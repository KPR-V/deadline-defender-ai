import { NextResponse } from 'next/server';
import { getGoogleOAuthClient } from '../../../../../lib/server/googleOAuth';
import { storeGoogleTokens } from '../../../../../lib/server/googleTokenStore';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const popupScript = (success: boolean) => `
    <html>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', success: ${success} }, '*');
            window.close();
          } else {
            window.location.href = '/settings/integrations';
          }
        </script>
        <p>${success ? 'Authentication successful. You can close this window.' : 'Authentication failed. Please try again.'}</p>
      </body>
    </html>
  `;

  if (error || !code || !state) {
    return new NextResponse(popupScript(false), { headers: { 'Content-Type': 'text/html' } });
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get('google_oauth_state')?.value;
  const userId = cookieStore.get('google_oauth_uid')?.value;

  if (!savedState || state !== savedState || !userId) {
    console.error('Invalid state or missing userId');
    return new NextResponse(popupScript(false), { headers: { 'Content-Type': 'text/html' } });
  }

  try {
    const oauth2Client = getGoogleOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    
    // Determine which scopes were actually granted
    const grantedScopes = tokens.scope ? tokens.scope.split(' ') : [];
    
    await storeGoogleTokens(userId, tokens, grantedScopes);

    // Clear cookies
    cookieStore.delete('google_oauth_state');
    cookieStore.delete('google_oauth_uid');

    return new NextResponse(popupScript(true), { headers: { 'Content-Type': 'text/html' } });
  } catch (err) {
    console.error('Error exchanging code:', err);
    return new NextResponse(popupScript(false), { headers: { 'Content-Type': 'text/html' } });
  }
}
