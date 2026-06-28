import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';
import { serverEnv } from '../server/env';

function getAppInstance() {
  if (getApps().length > 0) {
    return getApps()[0];
  }
  try {
    if (!serverEnv.FIREBASE_PRIVATE_KEY || serverEnv.FIREBASE_PRIVATE_KEY.length < 10) {
      throw new Error('Invalid or missing FIREBASE_PRIVATE_KEY');
    }
    const formattedKey = serverEnv.FIREBASE_PRIVATE_KEY
      .replace(/\\n/g, '\n')
      .replace(/\r/g, '')
      .trim();

    return initializeApp({
      credential: cert({
        projectId: serverEnv.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: serverEnv.FIREBASE_CLIENT_EMAIL,
        privateKey: formattedKey,
      }),
    });
  } catch (error) {
    if (process.env.NEXT_PHASE !== 'phase-production-build') {
      console.warn('Firebase Admin Initialization error:', error instanceof Error ? error.message : error);
    }
    throw error;
  }
}

// Export clean plain-object wrappers that lazily acquire the Firebase App instance when invoked.
// Avoiding JS Proxy prevents Vercel serverless bundling and runtime inspection from triggering crashes.
export const adminDb = {
  collection: (path: string) => getFirestore(getAppInstance()).collection(path),
  doc: (path: string) => getFirestore(getAppInstance()).doc(path),
  batch: () => getFirestore(getAppInstance()).batch(),
  runTransaction: (updateFunction: any, transactionOptions?: any) =>
    getFirestore(getAppInstance()).runTransaction(updateFunction, transactionOptions),
} as unknown as ReturnType<typeof getFirestore>;

export const adminAuth = {
  verifyIdToken: (token: string, checkRevoked?: boolean) =>
    getAuth(getAppInstance()).verifyIdToken(token, checkRevoked),
  getUser: (uid: string) => getAuth(getAppInstance()).getUser(uid),
  createCustomToken: (uid: string, developerClaims?: object) =>
    getAuth(getAppInstance()).createCustomToken(uid, developerClaims),
} as unknown as ReturnType<typeof getAuth>;

export const adminMessaging = {
  send: (message: any, dryRun?: boolean) =>
    getMessaging(getAppInstance()).send(message, dryRun),
  sendEachForMulticast: (message: any, dryRun?: boolean) =>
    getMessaging(getAppInstance()).sendEachForMulticast(message, dryRun),
} as unknown as ReturnType<typeof getMessaging>;

