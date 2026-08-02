import { NextResponse } from "next/server";
import { requireUser, requireVendor } from "@/lib/ugc/platform/auth";
import { roleCan } from "@/lib/ugc/enterprise/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { db, vendor } = await requireVendor(user.id);
  if (!vendor) return NextResponse.json({ error: "Brand account required" }, { status: 403 });
  if (!roleCan("owner", "finance.view") && !roleCan("finance", "finance.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: campaigns } = await db
    .from("ugc_campaigns")
    .select("id, title, status, total_budget, spent_budget")
    .eq("brand_id", vendor.id);

  const campaignIds = (campaigns ?? []).map((c) => c.id);

  let escrowRows: Array<{
    id: string;
    campaign_id: string;
    amount: number | null;
    locked_amount: number | null;
    released_amount: number | null;
    refunded_amount: number | null;
    status: string | null;
    currency: string | null;
  }> = [];

  let ledgerRows: Array<Record<string, unknown>> = [];

  if (campaignIds.length > 0) {
    const [escrowRes, ledgerRes] = await Promise.all([
      db
        .from("ugc_campaign_escrow")
        .select("id, campaign_id, amount, locked_amount, released_amount, refunded_amount, status, currency")
        .in("campaign_id", campaignIds),
      db
        .from("ugc_escrow_ledger")
        .select("*")
        .eq("brand_id", vendor.id)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    escrowRows = (escrowRes.data ?? []) as typeof escrowRows;
    ledgerRows = (ledgerRes.data ?? []) as typeof ledgerRows;
  }

  const totals = {
    locked: escrowRows.reduce((s, e) => s + Number(e.locked_amount ?? 0), 0),
    released: escrowRows.reduce((s, e) => s + Number(e.released_amount ?? 0), 0),
    refunded: escrowRows.reduce((s, e) => s + Number(e.refunded_amount ?? 0), 0),
    funded: escrowRows.reduce((s, e) => s + Number(e.amount ?? 0), 0),
  };

  const campaignById = new Map((campaigns ?? []).map((c) => [c.id, c]));
  const escrowByCampaign = escrowRows.map((e) => ({
    ...e,
    campaign: campaignById.get(e.campaign_id) ?? null,
  }));

  return NextResponse.json({
    totals,
    escrow: escrowByCampaign,
    ledger: ledgerRows,
  });
}
