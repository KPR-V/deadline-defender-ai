import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "../../../../lib/firebase/apiAuth";
import { adminDb } from "../../../../lib/firebase/admin";

export async function GET(req: NextRequest) {
  try {
    const user = await verifyApiAuth(req);
    if (!user) {
      return NextResponse.json(
        {
          status: "error",
          message: "Unauthorized.",
          suggestedFix: "Please log in.",
        },
        { status: 401 }
      );
    }

    const devicesSnap = await adminDb
      .collection("users")
      .doc(user.uid)
      .collection("devices")
      .get();

    if (!devicesSnap.empty) {
      const count = devicesSnap.size;
      return NextResponse.json({
        status: "connected",
        message: `In-app reminders active. Browser push enabled (${count} registered device${count > 1 ? "s" : ""}).`,
        suggestedFix: null,
      });
    }

    return NextResponse.json({
      status: "in_app_only",
      message: "In-app reminders active. Browser push notifications not enabled or HTTPS/Service Worker unsupported.",
      suggestedFix: "Enable browser push notifications in Settings.",
    });
  } catch (error: any) {
    console.error("Notifications health check error:", error);
    return NextResponse.json({
      status: "error",
      message: "Failed to verify notification registration status.",
      suggestedFix: "Check database connection or re-register notifications.",
    });
  }
}
