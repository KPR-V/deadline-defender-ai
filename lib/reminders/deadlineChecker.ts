import { getTasks, getUserProfile, createReminder, getReminders } from '../firebase/firestore';
import { generateApproachingDeadlineReminder } from './reminderEngine';
import { Task } from '../../types/task';

// Prevents duplicate reminders by checking if we recently generated one for this task
export async function checkApproachingDeadlines(userId: string): Promise<void> {
  const profile = await getUserProfile(userId);
  if (!profile) return;

  const tasks = await getTasks(userId);
  const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');

  const existingReminders = await getReminders(userId);
  
  const now = new Date();
  
  for (const task of activeTasks) {
    const deadline = new Date(task.deadline);
    const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

    // If deadline is within 24 hours and progress is low (< 80%)
    if (hoursRemaining > 0 && hoursRemaining <= 24 && task.progressPercentage < 80) {
      // Check if we already sent a deadline_approaching reminder for this task
      const alreadySent = existingReminders.some(
        r => r.taskId === task.id && r.type === 'deadline_approaching'
      );
      
      if (!alreadySent) {
        const reminder = generateApproachingDeadlineReminder(userId, task, profile);
        await createReminder(userId, reminder);
      }
    }
  }
}
