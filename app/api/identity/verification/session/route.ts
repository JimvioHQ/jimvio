import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  createDiditSession,
  diditConfigured,
  mapDiditStatusToCustomer,
  normalizeDiditStatus,
  retrieveDiditSession,
} from "@/lib/identity/didit";
import { applyDiditIdentityResult } from "@/lib/identity/apply-didit-result";
import {
  assertNonLocalhostProductionOrigin,
  getCanonicalAppOrigin,
} from "@/lib/app-origin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/identity/verification/session — start a Didit KYC session.
 * Never marks the user verified; wait for webhook or server-side reconcile.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!diditConfigured()) {
    return NextResponse.json(
      {
        error: "Identity verification is not configured yet",
        configured: false,
      },
      { status: 503 },
    );
  }

  const appUrl = assertNonLocalhostProductionOrigin(getCanonicalAppOrigin());
  const callbackUrl = `${appUrl}/identity/verification?return=1`;

  const created = await createDiditSession({
    userId: user.id,
    callbackUrl,
    metadata: { source: "jimvio_identity" },
  });
  if (!created.ok) {
    return NextResponse.json({ error: created.error }, { status: 502 });
  }

  const admin = createServiceRoleClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  await admin.from("jip_didit_sessions").upsert(
    {
      user_id: user.id,
      session_id: created.sessionId,
      status: created.status,
      workflow_id: process.env.DIDIT_WORKFLOW_ID?.trim() || null,
      verification_url: created.verificationUrl,
      vendor_data: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id" },
  );

  return NextResponse.json({
    sessionId: created.sessionId,
    verificationUrl: created.verificationUrl,
    status: created.status,
    customer: mapDiditStatusToCustomer(created.status),
    callbackOrigin: appUrl,
  });
}

/**
 * GET — latest verification status for the signed-in user.
 * Optional query: sessionId / verificationSessionId — when present on return
 * from Didit, server retrieves authoritative status (never trusts ?status=).
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createServiceRoleClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const hintSessionId =
    req.nextUrl.searchParams.get("sessionId") ||
    req.nextUrl.searchParams.get("verificationSessionId") ||
    "";

  // Hint status from URL is intentionally ignored for authorization decisions.
  void req.nextUrl.searchParams.get("status");

  const { data: identity } = await admin
    .from("jip_identity")
    .select("identity_verified")
    .eq("user_id", user.id)
    .maybeSingle();

  let verified = Boolean((identity as { identity_verified?: boolean } | null)?.identity_verified);

  let session: {
    session_id?: string;
    status?: string;
    updated_at?: string;
    created_at?: string;
  } | null = null;

  if (hintSessionId) {
    const { data: owned } = await admin
      .from("jip_didit_sessions")
      .select("session_id, status, updated_at, created_at, user_id")
      .eq("session_id", hintSessionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!owned) {
      return NextResponse.json({ error: "Verification session not found" }, { status: 404 });
    }
    session = owned;

    if (!verified) {
      const remote = await retrieveDiditSession(hintSessionId);
      if (remote.ok) {
        const applied = await applyDiditIdentityResult({
          admin,
          userId: user.id,
          sessionId: hintSessionId,
          status: remote.status,
          currentStatus: owned.status,
          purpose: "identity",
        });
        verified = applied.verified;
        session = {
          session_id: hintSessionId,
          status: applied.status,
          updated_at: new Date().toISOString(),
        };
      }
    }
  } else {
    const { data: latest } = await admin
      .from("jip_didit_sessions")
      .select("session_id, status, updated_at, created_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    session = latest;

    // If local status is still open and session exists, pull authoritative Didit result.
    const localStatus = normalizeDiditStatus(session?.status);
    const open =
      localStatus === "In Progress" ||
      localStatus === "Not Started" ||
      localStatus === "Not Finished" ||
      localStatus === "Resubmitted" ||
      localStatus === "";
    if (!verified && session?.session_id && open) {
      const remote = await retrieveDiditSession(session.session_id);
      if (remote.ok) {
        const applied = await applyDiditIdentityResult({
          admin,
          userId: user.id,
          sessionId: session.session_id,
          status: remote.status,
          currentStatus: session.status,
          purpose: "identity",
        });
        verified = applied.verified;
        session = {
          ...session,
          status: applied.status,
          updated_at: new Date().toISOString(),
        };
      }
    }
  }

  const status = verified
    ? "Approved"
    : String((session as { status?: string } | null)?.status ?? "");

  return NextResponse.json({
    configured: diditConfigured(),
    verified,
    status,
    customer: mapDiditStatusToCustomer(verified ? "Approved" : status || null),
    sessionId: (session as { session_id?: string } | null)?.session_id ?? null,
    updatedAt: (session as { updated_at?: string } | null)?.updated_at ?? null,
  });
}
