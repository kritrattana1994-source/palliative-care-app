import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';

// Firebase configuration (using Vite env vars)
// In local development, you should create a .env file
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCs7t8BDexv6jtgMx0cFOYvaSKV9MUiPuE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "palliative-care-app-9d6cf.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "palliative-care-app-9d6cf",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "palliative-care-app-9d6cf.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "196085240825",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:196085240825:web:9c2c53fa6683fc3b5ca328"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Helper for username login (appends dummy domain)
const USER_DOMAIN = '@palliative-rph.local';

export const loginWithUsername = async (username, password) => {
  const email = `${username}${USER_DOMAIN}`;
  return signInWithEmailAndPassword(auth, email, password);
};

export const createStaffUser = async (username, password) => {
    const email = `${username}${USER_DOMAIN}`;
    return createUserWithEmailAndPassword(auth, email, password);
}

export { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  getDoc,
  addDoc,
  serverTimestamp
};
