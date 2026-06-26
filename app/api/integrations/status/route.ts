import { NextResponse } from 'next/server';
import { getGoogleTokens } from '../../../../lib/server/googleTokenStore';
import { adminAuth } from '../../../../lib/firebase/admin';

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const googleIntegration = await getGoogleTokens(userId);

    const status = {
      google: googleIntegration ? {
        connected: googleIntegration.connected,
        calendarConnected: googleIntegration.calendarConnected,
        gmailConnected: googleIntegration.gmailConnected,
        scopes: googleIntegration.scopes,
        reconnectRequired: googleIntegration.reconnectRequired,
        lastSyncedAt: googleIntegration.updatedAt,
      } : { connected: false },
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error getting integrations status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
