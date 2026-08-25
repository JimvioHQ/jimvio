import { NextResponse } from "next/server";
import { assertPlatformAdmin } from "@/lib/auth/platform-admin";
import { getTopRankedProducts } from "@/lib/marketplace/intelligence-v4/persist";

async function assertAdmin() {
  const auth = await assertPlatformAdmin();
  return auth.ok;
}

export async function GET(req: Request) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const limit = Math.min(100, Number(new URL(req.url).searchParams.get("limit") ?? 50));
  const rankings = await getTopRankedProducts(limit);
  return NextResponse.json({ success: true, rankings });
}
