// Import the functions you need from the SDKs you need
import { getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCKN3cXtE2n31gqORVO7hSEQQA_32v117Q",
  authDomain: "sudhar-app-6392d.firebaseapp.com",
  projectId: "sudhar-app-6392d",
  storageBucket: "sudhar-app-6392d.firebasestorage.app",
  messagingSenderId: "384113607186",
  appId: "1:384113607186:web:7501db7d239f592f3ececb",
  measurementId: "G-EN5LBTT9DR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = Platform.OS !== 'web' ? null : getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { analytics, app, auth, db, storage };

