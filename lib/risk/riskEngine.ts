import { Task, RiskLevel } from '../../types/task';
import { RiskCalculationResult, RiskFactors } from '../../types/risk';

export function calculateRisk(
  task: Partial<Task>,
  now: Date = new Date(),
  ignoredRemindersCount: number = 1,
  workHours: { start: string; end: string } = { start: '09:00', end: '22:00' },
  behaviorStats?: any
): RiskCalculationResult {
  const deadlineDate = task.deadline instanceof Date 
    ? task.deadline 
    : (task.deadline?.toDate ? task.deadline.toDate() : new Date(task.deadline));

  const msRemaining = deadlineDate.getTime() - now.getTime();
  const hoursRemaining = msRemaining / (1000 * 60 * 60);
  const minutesRemaining = Math.max(0, msRemaining / (1000 * 60));

  let estimatedMinutes = task.estimatedMinutes || 60;
  
  // Phase 6: Apply Procrastination Pattern Buffer
  // If user delays this category heavily, we implicitly increase the estimated time risk
  if (behaviorStats?.categoryDelays) {
    const categoryName = task.category || 'general';
    const delays = behaviorStats.categoryDelays[categoryName] || 0;
    // Add 15% effort buffer for each delay in this category, up to +60% max
    const bufferMultiplier = 1 + Math.min(delays * 0.15, 0.60);
    estimatedMinutes = estimatedMinutes * bufferMultiplier;
  }

  // 1. Urgency Score
  let urgencyScore = 10;
  if (msRemaining <= 0) {
    urgencyScore = 100;
  } else if (hoursRemaining < 2) {
    urgencyScore = 95;
  } else if (hoursRemaining < 6) {
    urgencyScore = 85;
  } else if (hoursRemaining < 12) {
    urgencyScore = 75;
  } else if (hoursRemaining < 24) {
    urgencyScore = 65;
  } else if (hoursRemaining < 72) { // 3 days
    urgencyScore = 45;
  } else if (hoursRemaining < 168) { // 7 days
    urgencyScore = 25;
  } else {
    urgencyScore = 10;
  }

  // 2. Importance Score
  let importanceScore = 20;
  switch (task.importance) {
    case 'low':
      importanceScore = 20;
      break;
    case 'medium':
      importanceScore = 50;
      break;
    case 'high':
      importanceScore = 75;
      break;
    case 'critical':
      importanceScore = 100;
      break;
  }

  // 3. Effort Gap Score
  // Calculate available work hours between now and deadline.
  // Simple robust approximation: total remaining hours * ratio of work hours to 24.
  // Parse work hours e.g., "09:00" to "22:00"
  let workStartHour = 9;
  let workEndHour = 22;
  try {
    if (workHours?.start) workStartHour = parseInt(workHours.start.split(':')[0], 10);
    if (workHours?.end) workEndHour = parseInt(workHours.end.split(':')[0], 10);
  } catch (e) {
    // fallback
  }
  const dailyWorkHours = Math.max(4, workEndHour - workStartHour);
  const workRatio = dailyWorkHours / 24;
  
  // Available productive/free minutes approximation:
  const availableFreeMinutes = Math.max(0, minutesRemaining * workRatio);

  let effortGapScore = 20;
  if (availableFreeMinutes <= 0) {
    effortGapScore = 100;
  } else if (estimatedMinutes > availableFreeMinutes) {
    effortGapScore = 90;
  } else if (estimatedMinutes > availableFreeMinutes * 0.75) {
    effortGapScore = 70;
  } else if (estimatedMinutes > availableFreeMinutes * 0.50) {
    effortGapScore = 45;
  } else {
    effortGapScore = 20;
  }

  // 4. Dependency Score
  const depCount = task.dependencies ? task.dependencies.length : 0;
  let dependencyScore = 10;
  if (depCount === 0) {
    dependencyScore = 10;
  } else if (depCount === 1) {
    dependencyScore = 30;
  } else if (depCount === 2) {
    dependencyScore = 50;
  } else {
    dependencyScore = 80;
  }

  // 5. Progress Score
  const progress = task.progressPercentage ?? 0;
  let progressScore = 70;
  if (task.status === 'completed' || progress >= 100) {
    progressScore = 0;
  } else if (progress >= 80) {
    progressScore = 10;
  } else if (progress >= 50) {
    progressScore = 35;
  } else if (progress >= 25) {
    progressScore = 60;
  } else if (progress < 25 && hoursRemaining < 24) {
    progressScore = 90;
  } else {
    progressScore = 70;
  }

  // 6. Ignored Reminder Score
  const ignoredReminderScore = Math.min(100, Math.max(20, ignoredRemindersCount * 20));

  // Risk Formula:
  // risk = urgencyScore * 0.30 + effortGapScore * 0.25 + importanceScore * 0.20 + dependencyScore * 0.10 + progressScore * 0.10 + ignoredReminderScore * 0.05
  const riskScore = Math.round(
    urgencyScore * 0.30 +
    effortGapScore * 0.25 +
    importanceScore * 0.20 +
    dependencyScore * 0.10 +
    progressScore * 0.10 +
    ignoredReminderScore * 0.05
  );

  // Risk level assignment
  // 0-30 = Safe, 31-60 = Warning, 61-80 = Danger, 81-100 = Critical
  let riskLevel: RiskLevel = 'safe';
  if (riskScore >= 81) {
    riskLevel = 'critical';
  } else if (riskScore >= 61) {
    riskLevel = 'danger';
  } else if (riskScore >= 31) {
    riskLevel = 'warning';
  } else {
    riskLevel = 'safe';
  }

  // Human-readable explanation builder
  let explanation = '';
  if (msRemaining <= 0) {
    explanation = 'This deadline has already passed, rendering this task critical.';
  } else {
    const hoursFormatted = hoursRemaining.toFixed(1);
    const freeHoursFormatted = (availableFreeMinutes / 60).toFixed(1);
    const estHoursFormatted = (estimatedMinutes / 60).toFixed(1);

    if (riskScore >= 81) {
      explanation = `Risk is critical because the deadline is in ${hoursFormatted} hours, estimated work is ${estHoursFormatted} hours, and only ${freeHoursFormatted} focus hours are estimated to be available.`;
    } else if (riskScore >= 61) {
      explanation = `Risk is high because the deadline is approaching in ${hoursFormatted} hours with limited focus windows (${freeHoursFormatted} focus hours available vs ${estHoursFormatted} hours required).`;
    } else if (riskScore >= 31) {
      explanation = `Warning level: There are ${hoursFormatted} hours left. Progress is currently at ${progress}% with ${estHoursFormatted} work hours remaining.`;
    } else {
      explanation = `Task is safe. There are ${hoursFormatted} hours remaining, allowing ample focus window (${freeHoursFormatted} focus hours available vs ${estHoursFormatted} hours required).`;
    }

    if (depCount > 1) {
      explanation += ` This is further compounded by having ${depCount} unresolved dependencies.`;
    }
  }

  const factors: RiskFactors = {
    urgencyScore,
    effortGapScore,
    importanceScore,
    dependencyScore,
    progressScore,
    ignoredReminderScore,
  };

  return {
    riskScore,
    riskLevel,
    explanation,
    factors,
  };
}

export function calculateDeadlineSafetyScore(tasks: Partial<Task>[]): number {
  const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  if (activeTasks.length === 0) return 100;

  // Let's calculate a safety score from 0 to 100:
  // 100 - average risk of all active tasks, weighted more heavily for tasks due within 48 hours.
  let totalWeight = 0;
  let totalWeightedRisk = 0;

  const now = new Date();

  activeTasks.forEach(task => {
    const deadlineDate = task.deadline instanceof Date 
      ? task.deadline 
      : (task.deadline?.toDate ? task.deadline.toDate() : new Date(task.deadline));
    const msRemaining = deadlineDate.getTime() - now.getTime();
    const hoursRemaining = msRemaining / (1000 * 60 * 60);

    // weight tasks due within 48 hours twice as heavily
    const weight = (hoursRemaining > 0 && hoursRemaining <= 48) ? 2.0 : 1.0;
    const risk = task.riskScore ?? 0;

    totalWeightedRisk += risk * weight;
    totalWeight += weight;
  });

  const avgRisk = totalWeightedRisk / totalWeight;
  return Math.round(Math.max(0, 100 - avgRisk));
}
