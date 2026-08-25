"use server";

import { revalidatePath } from "next/cache";
import { getAdminDB } from "@/services/db";
import type { ResolvedPlatformSettings } from "@/lib/platform-settings-shared";
import { assertPlatformAdmin } from "@/lib/auth/platform-admin";

export async function savePlatformSettingsAction(next: ResolvedPlatformSettings): Promise<{ ok: true } | { error: string }> {
  try {
    const auth = await assertPlatformAdmin();
    if (!auth.ok) return { error: auth.status === 401 ? "Unauthorized" : "Forbidden" };

    const admin = getAdminDB();
    const rows = [
      { key: "fees", value: next.fees as unknown as Record<string, unknown> },
      { key: "social_proof", value: next.social_proof as unknown as Record<string, unknown> },
      { key: "marketing", value: next.marketing as unknown as Record<string, unknown> },
      { key: "contact", value: next.contact as unknown as Record<string, unknown> },
    ];
    const { error } = await (admin.from("platform_settings") as any).upsert(rows, { onConflict: "key" });
    if (error) return { error: error.message };

    revalidatePath("/admin/settings");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Save failed" };
  }
}
