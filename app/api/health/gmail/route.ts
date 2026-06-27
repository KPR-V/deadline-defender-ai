import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "../../../../lib/firebase/apiAuth";
import { getGoogleTokens } from "../../../../lib/server/googleTokenStore";
import { listRecentMessages } from "../../../../lib/server/gmail";

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

    const tokens = await getGoogleTokens(user.uid);
    if (!tokens || !tokens.connected) {
      return NextResponse.json({
        status: "disconnected",
        message: "Google account is not connected.",
        suggestedFix: "Connect Google account in Settings.",
      });
    }

    const hasGmailScope =
      tokens.gmailConnected ||
      (tokens.scopes && tokens.scopes.some((s) => s.includes("gmail")));

    if (!hasGmailScope) {
      return NextResponse.json({
        status: "missing_scope",
        message: "Gmail scope is missing.",
        suggestedFix: "Reconnect Google account and grant Gmail permissions.",
      });
    }

    // Execute messages.list test
    await listRecentMessages(user.uid, "newer_than:1d", 1);

    return NextResponse.json({
      status: "connected",
      message: "Gmail API messages.list test succeeded.",
      suggestedFix: null,
    });
  } catch (error: any) {
    console.error("Gmail health check error:", error);
    return NextResponse.json({
      status: "error",
      message: "Gmail API test failed.",
      suggestedFix: "Verify Gmail API enabled in Google Cloud Console or reconnect account.",
    });
  }
}
