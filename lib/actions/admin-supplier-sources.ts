"use server";

import { revalidatePath } from "next/cache";
import { getAdminDB } from "@/services/db";
import type { SupplierSourcesSettings } from "@/lib/sources/supplier-settings-shared";
import { assertPlatformAdmin } from "@/lib/auth/platform-admin";

export async function saveSupplierSourcesAction(
  next: SupplierSourcesSettings
): Promise<{ ok: true } | { error: string }> {
  try {
    const auth = await assertPlatformAdmin();
    if (!auth.ok) return { error: auth.status === 401 ? "Unauthorized" : "Forbidden" };

    const admin = getAdminDB();
    const { error } = await (admin.from("platform_settings") as any).upsert(
      { key: "supplier_sources", value: next as unknown as Record<string, unknown> },
      { onConflict: "key" }
    );
    if (error) return { error: error.message };

    revalidatePath("/admin/settings");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Save failed" };
  }
}
