'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { subscribeToAuth, logoutUser } from './auth';
import { getAuth, GoogleAuthProvider, linkWithPopup, signInWithPopup } from 'firebase/auth';

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  isDemo: boolean;
  getIdToken: () => Promise<string>;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  signInDemo: () => Promise<void>;
  googleAccessToken: string | null;
  connectGoogleCalendar: () => Promise<void>;
  gmailAccessToken: string | null;
  connectGmail: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  signInDemo: async () => {},
  googleAccessToken: null,
  connectGoogleCalendar: async () => {},
  gmailAccessToken: null,
  connectGmail: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [gmailAccessToken, setGmailAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setGoogleAccessToken(null);
        setGmailAccessToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    setLoading(true);
    await logoutUser();
    setUser(null);
    setGoogleAccessToken(null);
    setGmailAccessToken(null);
    setLoading(false);
  };

  const signInDemo = async () => {
    setLoading(true);
    try {
      const { signInAnonymously, updateProfile } = await import('firebase/auth');
      const { auth } = await import('./client');
      const { createUserProfile } = await import('./firestore');
      const { seedDemoData } = await import('../demo/demoSeeder');

      const credential = await signInAnonymously(auth);
      await updateProfile(credential.user, { displayName: 'Tactical Commander (Demo)' });
      
      // Create user profile
      try {
        await createUserProfile(credential.user.uid, {
          displayName: 'Tactical Commander (Demo)',
          email: 'demo@deadline.defender'
        });
        // Seed initial demo data
        await seedDemoData(credential.user.uid);
      } catch (err) {
        console.error('Demo seeding failed:', err);
      }
    } catch (err) {
      console.error('Demo sign in failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const connectGoogleCalendar = async () => {
    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar.events');
      provider.addScope('https://www.googleapis.com/auth/calendar.freebusy');

      if (user?.isDemo) {
        alert('Cannot connect real Google Calendar in Demo Mode. Please sign in with a real account.');
        return;
      }

      if (!auth.currentUser) {
        // Sign in with Google if not authenticated
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          setGoogleAccessToken(credential.accessToken);
        }
      } else {
        // Try linking to existing account
        try {
          const result = await linkWithPopup(auth.currentUser, provider);
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential?.accessToken) {
            setGoogleAccessToken(credential.accessToken);
          }
        } catch (err: any) {
          if (err.code === 'auth/credential-already-in-use') {
            // Already linked to another account? Or maybe we can just sign in
            const result = await signInWithPopup(auth, provider);
            const credential = GoogleAuthProvider.credentialFromResult(result);
            if (credential?.accessToken) {
              setGoogleAccessToken(credential.accessToken);
            }
          } else if (err.code === 'auth/provider-already-linked') {
             // We just need the token, let's force sign in again to get fresh token
            const result = await signInWithPopup(auth, provider);
            const credential = GoogleAuthProvider.credentialFromResult(result);
            if (credential?.accessToken) {
              setGoogleAccessToken(credential.accessToken);
            }
          } else {
            throw err;
          }
        }
      }
    } catch (error) {
      console.error('Failed to connect Google Calendar:', error);
      throw error;
    }
  };

  const connectGmail = async () => {
    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/gmail.readonly');

      if (user?.isDemo) {
        alert('Cannot connect real Gmail in Demo Mode. Please sign in with a real account.');
        return;
      }

      if (!auth.currentUser) {
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          setGmailAccessToken(credential.accessToken);
        }
      } else {
        try {
          const result = await linkWithPopup(auth.currentUser, provider);
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential?.accessToken) {
            setGmailAccessToken(credential.accessToken);
          }
        } catch (err: any) {
          if (err.code === 'auth/credential-already-in-use' || err.code === 'auth/provider-already-linked') {
            const result = await signInWithPopup(auth, provider);
            const credential = GoogleAuthProvider.credentialFromResult(result);
            if (credential?.accessToken) {
              setGmailAccessToken(credential.accessToken);
            }
          } else {
            throw err;
          }
        }
      }
    } catch (error) {
      console.error('Failed to connect Gmail:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, signInDemo, googleAccessToken, connectGoogleCalendar, gmailAccessToken, connectGmail }}>
      {children}
    </AuthContext.Provider>
  );
}
