import { google, calendar_v3 } from 'googleapis';
import { getGoogleTokens, updateGoogleTokens } from './googleTokenStore';

export async function getCalendarClient(userId: string): Promise<calendar_v3.Calendar> {
  const tokens = await getGoogleTokens(userId);
  if (!tokens || !tokens.accessToken) {
    throw new Error('Google Calendar integration not connected');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: tokens.expiryDate,
  });

  // Check if token is expired and refresh if necessary
  if (tokens.expiryDate && Date.now() >= tokens.expiryDate) {
    if (!tokens.refreshToken) {
      throw new Error('Google token expired and no refresh token available');
    }
    const { credentials } = await oauth2Client.refreshAccessToken();
    await updateGoogleTokens(userId, {
      accessToken: credentials.access_token!,
      expiryDate: credentials.expiry_date!,
    });
  }

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export async function getFreeBusy(
  userId: string,
  timeMin: string,
  timeMax: string,
  calendarIds: string[] = ['primary']
): Promise<{ start: string; end: string }[]> {
  const calendar = await getCalendarClient(userId);
  
  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      items: calendarIds.map(id => ({ id })),
    },
  });

  const busy: { start: string; end: string }[] = [];
  const calendars = response.data.calendars;
  
  if (calendars) {
    for (const calendarId of Object.keys(calendars)) {
      const calData = calendars[calendarId];
      if (calData.busy) {
        calData.busy.forEach((period) => {
          if (period.start && period.end) {
            busy.push({
              start: period.start,
              end: period.end,
            });
          }
        });
      }
    }
  }

  // Sort by start time
  busy.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return busy;
}

export async function createEvent(
  userId: string,
  eventDetails: {
    summary: string;
    description?: string;
    start: string;
    end: string;
  }
): Promise<calendar_v3.Schema$Event> {
  const calendar = await getCalendarClient(userId);
  
  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: eventDetails.summary,
      description: eventDetails.description,
      start: {
        dateTime: eventDetails.start,
      },
      end: {
        dateTime: eventDetails.end,
      },
    },
  });

  return response.data;
}
