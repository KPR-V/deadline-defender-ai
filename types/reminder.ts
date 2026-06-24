export type ReminderIntensity = 'gentle' | 'normal' | 'aggressive';
export type ReminderStatus = 'unread' | 'read' | 'actioned' | 'dismissed';
export type ReminderType = 'planning' | 'action' | 'rescue' | 'missed_block' | 'deadline_approaching';

export interface Reminder {
  id: string;
  userId: string;
  taskId?: string; // Optional if reminder is general
  title: string;
  message: string;
  type: ReminderType;
  intensity: ReminderIntensity;
  status: ReminderStatus;
  reason?: string;
  suggestedAction?: 'start_now' | 'snooze_15' | 'reduce_scope' | 'open_rescue';
  createdAt: any;
  readAt?: any;
}
