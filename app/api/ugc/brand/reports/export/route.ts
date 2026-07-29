import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

export const dynamic = "force-dynamic";

function csvEscape(v: unknown): string {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function buildCsv(rows: Record<string, unknown>[], columns: string[]) {
  const header = columns.map(csvEscape).join(",");
  const body = rows
    .map((r) => columns.map((c) => csvEscape(r[c])).join(","))
    .join("\n");
  return `${header}\n${body}\n`;
}

function bufferToArrayBuffer(buf: Buffer): ArrayBuffer {
  // Force to a plain ArrayBuffer for NextResponse BodyInit typings.
  return (buf.buffer as ArrayBuffer).slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const type = sp.get("type") ?? "campaigns"; // campaigns | creators | financial
  const format = sp.get("format") ?? "csv"; // csv | xlsx | pdf

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceRoleClient();
  const { data: vendor } = await db
    .from("vendors")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!vendor?.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (type === "financial") {
    const { data: campaigns } = await db
      .from("ugc_campaigns")
      .select("id, status, total_budget, spent_budget, total_views_tracked, updated_at")
      .eq("brand_id", vendor.id);
    const list = campaigns ?? [];
    const totalSpend = list.reduce((s, c) => s + Number(c.spent_budget ?? 0), 0);
    const totalBudget = list.reduce((s, c) => s + Number(c.total_budget ?? 0), 0);
    const totalViews = list.reduce((s, c) => s + Number(c.total_views_tracked ?? 0), 0);

    const payloadRows = [
      {
        metric: "Total Spend",
        value: totalSpend,
      },
      { metric: "Total Budget", value: totalBudget },
      { metric: "Total Views Tracked", value: totalViews },
    ];
    const columns = ["metric", "value"];

    if (format === "csv") {
      const csv = await buildCsv(payloadRows, columns);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="ugc_financial_report.csv"`,
        },
      });
    }

    if (format === "xlsx") {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Financial Report");
      ws.columns = columns.map((c) => ({ header: c, key: c }));
      payloadRows.forEach((r) => ws.addRow(r));
      const buf = await wb.xlsx.writeBuffer();
      return new NextResponse(buf as any, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="ugc_financial_report.xlsx"`,
        },
      });
    }

    if (format === "pdf") {
      const doc = new PDFDocument({ margin: 40 });
      const chunks: Buffer[] = [];
      doc.on("data", (d) => chunks.push(d));
      const endPromise = new Promise<Buffer>((resolve, reject) => {
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", (err) => reject(err));
      });
      doc.fontSize(18).text("UGC Financial Report", { align: "left" });
      doc.moveDown(1);
      doc.fontSize(12).text(`Generated for vendor: ${vendor.id}`);
      doc.moveDown(1.5);
      payloadRows.forEach((r, i) => {
        doc.fontSize(12).text(`${i + 1}. ${String(r.metric)}: ${String(r.value)}`);
      });
      doc.end();
      const buf = await endPromise;
      return new NextResponse(bufferToArrayBuffer(buf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="ugc_financial_report.pdf"`,
        },
      });
    }

    return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  }

  // campaigns | creators (campaigns first)
  const { data: campaigns } = await db
    .from("ugc_campaigns")
    .select(
      "id, title, status, campaign_type, total_budget, spent_budget, total_views_tracked, submission_count, approved_count, updated_at",
    )
    .eq("brand_id", vendor.id)
    .order("updated_at", { ascending: false })
    .limit(200);

  const campaignList = campaigns ?? [];

  if (type === "creators") {
    const campaignIds = campaignList.map((c) => c.id);
    const { data: participants } = campaignIds.length
      ? await db
          .from("ugc_campaign_participants")
          .select("influencer_id, status, ugc_campaigns!campaign_id(status), campaign:ugc_campaigns!campaign_id(title), influencers:influencers!influencer_id(user_id)")
          .in("campaign_id", campaignIds)
      : { data: [] as any[] };

    // Lightweight: just count accepted participants per influencer.
    const byInf = new Map<
      string,
      { influencer_id: string; total: number; accepted: number; rejected: number }
    >();
    for (const p of participants ?? []) {
      const infId = String(p.influencer_id);
      const bucket = byInf.get(infId) ?? { influencer_id: infId, total: 0, accepted: 0, rejected: 0 };
      bucket.total += 1;
      if (p.status === "accepted") bucket.accepted += 1;
      if (p.status === "rejected") bucket.rejected += 1;
      byInf.set(infId, bucket);
    }

    const influencerIds = [...byInf.keys()].slice(0, 50);
    const { data: infRows } = influencerIds.length
      ? await db
          .from("influencers")
          .select("id, display_name, profile_image, total_followers, engagement_rate, is_verified")
          .in("id", influencerIds)
      : { data: [] as any[] };

    const infById = new Map<string, any>((infRows ?? []).map((r) => [String(r.id), r]));

    const rows = [...byInf.values()]
      .map((b) => {
        const inf = infById.get(b.influencer_id) ?? {};
        const approvalRate = b.accepted + b.rejected > 0 ? Math.round((b.accepted / (b.accepted + b.rejected)) * 100) : 0;
        return {
          influencer_id: b.influencer_id,
          display_name: inf.display_name ?? "Creator",
          total_followers: Number(inf.total_followers ?? 0),
          engagement_rate: Number(inf.engagement_rate ?? 0),
          is_verified: Boolean(inf.is_verified ?? false),
          total_records: b.total,
          approval_rate: approvalRate,
        };
      })
      .sort((a, b) => (b.approval_rate ?? 0) - (a.approval_rate ?? 0))
      .slice(0, 50);

    const columns = [
      "influencer_id",
      "display_name",
      "total_followers",
      "engagement_rate",
      "is_verified",
      "total_records",
      "approval_rate",
    ];

    if (format === "csv") {
      const csv = await buildCsv(rows, columns);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="ugc_creator_report.csv"`,
        },
      });
    }

    if (format === "xlsx") {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Creator Report");
      ws.columns = columns.map((c) => ({ header: c, key: c }));
      rows.forEach((r) => ws.addRow(r));
      const buf = await wb.xlsx.writeBuffer();
      return new NextResponse(buf as any, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="ugc_creator_report.xlsx"`,
        },
      });
    }

    if (format === "pdf") {
      const doc = new PDFDocument({ margin: 40 });
      const chunks: Buffer[] = [];
      doc.on("data", (d) => chunks.push(d));
      const endPromise = new Promise<Buffer>((resolve, reject) => {
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", (err) => reject(err));
      });
      doc.fontSize(18).text("UGC Creator Report", { align: "left" });
      doc.moveDown(1);
      doc.fontSize(11).text(`Generated for vendor: ${vendor.id}`);
      doc.moveDown(0.7);
      doc.fontSize(10).text(`Showing top ${rows.length} creators (approx).`);
      doc.moveDown(1);
      rows.slice(0, 20).forEach((r, i) => {
        doc.fontSize(10).text(
          `${i + 1}. ${String(r.display_name)} — followers ${String(r.total_followers)} — approval ${String(r.approval_rate)}%`,
        );
      });
      doc.end();
      const buf = await endPromise;
      return new NextResponse(bufferToArrayBuffer(buf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="ugc_creator_report.pdf"`,
        },
      });
    }

    return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  }

  // campaigns report
  const rows = campaignList.map((c) => ({
    id: c.id,
    title: c.title,
    status: c.status,
    campaign_type: c.campaign_type,
    total_budget: Number(c.total_budget ?? 0),
    spent_budget: Number(c.spent_budget ?? 0),
    total_views_tracked: Number(c.total_views_tracked ?? 0),
    submission_count: Number(c.submission_count ?? 0),
    approved_count: Number(c.approved_count ?? 0),
    updated_at: c.updated_at ? String(c.updated_at) : "",
  }));
  const columns = [
    "id",
    "title",
    "status",
    "campaign_type",
    "total_budget",
    "spent_budget",
    "total_views_tracked",
    "submission_count",
    "approved_count",
    "updated_at",
  ];

  if (format === "csv") {
    const csv = await buildCsv(rows, columns);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ugc_campaign_report.csv"`,
      },
    });
  }

  if (format === "xlsx") {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Campaign Report");
    ws.columns = columns.map((c) => ({ header: c, key: c }));
    rows.forEach((r) => ws.addRow(r));
    const buf = await wb.xlsx.writeBuffer();
    return new NextResponse(buf as any, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="ugc_campaign_report.xlsx"`,
      },
    });
  }

  if (format === "pdf") {
    const doc = new PDFDocument({ margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (d) => chunks.push(d));
    const endPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));
    });
    doc.fontSize(18).text("UGC Campaign Report", { align: "left" });
    doc.moveDown(1);
    doc.fontSize(11).text(`Generated for vendor: ${vendor.id}`);
    doc.moveDown(1);

    rows.slice(0, 30).forEach((r, i) => {
      doc.fontSize(10).text(
        `${i + 1}. ${String(r.title)} (${String(r.status)}) — spend ${String(r.spent_budget)} — views ${String(r.total_views_tracked)} — approvals ${String(r.approved_count)}`,
      );
      if (i % 4 === 3) doc.moveDown(0.2);
    });
    doc.end();
    const buf = await endPromise;
    return new NextResponse(bufferToArrayBuffer(buf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ugc_campaign_report.pdf"`,
      },
    });
  }

  return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
}

