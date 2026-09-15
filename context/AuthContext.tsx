import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider as FirebaseGoogleAuthProvider,
  signOut,
} from 'firebase/auth';
import { auth, googleProvider } from '@/config/firebase';
import { Platform } from 'react-native';

// Only import native Google Sign-In on non-web platforms
let GoogleSignin: any = null;
if (Platform.OS !== 'web') {
  try {
    const gsi = require('@react-native-google-signin/google-signin');
    GoogleSignin = gsi.GoogleSignin;
  } catch (_) {
    // Package not available — will fall through to error in signInWithGoogle
  }
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithEmail: (e: string, p: string) => Promise<void>;
  signUpWithEmail: (e: string, p: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signInWithGoogle: async () => {},
  signOutUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Configure native Google Sign-In on app start
    if (Platform.OS !== 'web' && GoogleSignin) {
      try {
        GoogleSignin.configure({
          webClientId: '304847390966-6f5far1pc5ogu692ga1qvrnasdq24bpd.apps.googleusercontent.com',
        });
      } catch (err: any) {
        console.error('[AuthContext] GoogleSignin.configure ERROR:', err?.code, err?.message, err?.stack, err);
      }
    }

    console.log('[AuthContext] Subscribing to onAuthStateChanged with auth:', !!auth);
    let unsubscribe: () => void = () => {};
    try {
      unsubscribe = onAuthStateChanged(
        auth,
        (currentUser) => {
          console.log('[AuthContext] onAuthStateChanged updated user:', currentUser ? currentUser.uid : 'null');
          setUser(currentUser);
          setLoading(false);
        },
        (error: any) => {
          console.error('[AuthContext] onAuthStateChanged error callback:', error?.code, error?.message, error?.stack, error);
        }
      );
    } catch (err: any) {
      console.error('[AuthContext] onAuthStateChanged thrown exception:', err?.code, err?.message, err?.stack, err);
    }

    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    if (!email || typeof email !== 'string' || !email.trim()) {
      throw new Error('Please enter a valid email address.');
    }
    if (!pass || typeof pass !== 'string' || !pass.trim()) {
      throw new Error('Please enter a password.');
    }
    const cleanEmail = email.trim();
    console.log('[AuthContext] Calling signInWithEmailAndPassword - email:', JSON.stringify(cleanEmail), 'passLength:', pass.length, 'authReady:', !!auth);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, cleanEmail, pass);
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    if (!email || typeof email !== 'string' || !email.trim()) {
      throw new Error('Please enter a valid email address.');
    }
    if (!pass || typeof pass !== 'string' || !pass.trim()) {
      throw new Error('Please enter a password.');
    }
    const cleanEmail = email.trim();
    console.log('[AuthContext] Calling createUserWithEmailAndPassword - email:', JSON.stringify(cleanEmail), 'passLength:', pass.length, 'authReady:', !!auth);
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        // Web: use Firebase popup
        await signInWithPopup(auth, googleProvider);
      } else {
        // Native: use @react-native-google-signin then exchange for Firebase credential
        if (!GoogleSignin) {
          throw new Error('Google Sign-In is not configured for this platform.');
        }
        await GoogleSignin.hasPlayServices();
        const signInResult = await GoogleSignin.signIn();
        const idToken = signInResult?.data?.idToken;
        if (!idToken) {
          throw new Error('Google Sign-In failed: no ID token received.');
        }
        const credential = FirebaseGoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, credential);
      }
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    setLoading(true);
    try {
      // Also sign out of native Google Sign-In if applicable
      if (Platform.OS !== 'web' && GoogleSignin) {
        try {
          await GoogleSignin.signOut();
        } catch (_) {
          // Ignore — user may not have signed in with Google
        }
      }
      await signOut(auth);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
