import { google } from 'googleapis';
import { serverEnv } from './env';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.freebusy',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.readonly',
];

export function getGoogleOAuthClient() {
  if (!serverEnv.GOOGLE_CLIENT_ID || !serverEnv.GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth credentials not configured');
  }

  return new google.auth.OAuth2(
    serverEnv.GOOGLE_CLIENT_ID,
    serverEnv.GOOGLE_CLIENT_SECRET,
    serverEnv.GOOGLE_OAUTH_REDIRECT_URI
  );
}

export function getGoogleAuthUrl(state: string) {
  const oauth2Client = getGoogleOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Force consent to get refresh token
    scope: GOOGLE_SCOPES,
    state,
  });
}
