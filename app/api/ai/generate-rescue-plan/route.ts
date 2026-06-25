import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "../../../../lib/firebase/apiAuth";
import { generateValidatedJson } from "../../../../lib/server/gemini";
import { rescuePlanSchema } from "../../../../lib/ai/validators";
import { z } from "zod";

const requestSchema = z.object({
  taskTitle: z.string(),
  taskDescription: z.string(),
  deadlineISO: z.string().datetime(),
  timeRemainingMinutes: z.number(),
  estimatedMinutes: z.number(),
  blockers: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await verifyApiAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { taskTitle, taskDescription, deadlineISO, timeRemainingMinutes, estimatedMinutes, blockers } = requestSchema.parse(body);

    const prompt = `You are a crisis-management productivity coach. A user is at high risk of missing a deadline.

Task: ${taskTitle}
Description: ${taskDescription}
Deadline: ${deadlineISO}
Estimated Need: ${estimatedMinutes} mins
Time Remaining: ${timeRemainingMinutes} mins
Reported Blockers: ${blockers || "None specified"}

Generate an emergency Rescue Plan in strict JSON format. 
Be highly encouraging but realistic. Tell them what to cut (scope reduction), what to do first (next 5 minute action), and draft an extension message if needed.`;

    const result = await generateValidatedJson(prompt, rescuePlanSchema);

    return NextResponse.json(result);
  } catch (error) {
    console.error("generate-rescue-plan error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: (error as any).errors || (error as any).issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
