import { NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, db, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  try {
    const { data, error: fetchError } = await db
      .from("community_subscription_events")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (fetchError) throw fetchError;

    const subscriptions = (data ?? []).map((row: {
      id: string;
      community_id: string;
      event_type: string;
      from_plan: string | null;
      to_plan: string | null;
      amount: number | string | null;
      currency: string | null;
      created_at: string;
    }) => ({
      id: row.id,
      communityId: row.community_id,
      eventType: row.event_type,
      fromPlan: row.from_plan ?? null,
      toPlan: row.to_plan ?? null,
      amount: row.amount !== null ? Number(row.amount) : null,
      currency: row.currency ?? null,
      createdAt: row.created_at,
    }));

    return NextResponse.json({ subscriptions });
  } catch (err) {
    console.error("GET /api/wallet/os/subscriptions failed", err);
    return NextResponse.json({ subscriptions: [] });
  }
}
