export interface UserWorkHours {
  start: string; // e.g. "09:00"
  end: string;   // e.g. "22:00"
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  timezone: string;
  workHours: UserWorkHours;
  preferredFocusBlockMinutes: number;
  reminderIntensity: 'gentle' | 'normal' | 'aggressive';
  productivityStyle: 'morning' | 'afternoon' | 'night' | 'flexible';
  defaultBufferPercentage: number;
  createdAt: Date | any;
  updatedAt: Date | any;
}
