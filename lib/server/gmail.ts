import { google, gmail_v1 } from 'googleapis';
import { getGoogleTokens, updateGoogleTokens } from './googleTokenStore';

export interface GmailMessageSummary {
  messageId: string;
  threadId: string;
  sender: string;
  subject: string;
  date: string;
  snippet: string;
  labels: string[];
}

export interface GmailMessageFull extends GmailMessageSummary {
  body: string;
}

export async function getGmailClient(userId: string): Promise<gmail_v1.Gmail> {
  const tokens = await getGoogleTokens(userId);
  if (!tokens || !tokens.accessToken || !tokens.connected) {
    throw new Error('Gmail integration not connected');
  }

  const hasGmailScope = tokens.gmailConnected || (tokens.scopes && tokens.scopes.some(s => s.includes('gmail')));
  if (!hasGmailScope) {
    throw new Error('Gmail integration not connected');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || process.env.GOOGLE_OAUTH_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: tokens.expiryDate,
  });

  if (tokens.expiryDate && Date.now() >= tokens.expiryDate) {
    if (!tokens.refreshToken) {
      throw new Error('Google token expired and no refresh token available');
    }
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      await updateGoogleTokens(userId, {
        accessToken: credentials.access_token!,
        expiryDate: credentials.expiry_date || (Date.now() + 3600 * 1000),
      });
    } catch (err) {
      console.error('Failed to refresh Gmail token:', err);
      throw new Error('Gmail integration not connected');
    }
  }

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

export async function listRecentMessages(
  userId: string,
  query = 'newer_than:30d',
  maxResults = 10
): Promise<GmailMessageSummary[]> {
  const gmail = await getGmailClient(userId);

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults,
  });

  const messages = listRes.data.messages || [];
  if (messages.length === 0) {
    return [];
  }

  const results = await Promise.all(
    messages.map(async (msg) => {
      if (!msg.id) return null;
      try {
        const detailRes = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date'],
        });

        const data = detailRes.data;
        const headers = data.payload?.headers || [];
        const getHeader = (name: string) => {
          const h = headers.find((item) => item.name?.toLowerCase() === name.toLowerCase());
          return h ? h.value || '' : '';
        };

        return {
          messageId: data.id || msg.id,
          threadId: data.threadId || '',
          sender: getHeader('From') || 'Unknown Sender',
          subject: getHeader('Subject') || 'No Subject',
          date: getHeader('Date') || new Date().toISOString(),
          snippet: data.snippet || '',
          labels: data.labelIds || [],
        } as GmailMessageSummary;
      } catch (err) {
        console.error(`Failed to fetch metadata for message ${msg.id}:`, err);
        return null;
      }
    })
  );

  return results.filter((item): item is GmailMessageSummary => item !== null);
}

function extractPlainText(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return '';
  if (payload.body && payload.body.data) {
    const decoded = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    if (payload.mimeType === 'text/html') {
      return decoded.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    }
    return decoded.trim();
  }
  if (payload.parts && Array.isArray(payload.parts)) {
    const plainPart = payload.parts.find((p) => p.mimeType === 'text/plain');
    if (plainPart) {
      return extractPlainText(plainPart);
    }
    const htmlPart = payload.parts.find((p) => p.mimeType === 'text/html');
    if (htmlPart) {
      return extractPlainText(htmlPart);
    }
    for (const part of payload.parts) {
      const result = extractPlainText(part);
      if (result) return result;
    }
  }
  return '';
}

export async function getMessage(userId: string, messageId: string): Promise<GmailMessageFull> {
  const gmail = await getGmailClient(userId);

  const res = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  const data = res.data;
  const headers = data.payload?.headers || [];
  const getHeader = (name: string) => {
    const h = headers.find((item) => item.name?.toLowerCase() === name.toLowerCase());
    return h ? h.value || '' : '';
  };

  const body = extractPlainText(data.payload);

  return {
    messageId: data.id || messageId,
    threadId: data.threadId || '',
    sender: getHeader('From') || 'Unknown Sender',
    subject: getHeader('Subject') || 'No Subject',
    date: getHeader('Date') || new Date().toISOString(),
    snippet: data.snippet || '',
    labels: data.labelIds || [],
    body: body || data.snippet || '',
  };
}
