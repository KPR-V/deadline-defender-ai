import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '../../../../lib/firebase/admin';
import { getFreeBusy } from '../../../../lib/server/googleCalendar';
import { suggestFocusBlocks } from '../../../../lib/calendar/schedulingEngine';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const { taskId } = await request.json();
    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }

    const taskDoc = await adminDb.collection('users').doc(userId).collection('tasks').doc(taskId).get();
    if (!taskDoc.exists) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    const task = { id: taskDoc.id, ...taskDoc.data() } as any;

    const profileDoc = await adminDb.collection('users').doc(userId).collection('profile').doc('settings').get();
    const settings = profileDoc.exists ? profileDoc.data() : {};

    // Get busy data from now to deadline
    const now = new Date();
    const deadline = new Date(task.deadline);
    
    if (now >= deadline) {
      return NextResponse.json({ suggestions: [], message: 'Task is already past deadline.' });
    }

    const timeMin = now.toISOString();
    const timeMax = deadline.toISOString();

    let busyBlocks;
    try {
      busyBlocks = await getFreeBusy(userId, timeMin, timeMax);
    } catch (e: any) {
      if (e.message === 'Google Calendar integration not connected') {
        return NextResponse.json({ error: 'connectRequired' }, { status: 403 });
      }
      throw e;
    }

    const bufferPercentage = settings?.defaultBufferPercentage || 0;
    
    const suggestions = suggestFocusBlocks(task, busyBlocks, bufferPercentage);

    // Calculate if we have a shortage
    const totalSuggestedDuration = suggestions.reduce((acc, s) => acc + s.duration, 0);
    const requiredMinutes = task.estimatedEffort + Math.ceil(task.estimatedEffort * (bufferPercentage / 100));

    let shortageInfo = null;
    if (totalSuggestedDuration < requiredMinutes) {
      shortageInfo = {
        availableMinutes: totalSuggestedDuration,
        requiredMinutes,
        shortageMinutes: requiredMinutes - totalSuggestedDuration,
        message: 'Not enough available time before deadline to fully complete this task.'
      };
    }

    // Save suggested focus blocks to Firestore
    const batch = adminDb.batch();
    const savedBlocks = [];
    
    for (const s of suggestions) {
      const blockRef = adminDb.collection('users').doc(userId).collection('tasks').doc(taskId).collection('focusBlocks').doc();
      const blockData = {
        start: s.startTime,
        end: s.endTime,
        durationMinutes: s.duration,
        status: 'suggested',
        reason: 'Auto-suggested based on available time and task deadline',
        createdAt: new Date().toISOString()
      };
      batch.set(blockRef, blockData);
      savedBlocks.push({ id: blockRef.id, ...blockData });
    }

    await batch.commit();

    return NextResponse.json({ suggestions: savedBlocks, shortageInfo });

  } catch (error: any) {
    console.error('Suggest focus blocks error:', error);
    return NextResponse.json({ error: 'Failed to suggest focus blocks' }, { status: 500 });
  }
}
