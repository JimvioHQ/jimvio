"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { publishAdminProduct } from "@/lib/actions/admin-products";
import type { ActionResult } from "@/lib/actions/security";
import { logAutoPublishEvent } from "@/lib/cj/premium-intelligence/auto-publish-events";
import {
  assertAdminAccess,
  assertSuperAdminAccess,
} from "@/lib/cj/premium-intelligence/super-admin-auth";

/** Admin force publish — bypasses Auto Publish requirements */
export async function forcePublishAdminProduct(
  productId: string,
  reason: string
): Promise<ActionResult> {
  const auth = await assertSuperAdminAccess();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!reason?.trim()) {
    return { success: false, error: "Override reason is required." };
  }

  const start = Date.now();
  const pub = await publishAdminProduct(productId);
  if (!pub.success) return pub;

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: product, error } = await admin
    .from("products")
    .update({
      published_by_admin_override: true,
      override_reason: reason.trim(),
      override_user: auth.user.id,
      override_time: now,
      updated_at: now,
    })
    .eq("id", productId)
    .select("source_metadata, name")
    .maybeSingle();

  if (error) return { success: false, error: error.message };

  const meta = product?.source_metadata as Record<string, unknown> | null;
  const pid = typeof meta?.cj_pid === "string" ? meta.cj_pid : undefined;

  if (pid) {
    await admin
      .from("cj_product_intelligence")
      .update({
        auto_publish_status: "PUBLISHED_BY_ADMIN",
        last_auto_publish_check: now,
      })
      .eq("pid", pid);
  }

  await logAutoPublishEvent({
    pid,
    productId,
    supplier: product?.name,
    published: true,
    adminOverride: true,
    status: "PUBLISHED_BY_ADMIN",
    userId: auth.user.id,
    processingTimeMs: Date.now() - start,
    eventType: "force_publish",
    failureReasons: [],
    pendingReasons: [],
  });

  revalidatePath("/admin/products");
  revalidatePath("/admin/products/import/cj");
  return { success: true };
}

/** Super Admin bulk unpublish */
export async function bulkUnpublishAdminProducts(
  productIds: string[],
  reason: string
): Promise<ActionResult<{ unpublished: number }>> {
  const auth = await assertSuperAdminAccess();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!reason?.trim()) {
    return { success: false, error: "Unpublish reason is required." };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  let unpublished = 0;

  for (const productId of productIds) {
    const { error } = await admin
      .from("products")
      .update({
        status: "draft",
        is_active: false,
        auto_unpublished: true,
        auto_unpublish_reason: reason.trim(),
        auto_unpublished_at: now,
        updated_at: now,
      })
      .eq("id", productId);

    if (!error) {
      unpublished += 1;
      await logAutoPublishEvent({
        productId,
        published: false,
        userId: auth.user.id,
        failureReasons: [reason.trim()],
        eventType: "unpublished",
      });
    }
  }

  revalidatePath("/admin/products");
  return { success: true, data: { unpublished } };
}

/** Super Admin supplier blacklist */
export async function blacklistSupplier(
  supplierId: string,
  reason: string
): Promise<ActionResult> {
  const auth = await assertSuperAdminAccess();
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("cj_supplier_reputation")
    .upsert(
      {
        supplier_id: supplierId,
        supplier_name: supplierId,
        blacklisted: true,
        reputation_score: 0,
        reputation_label: "Poor",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "supplier_id" }
    );

  if (error) return { success: false, error: error.message };

  await logAutoPublishEvent({
    supplier: supplierId,
    userId: auth.user.id,
    failureReasons: [reason],
    eventType: "supplier_blacklist",
  });

  return { success: true };
}

export { assertAdminAccess, assertSuperAdminAccess };
