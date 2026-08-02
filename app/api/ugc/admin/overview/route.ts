import { NextResponse } from "next/server";
import { requireUser, isAdmin } from "@/lib/ugc/platform/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, db, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const admin = await isAdmin(user.id);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [
    campaignsRes,
    pendingSubsRes,
    reportsRes,
    escrowRes,
    suspiciousRes,
    payoutsRes,
  ] = await Promise.all([
    db.from("ugc_campaigns").select("id, status"),
    db
      .from("ugc_submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    db
      .from("ugc_reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    db.from("ugc_campaign_escrow").select("amount, status"),
    db
      .from("ugc_submissions")
      .select("id, campaign_id, influencer_id, fraud_score, is_suspicious, created_at, status")
      .eq("is_suspicious", true)
      .order("created_at", { ascending: false })
      .limit(25),
    db.from("ugc_payouts").select("amount, status"),
  ]);

  const campaigns = campaignsRes.data ?? [];
  const campaignCounts = {
    total: campaigns.length,
    draft: campaigns.filter((c) => c.status === "draft").length,
    active: campaigns.filter((c) => c.status === "active").length,
    paused: campaigns.filter((c) => c.status === "paused").length,
    completed: campaigns.filter((c) => c.status === "completed").length,
    cancelled: campaigns.filter((c) => c.status === "cancelled").length,
  };

  const escrowRows = escrowRes.data ?? [];
  const escrowTotals = {
    held: escrowRows
      .filter((e) => e.status === "held" || e.status === "active" || e.status === "deposited")
      .reduce((s, e) => s + Number(e.amount ?? 0), 0),
    released: escrowRows
      .filter((e) => e.status === "released")
      .reduce((s, e) => s + Number(e.amount ?? 0), 0),
    total: escrowRows.reduce((s, e) => s + Number(e.amount ?? 0), 0),
    count: escrowRows.length,
  };

  const payoutRows = payoutsRes.data ?? [];
  const payoutTotals = {
    pending: payoutRows
      .filter((p) => p.status === "pending")
      .reduce((s, p) => s + Number(p.amount ?? 0), 0),
    paid: payoutRows
      .filter((p) => p.status === "paid")
      .reduce((s, p) => s + Number(p.amount ?? 0), 0),
  };

  return NextResponse.json({
    campaigns: campaignCounts,
    pendingSubmissions: pendingSubsRes.count ?? 0,
    reportsCount: reportsRes.count ?? 0,
    escrow: escrowTotals,
    payouts: payoutTotals,
    suspiciousSubmissions: suspiciousRes.data ?? [],
  });
}
