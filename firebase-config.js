const firebaseConfig = {
    apiKey: "AIzaSyAPgMAC-k2lKo46OAdqKPDFdCMxkHsakok",
    authDomain: "reviewer-3e104.firebaseapp.com",
    projectId: "reviewer-3e104",
    storageBucket: "reviewer-3e104.appspot.com",
    messagingSenderId: "199147480723",
    appId: "1:199147480723:web:887d9014a8f2ec197b0f66",
    measurementId: "G-DGQ623776S"
  };

firebase.initializeApp(firebaseConfig);


// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
window.auth = auth;
window.db = db;