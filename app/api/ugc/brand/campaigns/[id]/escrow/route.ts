import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireCampaignPermission } from "@/lib/ugc/enterprise/brand-access";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await requireCampaignPermission(user.id, id, "finance.view");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const db = access.db;

  const { data: escrow } = await db
    .from("ugc_campaign_escrow")
    .select("id, status, amount, currency, payment_method, payment_ref, deposited_at, released_at")
    .eq("campaign_id", id)
    .order("deposited_at", { ascending: false })
    .limit(5);

  return NextResponse.json({
    campaignId: id,
    escrow: (escrow ?? []).map((e) => ({
      id: String(e.id),
      status: String(e.status ?? "held"),
      amount: Number(e.amount ?? 0),
      currency: e.currency ?? "RWF",
      paymentMethod: e.payment_method ?? null,
      paymentRef: e.payment_ref ?? null,
      depositedAt: e.deposited_at ? String(e.deposited_at) : null,
      releasedAt: e.released_at ? String(e.released_at) : null,
    })),
  });
}

