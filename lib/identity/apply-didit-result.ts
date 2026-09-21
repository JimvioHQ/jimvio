/**
 * Apply an authoritative Didit session status to Jimvio identity tables.
 * Used by webhook and browser-return reconciliation.
 */

import {
  canTransitionDiditStatus,
  normalizeDiditStatus,
} from "@/lib/identity/didit";

type AdminClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

export async function applyDiditIdentityResult(input: {
  admin: AdminClient;
  userId: string;
  sessionId: string;
  status: string;
  /** Existing DB status for transition guard */
  currentStatus?: string | null;
  eventId?: string | null;
  purpose?: "identity" | "business" | string | null;
}): Promise<{ applied: boolean; status: string; verified: boolean }> {
  const status = normalizeDiditStatus(input.status);
  const current = normalizeDiditStatus(input.currentStatus);
  if (!canTransitionDiditStatus(current, status)) {
    const verified =
      current === "Approved" ||
      (await isIdentityVerified(input.admin, input.userId));
    return { applied: false, status: current || status, verified };
  }

  const decisionSummary: Record<string, unknown> = {
    received: true,
    at: new Date().toISOString(),
    source: input.eventId ? "webhook" : "reconcile",
  };
  if (input.purpose) decisionSummary.purpose = input.purpose;

  const upsertPayload: Record<string, unknown> = {
    user_id: input.userId,
    session_id: input.sessionId,
    status: status || "In Progress",
    vendor_data: input.userId,
    decision_summary: decisionSummary,
    updated_at: new Date().toISOString(),
  };
  if (input.eventId) upsertPayload.last_event_id = input.eventId;

  await input.admin.from("jip_didit_sessions").upsert(upsertPayload, {
    onConflict: "session_id",
  });

  if (status === "Approved" && input.purpose !== "business") {
    await input.admin
      .from("jip_identity")
      .update({
        identity_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", input.userId);

    await input.admin.from("profiles").update({ is_verified: true }).eq("id", input.userId);

    return { applied: true, status, verified: true };
  }

  return {
    applied: true,
    status,
    verified: status === "Approved" ? true : await isIdentityVerified(input.admin, input.userId),
  };
}

async function isIdentityVerified(admin: AdminClient, userId: string): Promise<boolean> {
  const { data } = await admin
    .from("jip_identity")
    .select("identity_verified")
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean((data as { identity_verified?: boolean } | null)?.identity_verified);
}
