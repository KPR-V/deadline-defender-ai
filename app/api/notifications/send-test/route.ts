import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "../../../../lib/firebase/apiAuth";
import { sendPushToUser } from "../../../../lib/server/notifications";
import { adminDb } from "../../../../lib/firebase/admin";

export async function POST(req: NextRequest) {
  try {
    const user = await verifyApiAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Also create an in-app test notification so it's visible even without push
    await adminDb.collection("users").doc(user.uid).collection("notifications").add({
      userId: user.uid,
      title: "Test Notification",
      message: "This is a test notification to confirm your system is working correctly.",
      type: "action",
      intensity: "normal",
      status: "unread",
      reason: "Requested test notification from settings.",
      createdAt: new Date(),
    });

    const pushRes = await sendPushToUser(user.uid, {
      title: "Deadline Defender Test",
      body: "Browser push notifications are enabled and functioning properly!",
      url: "/dashboard",
    });

    return NextResponse.json({
      success: true,
      inAppCreated: true,
      pushSent: pushRes.successCount > 0,
      details: pushRes,
    });
  } catch (error: any) {
    console.error("Error sending test notification:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
