import { Schema, Type } from '@google/genai';

// Schema for parsing natural language tasks
export const parseTaskSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: 'The clear, actionable title of the task.',
    },
    description: {
      type: Type.STRING,
      description: 'A brief description of what needs to be done, including any key details from the input.',
    },
    deadline: {
      type: Type.STRING,
      description: 'The calculated ISO 8601 datetime string representing the deadline. Use the provided current time context to resolve relative times like tonight, tomorrow, Friday, etc.',
    },
    importance: {
      type: Type.STRING,
      enum: ['low', 'medium', 'high', 'critical'],
      description: 'The priority or importance of the task.',
    },
    estimatedMinutes: {
      type: Type.INTEGER,
      description: 'The estimated duration to complete the task in minutes. Use a reasonable prediction if not specified.',
    },
    category: {
      type: Type.STRING,
      enum: ['assignment', 'interview', 'bill', 'meeting', 'project', 'personal', 'other'],
      description: 'The best fitting category for this task.',
    },
    dependencies: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Any dependencies, pre-requisites, or items needed before this task can be completed.',
    },
    confidence: {
      type: Type.NUMBER,
      description: 'Confidence score of the parse from 0.0 to 1.0.',
    },
  },
  required: ['title', 'description', 'deadline', 'importance', 'estimatedMinutes', 'category', 'dependencies', 'confidence'],
};

// Schema for generating a task plan breakdown
export const taskPlanSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          estimatedMinutes: { type: Type.INTEGER },
          order: { type: Type.INTEGER },
          status: { type: Type.STRING, enum: ['pending'] },
        },
        required: ['title', 'description', 'estimatedMinutes', 'order', 'status'],
      },
      description: 'An array of concrete, ordered subtasks.',
    },
    firstUsefulAction: {
      type: Type.STRING,
      description: 'A specific, bite-sized, high-leverage first action the user can complete in 5 minutes to overcome inertia.',
    },
    completionStrategy: {
      type: Type.STRING,
      description: 'The overall high-level strategy to execute and complete this task before the deadline.',
    },
  },
  required: ['steps', 'firstUsefulAction', 'completionStrategy'],
};

// Schema for generating a Rescue Plan for critical tasks
export const rescuePlanSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: 'A brief, highly encouraging emergency overview of the rescue state.',
    },
    nextFiveMinuteAction: {
      type: Type.STRING,
      description: 'The single most critical, micro-action to start immediately (e.g., Open the document, log into the bank).',
    },
    emergencySteps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          durationMinutes: { type: Type.INTEGER },
          whyThisMatters: { type: Type.STRING },
        },
        required: ['title', 'durationMinutes', 'whyThisMatters'],
      },
      description: 'A streamlined, hyper-focused list of core steps to save the deadline.',
    },
    scopeReduction: {
      type: Type.STRING,
      description: 'Suggestions on what parts of the task can be safely deferred, skipped, or simplified to make the deadline possible.',
    },
    fallbackPlan: {
      type: Type.STRING,
      description: 'A fallback plan if the primary deadline cannot be fully met (e.g., partial submission, emergency notice).',
    },
    extensionMessageDraft: {
      type: Type.STRING,
      description: 'A professionally drafted request for an extension, rescheduling, or early heads-up message for the stakeholder.',
    },
  },
  required: ['summary', 'nextFiveMinuteAction', 'emergencySteps', 'scopeReduction', 'fallbackPlan', 'extensionMessageDraft'],
};

export const gmailExtractionSchema = {
  type: Type.OBJECT,
  properties: {
    tasks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          deadline: { type: Type.STRING, nullable: true },
          importance: { 
            type: Type.STRING,
            enum: ["low", "medium", "high", "critical"]
          },
          estimatedMinutes: { type: Type.INTEGER },
          category: {
            type: Type.STRING,
            enum: ["assignment", "interview", "bill", "meeting", "project", "personal", "other"]
          },
          dependencies: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          sourceEmail: {
            type: Type.OBJECT,
            properties: {
              subject: { type: Type.STRING },
              sender: { type: Type.STRING },
              date: { type: Type.STRING }
            },
            required: ["subject", "sender", "date"]
          },
          confidence: { type: Type.NUMBER }
        },
        required: [
          "title", "description", "importance", "estimatedMinutes", 
          "category", "dependencies", "sourceEmail", "confidence"
        ]
      }
    }
  },
  required: ["tasks"]
};
