export interface GmailMessage {
  id: string;
  threadId: string;
  sender: string;
  subject: string;
  snippet: string;
  body: string;
  date: Date;
}

export interface ExtractedDeadline {
  title: string;
  deadlineISO: string;
  category: string;
  suggestedDuration: number;
  importance: 'low' | 'medium' | 'high' | 'critical';
  confidenceScore: number;
}
