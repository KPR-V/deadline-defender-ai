import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "../../../../lib/firebase/apiAuth";
import { getGoogleTokens, markReconnectRequired, updateGoogleTokens } from "../../../../lib/server/googleTokenStore";
import { google } from "googleapis";

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
        suggestedFix: "Connect Google Workspace from Settings.",
      });
    }

    if (tokens.reconnectRequired) {
      return NextResponse.json({
        status: "reconnect_required",
        message: "Google OAuth token expired or access revoked.",
        suggestedFix: "Click Reconnect to re-authorize Google Workspace.",
      });
    }

    // Check if expiry date reached and test refresh
    if (tokens.expiryDate && Date.now() >= tokens.expiryDate) {
      if (!tokens.refreshToken) {
        await markReconnectRequired(user.uid);
        return NextResponse.json({
          status: "reconnect_required",
          message: "Google token expired and no refresh token available.",
          suggestedFix: "Click Reconnect to re-authorize Google Workspace.",
        });
      }

      try {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI || process.env.GOOGLE_OAUTH_REDIRECT_URI
        );
        oauth2Client.setCredentials({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
        });

        const { credentials } = await oauth2Client.refreshAccessToken();
        await updateGoogleTokens(user.uid, {
          accessToken: credentials.access_token!,
          expiryDate: credentials.expiry_date || Date.now() + 3600 * 1000,
        });
      } catch (err) {
        console.error("Token refresh failed during Google health check:", err);
        await markReconnectRequired(user.uid);
        return NextResponse.json({
          status: "reconnect_required",
          message: "Failed to refresh Google OAuth token.",
          suggestedFix: "Click Reconnect to re-authorize Google Workspace.",
        });
      }
    }

    return NextResponse.json({
      status: "connected",
      message: "Google OAuth is connected and tokens are valid.",
      suggestedFix: null,
    });
  } catch (error: any) {
    console.error("Google health check error:", error);
    return NextResponse.json({
      status: "error",
      message: "An error occurred checking Google OAuth status.",
      suggestedFix: "Try reconnecting your Google account.",
    });
  }
}
