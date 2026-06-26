import axios from 'axios';
import { BusyBlock } from '../../types/calendar';
import { isDemoMode } from '../env';

export async function fetchGoogleFreeBusy(accessToken: string, timeMin: Date, timeMax: Date): Promise<BusyBlock[]> {
  const response = await axios.post(
    'https://www.googleapis.com/calendar/v3/freeBusy',
    {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: 'primary' }]
    },
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const data = response.data;
  const busyPeriods = data.calendars?.primary?.busy || [];

  return busyPeriods.map((period: any) => ({
    title: 'Busy',
    start: new Date(period.start),
    end: new Date(period.end)
  }));
}

export async function createGoogleCalendarEvent(accessToken: string, title: string, start: Date, end: Date): Promise<void> {
  await axios.post(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      summary: title,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() }
    },
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
}

export async function getBusyBlocks(googleAccessToken: string | null, timeMin: Date, timeMax: Date): Promise<BusyBlock[]> {
  if (googleAccessToken) {
    try {
      return await fetchGoogleFreeBusy(googleAccessToken, timeMin, timeMax);
    } catch (err) {
      console.warn('Failed to fetch real calendar.', err);
      if (isDemoMode()) {
        const { getMockBusyBlocks } = await import('../demo/mockCalendarService');
        return getMockBusyBlocks(timeMin);
      }
      throw new Error('Failed to fetch calendar data. Please reconnect your Google Calendar.');
    }
  }
  
  if (isDemoMode()) {
    const { getMockBusyBlocks } = await import('../demo/mockCalendarService');
    return getMockBusyBlocks(timeMin);
  }
  
  return [];
}
