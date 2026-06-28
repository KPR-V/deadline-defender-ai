import { getTask, getUserProfile, updateTask, createReminder, createTask, addBehaviorSignal, getBehaviorSignals } from '../firebase/firestore';
import { calculateRisk } from '../risk/riskEngine';
import { generateRiskChangeReminder } from './reminderEngine';
import { Task } from '../../types/task';
import { Reminder } from '../../types/reminder';
import { computeProcrastinationStats } from '../behavior/statsEngine';

export async function createTaskAndNotify(userId: string, taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const profile = await getUserProfile(userId);
  const signals = await getBehaviorSignals(userId);
  const stats = computeProcrastinationStats(signals);

  // Recalculate risk with behavior buffer for initial task
  const initialRisk = calculateRisk(taskData, new Date(), 1, undefined, stats);
  
  const newTaskData = {
    ...taskData,
    riskLevel: initialRisk.riskLevel,
    riskScore: initialRisk.riskScore,
    riskExplanation: initialRisk.explanation
  };
  
  // Create task
  const taskId = await createTask(userId, newTaskData);

  // Initial reminder based on risk
  if (profile) {
    let reminderIntensity = profile.reminderIntensity;
    let type: 'planning' | 'action' | 'rescue' = 'planning';
    let message = `New task "${newTaskData.title}" tracked. Current risk is ${newTaskData.riskLevel}.`;
    
    if (newTaskData.riskLevel === 'danger') {
      type = 'action';
      message = `Warning: "${newTaskData.title}" is already in the danger zone. Prioritize this.`;
    } else if (newTaskData.riskLevel === 'critical') {
      type = 'rescue';
      message = `CRITICAL: "${newTaskData.title}" tracked with extremely high risk. Rescue mode recommended.`;
    }

    const reminder: Omit<Reminder, 'id' | 'createdAt'> = {
      userId,
      taskId,
      title: 'Task Tracked',
      message,
      type,
      intensity: reminderIntensity || 'normal',
      status: 'unread',
      suggestedAction: newTaskData.riskLevel === 'critical' ? 'open_rescue' : 'start_now'
    };
    
    await createReminder(userId, reminder);
  }

  return taskId;
}

export async function updateTaskRiskAndNotify(userId: string, taskId: string, progressUpdate?: number): Promise<void> {
  const task = await getTask(userId, taskId);
  const profile = await getUserProfile(userId);
  const signals = await getBehaviorSignals(userId);
  const stats = computeProcrastinationStats(signals);

  if (!task || !profile) return;

  const oldRiskLevel = task.riskLevel;
  
  // Calculate new risk
  const now = new Date();
  const riskInput = {
    ...task,
    progressPercentage: progressUpdate !== undefined ? progressUpdate : task.progressPercentage
  };
  const riskResult = calculateRisk(riskInput, now, 1, undefined, stats);

  const newRiskLevel = riskResult.riskLevel;
  
  const isCompleted = riskInput.progressPercentage >= 100;
  
  // Update task
  await updateTask(userId, taskId, {
    progressPercentage: riskInput.progressPercentage,
    status: isCompleted ? 'completed' : 'pending',
    riskScore: riskResult.riskScore,
    riskLevel: riskResult.riskLevel,
    riskExplanation: riskResult.explanation
  });

  if (isCompleted && task.status !== 'completed') {
    // Task just completed!
    const wasCritical = oldRiskLevel === 'critical';
    await addBehaviorSignal(userId, {
      type: wasCritical ? 'rescue_success' : 'task_completed',
      taskId: task.id,
      value: { 
        category: task.category,
        completionTime: new Date().toISOString()
      }
    });
  }

  // Generate reminder if escalated
  if (!isCompleted && oldRiskLevel !== newRiskLevel) {
    const taskWithNewRisk = { ...task, riskLevel: newRiskLevel };
    const reminder = generateRiskChangeReminder(userId, taskWithNewRisk, oldRiskLevel, newRiskLevel, profile);
    if (reminder) {
      await createReminder(userId, reminder);
    }
  }
}
