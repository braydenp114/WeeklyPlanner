import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import {
  initializeAuth,
  getAuth,
  GoogleAuthProvider,
  browserLocalPersistence,
  // @ts-ignore
  getReactNativePersistence,
} from 'firebase/auth';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Firebase Configuration
 * Environment variables can be configured in a .env file or Expo environment settings.
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

console.log('[firebase.ts] Initializing Firebase with config keys:', {
  hasApiKey: !!firebaseConfig.apiKey,
  hasAuthDomain: !!firebaseConfig.authDomain,
  hasProjectId: !!firebaseConfig.projectId,
  platform: Platform.OS,
});

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with platform-appropriate configuration
let authInstance;
try {
  if (Platform.OS === 'web') {
    // getAuth auto-includes the popup/redirect resolver on web
    authInstance = getAuth(app);
    console.log('[firebase.ts] getAuth (web) succeeded');
  } else {
    // Native platforms require manual persistence config
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
    console.log('[firebase.ts] initializeAuth (native) succeeded');
  }
} catch (err: any) {
  console.log('[firebase.ts] Auth initialization threw error (falling back to getAuth):', err?.code, err?.message, err);
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

export default app;
