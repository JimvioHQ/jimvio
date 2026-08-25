import { NextResponse } from "next/server";
import { assertPlatformAdmin } from "@/lib/auth/platform-admin";
import { getLatestHealthSnapshot } from "@/lib/marketplace/intelligence-v4/persist";
import { runDailyLearning } from "@/lib/marketplace/intelligence-v4/run-intelligence";

async function assertAdmin() {
  const auth = await assertPlatformAdmin();
  return auth.ok;
}

export async function GET(req: Request) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const refresh = new URL(req.url).searchParams.get("refresh") === "1";

  if (refresh) {
    await runDailyLearning();
  }

  const health = await getLatestHealthSnapshot();
  return NextResponse.json({ success: true, health });
}
