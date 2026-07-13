import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canUserAccessLiveSession } from "@/lib/actions/live-sessions";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasAccess = await canUserAccessLiveSession(user.id, sessionId);
  if (!hasAccess) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { data: tiers, error } = await supabase
    .from("live_ticket_tiers")
    .select("*")
    .eq("session_id", sessionId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = new Date();
  const tiersWithAvailability = (tiers || []).map(tier => ({
    ...tier,
    available: !tier.max_quantity || tier.sold_quantity < tier.max_quantity,
    remaining: tier.max_quantity ? Math.max(0, tier.max_quantity - tier.sold_quantity) : null,
    saleActive: (!tier.sale_starts_at || new Date(tier.sale_starts_at) <= now) &&
                (!tier.sale_ends_at || new Date(tier.sale_ends_at) >= now),
  }));

  return NextResponse.json({ tiers: tiersWithAvailability });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: session } = await supabase
    .from("live_sessions")
    .select("host_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session || session.host_id !== user.id) {
    return NextResponse.json({ error: "Only host can create ticket tiers" }, { status: 403 });
  }

  const body = await request.json();
  const { name, description, priceUsd, priceCurrency = "USD", maxQuantity, perks = [], saleStartsAt, saleEndsAt, sortOrder = 0 } = body;

  if (!name || priceUsd === undefined) {
    return NextResponse.json({ error: "Name and price required" }, { status: 400 });
  }

  const tierId = crypto.randomUUID();

  const { data: tier, error } = await supabase
    .from("live_ticket_tiers")
    .insert({
      id: tierId,
      session_id: sessionId,
      name,
      description: description ?? null,
      price_usd: priceUsd,
      price_currency: priceCurrency,
      max_quantity: maxQuantity ?? null,
      perks,
      sale_starts_at: saleStartsAt ?? null,
      sale_ends_at: saleEndsAt ?? null,
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tier });
}