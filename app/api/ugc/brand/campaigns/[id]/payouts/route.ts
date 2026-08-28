import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireCampaignPermission } from "@/lib/ugc/enterprise/brand-access";

export const dynamic = "force-dynamic";

type PayoutRow = {
  id: string;
  submission_id: string;
  influencer_id: string;
  amount: number | string | null;
  status: "pending" | "approved" | "paid";
  paid_at: string | null;
  created_at: string | null;
  payout_id: string | null;
  ugc_submissions?: unknown;
  influencer?: {
    id: string;
    display_name: string;
    profile_image: string | null;
    user_id: string;
  } | null;
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await requireCampaignPermission(user.id, id, "finance.view");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const db = access.db;

  const { data: submissions } = await db
    .from("ugc_submissions")
    .select(
      `
      id,
      influencer_id,
      ugc_payouts (
        id,
        submission_id,
        influencer_id,
        amount,
        status,
        paid_at,
        created_at,
        payout_id
      ),
      influencer:influencers!influencer_id (
        id,
        display_name,
        profile_image,
        user_id
      )
    `,
    )
    .eq("campaign_id", id)
    .order("created_at", { ascending: false });

  const payoutItems: Array<{
    payoutId: string;
    submissionId: string;
    influencerId: string;
    influencerName: string;
    avatarUrl: string | null;
    amount: number;
    status: "pending" | "processing" | "paid";
    createdAt: string | null;
    paidAt: string | null;
  }> = [];

  for (const sub of submissions ?? []) {
    const inf = (sub as any).influencer as PayoutRow["influencer"] | null;
    for (const p of (sub as any).ugc_payouts ?? []) {
      const rawStatus = String(p.status ?? "pending");
      const uiStatus = rawStatus === "approved" ? "processing" : rawStatus === "paid" ? "paid" : "pending";
      payoutItems.push({
        payoutId: String(p.id),
        submissionId: String(sub.id),
        influencerId: String(p.influencer_id ?? sub.influencer_id),
        influencerName: inf?.display_name ?? "Creator",
        avatarUrl: inf?.profile_image ?? null,
        amount: Number(p.amount ?? 0),
        status: uiStatus,
        createdAt: p.created_at ? String(p.created_at) : null,
        paidAt: p.paid_at ? String(p.paid_at) : null,
      });
    }
  }

  const pending = payoutItems.filter((p) => p.status === "pending").length;
  const processing = payoutItems.filter((p) => p.status === "processing").length;
  const paid = payoutItems.filter((p) => p.status === "paid").length;
  const totalAmount = payoutItems.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

  return NextResponse.json({
    campaignId: id,
    summary: { pending, processing, paid, totalAmount },
    payouts: payoutItems.sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0)),
  });
}

