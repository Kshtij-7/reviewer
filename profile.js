// DOM Elements
const profileSection = document.getElementById('profile-section');
const selfAttributesForm = document.getElementById('self-attributes-form');
const groupSelect = document.getElementById('group-select');
const johariWindowDiv = document.getElementById('johari-window');
const selfAttributesError = document.getElementById('self-attributes-error');
const selfAttributesSuccess = document.getElementById('self-attributes-success');

// Load Groups on Auth State Change
auth.onAuthStateChanged(async (user) => {
  if (user && user.emailVerified) {
    profileSection.classList.remove('hidden');
    await loadUserGroups(user.uid); // Load user groups
    await populateSelfAttributesForm(user.uid); // Populate attributes form
  } else {
    alert('Please log in and verify your email.');
    window.location.href = 'index.html';
  }
});

// **Function to Load User's Groups**
async function loadUserGroups(userId) {
  try {
    const groupsSnapshot = await db.collection('groups')
      .where('members', 'array-contains', userId)
      .get();

    groupSelect.innerHTML = '<option value="">--Select Group--</option>'; // Reset dropdown

    groupsSnapshot.forEach(doc => {
      const group = doc.data();
      const option = document.createElement('option');
      option.value = doc.id;
      option.textContent = group.name;
      groupSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading groups:', error);
    alert('Failed to load groups.');
  }
}

// **Function to Populate Self-Attributes Form**
async function populateSelfAttributesForm(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      const attributeButtons = selfAttributesForm.querySelectorAll('.attribute-btn');

      attributeButtons.forEach(button => {
        const attr = button.getAttribute('data-attribute');
        if (data.selfAttributes && data.selfAttributes.includes(attr)) {
          button.classList.add('active', 'btn-primary');
          button.classList.remove('btn-outline-primary');
        }
      });
    }
  } catch (error) {
    console.error('Error loading self attributes:', error);
    displaySelfAttributesError('Failed to load your attributes.');
  }
}

// **Handle Form Submission and Save Attributes**
selfAttributesForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const selectedGroupId = groupSelect.value;
  if (!selectedGroupId) {
    displaySelfAttributesError('Please select a group.');
    return;
  }

  const selectedAttributes = Array.from(selfAttributesForm.querySelectorAll('.attribute-btn.active'))
    .map(button => button.getAttribute('data-attribute'));

  if (selectedAttributes.length === 0) {
    displaySelfAttributesError('Please select at least one attribute.');
    return;
  }

  const user = auth.currentUser;
  try {
    await db.collection('users').doc(user.uid).update({ selfAttributes: selectedAttributes });
    displaySelfAttributesSuccess('Attributes saved!');
    generateJohariWindow(user.uid, selectedGroupId); // Use selected group to filter reviews
  } catch (error) {
    console.error('Error saving attributes:', error);
    displaySelfAttributesError('Failed to save attributes.');
  }
});

// **Generate Johari Window with Group Filtering**
async function generateJohariWindow(userId, groupId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const selfAttributes = userDoc.data()?.selfAttributes || [];

    const reviewsSnapshot = await db.collection('reviews')
      .where('reviewedPersonId', '==', userId)
      .where('groupId', '==', groupId)
      .get();

    const othersAttributes = [];
    reviewsSnapshot.forEach(doc => othersAttributes.push(...(doc.data().qualities || [])));
    console.log('Others Attributes:', othersAttributes);

    const openArea = selfAttributes.filter(attr => othersAttributes.includes(attr));
    const blindArea = othersAttributes.filter(attr => !selfAttributes.includes(attr));
    const hiddenArea = selfAttributes.filter(attr => !othersAttributes.includes(attr));

    const allKnownAttributes = new Set([...selfAttributes, ...othersAttributes]);
    const unknownArea = Array.from(allKnownAttributes).filter(
      attr => !openArea.includes(attr) && !blindArea.includes(attr) && !hiddenArea.includes(attr)
    );

    renderJohariWindow(openArea, blindArea, hiddenArea, unknownArea);
  } catch (error) {
    console.error('Error generating Johari Window:', error);
    johariWindowDiv.innerHTML = '<p class="text-danger">Failed to generate Johari Window.</p>';
  }
}

// **Render Johari Window**
function renderJohariWindow(openArea, blindArea, hiddenArea, unknownArea) {
  johariWindowDiv.innerHTML = ''; // Clear previous content

  const svg = d3.select(johariWindowDiv).append('svg')
    .attr('width', 600)
    .attr('height', 900);

  const quadrants = [
    { name: 'Open Area', x: 0, y: 0, fill: '#ADD8E6', attributes: openArea },
    { name: 'Blind Area', x: 300, y: 0, fill: '#90EE90', attributes: blindArea },
    { name: 'Hidden Area', x: 0, y: 400, fill: '#FFB6C1', attributes: hiddenArea },
    { name: 'Unknown Area', x: 300, y: 400, fill: 'grey', attributes: unknownArea },
  ];

  svg.selectAll('rect')
    .data(quadrants)
    .enter()
    .append('rect')
    .attr('x', d => d.x)
    .attr('y', d => d.y)
    .attr('width', 300)
    .attr('height', 400)
    .attr('fill', d => d.fill);

  svg.selectAll('text')
    .data(quadrants)
    .enter()
    .append('text')
    .attr('x', d => d.x + 150)
    .attr('y', d => d.y + 20)
    .attr('text-anchor', 'middle')
    .text(d => d.name);

  svg.selectAll('foreignObject')
    .data(quadrants)
    .enter()
    .append('foreignObject')
    .attr('x', d => d.x + 10)
    .attr('y', d => d.y + 40)
    .attr('width', 280)
    .attr('height', 460)
    .append('xhtml:div')
    .style('overflow-wrap', 'break-word')
    .html(d => `<p>${d.attributes.join(', ')}</p>`);
}

// **Utility Functions for Error and Success Messages**
function displaySelfAttributesError(message) {
  selfAttributesError.textContent = message;
  setTimeout(() => { selfAttributesError.textContent = ''; }, 5000);
}

function displaySelfAttributesSuccess(message) {
  selfAttributesSuccess.textContent = message;
  setTimeout(() => { selfAttributesSuccess.textContent = ''; }, 5000);
}


const reviewAttributeButtons = document.querySelectorAll('#review-section .attribute-btn');
reviewAttributeButtons.forEach(button => {
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