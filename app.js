// app.js

// DOM Elements for Authentication
const authSection = document.getElementById('auth-section');
const loginForm = document.getElementById('login-form');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const authError = document.getElementById('auth-error');

const forgotPasswordButton = document.getElementById('forgot-password-button');
const forgotPasswordSection = document.getElementById('forgot-password-section');
const forgotPasswordForm = document.getElementById('forgot-password-form');
const forgotEmail = document.getElementById('forgot-email');
const forgotPasswordError = document.getElementById('forgot-password-error');
const forgotPasswordSuccess = document.getElementById('forgot-password-success');
const backToLoginButton = document.getElementById('back-to-login-button');

const signupButton = document.getElementById('signup-button');
const signupSection = document.getElementById('signup-section');
const signupForm = document.getElementById('signup-form');
const signupEmail = document.getElementById('signup-email');
const signupPassword = document.getElementById('signup-password');
const signupError = document.getElementById('signup-error');
const backToLoginFromSignup = document.getElementById('back-to-login-from-signup');
const loginSection = document.getElementById('login-section');

const verifyEmailSection = document.getElementById('verify-email-section');
const resendVerificationButton = document.getElementById('resend-verification-button');
const logoutButtonVerify = document.getElementById('logout-button-verify');
const verifyError = document.getElementById('verify-error');
const verifySuccess = document.getElementById('verify-success');
const checkVerificationButton = document.getElementById('check-verification-button');

// DOM Elements for Reviews
const reviewSection = document.getElementById('review-section');
const reviewForm = document.getElementById('review-form');
const reviewedPersonSelect = document.getElementById('reviewed-person');
const reviewError = document.getElementById('review-error');
const reviewSuccess = document.getElementById('review-success');
const logoutButton = document.getElementById('logout-button');

const reviewsSection = document.getElementById('reviews-section');
const reviewsDiv = document.getElementById('reviews');
const backToReviewFormButton = document.getElementById('back-to-review-form-button');

// Populate Reviewed Person Dropdown
async function populateReviewedPerson() {
  try {
    const usersSnapshot = await db.collection('users').get();
    usersSnapshot.forEach(doc => {
      const user = doc.data();
      // Prevent users from reviewing themselves
      if (doc.id !== firebase.auth().currentUser.uid) {
        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = user.email;
        reviewedPersonSelect.appendChild(option);
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
  }
}

// Toggle Sections
forgotPasswordButton.addEventListener('click', () => {
  loginSection.classList.add('hidden');
  signupSection.classList.add('hidden');
  forgotPasswordSection.classList.remove('hidden');
});

backToLoginButton.addEventListener('click', () => {
  forgotPasswordSection.classList.add('hidden');
  loginSection.classList.remove('hidden');
});

signupButton.addEventListener('click', () => {
  console.log("signup button clicked");
  loginSection.classList.add('hidden');
  forgotPasswordSection.classList.add('hidden');
  signupSection.classList.remove('hidden');
});

backToLoginFromSignup.addEventListener('click', () => {
  signupSection.classList.add('hidden');
  loginSection.classList.remove('hidden');
});

// Handle Sign Up Form Submission
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = signupEmail.value.trim();
  const password = signupPassword.value.trim();
  
  // Clear previous errors
  signupError.textContent = '';
  
  try {
    const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
    console.log('User signed up:', userCredential.user);
    
    // Add user to Firestore 'users' collection
    await db.collection('users').doc(userCredential.user.uid).set({
      email: email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
      // Add other user-specific fields if necessary
    });
    
    // Send Email Verification
    await userCredential.user.sendEmailVerification();
    
    // Show Email Verification Notice
    signupSection.classList.add('hidden');
    verifyEmailSection.classList.remove('hidden');
  } catch (error) {
    console.error('Error signing up:', error);
    signupError.textContent = error.message;
  }
});

// Handle Login Form Submission
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = loginEmail.value.trim();
  const password = loginPassword.value.trim();
  
  // Clear previous errors
  //authError.textContent = '';
  
  try {
    const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
    console.log('User logged in:', userCredential.user);
    // Firebase auth state listener will handle UI changes
  } catch (error) {
    console.error('Error logging in:', error);
    authError.textContent = error.message;
  }
});

// Handle Forgot Password Form Submission
forgotPasswordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = forgotEmail.value.trim();
  
  // Clear previous messages
  forgotPasswordError.textContent = '';
  forgotPasswordSuccess.textContent = '';
  
  try {
    await firebase.auth().sendPasswordResetEmail(email);
    console.log('Password reset email sent to:', email);
    forgotPasswordSuccess.textContent = 'Password reset email sent! Please check your inbox.';
  } catch (error) {
    console.error('Error sending password reset email:', error);
    if (error.code === 'auth/user-not-found') {
      forgotPasswordError.textContent = 'No account found with this email.';
    } else {
      forgotPasswordError.textContent = error.message;
    }
  }
});

// Resend Verification Email
resendVerificationButton.addEventListener('click', async () => {
  const user = firebase.auth().currentUser;
  if (user) {
    try {
      await user.sendEmailVerification();
      console.log('Verification email resent.');
      verifySuccess.textContent = 'Verification email resent! Please check your inbox.';
      verifyError.textContent = '';
    } catch (error) {
      console.error('Error resending verification email:', error);
      verifyError.textContent = error.message;
      verifySuccess.textContent = '';
    }
  }
});

// Logout from Verification Section
logoutButtonVerify.addEventListener('click', async () => {
  try {
    await firebase.auth().signOut();
    verifyEmailSection.classList.add('hidden');
    authSection.classList.remove('hidden');
  } catch (error) {
    console.error('Error logging out:', error);
  }
});

// Check Email Verification Status
checkVerificationButton.addEventListener('click', async () => {
  const user = firebase.auth().currentUser;
  if (user) {
    await user.reload();
    if (user.emailVerified) {
      verifyEmailSection.classList.add('hidden');
      authSection.classList.add('hidden');
      reviewSection.classList.remove('hidden');
      reviewsSection.classList.remove('hidden');
      populateReviewedPerson();
      displayReviews(user.uid);
    } else {
      verifySuccess.textContent = '';
      verifyError.textContent = 'Email not verified yet. Please check your inbox.';
    }
  }
});

// Handle Logout from Review Section
logoutButton.addEventListener('click', async () => {
  try {
    await firebase.auth().signOut();
    reviewSection.classList.add('hidden');
    reviewsSection.classList.add('hidden');
    authSection.classList.remove('hidden');
  } catch (error) {
    console.error('Error logging out:', error);
  }
});

// Authentication State Listener
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    if (user.emailVerified) {
      // User is signed in and email is verified
      console.log('User is authenticated and email is verified.');
      authSection.classList.add('hidden');
      signupSection.classList.add('hidden');
      forgotPasswordSection.classList.add('hidden');
      verifyEmailSection.classList.add('hidden');
      reviewSection.classList.remove('hidden');
      reviewsSection.classList.remove('hidden');
      populateReviewedPerson();
      displayReviews(user.uid);
    } else {
      // User is signed in but email is not verified
      console.log('User is authenticated but email is not verified.');
      authSection.classList.add('hidden');
      signupSection.classList.add('hidden');
      forgotPasswordSection.classList.add('hidden');
      verifyEmailSection.classList.remove('hidden');
      reviewSection.classList.add('hidden');
      reviewsSection.classList.add('hidden');
      window.alert("Please verify your email");

    }
  } else {
    // User is signed out
    console.log('User is signed out.');
    authSection.classList.remove('hidden');
    signupSection.classList.add('hidden');
    forgotPasswordSection.classList.add('hidden');
    verifyEmailSection.classList.add('hidden');
    reviewSection.classList.add('hidden');
    reviewsSection.classList.add('hidden');
  }
});

// Handle Review Form Submission
reviewForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const reviewedPersonId = reviewedPersonSelect.value;
  const qualities = Array.from(document.querySelectorAll('input[name="qualities"]:checked')).map(cb => cb.value);
  
  // Clear previous messages
  reviewError.textContent = '';
  reviewSuccess.textContent = '';
  
  if (!reviewedPersonId) {
    reviewError.textContent = 'Please select a person to review.';
    return;
  }
  
  if (qualities.length === 0) {
    reviewError.textContent = 'Please select at least one quality.';
    return;
  }
  
  try {
    const user = firebase.auth().currentUser;
    if (user) {
      await db.collection('reviews').add({
        senderId: user.uid,
        reviewedPersonId: reviewedPersonId,
        qualities: qualities,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log('Review submitted successfully.');
      reviewSuccess.textContent = 'Review submitted successfully!';
      reviewForm.reset();
      displayReviews(user.uid);
    } else {
      reviewError.textContent = 'You must be logged in to submit a review.';
    }
  } catch (error) {
    console.error('Error submitting review:', error);
    reviewError.textContent = 'Failed to submit review. Please try again.';
  }
});

// Display Reviews
async function displayReviews(userId) {
  try {
    const reviewsSnapshot = await db.collection('reviews')
      .where('senderId', '==', userId)
      .orderBy('timestamp', 'desc')
      .get();
      
    reviewsDiv.innerHTML = '';
    
    if (reviewsSnapshot.empty) {
      reviewsDiv.innerHTML = '<p>No reviews submitted yet.</p>';
      return;
    }
    
    reviewsSnapshot.forEach(async doc => {
      const review = doc.data();
      const reviewedPersonEmail = await getEmailById(review.reviewedPersonId);
      const reviewDiv = document.createElement('div');
      reviewDiv.style.border = '1px solid #ccc';
      reviewDiv.style.padding = '10px';
      reviewDiv.style.marginBottom = '10px';
      reviewDiv.innerHTML = `
        <p><strong>Reviewed Person:</strong> ${reviewedPersonEmail}</p>
        <p><strong>Qualities:</strong> ${review.qualities.join(', ')}</p>
        <p><em>Submitted on: ${review.timestamp ? review.timestamp.toDate().toLocaleString() : 'N/A'}</em></p>
      `;
      reviewsDiv.appendChild(reviewDiv);
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    reviewsDiv.innerHTML = '<p>Error fetching reviews. Please try again later.</p>';
  }
}

// Helper Function to Get Email by User ID
async function getEmailById(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      return userDoc.data().email;
    } else {
      return 'Unknown User';
    }
  } catch (error) {
    console.error('Error fetching user email:', error);
    return 'Unknown User';
  }
}

// Handle Back to Review Form Button
backToReviewFormButton.addEventListener('click', () => {
  reviewsSection.classList.add('hidden');
  reviewSection.classList.remove('hidden');
});


function goToProfile() {
  window.location.href = "profile.html";
}