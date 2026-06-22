"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncProductVideos } from "@/lib/product-videos";

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

  return { ok: true as const, user };
}

export async function saveProductVideos(
  productId: string,
  videoUrls: string[],
  opts?: { asAdmin?: boolean },
): Promise<{ success: boolean; error?: string }> {
  if (opts?.asAdmin) {
    const auth = await assertAdminAccess();
    if (!auth.ok) return { success: false, error: auth.error };
    const admin = createAdminClient();
    const result = await syncProductVideos(admin, productId, videoUrls);
    return result.error ? { success: false, error: result.error } : { success: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: product } = await supabase
    .from("products")
    .select("id, vendor_id")
    .eq("id", productId)
    .maybeSingle();

  if (!product?.vendor_id) {
    return { success: false, error: "Product not found" };
  }

  const { data: vendor } = await supabase
    .from("vendors")
    .select("id")
    .eq("id", product.vendor_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!vendor) {
    return { success: false, error: "You do not have permission to edit this product" };
  }

  const result = await syncProductVideos(supabase, productId, videoUrls);
  return result.error ? { success: false, error: result.error } : { success: true };
}
