import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCreatorRevenue, revenueCsv } from "@/services/creator-economy/revenue";

export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const days = Number(req.nextUrl.searchParams.get("days") ?? 30);
  const report = await getCreatorRevenue(user.id, days);
  if (req.nextUrl.searchParams.get("export") === "csv") return new NextResponse(revenueCsv(report), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=creator-revenue.csv" } });
  return NextResponse.json(report);
}
