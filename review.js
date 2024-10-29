// DOM Elements
const reviewSection = document.getElementById('review-section');
const reviewForm = document.getElementById('review-form');
const reviewedPersonSelect = document.getElementById('reviewed-person');
const groupSelect = document.getElementById('group-select');
const reviewError = document.getElementById('review-error');
const reviewSuccess = document.getElementById('review-success');
const logoutButton = document.getElementById('logout-button');

const createGroupForm = document.getElementById('create-group-form');
const joinGroupBtn = document.getElementById('join-group-btn');

// Store fetched reviews to avoid redundant calls
let reviewMap = {};

// Load Groups and Members on Auth State Change
auth.onAuthStateChanged(async (user) => {
  if (user && user.emailVerified) {
    await populateGroups(user.uid);
  } else {
    alert('Please log in and verify your email.');
    window.location.href = 'index.html';
  }
});

// **Populate Groups Dropdown**
async function populateGroups(userId) {
  try {
    const groupsSnapshot = await db.collection('groups')
      .where('members', 'array-contains', userId)
      .get();

    groupSelect.innerHTML = '<option value="">--Select Group--</option>';
    groupsSnapshot.forEach(doc => {
      const group = doc.data();
      const option = document.createElement('option');
      option.value = doc.id;
      option.textContent = group.name;
      groupSelect.appendChild(option);
    });

    // Load group members when a group is selected
    groupSelect.addEventListener('change', populateGroupMembers);
  } catch (error) {
    console.error('Error loading groups:', error);
  }
}

// **Populate Reviewed Person Dropdown Based on Group Members**
async function populateGroupMembers() {
  reviewedPersonSelect.innerHTML = '<option value="">--Select Person--</option>';
  const selectedGroupId = groupSelect.value;
  if (!selectedGroupId) return;

  try {
    const groupDoc = await db.collection('groups').doc(selectedGroupId).get();
    const groupData = groupDoc.data();

    const members = groupData.members || [];
    for (const memberId of members) {
      if (memberId !== auth.currentUser.uid) {
        const userDoc = await db.collection('users').doc(memberId).get();
        const user = userDoc.data();
        const option = document.createElement('option');
        option.value = memberId;
        option.textContent = user.email;
        reviewedPersonSelect.appendChild(option);
      }
    }

    // Handle person selection to load previous review if exists
    reviewedPersonSelect.addEventListener('change', loadPreviousReview);
  } catch (error) {
    console.error('Error loading group members:', error);
    reviewError.textContent = 'Failed to load group members.';
  }
}

// **Load Previous Review for Selected User in Group**
async function loadPreviousReview() {
  resetReviewForm();  // Reset the form first
  const reviewedPersonId = reviewedPersonSelect.value;
  const groupId = groupSelect.value;

  if (!reviewedPersonId || !groupId) return;

  try {
    const reviewQuery = await db.collection('reviews')
      .where('senderId', '==', auth.currentUser.uid)
      .where('reviewedPersonId', '==', reviewedPersonId)
      .where('groupId', '==', groupId)
      .get();

    if (!reviewQuery.empty) {
      const reviewData = reviewQuery.docs[0].data();
      console.log('Previous review found:', reviewData);

      // Highlight previously selected attributes
      reviewData.qualities.forEach(attr => {
        const button = reviewSection.querySelector(`.attribute-btn[data-attribute="${attr}"]`);
        if (button) {
          button.classList.add('active', 'btn-primary');
          button.classList.remove('btn-outline-primary');
        }
      });
    }
  } catch (error) {
    console.error('Error loading previous review:', error);
  }
}

// **Reset Review Form**
function resetReviewForm() {
  // Deselect all attribute buttons
  document.querySelectorAll('.attribute-btn').forEach(button => {
    button.classList.remove('active', 'btn-primary');
    button.classList.add('btn-outline-primary');
  });
}

// **Handle Review Form Submission (Save or Update Review)**
reviewForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const reviewedPersonId = reviewedPersonSelect.value;
  const groupId = groupSelect.value;
  const qualities = Array.from(document.querySelectorAll('.attribute-btn.active')).map(btn =>
    btn.getAttribute('data-attribute')
  );

  if (!reviewedPersonId) {
    reviewError.textContent = 'Please select a person to review.';
    return;
  }

  if (!groupId) {
    reviewError.textContent = 'Please select a group.';
    return;
  }

  if (qualities.length === 0) {
    reviewError.textContent = 'Please select at least one quality.';
    return;
  }

  try {
    const currentUser = auth.currentUser;
    const existingReviewQuery = await db.collection('reviews')
      .where('senderId', '==', currentUser.uid)
      .where('reviewedPersonId', '==', reviewedPersonId)
      .where('groupId', '==', groupId)
      .get();

    if (!existingReviewQuery.empty) {
      // Update existing review
      const reviewDoc = existingReviewQuery.docs[0];
      await reviewDoc.ref.update({
        qualities,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      reviewSuccess.textContent = 'Review updated successfully!';
    } else {
      // Create new review
      await db.collection('reviews').add({
        senderId: currentUser.uid,
        reviewedPersonId,
        groupId,
        qualities,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      reviewSuccess.textContent = 'Review submitted successfully!';
    }
  } catch (error) {
    console.error('Error saving review:', error);
    reviewError.textContent = 'Failed to submit review. Please try again.';
  }
});

// **Toggle Attribute Buttons**
document.querySelectorAll('.attribute-btn').forEach(button => {
  button.addEventListener('click', () => {
    button.classList.toggle('active');
    button.classList.toggle('btn-primary');
    button.classList.toggle('btn-outline-primary');
  });
});

// **Logout**
logoutButton.addEventListener('click', async () => {
  try {
    await auth.signOut();
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Error logging out:', error);
  }
});

createGroupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const groupName = document.getElementById('group-name').value;
  const whitelistOnly = document.getElementById('whitelist-toggle').checked;
  const user = auth.currentUser;
  const joinCode = generateJoinCode();

  const groupDoc = await db.collection('groups').add({
    name: groupName,
    owner: user.uid,
    whitelistOnly,
    members: [user.uid],
    joinCode
  });

  // Show the join code to the owner
  showJoinCodeModal(joinCode);
  
  populateGroups();
});

function generateJoinCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

function showJoinCodeModal(code) {
  const joinCodeDisplay = document.getElementById('join-code-display');
  joinCodeDisplay.textContent = code;
  new bootstrap.Modal(document.getElementById('joinCodeModal')).show();
}

joinGroupBtn.addEventListener('click', async () => {
  const joinCode = document.getElementById('join-code').value;
  const user = auth.currentUser;

  const groupSnapshot = await db.collection('groups').where('joinCode', '==', joinCode).get();
  if (!groupSnapshot.empty) {
    const groupDoc = groupSnapshot.docs[0];
    await groupDoc.ref.update({
      members: firebase.firestore.FieldValue.arrayUnion(user.uid)
    });
    alert('Joined group successfully!');
    populateGroups();
  } else {
    alert('Invalid join code.');
  }
});

function goToProfile(){
  window.location.href = 'profile.html';
}