"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminDB } from "@/services/db";
import type { SupplierSourcesSettings } from "@/lib/sources/supplier-settings";

export async function saveSupplierSourcesAction(
  next: SupplierSourcesSettings
): Promise<{ ok: true } | { error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((r) => r.role === "admin")) return { error: "Forbidden" };

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
