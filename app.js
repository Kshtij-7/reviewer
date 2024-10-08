// app.js

// DOM Elements
const authSection = document.getElementById('auth-section');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const authError = document.getElementById('auth-error');

const reviewSection = document.getElementById('review-section');
const reviewForm = document.getElementById('review-form');
const reviewedPersonSelect = document.getElementById('reviewed-person');
const reviewSuccess = document.getElementById('review-success');
const reviewError = document.getElementById('review-error');

const reviewsSection = document.getElementById('reviews-section');
const reviewsDiv = document.getElementById('reviews');

const logoutButton = document.getElementById('logout-button');

// Utility Function to Display Errors
function displayAuthError(message) {
  authError.textContent = message;
  setTimeout(() => { authError.textContent = ''; }, 5000);
}

function displayReviewError(message) {
  reviewError.textContent = message;
  setTimeout(() => { reviewError.textContent = ''; }, 5000);
}

function displayReviewSuccess(message) {
  reviewSuccess.textContent = message;
  setTimeout(() => { reviewSuccess.textContent = ''; }, 5000);
}

// Authentication State Listener
auth.onAuthStateChanged(user => {
  if (user) {
    // User is signed in
    authSection.classList.add('hidden');
    reviewSection.classList.remove('hidden');
    reviewsSection.classList.remove('hidden');
    populateReviewedPersons(user.uid);
    fetchReviews(user.uid);
  } else {
    // User is signed out
    authSection.classList.remove('hidden');
    reviewSection.classList.add('hidden');
    reviewsSection.classList.add('hidden');
  }
});

// Handle Signup
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Add user to 'users' collection
    await db.collection('users').doc(user.uid).set({
      email: user.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    signupForm.reset();
    displayReviewSuccess('Signup successful! You are now logged in.');
  } catch (error) {
    console.error('Signup Error:', error);
    displayAuthError(error.message);
  }
});

// Handle Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    await auth.signInWithEmailAndPassword(email, password);
    loginForm.reset();
  } catch (error) {
    console.error('Login Error:', error);
    displayAuthError(error.message);
  }
});

// Handle Logout
logoutButton.addEventListener('click', async () => {
  try {
    await auth.signOut();
    displayReviewSuccess('Logged out successfully.');
  } catch (error) {
    console.error('Logout Error:', error);
    displayReviewError(error.message);
  }
});

// Populate Reviewed Persons Dropdown
async function populateReviewedPersons(currentUserId) {
  try {
    const usersSnapshot = await db.collection('users').get();
    reviewedPersonSelect.innerHTML = '<option value="">--Select--</option>'; // Reset options

    usersSnapshot.forEach(doc => {
      const user = doc.data();
      if (doc.id !== currentUserId) { // Exclude current user
        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = user.email;
        reviewedPersonSelect.appendChild(option);
      }
    });

    // If no other users are available
    if (reviewedPersonSelect.options.length === 1) {
      const option = document.createElement('option');
      option.value = "";
      option.textContent = "No users available to review.";
      reviewedPersonSelect.appendChild(option);
      reviewedPersonSelect.disabled = true;
    } else {
      reviewedPersonSelect.disabled = false;
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    displayReviewError('Failed to load users for review.');
  }
}

// Handle Review Submission
reviewForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const reviewedPersonId = reviewedPersonSelect.value;
  if (!reviewedPersonId) {
    displayReviewError('Please select a person to review.');
    return;
  }

  const qualities = {
    smiling: parseInt(document.getElementById('smiling').value),
    intelligent: parseInt(document.getElementById('intelligent').value),
    confident: parseInt(document.getElementById('confident').value),
    optimist: parseInt(document.getElementById('optimist').value),
    'short-tempered': parseInt(document.getElementById('short-tempered').value),
    egoist: parseInt(document.getElementById('egoist').value)
  };

  const comment = document.getElementById('comment').value.trim();
  if (!comment) {
    displayReviewError('Please enter a comment.');
    return;
  }

  const senderId = auth.currentUser.uid;

  try {
    await db.collection('reviews').add({
      senderId: senderId,
      reviewedPersonId: reviewedPersonId,
      qualities: qualities,
      comment: comment,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    reviewForm.reset();
    displayReviewSuccess('Review submitted successfully!');
    fetchReviews(senderId); // Refresh reviews
  } catch (error) {
    console.error('Error submitting review:', error);
    displayReviewError('Failed to submit review.');
  }
});

// Fetch and Display Reviews for the Logged-In User
async function fetchReviews(userId) {
  try {
    const reviewsSnapshot = await db.collection('reviews')
      .where('reviewedPersonId', '==', userId)
      .orderBy('timestamp', 'desc')
      .get();

    reviewsDiv.innerHTML = ''; // Clear existing reviews

    if (reviewsSnapshot.empty) {
      reviewsDiv.innerHTML = '<p>No reviews yet.</p>';
      return;
    }

    reviewsSnapshot.forEach(doc => {
      const data = doc.data();
      const review = data;

      const reviewElement = document.createElement('div');
      reviewElement.innerHTML = `
        <p><strong>Smiling:</strong> ${review.qualities.smiling}</p>
        <p><strong>Intelligent:</strong> ${review.qualities.intelligent}</p>
        <p><strong>Confident:</strong> ${review.qualities.confident}</p>
        <p><strong>Optimist:</strong> ${review.qualities.optimist}</p>
        <p><strong>Short Tempered:</strong> ${review.qualities['short-tempered']}</p>
        <p><strong>Egoist:</strong> ${review.qualities.egoist}</p>
        <p><strong>Comment:</strong> ${review.comment}</p>
        <hr>
      `;
      reviewsDiv.appendChild(reviewElement);
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    displayReviewError('Failed to load reviews.');
  }
}
