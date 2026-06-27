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
          message: "Firebase Auth verification failed or token expired.",
          suggestedFix: "Please log out and log back in.",
        },
        { status: 401 }
      );
    }

    // Try reading user document from Firestore
    await adminDb.collection("users").doc(user.uid).get();

    return NextResponse.json({
      status: "connected",
      message: "Firebase Auth and Firestore are connected and operating normally.",
      suggestedFix: null,
    });
  } catch (error: any) {
    console.error("Firebase health check error:", error);
    return NextResponse.json({
      status: "error",
      message: "Firestore read failed or config permission denied.",
      suggestedFix: "Verify Firebase service account credentials and Firestore permissions.",
    });
  }
}
