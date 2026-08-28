import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { requireBrandWorkspace } from "@/lib/ugc/enterprise/brand-access";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const ws = await requireBrandWorkspace(user.id);
  if (!ws.ok) return NextResponse.json({ error: ws.error }, { status: ws.status });
  const { db, vendor } = ws;

  const { data: sub } = await db
    .from("ugc_webhook_subscriptions")
    .select("id")
    .eq("id", id)
    .eq("brand_id", vendor.id)
    .maybeSingle();
  if (!sub) return NextResponse.json({ error: "Webhook not found" }, { status: 404 });

  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 50)));

  const { data, error: qErr } = await db
    .from("ugc_webhook_deliveries")
    .select("id, event_type, status, response_code, attempts, idempotency_key, created_at, delivered_at")
    .eq("subscription_id", id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}
