import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';
import { serverEnv } from '../server/env';

function initAdminApp() {
  if (getApps().length === 0) {
    try {
      if (!serverEnv.FIREBASE_PRIVATE_KEY || serverEnv.FIREBASE_PRIVATE_KEY.length < 10) {
        throw new Error('Invalid or missing FIREBASE_PRIVATE_KEY');
      }
      initializeApp({
        credential: cert({
          projectId: serverEnv.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: serverEnv.FIREBASE_CLIENT_EMAIL,
          privateKey: serverEnv.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    } catch (error) {
      // Suppress noisy warnings during Next.js build phase when env keys are expected to be absent
      if (process.env.NEXT_PHASE !== 'phase-production-build') {
        console.warn('Firebase Admin Initialization skipped:', error instanceof Error ? error.message : error);
      }
      return null;
    }
  }
  return true;
}

// Use proxy with lazy initialization to avoid build-time errors and warnings on module load
export const adminDb = new Proxy({} as ReturnType<typeof getFirestore>, {
  get: (target, prop) => {
    if (prop === '__esModule' || prop === 'then' || typeof prop === 'symbol') return undefined;
    initAdminApp();
    if (getApps().length === 0) {
      return () => { throw new Error('Firebase Admin not initialized'); };
    }
    const instance = getFirestore(getApps()[0]);
    const val = (instance as any)[prop];
    return typeof val === 'function' ? val.bind(instance) : val;
  }
});

export const adminAuth = new Proxy({} as ReturnType<typeof getAuth>, {
  get: (target, prop) => {
    if (prop === '__esModule' || prop === 'then' || typeof prop === 'symbol') return undefined;
    initAdminApp();
    if (getApps().length === 0) {
      return () => { throw new Error('Firebase Admin not initialized'); };
    }
    const instance = getAuth();
    const val = (instance as any)[prop];
    return typeof val === 'function' ? val.bind(instance) : val;
  }
});

export const adminMessaging = new Proxy({} as ReturnType<typeof getMessaging>, {
  get: (target, prop) => {
    if (prop === '__esModule' || prop === 'then' || typeof prop === 'symbol') return undefined;
    initAdminApp();
    if (getApps().length === 0) {
      return () => { throw new Error('Firebase Admin not initialized'); };
    }
    const instance = getMessaging();
    const val = (instance as any)[prop];
    return typeof val === 'function' ? val.bind(instance) : val;
  }
});

