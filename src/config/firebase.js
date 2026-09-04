import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAlKWWlOcPyFQgYgN_Va2UKcF3_OnfZMlo",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "financial-tracker-de932.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "financial-tracker-de932",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "financial-tracker-de932.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "21916753373",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:21916753373:web:108dab00070affc2baaa34",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-70SW2KNR7S"
};

export const appId = typeof __app_id !== 'undefined' ? __app_id : 'financial-tracker-app';

let app;
let auth;
let db;
let googleProvider;

try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
} catch (e) {
  console.warn("Firebase initialization notice:", e);
}

export { app, auth, db, googleProvider };
