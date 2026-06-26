import { NextResponse } from 'next/server';
import { getFreeBusy } from '../../../../lib/server/googleCalendar';
import { adminAuth } from '../../../../lib/firebase/admin';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const { timeMin, timeMax, calendarIds } = await request.json();

    if (!timeMin || !timeMax) {
      return NextResponse.json({ error: 'timeMin and timeMax are required' }, { status: 400 });
    }

    const busy = await getFreeBusy(userId, timeMin, timeMax, calendarIds);

    return NextResponse.json({ busy });
  } catch (error: any) {
    console.error('Freebusy error:', error);
    if (error.message === 'Google Calendar integration not connected') {
      return NextResponse.json({ error: 'connectRequired' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch free/busy data' }, { status: 500 });
  }
}
