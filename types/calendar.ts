export interface BusyBlock {
  title: string;
  start: Date;
  end: Date;
}

export interface AvailableFocusBlock {
  start: Date;
  end: Date;
  durationMinutes: number;
  taskId: string;
  reason: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date | string;
  end: Date | string;
  description?: string;
  isBusy: boolean;
}
