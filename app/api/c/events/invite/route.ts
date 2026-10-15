import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { hashInviteToken } from "@/lib/community/event-access";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  if (token.length < 20) return NextResponse.json({ error: "Invitation is not valid." }, { status: 403 });
  const admin = createServiceRoleClient() as any;
  const { data } = await admin
    .from("community_event_invites")
    .select("event_id, expires_at, revoked_at")
    .eq("token_hash", hashInviteToken(token))
    .is("revoked_at", null)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "Invitation is not valid." }, { status: 403 });
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Invitation has expired." }, { status: 403 });
  }
  const { data: event } = await admin.from("community_events").select("id, status").eq("id", data.event_id).maybeSingle();
  if (!event || event.status === "draft") return NextResponse.json({ error: "Invitation is not valid." }, { status: 403 });
  return NextResponse.json({ eventId: event.id });
}
