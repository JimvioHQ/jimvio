import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canUserAccessLiveSession } from "@/lib/actions/live-sessions";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; tierId: string }> }
) {
  const { sessionId, tierId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasAccess = await canUserAccessLiveSession(user.id, sessionId);
  if (!hasAccess) {
    return NextResponse.json({ error: "Access denied to session" }, { status: 403 });
  }

  const body = await request.json();
  const { quantity = 1, paymentProvider, paymentIntentId } = body;

  // Get tier details
  const { data: tier, error: tierError } = await supabase
    .from("live_ticket_tiers")
    .select("*")
    .eq("id", tierId)
    .eq("session_id", sessionId)
    .eq("is_active", true)
    .maybeSingle();

  if (tierError || !tier) {
    return NextResponse.json({ error: "Ticket tier not found or inactive" }, { status: 404 });
  }

  // Check sale window
  const now = new Date();
  if (tier.sale_starts_at && new Date(tier.sale_starts_at) > now) {
    return NextResponse.json({ error: "Ticket sales have not started yet" }, { status: 400 });
  }
  if (tier.sale_ends_at && new Date(tier.sale_ends_at) < now) {
    return NextResponse.json({ error: "Ticket sales have ended" }, { status: 400 });
  }

  // Check availability
  const available = tier.max_quantity ? tier.max_quantity - tier.sold_quantity : quantity;
  if (available < quantity) {
    return NextResponse.json({ error: `Only ${available} tickets remaining` }, { status: 400 });
  }

  // Create pending purchase
  const purchaseId = crypto.randomUUID();
  const totalPrice = Number(tier.price_usd) * quantity;

  const { data: purchase, error } = await supabase
    .from("live_ticket_purchases")
    .insert({
      id: purchaseId,
      session_id: sessionId,
      tier_id: tierId,
      user_id: user.id,
      quantity,
      unit_price_usd: tier.price_usd,
      total_price_usd: totalPrice,
      currency: tier.price_currency,
      status: "pending",
      payment_provider: paymentProvider,
      payment_intent_id: paymentIntentId,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    purchase,
    payment: {
      amount: totalPrice,
      currency: tier.price_currency,
      provider: paymentProvider || "auto",
    },
  });
}