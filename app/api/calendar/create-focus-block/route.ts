import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '../../../../lib/firebase/admin';
import { createEvent } from '../../../../lib/server/googleCalendar';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const { taskId, focusBlockId } = await request.json();

    if (!taskId || !focusBlockId) {
      return NextResponse.json({ error: 'taskId and focusBlockId are required' }, { status: 400 });
    }

    const taskDoc = await adminDb.collection('users').doc(userId).collection('tasks').doc(taskId).get();
    if (!taskDoc.exists) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    const task = taskDoc.data() as any;

    const blockRef = adminDb.collection('users').doc(userId).collection('tasks').doc(taskId).collection('focusBlocks').doc(focusBlockId);
    const blockDoc = await blockRef.get();
    if (!blockDoc.exists) {
      return NextResponse.json({ error: 'Focus block not found' }, { status: 404 });
    }
    const block = blockDoc.data() as any;

    if (block.status === 'accepted') {
      return NextResponse.json({ error: 'Focus block is already accepted' }, { status: 400 });
    }

    const eventDetails = {
      summary: `Focus: ${task.title}`,
      description: `Created by Deadline Defender AI.
Task: ${task.title}
Risk: ${task.riskScore}/100
First action: ${task.firstUsefulAction || 'None specified'}`,
      start: block.start,
      end: block.end,
    };

    let calendarEvent;
    try {
      calendarEvent = await createEvent(userId, eventDetails);
    } catch (e: any) {
      if (e.message === 'Google Calendar integration not connected') {
        return NextResponse.json({ error: 'connectRequired' }, { status: 403 });
      }
      throw e;
    }

    await blockRef.update({
      status: 'accepted',
      googleCalendarEventId: calendarEvent.id,
      googleCalendarEventLink: calendarEvent.htmlLink,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true, eventId: calendarEvent.id, eventLink: calendarEvent.htmlLink });

  } catch (error: any) {
    console.error('Create focus block error:', error);
    return NextResponse.json({ error: 'Failed to create focus block event' }, { status: 500 });
  }
}
