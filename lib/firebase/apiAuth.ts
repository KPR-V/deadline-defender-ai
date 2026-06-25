import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "./admin";

export async function verifyApiAuth(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error("API Auth Error:", error);
    return null;
  }
}
