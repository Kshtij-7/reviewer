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
    window.location.href="review.html";
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
    window.location.href="review.html";
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
      window.location.href="review.html";
    } else {
      // User is signed in but email is not verified
      console.log('User is authenticated but email is not verified.');
      
      window.alert("Please verify your email");
    }
  } else {
    // User is signed out
    console.log('User is signed out.');
    
  }
});