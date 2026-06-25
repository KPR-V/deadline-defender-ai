import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "../../../../lib/firebase/apiAuth";
import { generateValidatedJson } from "../../../../lib/server/gemini";
import { recoveryMessageSchema } from "../../../../lib/ai/validators";
import { z } from "zod";

const requestSchema = z.object({
  taskTitle: z.string(),
  taskDescription: z.string(),
  category: z.string(),
  importance: z.string(),
  progressPercentage: z.number(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await verifyApiAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { taskTitle, taskDescription, category, importance, progressPercentage } = requestSchema.parse(body);

    const prompt = `You are a recovery and crisis management AI assistant.
A user is likely going to fail to complete their task fully by the deadline. 
Your goal is to help them draft a message/email to the stakeholder explaining the situation professionally.

Task Title: "${taskTitle}"
Task Description: "${taskDescription}"
Category: "${category}"
Importance: "${importance}"
Current Progress: ${progressPercentage}%

Generate a structured recovery plan message draft. Keep it professional, taking accountability, no excuses.`;

    const systemInstruction = "Draft a professional stakeholder message for a delayed or incomplete task. Output strict JSON matching the schema.";

    const result = await generateValidatedJson(prompt, recoveryMessageSchema, systemInstruction);

    return NextResponse.json(result);
  } catch (error) {
    console.error("generate-recovery-message error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: (error as any).errors || (error as any).issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
