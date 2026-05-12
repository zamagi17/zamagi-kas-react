import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBy_VQdEmpjpB9OqUuN4EEFtiF2wVGAkKA",
  authDomain: "zonakas.firebaseapp.com",
  projectId: "zonakas",
  storageBucket: "zonakas.firebasestorage.app",
  messagingSenderId: "864876991435",
  appId: "1:864876991435:web:38ac49231c62ccca055c4e",
  measurementId: "G-CCEDPYXCF4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);
export default app;
