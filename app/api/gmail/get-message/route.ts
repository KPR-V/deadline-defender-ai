import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "../../../../lib/firebase/apiAuth";
import { getMessage } from "../../../../lib/server/gmail";
import { z } from "zod";

const requestSchema = z.object({
  messageId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const user = await verifyApiAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { messageId } = requestSchema.parse(body);

    const message = await getMessage(user.uid, messageId);

    return NextResponse.json({ message });
  } catch (error: any) {
    console.error("get-message error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: (error as any).errors || (error as any).issues }, { status: 400 });
    }
    if (error?.message?.includes("Gmail integration not connected")) {
      return NextResponse.json({ error: "Gmail not connected", notConnected: true }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
