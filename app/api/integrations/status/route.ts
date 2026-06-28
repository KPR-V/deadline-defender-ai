import { NextRequest, NextResponse } from 'next/server';
import { getGoogleTokens } from '../../../../lib/server/googleTokenStore';
import { verifyApiAuth } from '../../../../lib/firebase/apiAuth';

export async function GET(request: NextRequest) {
  try {
    const decodedToken = await verifyApiAuth(request);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
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
