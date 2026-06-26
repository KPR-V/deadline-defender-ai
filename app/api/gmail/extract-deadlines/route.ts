import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "../../../../lib/firebase/apiAuth";
import { getMessage } from "../../../../lib/server/gmail";
import { generateValidatedJson } from "../../../../lib/server/gemini";
import { emailDeadlineExtractionSchema } from "../../../../lib/ai/validators";
import { z } from "zod";

const requestSchema = z.object({
  messageIds: z.array(z.string().min(1)).min(1).max(20),
});

export async function POST(req: NextRequest) {
  try {
    const user = await verifyApiAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { messageIds } = requestSchema.parse(body);

    const messages = await Promise.all(
      messageIds.map(async (id) => {
        try {
          return await getMessage(user.uid, id);
        } catch (err) {
          console.error(`Failed to get full message for extraction (${id}):`, err);
          return null;
        }
      })
    );

    const validMessages = messages.filter((m) => m !== null);
    if (validMessages.length === 0) {
      return NextResponse.json({ tasks: [] });
    }

    const nowISO = new Date().toISOString();
    const emailContext = validMessages
      .map((e) => {
        const cleanBody = e.body ? e.body.slice(0, 3000) : e.snippet;
        return `Message ID: ${e.messageId}
Subject: ${e.subject}
From: ${e.sender}
Date: ${e.date}
Content:
${cleanBody}`;
      })
      .join("\n========================================\n");

    const prompt = `Analyze these emails and extract any actionable tasks, meetings, invoices/bills, assignments, or interviews.
Current reference time: ${nowISO}

Emails to analyze:
${emailContext}

Instructions:
1. Identify distinct tasks or deliverables requested or implied in the emails.
2. For each task, extract or calculate an absolute ISO 8601 timestamp for the deadline if mentioned or clearly implied. If no deadline is specified or implied, set deadline to null. Do NOT guess arbitrary deadlines if unknown.
3. Assess realistic importance ("low" | "medium" | "high" | "critical") and estimated execution minutes.
4. Categorize accurately ("assignment" | "interview" | "bill" | "meeting" | "project" | "personal" | "other").
5. Include the exact sourceEmail metadata (messageId, subject, sender, date) corresponding to where this task came from.
6. Provide a confidence score between 0.0 and 1.0 representing how certain you are this is a genuine actionable task.
7. Provide evidenceText: a short quote or snippet from the email supporting why this task/deadline exists.

Return strict JSON matching the schema. If no tasks are found, return an empty tasks array.`;

    const systemInstruction =
      "You are an expert AI email parsing and task extraction assistant. You extract structured tasks accurately without hallucinating deadlines.";

    const result = await generateValidatedJson(
      prompt,
      emailDeadlineExtractionSchema,
      systemInstruction
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("extract-deadlines error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: (error as any).errors || (error as any).issues }, { status: 400 });
    }
    if (error?.message?.includes("Gmail integration not connected")) {
      return NextResponse.json({ error: "Gmail not connected", notConnected: true }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
