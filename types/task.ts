export type TaskImportance = "low" | "medium" | "high" | "critical";
export type TaskCategory =
  | "assignment"
  | "interview"
  | "bill"
  | "meeting"
  | "project"
  | "personal"
  | "other";
export type TaskSource = "manual" | "ai_parse" | "gmail" | "calendar" | "voice";
export type TaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "missed"
  | "cancelled";
export type RiskLevel = "safe" | "warning" | "danger" | "critical";

export interface Task {
  id: string;
  title: string;
  description: string;
  deadline: any; // Date or Firestore timestamp
  importance: TaskImportance;
  estimatedMinutes: number;
  category: TaskCategory;
  dependencies: string[];
  source: TaskSource;
  status: TaskStatus;
  progressPercentage: number;
  riskScore: number;
  riskLevel: RiskLevel;
  riskExplanation: string;
  firstUsefulAction?: string;
  completionStrategy?: string;
  metadata?: Record<string, any>;
  createdAt: any;
  updatedAt: any;
}

export interface TaskStep {
  id: string;
  taskId: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  order: number;
  status: "pending" | "in_progress" | "completed";
  createdAt: any;
  updatedAt: any;
}

export interface RiskSnapshot {
  id: string;
  taskId: string;
  riskScore: number;
  riskLevel: RiskLevel;
  reason: string;
  factors: {
    urgencyScore: number;
    effortGapScore: number;
    importanceScore: number;
    dependencyScore: number;
    progressScore: number;
    ignoredReminderScore: number;
  };
  createdAt: any;
}

export interface ProgressEvidence {
  id: string;
  type:
    | "subtask_completed"
    | "focus_block_completed"
    | "rescue_session"
    | "manual_update"
    | "draft_generated"
    | "external_integration_placeholder";
  description: string;
  createdAt: any; // Firestore Timestamp
}

export interface FocusBlock {
  id: string;
  taskId: string;
  start: any; // Date or Timestamp
  end: any; // Date or Timestamp
  durationMinutes: number;
  status: "suggested" | "accepted" | "completed" | "missed";
  reason: string;
  googleCalendarEventId?: string;
  googleCalendarEventLink?: string;
  createdAt: any;
}

export interface RescuePlan {
  id: string;
  taskId: string;
  summary: string;
  nextFiveMinuteAction: string;
  emergencySteps: Array<{
    title: string;
    durationMinutes: number;
    whyThisMatters: string;
  }>;
  scopeReduction: string;
  fallbackPlan: string;
  extensionMessageDraft: string;
  createdAt: any;
}

export interface RecoveryPlan {
  situationSummary: string;
  bestRealisticOutcome: string;
  scopeReductionPlan: string;
  partialSubmissionPlan: string;
  messageDraft: string;
  nextSteps: string[];
}

export interface BehaviorSignal {
  id: string;
  type:
    | "reminder_ignored"
    | "reminder_actioned"
    | "task_completed"
    | "focus_block_missed"
    | "focus_block_completed"
    | "deadline_missed"
    | "rescue_started"
    | "rescue_success"
    | "task_delayed";
  taskId: string;
  value: any;
  createdAt: any;
}
