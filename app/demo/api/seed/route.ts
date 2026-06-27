import { NextRequest, NextResponse } from "next/server";
import { isDemoMode } from "../../../../lib/demo/isDemoMode";
import { seedDemoData } from "../../../../lib/demo/demoSeeder";
import { verifyApiAuth } from "../../../../lib/firebase/apiAuth";

export async function POST(req: NextRequest) {
  if (!isDemoMode()) {
    return NextResponse.json({ error: "Demo mode is disabled in production." }, { status: 403 });
  }

  try {
    const user = await verifyApiAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await seedDemoData(user.uid);
    return NextResponse.json({ success: true, message: "Demo data seeded successfully." });
  } catch (error: any) {
    console.error("Error seeding demo data:", error);
    return NextResponse.json({ error: error.message || "Failed to seed demo data" }, { status: 500 });
  }
}
