import { NextResponse } from "next/server";
import { assertPlatformAdmin } from "@/lib/auth/platform-admin";
import {
  computeAutoPublishAnalytics,
  getLatestAutoPublishAnalytics,
} from "@/lib/cj/premium-intelligence/auto-publish-analytics";

async function assertAdmin() {
  const auth = await assertPlatformAdmin();
  return auth.ok;
}

export async function GET(req: Request) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const refresh = new URL(req.url).searchParams.get("refresh") === "1";
    const analytics = refresh
      ? await computeAutoPublishAnalytics({ force: true })
      : (await getLatestAutoPublishAnalytics()) ??
        (await computeAutoPublishAnalytics());

    return NextResponse.json({ success: true, analytics });
  } catch (err) {
    console.error("[auto-publish/analytics]", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Analytics unavailable",
        analytics: null,
      },
      { status: 200 }
    );
  }
}
