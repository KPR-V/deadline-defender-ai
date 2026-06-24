import { env as clientEnv } from "../env";

export const serverEnv = {
  ...clientEnv,

  NODE_ENV: process.env.NODE_ENV || "development",

  FIREBASE_ADMIN_PROJECT_ID:
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "",
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || "",
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : "",

  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-2.5-flash",

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
  GOOGLE_OAUTH_REDIRECT_URI:
    process.env.GOOGLE_OAUTH_REDIRECT_URI ||
    `${clientEnv.APP_URL}/api/auth/google/callback`,

  GOOGLE_CALENDAR_SCOPES:
    process.env.GOOGLE_CALENDAR_SCOPES ||
    "https://www.googleapis.com/auth/calendar.freebusy https://www.googleapis.com/auth/calendar.events",
  GOOGLE_GMAIL_SCOPES:
    process.env.GOOGLE_GMAIL_SCOPES ||
    "https://www.googleapis.com/auth/gmail.readonly",
};

// Validate required server environment variables
export function validateServerEnv() {
  if (typeof window !== "undefined") {
    throw new Error("validateServerEnv can only be called on the server side.");
  }

  const missing: string[] = [];

  if (!serverEnv.GEMINI_API_KEY) missing.push("GEMINI_API_KEY");

  if (!serverEnv.ENABLE_DEMO_MODE) {
    if (!serverEnv.GOOGLE_CLIENT_ID) missing.push("GOOGLE_CLIENT_ID");
    if (!serverEnv.GOOGLE_CLIENT_SECRET) missing.push("GOOGLE_CLIENT_SECRET");
  }

  if (missing.length > 0 && process.env.NEXT_PHASE !== "phase-production-build") {
    console.warn(
      `⚠️ Missing optional/required server environment variables: ${missing.join(", ")}`,
    );
  }
}

validateServerEnv();
