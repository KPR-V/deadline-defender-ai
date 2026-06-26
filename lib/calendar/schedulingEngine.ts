import { Task, FocusBlock } from '../../types/task';

export interface FreeBusyBlock {
  start: string;
  end: string;
}

export interface FocusBlockSuggestion {
  startTime: string;
  endTime: string;
  duration: number;
}

export interface CalculatedFocusBlock {
  start: string;
  end: string;
  durationMinutes: number;
  reason: string;
}

export function suggestFocusBlocks(
  task: Task,
  busyBlocks: FreeBusyBlock[],
  userBufferPercentage: number = 0,
  workHoursStart: number = 9,
  workHoursEnd: number = 17
): FocusBlockSuggestion[] {
  const now = new Date();
  const deadline = new Date(task.deadline);
  
  if (now >= deadline) {
    return [];
  }

  const requiredMinutes = task.estimatedMinutes || 60;
  const bufferMinutes = Math.ceil(requiredMinutes * (userBufferPercentage / 100));
  const totalRequiredMinutes = requiredMinutes + bufferMinutes;

  let allocatedMinutes = 0;
  const suggestions: FocusBlockSuggestion[] = [];

  let currentTime = new Date(now);
  const maxBlockDuration = 90;

  while (currentTime < deadline && allocatedMinutes < totalRequiredMinutes) {
    if (currentTime.getHours() < workHoursStart) {
      currentTime.setHours(workHoursStart, 0, 0, 0);
    }
    if (currentTime.getHours() >= workHoursEnd) {
      currentTime.setDate(currentTime.getDate() + 1);
      currentTime.setHours(workHoursStart, 0, 0, 0);
      continue;
    }

    let blockStart = new Date(currentTime);
    let blockEnd = new Date(blockStart.getTime() + maxBlockDuration * 60000);

    if (blockEnd > deadline) {
      blockEnd = new Date(deadline);
    }
    
    const endOfDay = new Date(blockStart);
    endOfDay.setHours(workHoursEnd, 0, 0, 0);
    if (blockEnd > endOfDay) {
      blockEnd = endOfDay;
    }

    let duration = (blockEnd.getTime() - blockStart.getTime()) / 60000;
    
    if (duration < 15) {
      currentTime = new Date(blockEnd);
      continue;
    }

    let isBusy = false;
    for (const busy of busyBlocks) {
      const busyStart = new Date(busy.start);
      const busyEnd = new Date(busy.end);
      
      if (blockStart < busyEnd && blockEnd > busyStart) {
        isBusy = true;
        currentTime = new Date(Math.max(currentTime.getTime(), busyEnd.getTime()));
        break;
      }
    }

    if (!isBusy) {
      const neededMinutes = totalRequiredMinutes - allocatedMinutes;
      if (duration > neededMinutes) {
        duration = neededMinutes;
        blockEnd = new Date(blockStart.getTime() + duration * 60000);
      }

      suggestions.push({
        startTime: blockStart.toISOString(),
        endTime: blockEnd.toISOString(),
        duration,
      });

      allocatedMinutes += duration;
      currentTime = new Date(blockEnd.getTime() + 15 * 60000);
    }
  }

  return suggestions;
}

export function findAvailableFocusBlocks(
  deadline: Date,
  estimatedMinutes: number,
  busyBlocks: { start: string | Date; end: string | Date }[] = [],
  now: Date = new Date(),
  preferredDuration: number = 45,
  isHighRisk: boolean = false
): CalculatedFocusBlock[] {
  if (now >= deadline || estimatedMinutes <= 0) return [];

  const results: CalculatedFocusBlock[] = [];
  let allocated = 0;
  let curr = new Date(now);

  const parsedBusy = busyBlocks.map(b => ({
    start: new Date(b.start),
    end: new Date(b.end)
  }));

  while (curr < deadline && allocated < estimatedMinutes) {
    if (curr.getHours() < 9) {
      curr.setHours(9, 0, 0, 0);
    }
    if (curr.getHours() >= 17) {
      curr.setDate(curr.getDate() + 1);
      curr.setHours(9, 0, 0, 0);
      continue;
    }

    const duration = Math.min(preferredDuration, estimatedMinutes - allocated);
    let blockEnd = new Date(curr.getTime() + duration * 60000);
    if (blockEnd > deadline) blockEnd = new Date(deadline);

    const endOfDay = new Date(curr);
    endOfDay.setHours(17, 0, 0, 0);
    if (blockEnd > endOfDay) blockEnd = endOfDay;

    const actualDuration = Math.round((blockEnd.getTime() - curr.getTime()) / 60000);
    if (actualDuration < 15) {
      curr = new Date(blockEnd);
      continue;
    }

    let isBusy = false;
    for (const b of parsedBusy) {
      if (curr < b.end && blockEnd > b.start) {
        isBusy = true;
        curr = new Date(Math.max(curr.getTime(), b.end.getTime()));
        break;
      }
    }

    if (!isBusy) {
      results.push({
        start: curr.toISOString(),
        end: blockEnd.toISOString(),
        durationMinutes: actualDuration,
        reason: isHighRisk ? 'High risk priority block' : 'Scheduled focus session'
      });
      allocated += actualDuration;
      curr = new Date(blockEnd.getTime() + 15 * 60000);
    }
  }

  return results;
}
