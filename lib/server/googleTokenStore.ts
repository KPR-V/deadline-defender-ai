import { adminDb } from '../firebase/admin';

export interface GoogleIntegration {
  provider: 'google';
  connected: boolean;
  scopes: string[];
  accessToken: string;
  refreshToken?: string;
  expiryDate: number;
  calendarConnected: boolean;
  gmailConnected: boolean;
  createdAt: number;
  updatedAt: number;
  reconnectRequired?: boolean;
}

export async function storeGoogleTokens(userId: string, tokens: any, scopes: string[]) {
  const docRef = adminDb.collection('users').doc(userId).collection('integrations').doc('google');
  
  const calendarConnected = scopes.some(s => s.includes('calendar'));
  const gmailConnected = scopes.some(s => s.includes('gmail'));

  const data: Partial<GoogleIntegration> = {
    provider: 'google',
    connected: true,
    scopes,
    accessToken: tokens.access_token,
    calendarConnected,
    gmailConnected,
    updatedAt: Date.now(),
    reconnectRequired: false,
  };

  if (tokens.expiry_date) {
    data.expiryDate = tokens.expiry_date;
  }

  if (tokens.refresh_token) {
    data.refreshToken = tokens.refresh_token;
  }

  // Set createdAt if it doesn't exist
  await docRef.set({ createdAt: Date.now() }, { merge: true });
  await docRef.set(data, { merge: true });
}

export async function getGoogleTokens(userId: string): Promise<GoogleIntegration | null> {
  const doc = await adminDb.collection('users').doc(userId).collection('integrations').doc('google').get();
  if (!doc.exists) return null;
  return doc.data() as GoogleIntegration;
}

export async function deleteGoogleTokens(userId: string) {
  await adminDb.collection('users').doc(userId).collection('integrations').doc('google').delete();
}

export async function updateGoogleTokens(userId: string, updates: Partial<GoogleIntegration>) {
  await adminDb.collection('users').doc(userId).collection('integrations').doc('google').update({
    ...updates,
    updatedAt: Date.now()
  });
}

export async function markReconnectRequired(userId: string) {
  await adminDb.collection('users').doc(userId).collection('integrations').doc('google').update({
    reconnectRequired: true,
    connected: false,
    updatedAt: Date.now()
  });
}
