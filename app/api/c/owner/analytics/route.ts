import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  ANALYTICS_RANGES,
  computeOwnerAnalytics,
  resolveAnalyticsContext,
  type AnalyticsRangeId,
} from "@/lib/community/owner-console/analytics";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const communityId = req.nextUrl.searchParams.get("communityId")?.trim() ?? "";
  if (!communityId) {
    return NextResponse.json({ error: "communityId is required" }, { status: 400 });
  }

  const ctx = await resolveAnalyticsContext(
    supabase,
    user.id,
    communityId,
    "analytics.view"
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const rangeRaw = req.nextUrl.searchParams.get("range")?.trim() ?? "30d";
  const range = (ANALYTICS_RANGES as readonly string[]).includes(rangeRaw)
    ? (rangeRaw as AnalyticsRangeId)
    : "30d";

  const admin = createServiceRoleClient();
  const analytics = await computeOwnerAnalytics(admin, {
    communityId,
    range,
    customStart: req.nextUrl.searchParams.get("start"),
    customEnd: req.nextUrl.searchParams.get("end"),
    groupId: req.nextUrl.searchParams.get("groupId"),
    channelId: req.nextUrl.searchParams.get("channelId"),
    role: req.nextUrl.searchParams.get("role"),
  });

  return NextResponse.json({ analytics, community: ctx });
}
