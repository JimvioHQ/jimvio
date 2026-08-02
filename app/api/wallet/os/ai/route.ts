import { NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { computeWalletAiInsights, getCachedWalletAiInsights } from "@/lib/wallet-os/ai";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  try {
    const insights = (await getCachedWalletAiInsights(user.id)) ?? (await computeWalletAiInsights(user.id));
    return NextResponse.json({ insights });
  } catch (err) {
    console.error("GET /api/wallet/os/ai failed", err);
    return NextResponse.json({ error: "Failed to load AI insights" }, { status: 500 });
  }
}

export async function POST() {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  try {
    const insights = await computeWalletAiInsights(user.id);
    return NextResponse.json({ insights });
  } catch (err) {
    console.error("POST /api/wallet/os/ai failed", err);
    return NextResponse.json({ error: "Failed to recompute AI insights" }, { status: 500 });
  }
}
