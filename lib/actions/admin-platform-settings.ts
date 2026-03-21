"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminDB } from "@/services/db";
import type { ResolvedPlatformSettings } from "@/lib/platform-settings-shared";

export async function savePlatformSettingsAction(next: ResolvedPlatformSettings): Promise<{ ok: true } | { error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((r) => r.role === "admin")) return { error: "Forbidden" };

    const admin = getAdminDB();
    const rows = [
      { key: "fees", value: next.fees as unknown as Record<string, unknown> },
      { key: "social_proof", value: next.social_proof as unknown as Record<string, unknown> },
      { key: "marketing", value: next.marketing as unknown as Record<string, unknown> },
      { key: "contact", value: next.contact as unknown as Record<string, unknown> },
    ];
    const { error } = await admin.from("platform_settings").upsert(rows, { onConflict: "key" });
    if (error) return { error: error.message };

    revalidatePath("/admin/settings");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Save failed" };
  }
}
