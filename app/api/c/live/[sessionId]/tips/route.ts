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

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  const { data: tips, error } = await supabase
    .from("live_tips")
    .select(`
      *,
      sender:profiles!sender_id (id, full_name, avatar_url, username),
      recipient:profiles!recipient_id (id, full_name, avatar_url, username)
    `)
    .eq("session_id", sessionId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tips: tips || [] });
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

  const hasAccess = await canUserAccessLiveSession(user.id, sessionId);
  if (!hasAccess) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const body = await request.json();
  const { amountUsd, currency = "USD", message, isAnonymous = false, recipientId, paymentProvider, paymentIntentId } = body;

  if (!amountUsd || amountUsd <= 0) {
    return NextResponse.json({ error: "Valid amount required" }, { status: 400 });
  }

  // Get session to find host (default recipient)
  const { data: session } = await supabase
    .from("live_sessions")
    .select("host_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const tipId = crypto.randomUUID();

  const { data: tip, error } = await supabase
    .from("live_tips")
    .insert({
      id: tipId,
      session_id: sessionId,
      sender_id: user.id,
      recipient_id: recipientId || session.host_id,
      amount_usd: amountUsd,
      currency,
      message: message ?? null,
      is_anonymous: isAnonymous,
      payment_provider: paymentProvider,
      payment_intent_id: paymentIntentId,
      status: "completed", // In production, this would be "pending" until webhook confirms
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tip });
}