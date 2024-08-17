// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCa4BMH2jw-1yFXZ3T8WhCl_OpTib1Rcq0",
  authDomain: "texas-mohini-app.firebaseapp.com",
  projectId: "texas-mohini-app",
  storageBucket: "texas-mohini-app.appspot.com",
  messagingSenderId: "1059494799010",
  appId: "1:1059494799010:web:bdc25af2afb7cef8f599fb",
  measurementId: "G-VBN36S0BDC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase Authentication and Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);