// profile.js

// DOM Elements
const profileSection = document.getElementById('profile-section');
const selfAttributesForm = document.getElementById('self-attributes-form');
const selfAttributesError = document.getElementById('self-attributes-error');
const selfAttributesSuccess = document.getElementById('self-attributes-success');

const vennDiagramDiv = document.getElementById('venn-diagram');
const loadingDiv = document.getElementById('loading');

// Utility Functions to Display Messages
function displaySelfAttributesError(message) {
  selfAttributesError.textContent = message;
  setTimeout(() => { selfAttributesError.textContent = ''; }, 5000);
}

function displaySelfAttributesSuccess(message) {
  selfAttributesSuccess.textContent = message;
  setTimeout(() => { selfAttributesSuccess.textContent = ''; }, 5000);
}

function showLoading() {
  loadingDiv.classList.remove('hidden');
}

function hideLoading() {
  loadingDiv.classList.add('hidden');
}

// Authentication State Listener
auth.onAuthStateChanged(user => {
  if (user) {
    if (user.emailVerified) {
      // User is signed in and email is verified
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
    //showLoading();
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      if (data.selfAttributes && Array.isArray(data.selfAttributes)) {
        data.selfAttributes.forEach(attr => {
          const checkbox = selfAttributesForm.querySelector(`input[value="${attr}"]`);
          if (checkbox) {
            checkbox.checked = true;
          }
        });
      }
    }
  } catch (error) {
    console.error('Error fetching self attributes:', error);
    displaySelfAttributesError('Failed to load your attributes.');
  } finally {
    //hideLoading();
  }
}

// Handle Self-Attributes Form Submission
selfAttributesForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) {
    displaySelfAttributesError('You must be logged in.');
    return;
  }

  // Collect selected self attributes
  const selectedSelfAttributes = Array.from(document.querySelectorAll('input[name="self-qualities"]:checked')).map(checkbox => checkbox.value);

  if (selectedSelfAttributes.length === 0) {
    displaySelfAttributesError('Please select at least one attribute.');
    return;
  }

  try {
    //showLoading();
    // Save to Firestore
    await db.collection('users').doc(user.uid).update({
      selfAttributes: selectedSelfAttributes
    });
    displaySelfAttributesSuccess('Your attributes have been saved.');
    // Regenerate Venn Diagram
    generateVennDiagram(user.uid);
  } catch (error) {
    console.error('Error saving self attributes:', error);
    displaySelfAttributesError('Failed to save your attributes.');
  } finally {
    //hideLoading();
  }
});

// Generate Venn Diagram
async function generateVennDiagram(userId) {
  try {
    //showLoading();
    // Fetch self attributes
    const userDoc = await db.collection('users').doc(userId).get();
    let selfAttributes = [];
    if (userDoc.exists) {
      const data = userDoc.data();
      if (data.selfAttributes && Array.isArray(data.selfAttributes)) {
        selfAttributes = data.selfAttributes;
      }
    }

    // Fetch others' attributes from reviews
    const reviewsSnapshot = await db.collection('reviews')
      .where('reviewedPersonId', '==', userId)
      .get();

    let othersAttributes = [];
    reviewsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.qualities && Array.isArray(data.qualities)) {
        othersAttributes = othersAttributes.concat(data.qualities);
      }
    });

    // Remove duplicates
    othersAttributes = Array.from(new Set(othersAttributes));

    // Compute overlapping attributes
    const overlappingAttributes = selfAttributes.filter(attr => othersAttributes.includes(attr));

    // Compute unique attributes
    const uniqueSelfAttributes = selfAttributes.filter(attr => !othersAttributes.includes(attr));
    const uniqueOthersAttributes = othersAttributes.filter(attr => !selfAttributes.includes(attr));

    // Prepare data for Venn Diagram
    const sets = [
      { sets: ['Self'], size: uniqueSelfAttributes.length },
      { sets: ['Others'], size: uniqueOthersAttributes.length },
      { sets: ['Self', 'Others'], size: overlappingAttributes.length }
    ];

    // Clear previous diagram
    vennDiagramDiv.innerHTML = '';

    // Create Venn Diagram
    const chart = venn.VennDiagram()
      .width(600)
      .height(400);

    const div = d3.select("#venn-diagram");
    div.datum(sets).call(chart);

    // Optional: Add labels or tooltips
    div.selectAll("g")
      .on("mouseover", function(event, d) {
        venn.sortAreas(div, d);
        const selection = d3.select(this).transition();
        selection.select("path")
          .style("stroke-width", 3)
          .style("fill-opacity", 0.4);
      })
      .on("mouseout", function(event, d) {
        const selection = d3.select(this).transition();
        selection.select("path")
          .style("stroke-width", 1)
          .style("fill-opacity", 0.25);
      });

    // Add labels inside the circles
    div.selectAll("g")
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

    // Optionally, add labels outside the circles as lists
    addAttributeLists(uniqueSelfAttributes, overlappingAttributes, uniqueOthersAttributes);

  } catch (error) {
    console.error('Error generating Venn diagram:', error);
    vennDiagramDiv.innerHTML = '<p>Failed to generate Venn diagram.</p>';
  } finally {
    //hideLoading();
  }
}

// Function to add categorized lists below the Venn diagram
function addAttributeLists(selfAttrs, overlappingAttrs, othersAttrs) {
  // Remove existing lists if any
  const existingLists = document.getElementById('attribute-lists');
  if (existingLists) {
    existingLists.remove();
  }

  // Create a container for the lists
  const container = document.createElement('div');
  container.id = 'attribute-lists';
  container.style.marginTop = '20px';

  // Self Attributes List
  const selfList = document.createElement('div');
  const selfHeader = document.createElement('h3');
  selfHeader.textContent = 'Attributes You Believe Others Associate with You';
  const selfUl = document.createElement('ul');
  selfAttrs.forEach(attr => {
    const li = document.createElement('li');
    li.textContent = attr;
    selfUl.appendChild(li);
  });
  selfList.appendChild(selfHeader);
  selfList.appendChild(selfUl);

  // Overlapping Attributes List
  const overlapList = document.createElement('div');
  const overlapHeader = document.createElement('h3');
  overlapHeader.textContent = 'Attributes Common to Both';
  const overlapUl = document.createElement('ul');
  overlappingAttrs.forEach(attr => {
    const li = document.createElement('li');
    li.textContent = attr;
    overlapUl.appendChild(li);
  });
  overlapList.appendChild(overlapHeader);
  overlapList.appendChild(overlapUl);

  // Others' Attributes List
  const othersList = document.createElement('div');
  const othersHeader = document.createElement('h3');
  othersHeader.textContent = 'Attributes Others Associate with You';
  const othersUl = document.createElement('ul');
  othersAttrs.forEach(attr => {
    const li = document.createElement('li');
    li.textContent = attr;
    othersUl.appendChild(li);
  });
  othersList.appendChild(othersHeader);
  othersList.appendChild(othersUl);

  // Append all lists to the container
  container.appendChild(selfList);
  container.appendChild(overlapList);
  container.appendChild(othersList);

  // Append the container below the Venn diagram
  vennDiagramDiv.appendChild(container);
}
