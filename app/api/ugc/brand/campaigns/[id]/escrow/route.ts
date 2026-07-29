import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceRoleClient();
  const { data: vendor } = await db
    .from("vendors")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!vendor?.id) return NextResponse.json({ error: "Vendor not found" }, { status: 403 });

  const { data: campaign } = await db
    .from("ugc_campaigns")
    .select("id, brand_id")
    .eq("id", id)
    .maybeSingle();
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (String(campaign.brand_id) !== String(vendor.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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

