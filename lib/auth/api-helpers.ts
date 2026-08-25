import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertPlatformAdmin, requirePlatformAdmin } from "@/lib/auth/platform-admin";

/**
 * Ensures the authenticated user owns `vendorId` or has platform admin authorization.
 */
export async function requireVendorOwnerOrAdmin(vendorId: string) {
  const admin = await assertPlatformAdmin();
  if (admin.ok) {
    return { user: admin.user };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: vendor } = await supabase
    .from("vendors")
    .select("id")
    .eq("id", vendorId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!vendor) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user };
}

/** Admin role only (e.g. platform Shopify connect without a body vendorId). */
export const requireAdmin = requirePlatformAdmin;
