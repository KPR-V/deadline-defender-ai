import { BusyBlock } from '../../types/calendar';

export function getMockBusyBlocks(now: Date = new Date()): BusyBlock[] {
  const blocks: BusyBlock[] = [];
  
  // Let's create mock busy blocks for today and the next 7 days.
  for (let i = 0; i < 7; i++) {
    const day = new Date(now);
    day.setDate(now.getDate() + i);
    
    // Sleep blocks: 11 PM to 8 AM every day
    const sleepStart = new Date(day);
    sleepStart.setHours(23, 0, 0, 0);
    const sleepEnd = new Date(day);
    sleepEnd.setDate(day.getDate() + 1);
    sleepEnd.setHours(8, 0, 0, 0);
    blocks.push({
      title: 'Sleep & Recharge',
      start: sleepStart,
      end: sleepEnd
    });

    // Weekday specifics (Mon-Fri)
    const dayOfWeek = day.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Daily Standup: 9:30 AM to 10:00 AM
      const standupStart = new Date(day);
      standupStart.setHours(9, 30, 0, 0);
      const standupEnd = new Date(day);
      standupEnd.setHours(10, 0, 0, 0);
      blocks.push({ title: 'Daily Team Sync', start: standupStart, end: standupEnd });

      // Lunch Block: 12:00 PM to 1:00 PM
      const lunchStart = new Date(day);
      lunchStart.setHours(12, 0, 0, 0);
      const lunchEnd = new Date(day);
      lunchEnd.setHours(13, 0, 0, 0);
      blocks.push({ title: 'Lunch & Screen Break', start: lunchStart, end: lunchEnd });

      // Client / Class Meeting on specific days
      if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) { // Mon, Wed, Fri
        // Classes or work meeting: 2:00 PM to 3:30 PM
        const classStart = new Date(day);
        classStart.setHours(14, 0, 0, 0);
        const classEnd = new Date(day);
        classEnd.setHours(15, 30, 0, 0);
        blocks.push({ title: 'Deep Technical Lectures / Review', start: classStart, end: classEnd });
      }

      if (dayOfWeek === 2 || dayOfWeek === 4) { // Tue, Thu
        // Gym / Workout: 5:30 PM to 6:30 PM
        const gymStart = new Date(day);
        gymStart.setHours(17, 30, 0, 0);
        const gymEnd = new Date(day);
        gymEnd.setHours(18, 30, 0, 0);
        blocks.push({ title: 'Cardio & Strength Training', start: gymStart, end: gymEnd });
      }
    } else {
      // Weekend specifics (Sat, Sun)
      // Brunch with friends: 11:00 AM to 1:00 PM
      const brunchStart = new Date(day);
      brunchStart.setHours(11, 0, 0, 0);
      const brunchEnd = new Date(day);
      brunchEnd.setHours(13, 0, 0, 0);
      blocks.push({ title: 'Weekend Social Brunch', start: brunchStart, end: brunchEnd });

      // Evening relaxation: 7:00 PM to 9:00 PM
      const relaxStart = new Date(day);
      relaxStart.setHours(19, 0, 0, 0);
      const relaxEnd = new Date(day);
      relaxEnd.setHours(21, 0, 0, 0);
      blocks.push({ title: 'Dinner & Movie Night', start: relaxStart, end: relaxEnd });
    }
  }

  return blocks;
}
