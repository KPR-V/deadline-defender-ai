/**
 * Format a Date object or timestamp into a readable deadline format
 * e.g., "Wednesday, Jun 24, 2026 @ 11:59 PM"
 */
export function formatDeadline(date: Date | string | number): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';
  
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Calculates remaining time in a highly readable emergency format:
 * e.g., "2h 15m remaining" or "3 days remaining" or "OVERDUE"
 */
export function formatTimeRemaining(deadline: Date | string | number, now: Date = new Date()): string {
  const d = new Date(deadline);
  const diffMs = d.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return 'OVERDUE';
  }
  
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return `${diffDays}d ${diffHours % 24}h remaining`;
  }
  
  if (diffHours > 0) {
    return `${diffHours}h ${diffMins % 60}m remaining`;
  }
  
  return `${diffMins}m ${diffSecs % 60}s remaining`;
}

/**
 * Helper to get ISO Date string at specified hours/minutes relative to today
 */
export function getRelativeTime(daysAhead: number, hour: number, minute: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  date.setHours(hour, minute, 0, 0);
  return date;
}
