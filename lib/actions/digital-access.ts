// lib/actions/digital-access.ts

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GrantAccessParams {
  userId: string;
  productId: string;
  orderItemId: string;
  orderId: string;
  accessUrl: string | null;
  subtype: string | null;
  pricingType: string;
  billingPeriod: string | null;
}

export interface DigitalAsset {
  id: string;
  accessUrl: string | null;
  subtype: string | null;
  grantedAt: string;
  expiresAt: string | null;
  isExpired: boolean;
  product: {
    id: string;
    name: string;
    images: string[];
    button_text: string | null;
    pricing_type: string | null;
    billing_period: string | null;
  } | null;
}

// ─── Write operations (admin client — bypasses RLS) ───────────────────────────

export async function grantDigitalAccess(params: GrantAccessParams) {
  // Admin client bypasses RLS — required for server-side writes where the
  // calling context is not the user's own session (checkout, webhooks, etc.)
  const supabase = createAdminClient();

  const {
    userId, productId, orderItemId, orderId,
    accessUrl, subtype, pricingType, billingPeriod,
  } = params;

  const expiresAt = calcExpiry(pricingType, billingPeriod);

  const { error: upsertError } = await supabase
    .from("digital_access")
    .upsert(
      {
        user_id: userId,
        product_id: productId,
        order_item_id: orderItemId,
        order_id: orderId,
        access_url: accessUrl,
        subtype,
        granted_at: new Date().toISOString(),
        expires_at: expiresAt,
        revoked_at: null,       // clear any previous revocation on re-purchase
        revoke_reason: null,
      },
      { onConflict: "user_id,product_id" }
    );

  if (upsertError) {
    console.error("[grantDigitalAccess] Upsert failed:", upsertError);
    throw new Error(`Failed to grant digital access: ${upsertError.message}`);
  }

  // Stamp access_granted_at on order_item for backwards compatibility
  const { error: stampError } = await supabase
    .from("order_items")
    .update({ access_granted_at: new Date().toISOString() })
    .eq("id", orderItemId);

  if (stampError) {
    // Non-fatal — log but don't throw, the access row is already created
    console.warn("[grantDigitalAccess] Failed to stamp order_item:", stampError);
  }
}

export async function revokeDigitalAccess(
  userId: string,
  productId: string,
  reason: "refunded" | "subscription_expired" | "manual"
) {
  const supabase = createAdminClient(); // admin for writes

  const { error } = await supabase
    .from("digital_access")
    .update({
      revoked_at: new Date().toISOString(),
      revoke_reason: reason,
    })
    .eq("user_id", userId)
    .eq("product_id", productId);

  if (error) {
    console.error("[revokeDigitalAccess] Failed:", error);
    throw new Error(`Failed to revoke digital access: ${error.message}`);
  }
}

// Renew expiry on subscription renewal
export async function renewDigitalAccess(
  userId: string,
  productId: string,
  billingPeriod: string
) {
  const supabase = createAdminClient();

  const expiresAt = calcExpiry("recurring", billingPeriod);

  const { error } = await supabase
    .from("digital_access")
    .update({
      expires_at: expiresAt,
      revoked_at: null,
      revoke_reason: null,
      granted_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("product_id", productId);

  if (error) {
    console.error("[renewDigitalAccess] Failed:", error);
    throw new Error(`Failed to renew digital access: ${error.message}`);
  }
}

// ─── Read operations (user client — RLS enforced) ─────────────────────────────

export async function getMyDigitalAssets(): Promise<{
  success: boolean;
  data: DigitalAsset[];
  error?: string;
}> {
  const supabase = await createClient(); // user client — RLS protects reads

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, data: [], error: "Not authenticated" };
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("digital_access")
    .select(`
      id,
      access_url,
      subtype,
      granted_at,
      expires_at,
      products (
        id,
        name,
        images,
        button_text,
        pricing_type,
        billing_period
      )
    `)
    .eq("user_id", user.id)
    .is("revoked_at", null)                         // not revoked
    .or(`expires_at.is.null,expires_at.gt.${now}`)  // lifetime or not yet expired
    .order("granted_at", { ascending: false });

  if (error) {
    console.error("[getMyDigitalAssets]", error);
    return { success: false, data: [], error: error.message };
  }

  return {
    success: true,
    data: (data ?? []).map((row): DigitalAsset => ({
      id: row.id,
      accessUrl: row.access_url,
      subtype: row.subtype,
      grantedAt: row.granted_at,
      expiresAt: row.expires_at,
      // Convenience flag for UI — expires_at in the past (shouldn't normally
      // appear due to the query filter, but guards against clock skew)
      isExpired: row.expires_at ? new Date(row.expires_at) < new Date() : false,
      product: row.products
        ? {
          id: (row.products as any).id,
          name: (row.products as any).name,
          images: (row.products as any).images ?? [],
          button_text: (row.products as any).button_text ?? null,
          pricing_type: (row.products as any).pricing_type ?? null,
          billing_period: (row.products as any).billing_period ?? null,
        }
        : null,
    })),
  };
}

// Check if a specific user has active access to a product
// Useful for gating content on product/course pages
export async function hasActiveAccess(
  productId: string
): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const now = new Date().toISOString();

  const { data } = await supabase
    .from("digital_access")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .is("revoked_at", null)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .maybeSingle();

  return !!data;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcExpiry(
  pricingType: string,
  billingPeriod: string | null
): string | null {
  if (pricingType !== "recurring" || !billingPeriod) return null;

  const now = new Date();
  if (billingPeriod === "monthly") {
    now.setMonth(now.getMonth() + 1);
  } else if (billingPeriod === "yearly") {
    now.setFullYear(now.getFullYear() + 1);
  }
  return now.toISOString();
}