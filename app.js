// app.js

// DOM Elements
const authSection = document.getElementById('auth-section');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const authError = document.getElementById('auth-error');

const verifyEmailSection = document.getElementById('verify-email-section');
const resendVerificationButton = document.getElementById('resend-verification');
const logoutButtonVerify = document.getElementById('logout-button-verify');
const verifyError = document.getElementById('verify-error');
const verifySuccess = document.getElementById('verify-success');

const checkVerificationButton = document.getElementById('check-verification');

const reviewSection = document.getElementById('review-section');
const reviewForm = document.getElementById('review-form');
const reviewedPersonSelect = document.getElementById('reviewed-person');
const reviewSuccess = document.getElementById('review-success');
const reviewError = document.getElementById('review-error');

const reviewsSection = document.getElementById('reviews-section');
const reviewsDiv = document.getElementById('reviews');

const logoutButton = document.getElementById('logout-button');

// Password Reset Elements
const forgotPasswordLink = document.getElementById('forgot-password-link');
const passwordResetSection = document.getElementById('password-reset-section');
const passwordResetForm = document.getElementById('password-reset-form');
const resetError = document.getElementById('reset-error');
const resetSuccess = document.getElementById('reset-success');
const backToLoginLink = document.getElementById('back-to-login-link');

// Utility Functions to Display Messages
function displayAuthError(message) {
  authError.textContent = message;
  setTimeout(() => { authError.textContent = ''; }, 5000);
}

function displayVerifyError(message) {
  verifyError.textContent = message;
  setTimeout(() => { verifyError.textContent = ''; }, 5000);
}

function displayVerifySuccess(message) {
  verifySuccess.textContent = message;
  setTimeout(() => { verifySuccess.textContent = ''; }, 5000);
}

function displayResetError(message) {
  resetError.textContent = message;
  setTimeout(() => { resetError.textContent = ''; }, 5000);
}

function displayResetSuccess(message) {
  resetSuccess.textContent = message;
  setTimeout(() => { resetSuccess.textContent = ''; }, 5000);
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
    if (user.emailVerified) {
      // User is signed in and email is verified
      authSection.classList.add('hidden');
      passwordResetSection.classList.add('hidden');
      verifyEmailSection.classList.add('hidden');
      reviewSection.classList.remove('hidden');
      reviewsSection.classList.remove('hidden');
      populateReviewedPersons(user.uid);
      fetchReviews(user.uid);
    } else {
      // User is signed in but email is not verified
      authSection.classList.add('hidden');
      reviewSection.classList.add('hidden');
      reviewsSection.classList.add('hidden');
      passwordResetSection.classList.add('hidden');
      verifyEmailSection.classList.remove('hidden');
    }
  } else {
    // User is signed out
    authSection.classList.remove('hidden');
    verifyEmailSection.classList.add('hidden');
    reviewSection.classList.add('hidden');
    reviewsSection.classList.add('hidden');
    passwordResetSection.classList.add('hidden');
  }
});

// Handle Signup
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Add user to 'users' collection
    await db.collection('users').doc(user.uid).set({
      email: user.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Send verification email
    await user.sendEmailVerification();

    signupForm.reset();
    displayVerifySuccess('Signup successful! A verification email has been sent to your email address. Please verify to continue.');
  } catch (error) {
    console.error('Signup Error:', error);
    displayAuthError(error.message);
  }
});

// Handle Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    await auth.signInWithEmailAndPassword(email, password);
    loginForm.reset();
  } catch (error) {
    console.error('Login Error:', error);
    displayAuthError(error.message);
  }
});

// Handle Logout from Review Section
logoutButton.addEventListener('click', async () => {
  try {
    await auth.signOut();
    displayReviewSuccess('Logged out successfully.');
  } catch (error) {
    console.error('Logout Error:', error);
    displayReviewError(error.message);
  }
});

// Handle Logout from Verification Section
logoutButtonVerify.addEventListener('click', async () => {
  try {
    await auth.signOut();
    displayVerifySuccess('Logged out successfully.');
  } catch (error) {
    console.error('Logout Error:', error);
    displayVerifyError(error.message);
  }
});

// Resend Verification Email
resendVerificationButton.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (user && !user.emailVerified) {
    try {
      await user.sendEmailVerification();
      displayVerifySuccess('Verification email resent. Please check your inbox.');
    } catch (error) {
      console.error('Resend Verification Error:', error);
      displayVerifyError('Failed to resend verification email.');
    }
  }
});

// Handle Verification Status Check
checkVerificationButton.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (user) {
    await user.reload(); // Reload user to get updated info
    if (user.emailVerified) {
      displayVerifySuccess('Email verified! Redirecting to the review system...');
      setTimeout(() => {
        window.location.reload();
      }, 3000); // Reload after 3 seconds
    } else {
      displayVerifyError('Email not verified yet. Please check your inbox.');
    }
  }
});

// Handle Forgot Password Link Click
forgotPasswordLink.addEventListener('click', (e) => {
  e.preventDefault();
  authSection.classList.add('hidden');
  passwordResetSection.classList.remove('hidden');
});

// Handle Back to Login Link Click
backToLoginLink.addEventListener('click', (e) => {
  e.preventDefault();
  passwordResetSection.classList.add('hidden');
  authSection.classList.remove('hidden');
});

// Handle Password Reset Form Submission
passwordResetForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const resetEmail = document.getElementById('reset-email').value.trim();

  try {
    await auth.sendPasswordResetEmail(resetEmail);
    passwordResetForm.reset();
    displayResetSuccess('Password reset email sent! Please check your inbox.');
  } catch (error) {
    console.error('Password Reset Error:', error);
    displayResetError(error.message);
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

  // Collect selected qualities
  const selectedQualities = Array.from(document.querySelectorAll('input[name="qualities"]:checked')).map(checkbox => checkbox.value);
  
  if (selectedQualities.length === 0) {
    displayReviewError('Please select at least one quality.');
    return;
  }

  const comment = document.getElementById('comment').value.trim();
  if (!comment) {
    displayReviewError('Please enter a comment.');
    return;
  }

  const senderId = auth.currentUser.uid;
  const reviewDocId = `${reviewedPersonId}_${senderId}`;

  try {
    const reviewRef = db.collection('reviews').doc(reviewDocId);
    const doc = await reviewRef.get();
    
    if (doc.exists) {
      displayReviewError('You have already reviewed this person.');
      return;
    }
    
    await reviewRef.set({
      senderId: senderId,
      reviewedPersonId: reviewedPersonId,
      qualities: selectedQualities, // Store as array
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
        <p><strong>Qualities:</strong> ${review.qualities.join(', ')}</p>
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
