"use server";

import { revalidatePath } from "next/cache";
import { getAdminDB } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/actions/security";
import { assertPlatformAdmin } from "@/lib/auth/platform-admin";

async function assertAdminAccess() {
  const auth = await assertPlatformAdmin();
  if (!auth.ok) return { ok: false as const, error: auth.error };
  return { ok: true as const, adminId: auth.user.id };
}

export async function dismissUgcReport(reportId: string): Promise<ActionResult> {
  const auth = await assertAdminAccess();
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = getAdminDB();
  const { error } = await admin
    .from("ugc_reports")
    .update({
      status: "dismissed",
      reviewed_by: auth.adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/verifications");
  revalidatePath("/admin/reports");
  return { success: true };
}

export async function removeUgcSubmission(
  reportId: string,
  submissionId: string | null | undefined,
): Promise<ActionResult> {
  const auth = await assertAdminAccess();
  if (!auth.ok) return { success: false, error: auth.error };
  if (!submissionId) return { success: false, error: "No submission linked to this report." };

  const admin = getAdminDB();
  const now = new Date().toISOString();

  const { error: subErr } = await admin
    .from("ugc_submissions")
    .update({
      status: "rejected",
      rejection_reason: "Removed after community report review",
      reviewed_by: auth.adminId,
      reviewed_at: now,
    })
    .eq("id", submissionId);

  if (subErr) return { success: false, error: subErr.message };

  const { error: repErr } = await admin
    .from("ugc_reports")
    .update({
      status: "resolved",
      reviewed_by: auth.adminId,
      reviewed_at: now,
    })
    .eq("id", reportId);

  if (repErr) return { success: false, error: repErr.message };

  revalidatePath("/admin/verifications");
  revalidatePath("/admin/reports");
  return { success: true };
}

export async function updateAdminDispute(
  orderId: string,
  input: { status: "open" | "resolved"; note?: string },
): Promise<ActionResult> {
  const auth = await assertAdminAccess();
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = getAdminDB();
  const { data: order, error: fetchErr } = await admin
    .from("orders")
    .select("metadata")
    .eq("id", orderId)
    .maybeSingle();

  if (fetchErr || !order) return { success: false, error: "Order not found." };

  const existing =
    order.metadata && typeof order.metadata === "object"
      ? (order.metadata as Record<string, unknown>)
      : {};

  const nextMeta = {
    ...existing,
    admin_dispute: {
      status: input.status,
      note: input.note?.trim() || null,
      updated_at: new Date().toISOString(),
      updated_by: auth.adminId,
      ...(input.status === "resolved" ? { resolved_at: new Date().toISOString() } : {}),
    },
  };

  const { error } = await admin
    .from("orders")
    .update({ metadata: nextMeta })
    .eq("id", orderId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/disputes");
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: true };
}
