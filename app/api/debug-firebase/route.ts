import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const steps: string[] = [];
  try {
    steps.push("Starting debug check...");
    
    steps.push("Checking environment variables...");
    const hasProject = !!process.env.FIREBASE_PROJECT_ID || !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const hasEmail = !!process.env.FIREBASE_CLIENT_EMAIL;
    const keyLen = process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.length : 0;
    steps.push(`Env status: project=${hasProject}, email=${hasEmail}, keyLength=${keyLen}`);

    steps.push("Dynamically importing firebase-admin/app...");
    const appMod = await import("firebase-admin/app");
    steps.push(`getApps count before: ${appMod.getApps().length}`);

    steps.push("Dynamically importing lib/firebase/admin...");
    const adminMod = await import("../../../lib/firebase/admin");
    steps.push("Imported lib/firebase/admin successfully.");

    steps.push("Testing adminDb.collection access...");
    try {
      const doc = await adminMod.adminDb.collection("users").doc("health_test").get();
      steps.push(`Firestore read success. Exists: ${doc.exists}`);
    } catch (dbErr: any) {
      steps.push(`Firestore read failed: ${dbErr.message}`);
    }

    return NextResponse.json({
      status: "success",
      steps,
      env: { hasProject, hasEmail, keyLen }
    });
  } catch (err: any) {
    return NextResponse.json({
      status: "error",
      steps,
      errorName: err?.name,
      errorMessage: err?.message || String(err),
      errorStack: err?.stack
    }, { status: 200 });
  }
}
