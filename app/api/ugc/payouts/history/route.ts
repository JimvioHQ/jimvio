import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireInfluencer } from "@/lib/ugc/platform/auth";

export const dynamic = "force-dynamic";

function toCsv(
  rows: Array<{
    id: string;
    amount: number;
    status: string;
    created_at: string | null;
    paid_at: string | null;
    campaign_title: string;
    campaign_id: string;
    submission_id: string;
  }>
) {
  const header = [
    "id",
    "campaign_id",
    "campaign_title",
    "submission_id",
    "amount",
    "status",
    "created_at",
    "paid_at",
  ];
  const escape = (v: string | number | null) => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        r.id,
        r.campaign_id,
        r.campaign_title,
        r.submission_id,
        r.amount,
        r.status,
        r.created_at,
        r.paid_at,
      ]
        .map(escape)
        .join(",")
    ),
  ];
  return lines.join("\n");
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const { db, influencer } = await requireInfluencer(user.id);
  if (!influencer) {
    return NextResponse.json({ error: "Influencer profile required", needsProfile: true }, { status: 403 });
  }

  const format = req.nextUrl.searchParams.get("format");
  const status = req.nextUrl.searchParams.get("status") ?? undefined;

  let query = db
    .from("ugc_payouts")
    .select(
      `
      id, amount, status, paid_at, created_at, payout_id, submission_id,
      submission:ugc_submissions!submission_id (
        id, campaign_id, post_url, platform,
        campaign:ugc_campaigns!campaign_id (
          id, title, status, campaign_type
        )
      )
    `
    )
    .eq("influencer_id", influencer.id)
    .order("created_at", { ascending: false })
    .limit(500);

  if (status) query = query.eq("status", status);

  const { data, error: qErr } = await query;
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  const rows = (data ?? []).map((p) => {
    const submission = p.submission as unknown as {
      id: string;
      campaign_id: string;
      campaign: { id: string; title: string } | null;
    } | null;
    return {
      id: p.id,
      amount: Number(p.amount ?? 0),
      status: p.status,
      created_at: p.created_at,
      paid_at: p.paid_at,
      payout_id: p.payout_id,
      submission_id: p.submission_id,
      campaign_id: submission?.campaign_id ?? "",
      campaign_title: submission?.campaign?.title ?? "",
      campaign: submission?.campaign ?? null,
      submission,
    };
  });

  if (format === "csv") {
    const csv = toCsv(rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="ugc-payout-history.csv"',
      },
    });
  }

  const summary = {
    total: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
    approved: rows.filter((r) => r.status === "approved").length,
    paid: rows.filter((r) => r.status === "paid").length,
    totalAmount: rows.reduce((s, r) => s + r.amount, 0),
    paidAmount: rows
      .filter((r) => r.status === "paid")
      .reduce((s, r) => s + r.amount, 0),
  };

  return NextResponse.json({ data: rows, summary });
}
