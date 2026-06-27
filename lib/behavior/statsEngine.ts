import { BehaviorSignal, TaskCategory } from "../../types/task";

export interface ProcrastinationStats {
  categoryDelays: Record<TaskCategory | "general", number>;
  completionTimeOfDay: {
    morning: number;
    afternoon: number;
    evening: number;
    night: number;
  };
  reminderResponseRate: number;
  focusBlockCompletionRate: number;
  rescueSuccessRate: number;
}

export function computeProcrastinationStats(
  signals: BehaviorSignal[],
): ProcrastinationStats {
  const stats: ProcrastinationStats = {
    categoryDelays: {
      assignment: 0,
      interview: 0,
      bill: 0,
      meeting: 0,
      project: 0,
      personal: 0,
      other: 0,
      general: 0,
    },
    completionTimeOfDay: {
      morning: 0,
      afternoon: 0,
      evening: 0,
      night: 0,
    },
    reminderResponseRate: 0,
    focusBlockCompletionRate: 0,
    rescueSuccessRate: 0,
  };

  let reminderIgnored = 0;
  let reminderActioned = 0;

  let blockMissed = 0;
  let blockCompleted = 0;

  let rescueStarted = 0;
  let rescueSuccess = 0;

  for (const sig of signals) {
    if (sig.type === "reminder_ignored") reminderIgnored++;
    if (sig.type === "reminder_actioned") reminderActioned++;

    if (sig.type === "focus_block_missed") blockMissed++;
    if (sig.type === "focus_block_completed") blockCompleted++;

    if (sig.type === "rescue_started") rescueStarted++;
    if (sig.type === "rescue_success") rescueSuccess++;

    if (sig.type === "task_completed" || sig.type === "rescue_success") {
      // time of day
      const date = sig.value?.completionTime
        ? new Date(sig.value.completionTime)
        : new Date(sig.createdAt);
      const hour = date.getHours();
      if (hour >= 5 && hour < 12) stats.completionTimeOfDay.morning++;
      else if (hour >= 12 && hour < 17) stats.completionTimeOfDay.afternoon++;
      else if (hour >= 17 && hour < 22) stats.completionTimeOfDay.evening++;
      else stats.completionTimeOfDay.night++;
    }

    if (sig.type === "deadline_missed" || sig.type === "task_delayed") {
      const cat = (sig.value?.category as TaskCategory) || "general";
      if (stats.categoryDelays[cat] !== undefined) {
        stats.categoryDelays[cat]++;
      }
    }
  }

  const totalReminders = reminderIgnored + reminderActioned;
  stats.reminderResponseRate =
    totalReminders > 0 ? (reminderActioned / totalReminders) * 100 : 0;

  const totalBlocks = blockMissed + blockCompleted;
  stats.focusBlockCompletionRate =
    totalBlocks > 0 ? (blockCompleted / totalBlocks) * 100 : 0;

  stats.rescueSuccessRate =
    rescueStarted > 0 ? (rescueSuccess / rescueStarted) * 100 : 0;

  return stats;
}
