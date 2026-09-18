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
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const hasFirebaseConfig = !!firebaseConfig.apiKey;

if (!hasFirebaseConfig) {
  console.warn(
    'Firebase config is missing. Create a .env file with EXPO_PUBLIC_FIREBASE_* keys to enable sign-in.'
  );
}

// Initialize Firebase App only if config is present
const app = hasFirebaseConfig
  ? getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApp()
  : null;

// Initialize Auth with platform-appropriate persistence to prevent console warning
let authInstance: ReturnType<typeof getAuth> | null = null;
if (app) {
  try {
    if (Platform.OS === 'web') {
      authInstance = getAuth(app);
    } else {
      authInstance = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    }
  } catch (_err) {
    console.warn('Firebase auth failed to initialize:', _err);
    authInstance = null;
  }
}

export const auth = authInstance as ReturnType<typeof getAuth>;
export const googleProvider = new GoogleAuthProvider();
export const db = app ? getFirestore(app) : (null as any);

export default app;