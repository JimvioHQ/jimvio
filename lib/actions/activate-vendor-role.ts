"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { provisionOwnNonPrivilegedRole } from "@/lib/auth/provision-nonprivileged-role";
import type { ActionResult } from "@/lib/actions/security";

export type VendorApplicationInput = {
  business_name: string;
  business_slug: string;
  business_description?: string | null;
  business_email?: string | null;
  business_phone?: string | null;
  business_address?: string | null;
  business_country?: string | null;
  website?: string | null;
  tax_id?: string | null;
  business_type?: string | null;
  product_categories?: string | null;
};

function normalizeBusinessSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Create a vendor application on the server; clients cannot set privileged vendor fields. */
export async function submitVendorApplication(
  input: VendorApplicationInput,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: "Not authenticated." };

  const businessName = String(input.business_name ?? "").trim().slice(0, 120);
  if (!businessName) return { success: false, error: "Business name is required." };

  const admin = createAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("vendors")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) return { success: false, error: existingError.message };
  if (existing) {
    const roleResult = await provisionOwnNonPrivilegedRole("vendor");
    if (!("ok" in roleResult)) return { success: false, error: roleResult.error };
    revalidatePath("/");
    revalidatePath("/dashboard");
    return { success: true };
  }

  let businessSlug = normalizeBusinessSlug(input.business_slug || businessName);
  if (!businessSlug) return { success: false, error: "Enter a valid business name." };

  const { data: slugConflict, error: slugError } = await admin
    .from("vendors")
    .select("id")
    .eq("business_slug", businessSlug)
    .neq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (slugError) return { success: false, error: slugError.message };
  if (slugConflict) businessSlug = `${businessSlug}-${user.id.slice(0, 6)}`.slice(0, 80);

  const businessEmail = (input.business_email ?? "").trim().slice(0, 254) || user.email || null;
  const { error: insertError } = await admin.from("vendors").insert({
    user_id: user.id,
    business_name: businessName,
    business_slug: businessSlug,
    business_description: (input.business_description ?? "").trim().slice(0, 2000) || null,
    business_email: businessEmail,
    business_phone: (input.business_phone ?? "").trim().slice(0, 40) || null,
    business_address: (input.business_address ?? "").trim().slice(0, 250) || null,
    business_country: (input.business_country ?? "RW").trim().slice(0, 2).toUpperCase() || "RW",
    website: (input.website ?? "").trim().slice(0, 500) || null,
    tax_id: (input.tax_id ?? "").trim().slice(0, 100) || null,
    business_type: (input.business_type ?? "").trim().slice(0, 100) || null,
    product_categories: (input.product_categories ?? "").trim().slice(0, 1000) || null,
    verification_status: "pending",
    payout_method: "mtn",
    payout_account: null,
    affiliate_enabled: true,
    affiliate_commission_rate: 10,
    is_active: true,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return { success: false, error: "A business with this name or slug already exists. Please adjust the business name and try again." };
    }
    return { success: false, error: insertError.message };
  }

  const roleResult = await provisionOwnNonPrivilegedRole("vendor");
  if (!("ok" in roleResult)) {
    return {
      success: false,
      error: "Your application was saved, but vendor access could not be activated. Please retry.",
    };
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/ugc/campaign-center");
  return { success: true };
}

/** A vendor role may only be provisioned when the authenticated user already owns a vendor row. */
export async function activateVendorRole(): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: "Not authenticated." };

  const admin = createAdminClient();
  const { data: vendor, error } = await admin
    .from("vendors")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!vendor) return { success: false, error: "Submit a vendor application first." };

  const result = await provisionOwnNonPrivilegedRole("vendor");
  if (!("ok" in result)) return { success: false, error: result.error };

  revalidatePath("/");
  return { success: true };
}
