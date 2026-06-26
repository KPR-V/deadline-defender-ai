import { NextResponse } from 'next/server';
import { getGoogleAuthUrl } from '../../../../../lib/server/googleOAuth';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { adminAuth } from '../../../../../lib/firebase/admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idToken = searchParams.get('idToken');

  if (!idToken) {
    return NextResponse.json({ error: 'Missing idToken' }, { status: 401 });
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const state = crypto.randomBytes(32).toString('hex');
    const cookieStore = await cookies();
    
    cookieStore.set('google_oauth_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 60 * 10, // 10 minutes
    });

    cookieStore.set('google_oauth_uid', userId, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 60 * 10,
    });

    const authUrl = getGoogleAuthUrl(state);
    return NextResponse.json({ url: authUrl });
  } catch (error) {
    console.error('Error verifying ID token:', error);
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
