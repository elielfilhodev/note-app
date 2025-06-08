// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAc66GqY8AwrtbMRPusVum5qFltYl7dVcs",
  authDomain: "notas-app-7096e.firebaseapp.com",
  projectId: "notas-app-7096e",
  storageBucket: "notas-app-7096e.firebasestorage.app",
  messagingSenderId: "741699943020",
  appId: "1:741699943020:web:ff23fc17a5a42f1fe03649"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const auth = firebase.auth();

// Export Firebase services
export { db, auth };