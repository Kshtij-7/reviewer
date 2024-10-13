// profile.js

// DOM Elements
const profileSection = document.getElementById('profile-section');
const selfAttributesForm = document.getElementById('self-attributes-form');
const selfAttributesError = document.getElementById('self-attributes-error');
const selfAttributesSuccess = document.getElementById('self-attributes-success');

const johariWindowDiv = document.getElementById('johari-window');

// Utility Functions to Display Messages
function displaySelfAttributesError(message) {
  selfAttributesError.textContent = message;
  setTimeout(() => { selfAttributesError.textContent = ''; }, 5000);
}

function displaySelfAttributesSuccess(message) {
  selfAttributesSuccess.textContent = message;
  setTimeout(() => { selfAttributesSuccess.textContent = ''; }, 5000);
}

// Authentication State Listener
window.auth.onAuthStateChanged(user => {
  console.log('Auth State Changed:', user);
  if (user) {
    if (user.emailVerified) {
      // User is signed in and email is verified
      console.log('User is verified. Displaying profile section.');
      profileSection.classList.remove('hidden');
      populateSelfAttributesForm(user.uid);
      generateJohariWindow(user.uid);
    } else {
      // User is signed in but email is not verified
      alert('Please verify your email to access the profile page.');
      window.location.href = 'index.html';
    }
  } else {
    // User is signed out
    alert('Please log in to access the profile page.');
    window.location.href = 'index.html';
  }
});

// Populate Self-Attributes Form with Existing Data
async function populateSelfAttributesForm(userId) {
  try {
    console.log('Fetching self attributes for user:', userId);
    const userDoc = await window.db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      console.log('User data:', data);
      if (data.selfAttributes && Array.isArray(data.selfAttributes)) {
        // Iterate over each button and set active state based on saved attributes
        const attributeButtons = selfAttributesForm.querySelectorAll('.attribute-btn');
        attributeButtons.forEach(button => {
          const attr = button.getAttribute('data-attribute');
          if (data.selfAttributes.includes(attr)) {
            button.classList.add('active');
            button.classList.remove('btn-outline-primary');
            button.classList.add('btn-primary');
          }
        });
      } else {
        console.warn('No selfAttributes found or it is not an array.');
      }
    } else {
      console.warn('User document does not exist.');
    }
  } catch (error) {
    console.error('Error fetching self attributes:', error);
    displaySelfAttributesError('Failed to load your attributes.');
  }
}

// Handle Attribute Button Clicks
const attributeButtons = document.querySelectorAll('.attribute-btn');
attributeButtons.forEach(button => {
  button.addEventListener('click', () => {
    const attr = button.getAttribute('data-attribute');
    if (button.classList.contains('active')) {
      // Deselect the attribute
      button.classList.remove('active', 'btn-primary');
      button.classList.add('btn-outline-primary');
      console.log(`Attribute deselected: ${attr}`);
    } else {
      // Select the attribute
      button.classList.add('active', 'btn-primary');
      button.classList.remove('btn-outline-primary');
      console.log(`Attribute selected: ${attr}`);
    }
  });
});

// Handle Self-Attributes Form Submission
selfAttributesForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = window.auth.currentUser;
  console.log('Form submitted by user:', user);
  if (!user) {
    displaySelfAttributesError('You must be logged in.');
    return;
  }

  // Collect selected self attributes based on active buttons
  const selectedSelfAttributes = Array.from(document.querySelectorAll('.attribute-btn.active')).map(button => button.getAttribute('data-attribute'));
  console.log('Selected self attributes:', selectedSelfAttributes);

  if (selectedSelfAttributes.length === 0) {
    displaySelfAttributesError('Please select at least one attribute.');
    return;
  }

  try {
    // Save to Firestore
    console.log('Saving self attributes to Firestore for user:', user.uid);
    await window.db.collection('users').doc(user.uid).update({
      selfAttributes: selectedSelfAttributes
    });
    displaySelfAttributesSuccess('Your attributes have been saved.');
    // Regenerate Johari Window
    generateJohariWindow(user.uid);
  } catch (error) {
    console.error('Error saving self attributes:', error);
    displaySelfAttributesError('Failed to save your attributes.');
  }
});

// Generate Johari Window
async function generateJohariWindow(userId) {
  try {
    console.log('Generating Johari Window for user:', userId);
    
    // Fetch self attributes
    const userDoc = await window.db.collection('users').doc(userId).get();
    let selfAttributes = [];
    if (userDoc.exists) {
      const data = userDoc.data();
      console.log('User selfAttributes:', data.selfAttributes);
      if (data.selfAttributes && Array.isArray(data.selfAttributes)) {
        selfAttributes = data.selfAttributes;
      } else {
        console.warn('selfAttributes not found or not an array.');
      }
    } else {
      console.warn('User document does not exist.');
    }

    // Fetch others' attributes from reviews
    const reviewsSnapshot = await window.db.collection('reviews')
      .where('reviewedPersonId', '==', userId)
      .get();
    console.log('Fetched reviews:', reviewsSnapshot.size);

    let othersAttributes = [];
    reviewsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.qualities && Array.isArray(data.qualities)) {
        othersAttributes = othersAttributes.concat(data.qualities);
      } else {
        console.warn(`Review ${doc.id} has invalid or missing qualities.`);
      }
    });

    console.log('Aggregated othersAttributes:', othersAttributes);

    // Create a frequency map for othersAttributes
    const frequencyMap = {};
    othersAttributes.forEach(attr => {
      if (frequencyMap[attr]) {
        frequencyMap[attr]++;
      } else {
        frequencyMap[attr] = 1;
      }
    });

    console.log('Frequency Map:', frequencyMap);

    // Calculate Johari Window Quadrants
    // Open Area: Attributes known by both you and others
    const openArea = selfAttributes.filter(attr => frequencyMap[attr]).map(attr => ({
      name: attr,
      count: frequencyMap[attr]
    }));

    // Blind Area: Attributes known by others but not by you
    // We need to ensure unique attributes and their counts
    const blindAreaMap = {};
    othersAttributes.forEach(attr => {
      if (!selfAttributes.includes(attr)) {
        if (blindAreaMap[attr]) {
          blindAreaMap[attr]++;
        } else {
          blindAreaMap[attr] = 1;
        }
      }
    });
    const blindArea = Object.keys(blindAreaMap).map(attr => ({
      name: attr,
      count: blindAreaMap[attr]
    }));

    // Hidden Area: Attributes known by you but not by others
    const hiddenArea = selfAttributes.filter(attr => !frequencyMap[attr]);

    console.log('Open Area:', openArea);
    console.log('Blind Area:', blindArea);
    console.log('Hidden Area:', hiddenArea);

    // Determine the maximum number of attributes in any quadrant
    const maxAttributes = Math.max(openArea.length, blindArea.length, hiddenArea.length);
    console.log('Maximum attributes in any quadrant:', maxAttributes);

    // Define base height and additional height per attribute
    const baseHeight = 400; // Base height for up to 5 attributes
    const additionalHeightPerAttribute = 20; // Additional height for each attribute beyond the base

    // Calculate the required height
    const requiredHeight = baseHeight + Math.max(0, maxAttributes - 5) * additionalHeightPerAttribute;
    console.log('Required SVG height:', requiredHeight);

    // Clear previous diagram
    johariWindowDiv.innerHTML = '';

    // Create Johari Window Visualization with dynamic height
    createJohariWindow(
      { open: openArea.length, blind: blindArea.length, hidden: hiddenArea.length },
      openArea,
      blindArea,
      hiddenArea,
      requiredHeight
    );

    console.log('Johari Window generated successfully.');
  } catch (error) {
    console.error('Error generating Johari Window:', error);
    johariWindowDiv.innerHTML = '<p class="text-danger">Failed to generate Johari Window.</p>';
  }
}

// Function to Create Johari Window Visualization
function createJohariWindow(johariData, openArea, blindArea, hiddenArea, svgHeight) {
  // Using D3.js to create a simple Johari Window
  const width = 600;
  const height = svgHeight; // Dynamic height based on attribute count

  const svg = d3.select("#johari-window").append("svg")
    .attr("width", width)
    .attr("height", height);

  // Define quadrant dimensions
  const quadrants = [
    { name: 'Open Area', x: 0, y: 0, width: width / 2, height: height / 2, fill: '#ADD8E6' },       // Blue
    { name: 'Blind Area', x: width / 2, y: 0, width: width / 2, height: height / 2, fill: '#90EE90' }, // Green
    { name: 'Hidden Area', x: 0, y: height / 2, width: width / 2, height: height / 2, fill: '#FFB6C1' }, // Pink
    // Removed: Unknown Area
  ];

  // Draw quadrants
  svg.selectAll("rect")
    .data(quadrants)
    .enter()
    .append("rect")
    .attr("x", d => d.x)
    .attr("y", d => d.y)
    .attr("width", d => d.width)
    .attr("height", d => d.height)
    .attr("fill", d => d.fill)
    .attr("stroke", "black")
    .attr("stroke-width", 1);

  // Add quadrant labels
  svg.selectAll("text.quadrant-label")
    .data(quadrants)
    .enter()
    .append("text")
    .attr("class", "quadrant-label")
    .attr("x", d => d.x + d.width / 2)
    .attr("y", d => d.y + 20)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "bold")
    .text(d => d.name);

  // Add attribute strings inside quadrants
  // Open Area
  svg.append("foreignObject")
    .attr("x", quadrants[0].x + 10)
    .attr("y", quadrants[0].y + 40)
    .attr("width", quadrants[0].width - 20)
    .attr("height", quadrants[0].height - 50)
    .append("xhtml:div")
    .style("font-size", "14px") // Adjust font size as needed
    .style("overflow-wrap", "break-word")
    .html(generateAttributeStringWithCountHTML(openArea));

  // Blind Area
  svg.append("foreignObject")
    .attr("x", quadrants[1].x + 10)
    .attr("y", quadrants[1].y + 40)
    .attr("width", quadrants[1].width - 20)
    .attr("height", quadrants[1].height - 50)
    .append("xhtml:div")
    .style("font-size", "14px") // Adjust font size as needed
    .style("overflow-wrap", "break-word")
    .html(generateAttributeStringWithCountHTML(blindArea));

  // Hidden Area
  svg.append("foreignObject")
    .attr("x", quadrants[2].x + 10)
    .attr("y", quadrants[2].y + 40)
    .attr("width", quadrants[2].width - 20)
    .attr("height", quadrants[2].height - 50)
    .append("xhtml:div")
    .style("font-size", "14px") // Adjust font size as needed
    .style("overflow-wrap", "break-word")
    .html(generateAttributeStringHTML(hiddenArea));

  // Note: Unknown Area has been removed
}

// Helper Function to Generate Comma-Separated Attribute Strings with Counts
function generateAttributeStringWithCountHTML(attributes) {
  if (attributes.length === 0) {
    return '<p>No attributes.</p>';
  }
  // Format: AttributeName (count)
  return `<p>${attributes.map(attr => `${attr.name} (${attr.count})`).join(', ')}</p>`;
}

// Helper Function to Generate Comma-Separated Attribute Strings (Without Counts)
function generateAttributeStringHTML(attributes) {
  if (attributes.length === 0) {
    return '<p>No attributes.</p>';
  }
  return `<p>${attributes.join(', ')}</p>`;
}
