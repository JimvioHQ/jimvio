import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Ensures the authenticated user owns `vendorId` or has an active `admin` role.
 */
export async function requireVendorOwnerOrAdmin(vendorId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("is_active", true);

  if (roles?.some((r) => r.role === "admin")) {
    return { user };
  }

  const { data: vendor } = await supabase.from("vendors").select("id").eq("id", vendorId).eq("user_id", user.id).maybeSingle();

  if (!vendor) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user };
}

/** Admin role only (e.g. platform Shopify connect without a body vendorId). */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("is_active", true);

  if (!roles?.some((r) => r.role === "admin")) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user };
}
