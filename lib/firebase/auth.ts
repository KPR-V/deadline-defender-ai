import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously,
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from './client';
import { createUserProfile, getUserProfile } from './firestore';
import { UserProfile } from '../../types/user';

export async function loginWithEmail(email: string, password: string): Promise<FirebaseUser> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function loginWithGoogle(): Promise<FirebaseUser> {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  
  // Create profile if new
  try {
    const profile = await getUserProfile(credential.user.uid);
    if (!profile) {
      await createUserProfile(credential.user.uid, {
        displayName: credential.user.displayName || '',
        email: credential.user.email || '',
      });
    }
  } catch (err) {
    console.error('Failed to create/fetch profile on Google login:', err);
  }
  
  return credential.user;
}

export async function signupWithEmail(email: string, displayName: string, password: string): Promise<FirebaseUser> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  
  await updateProfile(credential.user, { displayName });
  
  // Create user profile in firestore
  try {
    await createUserProfile(credential.user.uid, {
      displayName,
      email,
    });
  } catch (err) {
    console.error('Failed to create user profile in firestore:', err);
  }

  return credential.user;
}

// loginDemoAnonymously was removed. We use local storage logic via setDemoUser.

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

// Custom React Auth Listener Hook / Helper that merges Firebase + Demo Mode
export function subscribeToAuth(
  onStateChange: (user: { uid: string; email: string | null; displayName: string | null; isDemo: boolean; getIdToken: () => Promise<string> } | null) => void
) {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      onStateChange({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        isDemo: firebaseUser.isAnonymous,
        getIdToken: () => firebaseUser.getIdToken()
      });
    } else {
      onStateChange(null);
    }
  });
}
