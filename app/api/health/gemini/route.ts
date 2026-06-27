import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "../../../../lib/firebase/apiAuth";
import { serverEnv } from "../../../../lib/server/env";
import { GoogleGenAI } from "@google/genai";

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

    if (!serverEnv.GEMINI_API_KEY) {
      return NextResponse.json({
        status: "error",
        message: "Gemini API key is missing.",
        suggestedFix: "Configure GEMINI_API_KEY in your server environment.",
      });
    }

    const ai = new GoogleGenAI({ apiKey: serverEnv.GEMINI_API_KEY });
    const model = serverEnv.GEMINI_MODEL || "gemini-2.5-flash";

    await ai.models.generateContent({
      model,
      contents: "ping",
    });

    return NextResponse.json({
      status: "connected",
      message: "Gemini API is connected and operating normally.",
      suggestedFix: null,
    });
  } catch (error: any) {
    const errStr = String(error?.message || error).toLowerCase();
    console.error("Gemini health check error:", error);

    if (errStr.includes("quota") || errStr.includes("429")) {
      return NextResponse.json({
        status: "error",
        message: "Gemini API quota exceeded.",
        suggestedFix: "Check Google AI Studio quota limits or billing settings.",
      });
    }

    if (errStr.includes("key") || errStr.includes("auth") || errStr.includes("401") || errStr.includes("403")) {
      return NextResponse.json({
        status: "error",
        message: "Gemini API key is invalid or unauthorized.",
        suggestedFix: "Verify your GEMINI_API_KEY token.",
      });
    }

    return NextResponse.json({
      status: "error",
      message: "Gemini model unavailable or failed to respond.",
      suggestedFix: "Check network connectivity or verify configured Gemini model ID.",
    });
  }
}
