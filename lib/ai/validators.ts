import { z } from "zod";

export const parsedTaskSchema = z.object({
  title: z.string(),
  description: z.string(),
  deadline: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid ISO date" }),
  importance: z.enum(["low", "medium", "high", "critical"]),
  estimatedMinutes: z.number().int().positive(),
  category: z.enum(["assignment", "interview", "bill", "meeting", "project", "personal", "other"]),
  dependencies: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export const taskPlanSchema = z.object({
  steps: z.array(z.object({
    title: z.string(),
    description: z.string(),
    estimatedMinutes: z.number().int().positive(),
    order: z.number().int(),
    status: z.literal("pending"),
  })),
  firstUsefulAction: z.string(),
  completionStrategy: z.string(),
});

export const rescuePlanSchema = z.object({
  summary: z.string(),
  nextFiveMinuteAction: z.string(),
  emergencySteps: z.array(z.object({
    title: z.string(),
    durationMinutes: z.number().int().positive(),
    whyThisMatters: z.string(),
  })),
  scopeReduction: z.string(),
  fallbackPlan: z.string(),
  extensionMessageDraft: z.string(),
});

export const emailDeadlineExtractionSchema = z.object({
  tasks: z.array(parsedTaskSchema.extend({
    deadline: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid ISO date" }).nullable(),
    sourceEmail: z.object({
      messageId: z.string(),
      subject: z.string(),
      sender: z.string(),
      date: z.string(),
    }),
    evidenceText: z.string().optional(),
  }))
});

export const recoveryMessageSchema = z.object({
  message: z.string(),
});
