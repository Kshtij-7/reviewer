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

const profileButton = document.getElementById('profile-button');

// Initialize Firestore and Auth

// Function to Navigate to Profile (Assuming profile.html exists)
function goToProfile() {
  window.location.href = "profile.html";
}

// Populate Reviewed Person Dropdown
async function populateReviewedPerson() {
  try {
    const usersSnapshot = await db.collection('users').get();
    const currentUser = auth.currentUser;
    usersSnapshot.forEach(doc => {
      const user = doc.data();
      // Prevent users from reviewing themselves
      if (doc.id !== currentUser.uid) {
        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = user.email;
        reviewedPersonSelect.appendChild(option);
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    reviewError.textContent = 'Failed to load users. Please try again later.';
  }
}

// Toggle Attribute Buttons (Review Form)
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

// Toggle Attribute Buttons (Signup Form)
const signupAttributeButtons = document.querySelectorAll('#signup-section .attribute-btn');
signupAttributeButtons.forEach(button => {
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
  
  // Collect selected attributes based on active buttons
  const selectedAttributes = Array.from(signupSection.querySelectorAll('.attribute-btn.active')).map(button => button.getAttribute('data-attribute'));
  console.log('Selected attributes for signup:', selectedAttributes);
  
  // Clear previous errors
  signupError.textContent = '';
  
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    console.log('User signed up:', userCredential.user);
    
    // Add user to Firestore 'users' collection with selected attributes
    await db.collection('users').doc(userCredential.user.uid).set({
      email: email,
      selfAttributes: selectedAttributes,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Send Email Verification
    await userCredential.user.sendEmailVerification();
    
    // Show Email Verification Notice
    signupSection.classList.add('hidden');
    verifyEmailSection.classList.remove('hidden');
    
    // Reset Signup Form and Toggle Buttons
    signupForm.reset();
    signupAttributeButtons.forEach(button => {
      button.classList.remove('active', 'btn-primary');
      button.classList.add('btn-outline-primary');
    });
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
  authError.textContent = '';
  
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
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
    await auth.sendPasswordResetEmail(email);
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
  const user = auth.currentUser;
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
    await auth.signOut();
    verifyEmailSection.classList.add('hidden');
    authSection.classList.remove('hidden');
  } catch (error) {
    console.error('Error logging out:', error);
  }
});

// Check Email Verification Status
checkVerificationButton.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (user) {
    await user.reload();
    if (user.emailVerified) {
      verifyEmailSection.classList.add('hidden');
      authSection.classList.add('hidden');
      reviewSection.classList.remove('hidden');
      populateReviewedPerson();
      displayReviewForm(user.uid);
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
    await auth.signOut();
    reviewSection.classList.add('hidden');
    authSection.classList.remove('hidden');
  } catch (error) {
    console.error('Error logging out:', error);
  }
});

// Authentication State Listener
auth.onAuthStateChanged(user => {
  if (user) {
    if (user.emailVerified) {
      // User is signed in and email is verified
      console.log('User is authenticated and email is verified.');
      authSection.classList.add('hidden');
      signupSection.classList.add('hidden');
      forgotPasswordSection.classList.add('hidden');
      verifyEmailSection.classList.add('hidden');
      reviewSection.classList.remove('hidden');
      populateReviewedPerson();
      displayReviewForm(user.uid);
      displayReviews(user.uid);
    } else {
      // User is signed in but email is not verified
      console.log('User is authenticated but email is not verified.');
      authSection.classList.add('hidden');
      signupSection.classList.add('hidden');
      forgotPasswordSection.classList.add('hidden');
      verifyEmailSection.classList.remove('hidden');
      reviewSection.classList.add('hidden');
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
  }
});

// Function to Display and Edit Existing Review
async function displayReviewForm(userId) {
  try {
    const reviewQuery = await db.collection('reviews')
      .where('senderId', '==', userId)
      .get();
    
    // Create a map of reviewedPersonId to reviewDoc
    const reviewMap = {};
    reviewQuery.forEach(doc => {
      const data = doc.data();
      reviewMap[data.reviewedPersonId] = { id: doc.id, ...data };
    });
    
    // Listen for changes in the reviewed-person select dropdown
    reviewedPersonSelect.addEventListener('change', async () => {
      const selectedPersonId = reviewedPersonSelect.value;
      if (!selectedPersonId) {
        // No person selected, reset the form
        resetReviewForm();
        return;
      }
      
      if (reviewMap[selectedPersonId]) {
        // Review exists, fetch and populate the form for editing
        const existingReview = reviewMap[selectedPersonId];
        console.log('Existing review found:', existingReview);
        // Deselect all attribute buttons first
        reviewAttributeButtons.forEach(button => {
          button.classList.remove('active', 'btn-primary');
          button.classList.add('btn-outline-primary');
        });
        // Select the attributes from the existing review
        existingReview.qualities.forEach(attr => {
          const button = reviewSection.querySelector(`.attribute-btn[data-attribute="${attr}"]`);
          if (button) {
            button.classList.add('active', 'btn-primary');
            button.classList.remove('btn-outline-primary');
          }
        });
      } else {
        // No existing review, reset the form
        resetReviewForm();
      }
    });
  } catch (error) {
    console.error('Error displaying review form:', error);
    reviewError.textContent = 'Failed to load review form. Please try again later.';
  }
}

// Function to Reset Review Form
function resetReviewForm() {
  // Deselect all attribute buttons
  reviewAttributeButtons.forEach(button => {
    button.classList.remove('active', 'btn-primary');
    button.classList.add('btn-outline-primary');
  });
}

// Handle Review Form Submission (Create or Update)
reviewForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const reviewedPersonId = reviewedPersonSelect.value;
  const qualities = Array.from(reviewSection.querySelectorAll('.attribute-btn.active')).map(button => button.getAttribute('data-attribute'));
  
  // Clear previous messages
  reviewError.textContent = '';
  reviewSuccess.textContent = '';
  
  if (!reviewedPersonId) {
    reviewError.textContent = 'Please select a person to review.';
    return;
  }
  
  if (qualities.length === 0) {
    reviewError.textContent = 'Please select at least one attribute.';
    return;
  }
  
  try {
    const user = auth.currentUser;
    if (user) {
      // Check if a review already exists for this person by the current user
      const existingReviewQuery = await db.collection('reviews')
        .where('senderId', '==', user.uid)
        .where('reviewedPersonId', '==', reviewedPersonId)
        .get();
      
      if (!existingReviewQuery.empty) {
        // Review exists, update it
        const reviewDoc = existingReviewQuery.docs[0];
        await db.collection('reviews').doc(reviewDoc.id).update({
          qualities: qualities,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('Review updated successfully.');
        reviewSuccess.textContent = 'Your review has been updated successfully!';
      } else {
        // No review exists, create a new one
        await db.collection('reviews').add({
          senderId: user.uid,
          reviewedPersonId: reviewedPersonId,
          qualities: qualities,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('Review submitted successfully.');
        reviewSuccess.textContent = 'Review submitted successfully!';
      }
      
      // Refresh the reviews display
      displayReviews(user.uid);
    } else {
      reviewError.textContent = 'You must be logged in to submit a review.';
    }
  } catch (error) {
    console.error('Error submitting review:', error);
    reviewError.textContent = 'Failed to submit review. Please try again.';
  }
});

// Function to Display Existing Reviews (Optional)
async function displayReviews(userId) {
  // Implementation depends on how you want to display reviews
  // This could involve fetching reviews and displaying them in a list or table
  // For simplicity, this function is left as a placeholder
  // You can implement it based on your specific requirements
}

// Function to Navigate to Profile Page
function goToProfile() {
  window.location.href = "profile.html";
}
