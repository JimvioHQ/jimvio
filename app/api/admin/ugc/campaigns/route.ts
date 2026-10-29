import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { campaignFunding, type EscrowRow } from "@/lib/ugc/escrow-funding";

export const dynamic = "force-dynamic";

const LIMIT = 200;

export async function GET(req: NextRequest) {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return auth.error;

  const status = req.nextUrl.searchParams.get("status");
  const db = createServiceRoleClient();

  let query = db
    .from("ugc_campaigns")
    .select(
      `
      *,
      media:ugc_campaign_media(*),
      vendor:vendors!brand_id (
        business_name,
        business_logo,
        business_slug,
        business_country,
        verification_status,
        verified_at
      )
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .limit(LIMIT);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Could not load campaigns." }, { status: 500 });
  }

  const ids = (data ?? []).map((row) => row.id as string);
  const escrowByCampaign = new Map<string, "held" | "pending" | "unfunded">();
  const escrowRowsBy = new Map<string, EscrowRow[]>();
  if (ids.length) {
    const { data: escrowRows } = await db
      .from("ugc_campaign_escrow")
      .select("campaign_id, status, amount, currency, refunded_amount")
      .in("campaign_id", ids);
    for (const row of escrowRows ?? []) {
      const list = escrowRowsBy.get(String(row.campaign_id)) ?? [];
      list.push(row as EscrowRow);
      escrowRowsBy.set(String(row.campaign_id), list);
      const cid = String(row.campaign_id);
      if (row.status === "held") escrowByCampaign.set(cid, "held");
      else if (row.status === "pending" && escrowByCampaign.get(cid) !== "held") {
        escrowByCampaign.set(cid, "pending");
      }
    }
  }

  const activatorIds = [
    ...new Set(
      (data ?? [])
        .map((row) => (row.admin_activated_by as string | null | undefined) ?? null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const activatorName = new Map<string, string>();
  if (activatorIds.length) {
    const { data: people } = await db
      .from("profiles")
      .select("id, full_name, email")
      .in("id", activatorIds);
    for (const person of people ?? []) {
      const label = (person.full_name || person.email || "").trim();
      if (label) activatorName.set(person.id, label);
    }
  }

  const rows = (data ?? []).map((row) => ({
    ...row,
    escrow_state: escrowByCampaign.get(row.id as string) ?? "unfunded",
    funding: (() => {
      const f = campaignFunding({
        escrow: escrowRowsBy.get(row.id as string) ?? [],
        totalBudget: row.total_budget as number | null,
        spentBudget: row.spent_budget as number | null,
      });
      return { state: f.state, heldUsd: f.heldUsd, coveragePct: f.coveragePct, remainingUsd: f.remainingUsd };
    })(),
    admin_activator_name: row.admin_activated_by
      ? activatorName.get(row.admin_activated_by as string) ?? null
      : null,
  }));

  return NextResponse.json({ data: rows, total: count ?? rows.length });
}
