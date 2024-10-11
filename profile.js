// profile.js

// DOM Elements
const profileSection = document.getElementById('profile-section');
const selfAttributesForm = document.getElementById('self-attributes-form');
const selfAttributesError = document.getElementById('self-attributes-error');
const selfAttributesSuccess = document.getElementById('self-attributes-success');

const vennDiagramDiv = document.getElementById('venn-diagram');
const attributeListsDiv = document.getElementById('attribute-lists');

// Initialize D3-tip
/*
const tip = d3.tip()
  .attr('class', 'd3-tip')
  .offset([-10, 0])
  .html(function(event, d) {
    let tooltipContent = '';
    if (d.sets.length === 1) {
      tooltipContent = `<strong>${d.sets[0]}</strong><br>Attributes: ${d.size}`;
    } else if (d.sets.length === 2) {
      tooltipContent = `<strong>Both</strong><br>Shared Attributes: ${d.size}`;
    }
    return tooltipContent;
  });*/

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
      generateVennDiagram(user.uid);
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
        data.selfAttributes.forEach(attr => {
          const checkbox = selfAttributesForm.querySelector(`input[value="${attr}"]`);
          if (checkbox) {
            checkbox.checked = true;
            console.log(`Checked attribute: ${attr}`);
          } else {
            console.warn(`Checkbox for attribute "${attr}" not found.`);
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

// Handle Self-Attributes Form Submission
selfAttributesForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = window.auth.currentUser;
  console.log('Form submitted by user:', user);
  if (!user) {
    displaySelfAttributesError('You must be logged in.');
    return;
  }

  // Collect selected self attributes
  const selectedSelfAttributes = Array.from(document.querySelectorAll('input[name="self-qualities"]:checked')).map(checkbox => checkbox.value);
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
    // Regenerate Venn Diagram
    generateVennDiagram(user.uid);
  } catch (error) {
    console.error('Error saving self attributes:', error);
    displaySelfAttributesError('Failed to save your attributes.');
  }
});

// Generate Venn Diagram
async function generateVennDiagram(userId) {
  try {
    console.log('Generating Venn diagram for user:', userId);
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
    // Remove duplicates
    othersAttributes = Array.from(new Set(othersAttributes));
    console.log('Unique othersAttributes:', othersAttributes);

    // Compute overlapping attributes
    const overlappingAttributes = selfAttributes.filter(attr => othersAttributes.includes(attr));
    console.log('Overlapping attributes:', overlappingAttributes);

    // Compute unique attributes
    const uniqueSelfAttributes = selfAttributes.filter(attr => !othersAttributes.includes(attr));
    const uniqueOthersAttributes = othersAttributes.filter(attr => !selfAttributes.includes(attr));
    console.log('Unique selfAttributes:', uniqueSelfAttributes);
    console.log('Unique othersAttributes:', uniqueOthersAttributes);

    // Prepare data for Venn Diagram
    const sets = [
      { sets: ['Self'], size: uniqueSelfAttributes.length },
      { sets: ['Others'], size: uniqueOthersAttributes.length },
      { sets: ['Self', 'Others'], size: overlappingAttributes.length }
    ];

    console.log('Venn sets:', sets);

    // Clear previous diagram
    vennDiagramDiv.innerHTML = '';

    // Create SVG container
    const svg = d3.select("#venn-diagram").append("svg")
      .attr("width", "100%")
      .attr("height", "100%");

    // Create Venn Diagram
    const chart = venn.VennDiagram()
      .width(600)
      .height(400);

    svg.datum(sets).call(chart);

    // Attach Bootstrap tooltips
    svg.selectAll("g")
      .each(function(d, i) {
        const group = d3.select(this);
        const path = group.select("path");
        
        // Determine tooltip content
        let tooltipContent = '';
        if (d.sets.length === 1) {
          tooltipContent = `<strong>${d.sets[0]}</strong><br>Attributes: ${d.size}`;
        } else if (d.sets.length === 2) {
          tooltipContent = `<strong>Both</strong><br>Shared Attributes: ${d.size}`;
        }

        // Assign Bootstrap tooltip attributes
        path
          .attr('data-bs-toggle', 'tooltip')
          .attr('data-bs-html', 'true')
          .attr('title', tooltipContent);

        // Initialize Bootstrap tooltip
        new bootstrap.Tooltip(path.node());
      });

    // Add labels inside the circles
    svg.selectAll("g")
      .each(function(d) {
        const group = d3.select(this);
        // Remove existing labels to prevent duplication
        group.selectAll("text").remove();

        let labelText = '';
        if (d.sets.length === 1) {
          labelText = d.sets[0] === 'Self' ? uniqueSelfAttributes.join(', ') : uniqueOthersAttributes.join(', ');
        } else if (d.sets.length === 2) {
          labelText = overlappingAttributes.join(', ');
        }

        if (labelText.length > 0) {
          group.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", ".35em")
            .text(labelText)
            .style("font-size", "12px");
        }
      });

    // Add categorized lists below the Venn diagram
    addAttributeLists(uniqueSelfAttributes, overlappingAttributes, uniqueOthersAttributes);

    console.log('Venn diagram generated successfully.');
  } catch (error) {
    console.error('Error generating Venn diagram:', error);
    vennDiagramDiv.innerHTML = '<p class="text-danger">Failed to generate Venn diagram.</p>';
  }
}


// Function to add categorized lists below the Venn diagram
function addAttributeLists(selfAttrs, overlappingAttrs, othersAttrs) {
  try {
    console.log('Adding categorized attribute lists.');
    // Remove existing lists if any
    if (attributeListsDiv) {
      attributeListsDiv.innerHTML = '';
      console.log('Existing attribute lists removed.');
    }

    // Create Self Attributes List
    const selfListCol = document.createElement('div');
    selfListCol.classList.add('col-md-4');
    const selfHeader = document.createElement('h5');
    selfHeader.textContent = 'Attributes You Believe Others Associate with You';
    const selfUl = document.createElement('ul');
    selfAttrs.forEach(attr => {
      const li = document.createElement('li');
      li.textContent = attr;
      selfUl.appendChild(li);
    });
    selfListCol.appendChild(selfHeader);
    selfListCol.appendChild(selfUl);

    // Create Overlapping Attributes List
    const overlapListCol = document.createElement('div');
    overlapListCol.classList.add('col-md-4');
    const overlapHeader = document.createElement('h5');
    overlapHeader.textContent = 'Attributes Common to Both';
    const overlapUl = document.createElement('ul');
    overlappingAttrs.forEach(attr => {
      const li = document.createElement('li');
      li.textContent = attr;
      overlapUl.appendChild(li);
    });
    overlapListCol.appendChild(overlapHeader);
    overlapListCol.appendChild(overlapUl);

    // Create Others' Attributes List (Without Counts)
    const othersListCol = document.createElement('div');
    othersListCol.classList.add('col-md-4');
    const othersHeader = document.createElement('h5');
    othersHeader.textContent = 'Attributes Others Associate with You';
    const othersUl = document.createElement('ul');

    othersAttrs.forEach(attr => {
      const li = document.createElement('li');
      li.textContent = attr;
      othersUl.appendChild(li);
    });

    othersListCol.appendChild(othersHeader);
    othersListCol.appendChild(othersUl);

    // Append all lists to the container
    attributeListsDiv.appendChild(selfListCol);
    attributeListsDiv.appendChild(overlapListCol);
    attributeListsDiv.appendChild(othersListCol);

    console.log('Categorized attribute lists added successfully.');
  } catch (error) {
    console.error('Error adding attribute lists:', error);
  }
}
