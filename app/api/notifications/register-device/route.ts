import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "../../../../lib/firebase/apiAuth";
import { adminDb } from "../../../../lib/firebase/admin";
import { z } from "zod";

const registerSchema = z.object({
  fcmToken: z.string().min(10),
  deviceId: z.string().default("default_web_device"),
});

export async function POST(req: NextRequest) {
  try {
    const user = await verifyApiAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { fcmToken, deviceId } = registerSchema.parse(body);

    await adminDb
      .collection("users")
      .doc(user.uid)
      .collection("devices")
      .doc(deviceId)
      .set(
        {
          fcmToken,
          userAgent: req.headers.get("user-agent") || "web",
          updatedAt: new Date(),
        },
        { merge: true }
      );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error registering device:", error);
    return NextResponse.json({ error: error.message || "Bad Request" }, { status: 400 });
  }
}
