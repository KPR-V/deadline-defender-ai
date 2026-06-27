import { Task, RiskLevel } from '../../types/task';
import { Reminder, ReminderType, ReminderIntensity } from '../../types/reminder';
import { UserProfile } from '../../types/user';

export function determineReminderIntensity(
  riskLevel: RiskLevel,
  userSetting: 'gentle' | 'normal' | 'aggressive' = 'normal'
): ReminderIntensity {
  if (riskLevel === 'safe') return 'gentle';
  if (riskLevel === 'warning') return userSetting === 'aggressive' ? 'normal' : 'gentle';
  if (riskLevel === 'danger') return userSetting === 'gentle' ? 'normal' : 'aggressive';
  if (riskLevel === 'critical') return 'aggressive';
  return 'normal';
}

function getHoursRemaining(deadline: any): number {
  const d = new Date(deadline).getTime();
  const now = Date.now();
  return Math.max(0, Math.round((d - now) / (1000 * 60 * 60)));
}

export function generateRiskChangeReminder(
  userId: string,
  task: Task,
  oldRiskLevel: RiskLevel,
  newRiskLevel: RiskLevel,
  userProfile: UserProfile
): Omit<Reminder, 'id' | 'createdAt'> | null {
  const riskWeights = { safe: 0, warning: 1, danger: 2, critical: 3 };
  if (riskWeights[newRiskLevel] <= riskWeights[oldRiskLevel]) return null;

  const intensity = determineReminderIntensity(newRiskLevel, userProfile.reminderIntensity);
  const hours = getHoursRemaining(task.deadline);
  const progress = Math.round(task.progressPercentage || 0);
  const reason = `Deadline in ${hours} hours and progress is ${progress}%. Risk escalated to ${newRiskLevel.toUpperCase()}.`;

  let type: ReminderType = 'planning';
  let message = '';
  let title = '';
  let suggestedAction: 'start_now' | 'snooze_15' | 'reduce_scope' | 'open_rescue' | undefined = undefined;

  switch (newRiskLevel) {
    case 'warning':
      type = 'planning';
      title = 'Task Risk Increasing';
      message = `"${task.title}" is showing signs of delay. Plan a focus block soon.`;
      suggestedAction = 'snooze_15';
      break;
    case 'danger':
      type = 'action';
      title = 'Danger Zone: Action Needed';
      message = `"${task.title}" requires immediate attention to protect your deadline.`;
      suggestedAction = 'start_now';
      break;
    case 'critical':
      type = 'rescue';
      title = 'CRITICAL: Deadline Imminent';
      message = `"${task.title}" is critical. Open Rescue Mode immediately to salvage the deadline.`;
      suggestedAction = 'open_rescue';
      break;
  }

  return {
    userId,
    taskId: task.id,
    title,
    message,
    type,
    intensity,
    status: 'unread',
    reason,
    suggestedAction
  };
}

export function generateMissedBlockReminder(
  userId: string,
  task: Task,
  userProfile: UserProfile
): Omit<Reminder, 'id' | 'createdAt'> {
  const intensity = determineReminderIntensity(task.riskLevel, userProfile.reminderIntensity);
  const hours = getHoursRemaining(task.deadline);
  const progress = Math.round(task.progressPercentage || 0);
  const reason = `Missed focus block while deadline is in ${hours} hours and progress is ${progress}%.`;

  return {
    userId,
    taskId: task.id,
    title: 'Focus Block Missed',
    message: `You missed a scheduled focus block for "${task.title}". Immediate action recommended.`,
    type: 'missed_block',
    intensity,
    status: 'unread',
    reason,
    suggestedAction: intensity === 'aggressive' ? 'start_now' : 'snooze_15'
  };
}

export function generateApproachingDeadlineReminder(
  userId: string,
  task: Task,
  userProfile: UserProfile
): Omit<Reminder, 'id' | 'createdAt'> {
  const intensity = determineReminderIntensity(task.riskLevel, userProfile.reminderIntensity);
  const hours = getHoursRemaining(task.deadline);
  const progress = Math.round(task.progressPercentage || 0);
  const reason = `Deadline in ${hours} hours and progress is ${progress}%.`;

  return {
    userId,
    taskId: task.id,
    title: 'Deadline Approaching',
    message: `The deadline for "${task.title}" is getting close.`,
    type: 'deadline_approaching',
    intensity,
    status: 'unread',
    reason,
    suggestedAction: task.riskLevel === 'critical' ? 'open_rescue' : 'start_now'
  };
}

export function evaluateTaskReminders(
  userId: string,
  task: Task,
  userProfile: UserProfile,
  hasMissedBlock: boolean = false
): Omit<Reminder, 'id' | 'createdAt'>[] {
  const reminders: Omit<Reminder, 'id' | 'createdAt'>[] = [];
  if (task.status === 'completed' || task.status === 'cancelled') return reminders;

  const hours = getHoursRemaining(task.deadline);
  const progress = Math.round(task.progressPercentage || 0);

  // Gentle reminder if gentle intensity and < 48h
  if (hours <= 48 && hours > 24 && progress < 50) {
    reminders.push(generateApproachingDeadlineReminder(userId, task, userProfile));
  }
  // Normal/Aggressive approaching reminder if <= 24h
  else if (hours <= 24 && progress < 80) {
    reminders.push(generateApproachingDeadlineReminder(userId, task, userProfile));
  }

  // Missed block
  if (hasMissedBlock) {
    reminders.push(generateMissedBlockReminder(userId, task, userProfile));
  }

  // Critical rescue state
  if (task.riskLevel === 'critical' || (hours <= 6 && progress < 50)) {
    const reason = `Deadline in ${hours} hours and progress is ${progress}%. Critical action required.`;
    reminders.push({
      userId,
      taskId: task.id,
      title: 'CRITICAL RESCUE STATE',
      message: `Immediate intervention required for "${task.title}".`,
      type: 'rescue',
      intensity: 'aggressive',
      status: 'unread',
      reason,
      suggestedAction: 'open_rescue'
    });
  }

  return reminders;
}
