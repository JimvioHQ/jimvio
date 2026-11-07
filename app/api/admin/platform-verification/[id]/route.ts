import { NextRequest, NextResponse } from "next/server";
import { assertAdminAccess } from "@/lib/cj/premium-intelligence/super-admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const ACTIONS = new Set([
  "approve",
  "reject",
  "request_info",
  "suspend",
  "revoke",
  "renew",
]);

const STATUS_FOR: Record<string, string> = {
  approve: "verified",
  reject: "rejected",
  request_info: "under_review",
  suspend: "suspended",
  revoke: "revoked",
  renew: "verified",
};

/**
 * GET — grant detail + private evidence metadata (admin only, service role).
 * PATCH — status transition with mandatory reason for reject/suspend/revoke.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await assertAdminAccess();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 403 });

  const { id } = await params;
  const db = createServiceClient();

  const { data: grant, error } = await db
    .from("platform_verification_grants")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!grant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [{ data: evidence }, { data: audit }] = await Promise.all([
    db
      .from("platform_verification_evidence")
      .select("id, kind, storage_path, mime_type, uploaded_by, created_at")
      .eq("grant_id", id)
      .order("created_at", { ascending: false }),
    db
      .from("platform_verification_audit")
      .select("id, action, actor_id, from_status, to_status, note, created_at")
      .eq("grant_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return NextResponse.json({
    grant,
    evidence: evidence ?? [],
    audit: audit ?? [],
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await assertAdminAccess();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 403 });

  const { id } = await params;
  let body: { action?: string; reason?: string; confirm?: boolean; expiresAt?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = String(body.action ?? "");
  if (!ACTIONS.has(action)) {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }
  if (!body.confirm) {
    return NextResponse.json(
      { error: "Confirmation required for verification status changes.", code: "CONFIRM_REQUIRED" },
      { status: 400 },
    );
  }

  const reason = String(body.reason ?? "").trim();
  if (["reject", "suspend", "revoke"].includes(action) && reason.length < 8) {
    return NextResponse.json(
      { error: "Provide a reason of at least 8 characters." },
      { status: 400 },
    );
  }

  const db = createServiceClient();
  const { data: grant, error: loadErr } = await db
    .from("platform_verification_grants")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 500 });
  if (!grant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const toStatus = STATUS_FOR[action];
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status: toStatus,
    reviewer_id: auth.user.id,
    decided_at: now,
    updated_at: now,
  };
  if (action === "reject") patch.reason = reason;
  if (action === "revoke" || action === "suspend") patch.revocation_reason = reason;
  if (action === "renew" && body.expiresAt) patch.expires_at = body.expiresAt;
  if (action === "approve") {
    patch.reason = reason || null;
    patch.revocation_reason = null;
  }

  const { data: updated, error: updErr } = await db
    .from("platform_verification_grants")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await db.from("platform_verification_audit").insert({
    grant_id: id,
    action,
    actor_id: auth.user.id,
    from_status: grant.status,
    to_status: toStatus,
    note: reason || null,
  });

  // Propagate to live badge sources for known entity types (never invent sources).
  try {
    if (toStatus === "verified") {
      if (grant.entity_type === "user" || grant.entity_type === "creator") {
        await db
          .from("jip_identity")
          .update({ identity_verified: true })
          .eq("user_id", grant.entity_id);
      }
      if (grant.entity_type === "influencer" || grant.category === "creator") {
        await db
          .from("influencers")
          .update({ is_verified: true })
          .eq("user_id", grant.entity_id);
      }
      if (
        grant.entity_type === "brand" ||
        grant.entity_type === "business" ||
        grant.entity_type === "merchant"
      ) {
        await db
          .from("vendors")
          .update({ verification_status: "verified" })
          .eq("id", grant.entity_id);
      }
    }
    if (["rejected", "suspended", "revoked", "expired"].includes(toStatus)) {
      if (grant.entity_type === "user" || grant.entity_type === "creator") {
        await db
          .from("jip_identity")
          .update({ identity_verified: false })
          .eq("user_id", grant.entity_id);
      }
      if (grant.entity_type === "influencer" || grant.category === "creator") {
        await db
          .from("influencers")
          .update({ is_verified: false })
          .eq("user_id", grant.entity_id);
      }
      if (
        grant.entity_type === "brand" ||
        grant.entity_type === "business" ||
        grant.entity_type === "merchant"
      ) {
        await db
          .from("vendors")
          .update({ verification_status: toStatus === "rejected" ? "rejected" : "suspended" })
          .eq("id", grant.entity_id);
      }
    }
  } catch {
    /* propagation best-effort; grant + audit are source of admin decision */
  }

  return NextResponse.json({ success: true, grant: updated });
}
