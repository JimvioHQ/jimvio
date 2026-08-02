import { NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { rateLimit } from "@/lib/ops/rate-limit";
import { computeAiInsights } from "@/lib/identity/ai-profile";

export const dynamic = "force-dynamic";

/**
 * GET /api/identity/ai — current user's AI insights. Computes on first
 * access if no cached row exists yet.
 */
export async function GET() {
  const { user, db, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { data: existing } = await db
    .from("jip_ai_insights")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return NextResponse.json({ data: existing });

  const insights = await computeAiInsights(user.id);
  return NextResponse.json({ data: insights });
}

/**
 * POST /api/identity/ai — force a recompute of AI insights.
 */
export async function POST() {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const limited = rateLimit(`identity-ai-recompute:${user.id}`, 10, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const insights = await computeAiInsights(user.id);
  return NextResponse.json({ data: insights });
}
