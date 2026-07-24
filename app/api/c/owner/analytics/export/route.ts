import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  ANALYTICS_RANGES,
  computeOwnerAnalytics,
  resolveAnalyticsContext,
  type AnalyticsExportFormat,
  type AnalyticsRangeId,
} from "@/lib/community/owner-console/analytics";

export const dynamic = "force-dynamic";

function flattenForCsv(analytics: Awaited<ReturnType<typeof computeOwnerAnalytics>>) {
  const rows: Record<string, string | number>[] = [];
  for (const s of analytics.overview.scores) {
    rows.push({ section: "score", key: s.id, label: s.label, value: s.score });
  }
  rows.push({
    section: "totals",
    key: "members",
    label: "Members",
    value: analytics.overview.totals.members,
  });
  rows.push({
    section: "totals",
    key: "messages",
    label: "Messages",
    value: analytics.overview.totals.messages,
  });
  for (const p of analytics.overview.growthSeries) {
    rows.push({
      section: "growth",
      key: p.date,
      label: "New members",
      value: p.value,
    });
  }
  return rows;
}

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

  const format = (req.nextUrl.searchParams.get("format")?.trim() ||
    "csv") as AnalyticsExportFormat;

  let ctx = await resolveAnalyticsContext(
    supabase,
    user.id,
    communityId,
    "analytics.export"
  );
  if ("error" in ctx) {
    ctx = await resolveAnalyticsContext(
      supabase,
      user.id,
      communityId,
      "analytics.manage"
    );
  }
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  if (format === "api") {
    return NextResponse.json({
      ok: true,
      accepted: false,
      message: "API export is future-ready",
    });
  }

  if (format === "pdf") {
    return NextResponse.json({
      ok: true,
      accepted: false,
      message: "PDF export is future-ready — use CSV or Excel",
    });
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

  const rows = flattenForCsv(analytics);

  if (format === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Analytics");
    sheet.columns = [
      { header: "Section", key: "section", width: 16 },
      { header: "Key", key: "key", width: 24 },
      { header: "Label", key: "label", width: 28 },
      { header: "Value", key: "value", width: 14 },
    ];
    for (const row of rows) sheet.addRow(row);
    const buf = await workbook.xlsx.writeBuffer();
    return new NextResponse(Buffer.from(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="community-analytics.xlsx"`,
      },
    });
  }

  const header = "section,key,label,value\n";
  const body = rows
    .map(
      (r) =>
        `${r.section},${JSON.stringify(String(r.key))},${JSON.stringify(String(r.label))},${r.value}`
    )
    .join("\n");
  return new NextResponse(header + body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="community-analytics.csv"`,
    },
  });
}
