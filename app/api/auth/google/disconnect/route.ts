import { NextResponse } from 'next/server';
import { deleteGoogleTokens, getGoogleTokens } from '../../../../../lib/server/googleTokenStore';
import { adminAuth } from '../../../../../lib/firebase/admin';
import { getGoogleOAuthClient } from '../../../../../lib/server/googleOAuth';

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const tokens = await getGoogleTokens(userId);
    if (tokens?.accessToken) {
      const oauth2Client = getGoogleOAuthClient();
      try {
        await oauth2Client.revokeToken(tokens.accessToken);
      } catch (err) {
        console.error('Failed to revoke Google token:', err);
        // Continue to delete from our store anyway
      }
    }

    await deleteGoogleTokens(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Google:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
