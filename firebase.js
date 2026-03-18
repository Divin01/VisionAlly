import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyCT7fK5OgnivENrc8vSrzE-hKW6u1CpFZk",
  authDomain: "safelink-47b5b.firebaseapp.com",
  projectId: "safelink-47b5b",
  storageBucket: "safelink-47b5b.firebasestorage.app",
  messagingSenderId: "338925339129",
  appId: "1:338925339129:web:717eaf9915a97a8ed1bd28"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication with AsyncStorage persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Cloud Firestore
export const firestore = getFirestore(app);

export default app;