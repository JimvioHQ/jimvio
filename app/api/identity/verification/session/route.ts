import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  createDiditSession,
  diditConfigured,
  mapDiditStatusToCustomer,
} from "@/lib/identity/didit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/identity/verification/session — start a Didit KYC session.
 * Never marks the user verified; wait for webhook confirmation.
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

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://www.jimvio.com").replace(/\/$/, "");
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
  });
}

/** GET — latest verification status for the signed-in user. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createServiceRoleClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const { data: identity } = await admin
    .from("jip_identity")
    .select("identity_verified")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: session } = await admin
    .from("jip_didit_sessions")
    .select("session_id, status, updated_at, created_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const verified = Boolean((identity as { identity_verified?: boolean } | null)?.identity_verified);
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
