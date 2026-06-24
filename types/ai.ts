import { TaskCategory, TaskImportance } from './task';

export interface AIParsedTask {
  title: string;
  description: string;
  deadline: string; // ISO datetime string
  importance: TaskImportance;
  estimatedMinutes: number;
  category: TaskCategory;
  dependencies: string[];
  confidence: number;
}

export interface AISubtaskStep {
  title: string;
  description: string;
  estimatedMinutes: number;
  order: number;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface AITaskPlan {
  steps: AISubtaskStep[];
  firstUsefulAction: string;
  completionStrategy: string;
}

export interface AIEmergencyStep {
  title: string;
  durationMinutes: number;
  whyThisMatters: string;
}

export interface AIRescuePlan {
  summary: string;
  nextFiveMinuteAction: string;
  emergencySteps: AIEmergencyStep[];
  scopeReduction: string;
  fallbackPlan: string;
  extensionMessageDraft: string;
}

export interface AIEmailExtractedTask {
  title: string;
  description: string;
  deadline: string | null;
  importance: TaskImportance;
  estimatedMinutes: number;
  category: TaskCategory;
  dependencies: string[];
  sourceEmail: {
    messageId: string;
    subject: string;
    sender: string;
    date: string;
  };
  confidence: number;
  evidenceText?: string;
}

export interface AIEmailExtractionResult {
  tasks: AIEmailExtractedTask[];
}
