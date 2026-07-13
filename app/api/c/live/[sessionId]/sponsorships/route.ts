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

  const { data: sponsorships, error } = await supabase
    .from("live_sponsorships")
    .select(`
      *,
      sponsor:profiles!sponsor_id (id, full_name, avatar_url, username)
    `)
    .eq("session_id", sessionId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sponsorships: sponsorships || [] });
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

  const { data: session } = await supabase
    .from("live_sessions")
    .select("host_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session || session.host_id !== user.id) {
    return NextResponse.json({ error: "Only host can manage sponsorships" }, { status: 403 });
  }

  const body = await request.json();
  const { sponsorId, title, description, imageUrl, linkUrl, amountUsd, currency = "USD", placement, startsAt, endsAt } = body;

  if (!sponsorId || !title || !amountUsd) {
    return NextResponse.json({ error: "sponsorId, title, and amountUsd required" }, { status: 400 });
  }

  const sponsorshipId = crypto.randomUUID();

  const { data: sponsorship, error } = await supabase
    .from("live_sponsorships")
    .insert({
      id: sponsorshipId,
      session_id: sessionId,
      sponsor_id: sponsorId,
      title,
      description: description ?? null,
      image_url: imageUrl ?? null,
      link_url: linkUrl ?? null,
      amount_usd: amountUsd,
      currency,
      placement: placement || "overlay",
      starts_at: startsAt ?? null,
      ends_at: endsAt ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sponsorship });
}