"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminDB } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/actions/security";

async function assertAdminAccess() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated." };

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const isAdminRole = roles?.some((r) => r.role === "admin") ?? false;
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const isAdminEmail = adminEmails.includes(user.email ?? "");

  if (!isAdminRole && !isAdminEmail) {
    return { ok: false as const, error: "Admin access required." };
  }

  return { ok: true as const, adminId: user.id };
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
