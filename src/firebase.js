import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyB0_n-ymDCtKQS0uMb6TFzm_ZOOu6gHX3Y",
  authDomain: "seci-fam.firebaseapp.com",
  projectId: "seci-fam",
  storageBucket: "seci-fam.firebasestorage.app",
  messagingSenderId: "766088372819",
  appId: "1:766088372819:web:9d26bbddea31b5a8975ca6",
  measurementId: "G-JW3251DES5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();
