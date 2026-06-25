import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "../../../../lib/firebase/apiAuth";
import { generateValidatedJson } from "../../../../lib/server/gemini";
import { taskPlanSchema } from "../../../../lib/ai/validators";
import { z } from "zod";

const requestSchema = z.object({
  taskTitle: z.string(),
  taskDescription: z.string(),
  deadlineISO: z.string().datetime(),
  estimatedMinutes: z.number().positive(),
  nowISO: z.string().datetime(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await verifyApiAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { taskTitle, taskDescription, deadlineISO, estimatedMinutes, nowISO } = requestSchema.parse(body);

    const prompt = `You are a productivity expert creating an actionable execution plan.

Task: ${taskTitle}
Description: ${taskDescription}
Deadline: ${deadlineISO}
Estimated Total Duration: ${estimatedMinutes} minutes
Current Time: ${nowISO}

Break this task down into sequential, manageable steps. 
Provide a "firstUsefulAction" (a 5-minute micro-task to overcome inertia).
Provide a high-level "completionStrategy".
Output STRICT JSON matching the schema.`;

    const result = await generateValidatedJson(prompt, taskPlanSchema);

    return NextResponse.json(result);
  } catch (error) {
    console.error("generate-task-plan error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: (error as any).errors || (error as any).issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
