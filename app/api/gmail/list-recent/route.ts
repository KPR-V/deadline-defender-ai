import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "../../../../lib/firebase/apiAuth";
import { listRecentMessages } from "../../../../lib/server/gmail";
import { z } from "zod";

const requestSchema = z.object({
  query: z.string().default("newer_than:30d"),
  maxResults: z.number().int().min(1).max(50).default(10),
});

export async function POST(req: NextRequest) {
  try {
    const user = await verifyApiAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body = {};
    try {
      body = await req.json();
    } catch {
      // Ignore empty or invalid JSON body and use defaults
    }

    const { query, maxResults } = requestSchema.parse(body);

    const messages = await listRecentMessages(user.uid, query, maxResults);

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error("list-recent error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: (error as any).errors || (error as any).issues }, { status: 400 });
    }
    if (error?.message?.includes("Gmail integration not connected")) {
      return NextResponse.json({ error: "Gmail not connected", notConnected: true }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
