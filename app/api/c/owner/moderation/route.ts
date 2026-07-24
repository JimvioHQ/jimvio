import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  REPORT_SELECT,
  asReportRow,
  mapReportRow,
  resolveModerationContext,
  type OwnerModerationOverview,
} from "@/lib/community/owner-console/moderation";

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

  const ctx = await resolveModerationContext(
    supabase,
    user.id,
    communityId,
    "moderation.view"
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const queue = req.nextUrl.searchParams.get("queue")?.trim() || "reports";
  const status = req.nextUrl.searchParams.get("status")?.trim() || "open";
  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const risk = req.nextUrl.searchParams.get("risk")?.trim() ?? "";
  const limit = Math.min(
    Number(req.nextUrl.searchParams.get("limit") ?? 100) || 100,
    300
  );

  const admin = createServiceRoleClient();
  const now = new Date().toISOString();

  const [
    { count: openReports },
    { count: spam },
    { count: scam },
    { count: appeals },
    { count: muted },
    { count: suspended },
    { count: banned },
  ] = await Promise.all([
    admin
      .from("community_content_reports")
      .select("id", { count: "exact", head: true })
      .eq("community_id", communityId)
      .eq("status", "open"),
    admin
      .from("community_content_reports")
      .select("id", { count: "exact", head: true })
      .eq("community_id", communityId)
      .eq("queue", "spam")
      .eq("status", "open"),
    admin
      .from("community_content_reports")
      .select("id", { count: "exact", head: true })
      .eq("community_id", communityId)
      .eq("queue", "scam")
      .eq("status", "open"),
    admin
      .from("community_moderation_appeals")
      .select("id", { count: "exact", head: true })
      .eq("community_id", communityId)
      .in("status", ["open", "in_review"]),
    admin
      .from("community_memberships")
      .select("id", { count: "exact", head: true })
      .eq("community_id", communityId)
      .gt("muted_until", now),
    admin
      .from("community_memberships")
      .select("id", { count: "exact", head: true })
      .eq("community_id", communityId)
      .or(`suspended_until.gt.${now},status.eq.suspended`),
    admin
      .from("community_memberships")
      .select("id", { count: "exact", head: true })
      .eq("community_id", communityId)
      .eq("status", "banned"),
  ]);

  const overview: OwnerModerationOverview = {
    openReports: openReports ?? 0,
    spam: spam ?? 0,
    scam: scam ?? 0,
    appeals: appeals ?? 0,
    muted: muted ?? 0,
    suspended: suspended ?? 0,
    banned: banned ?? 0,
    avgResponseHours: null,
  };

  // Content queues
  if (["reports", "messages", "posts", "files", "spam", "scam"].includes(queue)) {
    let query = admin
      .from("community_content_reports")
      .select(REPORT_SELECT)
      .eq("community_id", communityId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (queue !== "reports") {
      query = query.eq("queue", queue);
    }
    if (status !== "all") {
      query = query.eq("status", status);
    }
    if (risk) {
      query = query.eq("risk_level", risk);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    let reports = (data ?? []).map((row) => mapReportRow(asReportRow(row)));
    if (q) {
      reports = reports.filter(
        (r) =>
          r.reason.toLowerCase().includes(q) ||
          (r.details ?? "").toLowerCase().includes(q) ||
          (r.contentPreview ?? "").toLowerCase().includes(q) ||
          (r.reporterName ?? "").toLowerCase().includes(q) ||
          (r.reportedUserName ?? "").toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ overview, reports, community: ctx });
  }

  return NextResponse.json({ overview, reports: [], community: ctx });
}
