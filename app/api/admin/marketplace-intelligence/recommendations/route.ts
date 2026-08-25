import { NextResponse } from "next/server";
import { assertPlatformAdmin } from "@/lib/auth/platform-admin";
import { computeMarketplaceIntelligenceAnalytics } from "@/lib/marketplace/intelligence-v4/analytics";

async function assertAdmin() {
  const auth = await assertPlatformAdmin();
  return auth.ok;
}

export async function GET() {
  if (!(await assertAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { recommendations } = await computeMarketplaceIntelligenceAnalytics();
  return NextResponse.json({ success: true, recommendations });
}
