"use server";

import { revalidatePath } from "next/cache";
import { provisionOwnNonPrivilegedRole } from "@/lib/auth/provision-nonprivileged-role";
import type { ActionResult } from "@/lib/actions/security";

/** Server-chosen vendor role. Callers cannot pass role=admin. */
export async function activateVendorRole(): Promise<ActionResult> {
  const result = await provisionOwnNonPrivilegedRole("vendor");
  if (!("ok" in result)) return { success: false, error: result.error };
  revalidatePath("/dashboard");
  return { success: true };
}
