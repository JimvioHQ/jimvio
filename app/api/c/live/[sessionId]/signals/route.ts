import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const { data: participant } = await supabase
    .from("live_session_participants")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .is("left_at", null)
    .maybeSingle();

  if (!participant) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const after = searchParams.get("after");
  const limit = parseInt(searchParams.get("limit") || "100");

  let query = supabase
    .from("live_session_signals")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (after) {
    query = query.gt("created_at", after);
  }

  const { data: signals, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ signals });
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

  const { data: participant } = await supabase
    .from("live_session_participants")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .is("left_at", null)
    .maybeSingle();

  if (!participant) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  const body = await request.json();
  const { to_user_id, signal_type, payload } = body;

  if (!signal_type || !payload) {
    return NextResponse.json({ error: "Missing signal_type or payload" }, { status: 400 });
  }

  const { data: signal, error } = await supabase
    .from("live_session_signals")
    .insert({
      session_id: sessionId,
      from_user_id: user.id,
      to_user_id: to_user_id ?? null,
      signal_type,
      payload,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ signal });
}