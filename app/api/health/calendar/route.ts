import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "../../../../lib/firebase/apiAuth";
import { getGoogleTokens } from "../../../../lib/server/googleTokenStore";
import { getFreeBusy } from "../../../../lib/server/googleCalendar";

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

    const hasCalendarScope =
      tokens.calendarConnected ||
      (tokens.scopes && tokens.scopes.some((s) => s.includes("calendar")));

    if (!hasCalendarScope) {
      return NextResponse.json({
        status: "missing_scope",
        message: "Google Calendar scope is missing.",
        suggestedFix: "Reconnect Google account and grant Calendar permissions.",
      });
    }

    // Execute freebusy test
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 3600 * 1000);
    await getFreeBusy(user.uid, now.toISOString(), oneHourLater.toISOString());

    return NextResponse.json({
      status: "connected",
      message: "Google Calendar API freebusy test succeeded.",
      suggestedFix: null,
    });
  } catch (error: any) {
    console.error("Calendar health check error:", error);
    return NextResponse.json({
      status: "error",
      message: "Google Calendar API test failed.",
      suggestedFix: "Verify Google Calendar API enabled in Google Cloud Console or reconnect account.",
    });
  }
}
