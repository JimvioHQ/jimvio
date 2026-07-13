import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const hostId = searchParams.get("hostId");
  const type = searchParams.get("type"); // "followers" | "following"

  if (type === "following") {
    const { data, error } = await supabase
      .from("live_follows")
      .select(`
        *,
        host:profiles!host_id (id, full_name, avatar_url, username)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ follows: data || [] });
  }

  if (type === "followers") {
    const { data, error } = await supabase
      .from("live_follows")
      .select(`
        *,
        user:profiles!user_id (id, full_name, avatar_url, username)
      `)
      .eq("host_id", hostId || user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ follows: data || [] });
  }

  // Check if following specific host
  if (hostId) {
    const { data } = await supabase
      .from("live_follows")
      .select("*")
      .eq("user_id", user.id)
      .eq("host_id", hostId)
      .maybeSingle();

    return NextResponse.json({ isFollowing: !!data, follow: data });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { hostId, notifyLive = true, notifyScheduled = true, notifyClips = false } = body;

  if (!hostId) {
    return NextResponse.json({ error: "hostId required" }, { status: 400 });
  }

  if (hostId === user.id) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("live_follows")
    .upsert({
      user_id: user.id,
      host_id: hostId,
      notify_live: notifyLive,
      notify_scheduled: notifyScheduled,
      notify_clips: notifyClips,
    }, {
      onConflict: "user_id,host_id",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ follow: data });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const hostId = searchParams.get("hostId");

  if (!hostId) {
    return NextResponse.json({ error: "hostId required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("live_follows")
    .delete()
    .eq("user_id", user.id)
    .eq("host_id", hostId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}