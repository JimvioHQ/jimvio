import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { reviewDecision } from "@/lib/identity/social-verification-server";
import { publicProfileUrl } from "@/lib/identity/social-verification";
import { writeAuditEvent } from "@/services/ops/audit";

export const dynamic = "force-dynamic";

/** Social accounts waiting for a human to confirm the bio code. */
export async function GET() {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return auth.error;
  const db = createServiceRoleClient() as unknown as { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data } = await db
    .from("jip_social_accounts")
    .select("id, user_id, platform, handle, url, verify_code, verify_checked_at, verify_note, profile:profiles!user_id (full_name, username)")
    .eq("verify_status", "pending_review")
    .order("verify_checked_at", { ascending: true })
    .limit(200);
  const rows = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    ...r,
    pageUrl: publicProfileUrl(String(r.platform), (r.handle as string | null) ?? null, (r.url as string | null) ?? null),
  }));
  return NextResponse.json({ data: rows });
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return auth.error;
  const body = (await req.json().catch(() => ({}))) as { id?: string; approve?: boolean; note?: string };
  if (!body.id || typeof body.approve !== "boolean") {
    return NextResponse.json({ error: "id and approve are required." }, { status: 400 });
  }
  const note = typeof body.note === "string" ? body.note.slice(0, 300) : "";
  const result = await reviewDecision(body.id, body.approve, note);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });
  await writeAuditEvent({
    actorId: auth.user.id,
    action: body.approve ? "identity.social.verify_approve" : "identity.social.verify_reject",
    entityType: "jip_social_accounts",
    entityId: body.id,
    metadata: { note },
  });
  return NextResponse.json({ ok: true });
}
