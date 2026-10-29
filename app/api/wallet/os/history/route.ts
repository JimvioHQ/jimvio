import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { getWalletOsLedger } from "@/lib/wallet-os/ledger";
import { getWalletOsOverview } from "@/lib/wallet-os/overview";
import { buildBalanceSeries, incomeBySource } from "@/lib/wallet-os/history";

export const dynamic = "force-dynamic";

/** Real balance history (from the ledger) and income by source. */
export async function GET(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });
  const days = req.nextUrl.searchParams.get("days") === "30" ? 30 : 7;
  try {
    const [overview, page] = await Promise.all([getWalletOsOverview(user.id), getWalletOsLedger(user.id, { limit: 100 })]);
    const entries = page.entries.map((e) => ({
      amount: e.amount,
      direction: e.direction,
      status: e.status,
      createdAt: e.createdAt,
      surface: e.surface,
    }));
    const since = Date.now() - days * 86_400_000;
    return NextResponse.json({
      days,
      total: overview.netWorth,
      points: buildBalanceSeries(overview.netWorth, entries.filter((e) => Date.parse(e.createdAt) >= since), days),
      sources: incomeBySource(entries),
    });
  } catch (err) {
    console.error("GET /api/wallet/os/history failed", err);
    return NextResponse.json({ error: "Failed to load balance history" }, { status: 500 });
  }
}
