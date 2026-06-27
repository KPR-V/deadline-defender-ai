import { createTask, saveTaskStepsBatch, saveFocusBlocksBatch, addBehaviorSignal } from '../firebase/firestore';
import { calculateRisk } from '../risk/riskEngine';
import { getMockBusyBlocks } from './mockCalendarService';
import { findAvailableFocusBlocks } from '../calendar/schedulingEngine';
import { Task, TaskStep, FocusBlock } from '../../types/task';

export async function seedDemoData(userId: string): Promise<void> {
  const now = new Date();
  const busyBlocks = getMockBusyBlocks(now);

  // Mock behavior signals for Procrastination Pattern
  await Promise.all([
    addBehaviorSignal(userId, { type: 'reminder_ignored', taskId: 'demo1', value: { category: 'assignment' } }),
    addBehaviorSignal(userId, { type: 'reminder_ignored', taskId: 'demo2', value: { category: 'assignment' } }),
    addBehaviorSignal(userId, { type: 'reminder_actioned', taskId: 'demo3', value: { category: 'meeting' } }),
    addBehaviorSignal(userId, { type: 'reminder_actioned', taskId: 'demo4', value: { category: 'interview' } }),
    
    addBehaviorSignal(userId, { type: 'focus_block_missed', taskId: 'demo1', value: {} }),
    addBehaviorSignal(userId, { type: 'focus_block_missed', taskId: 'demo1', value: {} }),
    addBehaviorSignal(userId, { type: 'focus_block_completed', taskId: 'demo5', value: {} }),
    
    addBehaviorSignal(userId, { type: 'task_delayed', taskId: 'demo1', value: { category: 'assignment' } }),
    addBehaviorSignal(userId, { type: 'task_delayed', taskId: 'demo1', value: { category: 'assignment' } }),
    addBehaviorSignal(userId, { type: 'task_delayed', taskId: 'demo2', value: { category: 'project' } }),
    
    addBehaviorSignal(userId, { type: 'rescue_started', taskId: 'demo5', value: {} }),
    addBehaviorSignal(userId, { type: 'rescue_success', taskId: 'demo5', value: { completionTime: new Date(now.getTime() - 1000 * 60 * 60 * 20).toISOString() } }),
    
    addBehaviorSignal(userId, { type: 'task_completed', taskId: 'demo6', value: { completionTime: new Date(now.getTime() - 1000 * 60 * 60 * 48).toISOString() } }),
    addBehaviorSignal(userId, { type: 'task_completed', taskId: 'demo7', value: { completionTime: new Date(now.getTime() - 1000 * 60 * 60 * 72).toISOString() } })
  ]);

  // Define realistic demo tasks
  const rawTasks = [
    {
      title: 'Submit DBMS Assignment',
      description: 'Complete SQL queries for Homework 4, verify database schemas, and submit final report as PDF.',
      deadline: (() => {
        const d = new Date(now);
        d.setHours(23, 59, 0, 0); // Tonight 11:59 PM
        return d;
      })(),
      importance: 'critical' as const,
      estimatedMinutes: 240, // 4 hours
      category: 'assignment' as const,
      dependencies: ['Complete schema drawings', 'Review Lecture 12 slide decks'],
      source: 'manual' as const,
      status: 'pending' as const,
      progressPercentage: 15,
      steps: [
        { title: 'Define DBMS ER-Diagram structures', description: 'Map out tables, primary keys, and foreign key constraints.', estimatedMinutes: 60, order: 1, status: 'pending' as const },
        { title: 'Write primary query statements', description: 'Construct SELECT, JOIN, and GROUP BY operations requested.', estimatedMinutes: 90, order: 2, status: 'pending' as const },
        { title: 'Validate query outputs against test data', description: 'Run the scripts and confirm formatting matches specifications.', estimatedMinutes: 60, order: 3, status: 'pending' as const },
        { title: 'Assemble PDF report and submit on portal', description: 'Format answers neatly, generate PDF, and hit submit.', estimatedMinutes: 30, order: 4, status: 'pending' as const }
      ]
    },
    {
      title: 'Google Technical Interview Preparation',
      description: 'Review structural computer science topics (Data Structures, Algorithms) and rehearse past project accomplishments.',
      deadline: (() => {
        const d = new Date(now);
        d.setDate(now.getDate() + 1);
        d.setHours(10, 0, 0, 0); // Tomorrow at 10 AM
        return d;
      })(),
      importance: 'high' as const,
      estimatedMinutes: 120, // 2 hours
      category: 'interview' as const,
      dependencies: ['Revise graph search algorithms', 'STAR-format resume walkthrough'],
      source: 'gmail' as const,
      status: 'pending' as const,
      progressPercentage: 40,
      steps: [
        { title: 'Review Tree and Graph Traversals', description: 'Revise BFS, DFS, and topological sorting algorithms.', estimatedMinutes: 40, order: 1, status: 'pending' as const },
        { title: ' STAR project summaries practice', description: 'Write down situation, task, action, and result for 3 core projects.', estimatedMinutes: 45, order: 2, status: 'pending' as const },
        { title: 'Test workspace and camera setups', description: 'Ensure microphone, browser link, and quiet desk are ready.', estimatedMinutes: 35, order: 3, status: 'pending' as const }
      ]
    },
    {
      title: 'Pay Electricity Invoice Statement',
      description: 'Process payment for monthly utility service charge to avoid delay penalties.',
      deadline: (() => {
        const d = new Date(now);
        d.setDate(now.getDate() + 2);
        d.setHours(17, 0, 0, 0); // Due in 2 days 5 PM
        return d;
      })(),
      importance: 'medium' as const,
      estimatedMinutes: 15, // 15 mins
      category: 'bill' as const,
      dependencies: [],
      source: 'manual' as const,
      status: 'pending' as const,
      progressPercentage: 0,
      steps: [
        { title: 'Verify utility reading metrics', description: 'Confirm amount due matches normal consumption averages.', estimatedMinutes: 5, order: 1, status: 'pending' as const },
        { title: 'Execute portal payment securely', description: 'Pay invoice using secure electronic check or credit card.', estimatedMinutes: 10, order: 2, status: 'pending' as const }
      ]
    },
    {
      title: 'Finish Startup Pitch Deck Slides',
      description: 'Prepare and design slides for startup investor presentation due Sunday. Cover market, product, business model, and financial metrics.',
      deadline: (() => {
        const d = new Date(now);
        const currentDay = d.getDay();
        const daysUntilSunday = (7 - currentDay) % 7 || 7;
        d.setDate(d.getDate() + daysUntilSunday);
        d.setHours(18, 0, 0, 0);
        return d;
      })(),
      importance: 'high' as const,
      estimatedMinutes: 480, // 8 hours
      category: 'project' as const,
      dependencies: ['Complete Q3 revenue models', 'Finalize design assets'],
      source: 'manual' as const,
      status: 'pending' as const,
      progressPercentage: 10,
      steps: [
        { title: 'Detail problem and solution slides', description: 'Articulate the primary market pain point and your unique product proposition.', estimatedMinutes: 120, order: 1, status: 'pending' as const },
        { title: 'Outline business model and market sizing', description: 'Describe customer acquisition and market penetration forecasts.', estimatedMinutes: 120, order: 2, status: 'pending' as const },
        { title: 'Draft financial runway forecasts', description: 'Map out how investment funding will be allocated.', estimatedMinutes: 120, order: 3, status: 'pending' as const },
        { title: 'Polish visual assets and review slides', description: 'Apply layout styles and do verbal rehearse.', estimatedMinutes: 120, order: 4, status: 'pending' as const }
      ]
    },
    {
      title: 'Bi-Weekly Project Sync Meeting',
      description: 'Join virtual team status sync to share updates and discuss roadmap blocks.',
      deadline: (() => {
        const d = new Date(now);
        d.setHours(now.getHours() + 3); // in 3 hours
        return d;
      })(),
      importance: 'low' as const,
      estimatedMinutes: 60,
      category: 'meeting' as const,
      dependencies: [],
      source: 'calendar' as const,
      status: 'pending' as const,
      progressPercentage: 80,
      steps: [
        { title: 'Bullet weekly completed updates', description: 'Briefly note tasks resolved this week for quick read.', estimatedMinutes: 20, order: 1, status: 'pending' as const },
        { title: 'Identify blocking infrastructure elements', description: 'Format issues needing cross-team input to address.', estimatedMinutes: 40, order: 2, status: 'pending' as const }
      ]
    }
  ];

  // Save each task to Firestore
  for (const raw of rawTasks) {
    const riskResult = calculateRisk(
      {
        deadline: raw.deadline,
        importance: raw.importance,
        estimatedMinutes: raw.estimatedMinutes,
        dependencies: raw.dependencies,
        progressPercentage: raw.progressPercentage,
        status: raw.status
      },
      now,
      1
    );

    const firstUsefulAction = raw.steps[0].title;
    const completionStrategy = `Formulate focus intervals. Complete the core elements first, saving secondary formatting until the draft is fully viable.`;

    const taskId = await createTask(userId, {
      title: raw.title,
      description: raw.description,
      deadline: raw.deadline,
      importance: raw.importance,
      estimatedMinutes: raw.estimatedMinutes,
      category: raw.category,
      dependencies: raw.dependencies,
      source: raw.source,
      status: raw.status,
      progressPercentage: raw.progressPercentage,
      riskScore: riskResult.riskScore,
      riskLevel: riskResult.riskLevel,
      riskExplanation: riskResult.explanation,
      firstUsefulAction,
      completionStrategy
    });

    const taskSteps = raw.steps.map(step => ({
      taskId,
      title: step.title,
      description: step.description,
      estimatedMinutes: step.estimatedMinutes,
      order: step.order,
      status: step.status
    }));
    await saveTaskStepsBatch(userId, taskId, taskSteps);

    const calculatedBlocks = findAvailableFocusBlocks(
      raw.deadline,
      raw.estimatedMinutes,
      busyBlocks,
      now,
      45,
      riskResult.riskScore >= 81
    );

    if (calculatedBlocks.length > 0) {
      const dbBlocks = calculatedBlocks.map(block => ({
        taskId,
        start: block.start,
        end: block.end,
        durationMinutes: block.durationMinutes,
        status: 'suggested' as const,
        reason: block.reason
      }));
      await saveFocusBlocksBatch(userId, taskId, dbBlocks);
    }
  }
}
