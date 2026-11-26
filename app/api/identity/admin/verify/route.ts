import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/ops/require-platform-admin";

export const dynamic = "force-dynamic";

/** GET /api/identity/admin/verify — pending verification queue for admins. */
export async function GET(req: NextRequest) {
  const guard = await requirePlatformAdmin();
  if ("error" in guard) return guard.error;

  const supabase = createAdminClient();
  const status = req.nextUrl.searchParams.get("status") ?? "pending";

  const { data, error } = await supabase
    .from("jip_verification_requests")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name, username, avatar_url, email").in("id", userIds)
    : { data: [] as never[] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

  const requests = rows.map((row) => {
    const p = byId.get(row.user_id) ?? null;
    return {
      id: row.id,
      userId: row.user_id,
      requestType: row.request_type,
      status: row.status,
      payload: row.payload,
      decisionNote: row.decision_note,
      createdAt: row.created_at,
      decidedAt: row.decided_at,
      user: p
        ? { fullName: p.full_name, username: p.username, avatarUrl: p.avatar_url, email: p.email }
        : null,
    };
  });

  return NextResponse.json({ requests });
}

/** POST /api/identity/admin/verify — approve/reject a request ({ id, decision, note }). */
export async function POST(req: NextRequest) {
  const guard = await requirePlatformAdmin();
  if ("error" in guard) return guard.error;
  const admin = guard.user;

  const supabase = await createClient();
  const body = await req.json().catch(() => null);
  const id = body?.id as string | undefined;
  const decision = body?.decision as string | undefined;
  if (!id || (decision !== "approved" && decision !== "rejected")) {
    return NextResponse.json({ error: "id and decision (approved|rejected) are required" }, { status: 400 });
  }

  const { data: request, error: fetchError } = await supabase
    .from("jip_verification_requests")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchError || !request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  const { data: updated, error } = await supabase
    .from("jip_verification_requests")
    .update({
      status: decision,
      admin_id: admin.id,
      decision_note: typeof body.note === "string" ? body.note.slice(0, 1000) : null,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (decision === "approved") {
    const flagColumn =
      request.request_type === "identity"
        ? "identity_verified"
        : request.request_type === "documents"
          ? "documents_verified"
          : request.request_type === "social"
            ? "social_verified"
            : null;

    if (flagColumn) {
      await supabase
        .from("jip_identity")
        .upsert({ user_id: request.user_id, [flagColumn]: true } as never, { onConflict: "user_id" });
    }
    if (request.request_type === "identity" || request.request_type === "documents") {
      await supabase.from("profiles").update({ is_verified: true }).eq("id", request.user_id);
    }
  }

  return NextResponse.json({ request: updated });
}
