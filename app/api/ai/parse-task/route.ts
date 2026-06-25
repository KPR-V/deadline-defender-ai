import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "../../../../lib/firebase/apiAuth";
import { generateValidatedJson } from "../../../../lib/server/gemini";
import { parsedTaskSchema } from "../../../../lib/ai/validators";
import { z } from "zod";

const requestSchema = z.object({
  userInput: z.string().min(1),
  nowISO: z.string().datetime(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await verifyApiAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { userInput, nowISO } = requestSchema.parse(body);

    const prompt = `Parse the following user request into a structured task.
Current time: ${nowISO}

User input: "${userInput}"

Provide the response as a JSON object matching the exact schema. Ensure the deadline is an absolute ISO 8601 datetime string. If a category or importance isn't clear, use your best judgment. Set a realistic confidence score (0.0 to 1.0).`;

    const systemInstruction = "You are a task parsing assistant. Your output must strictly match the expected JSON schema.";

    const result = await generateValidatedJson(prompt, parsedTaskSchema, systemInstruction);

    return NextResponse.json(result);
  } catch (error) {
    console.error("parse-task error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: (error as any).errors || (error as any).issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
