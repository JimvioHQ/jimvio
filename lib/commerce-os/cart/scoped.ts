import type { SupabaseClient } from "@supabase/supabase-js";
import { cosTable } from "../db";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve and create a cart scoped to Marketplace (null) or a Jimvio store.
 * Does not trust client store ids — callers must resolve store ownership first.
 */
export async function getOrCreateScopedCart(
  db: SupabaseClient,
  userId: string,
  currency: string,
  jimvioStoreId: string | null
): Promise<{ id: string } | null> {
  if (jimvioStoreId && !UUID_RE.test(jimvioStoreId)) return null;

  let query = db.from("carts").select("id").eq("user_id", userId);
  if (jimvioStoreId) {
    query = query.eq("jimvio_store_id", jimvioStoreId);
  } else {
    query = query.is("jimvio_store_id", null);
  }

  const { data: existing } = await query.maybeSingle();
  if (existing?.id) return { id: existing.id };

  const { data: created, error } = await db
    .from("carts")
    .insert({
      user_id: userId,
      currency,
      jimvio_store_id: jimvioStoreId,
    })
    .select("id")
    .single();

  if (error || !created) {
    const { data: raced } = await query.maybeSingle();
    if (raced?.id) return { id: raced.id };
    return null;
  }
  return { id: created.id };
}

export async function resolveJimvioStoreIdByHandle(
  db: SupabaseClient,
  handle: string
): Promise<{ id: string; vendor_id: string; status: string } | null> {
  const decoded = handle.toLowerCase().trim();
  if (!decoded) return null;
  const { data } = await cosTable(db, "jimvio_stores")
    .select("id, vendor_id, status")
    .eq("handle", decoded)
    .maybeSingle();
  if (!data?.id) return null;
  return data;
}

/**
 * Track abandoned cart snapshot for recovery hooks (no marketing send).
 * Matches jimvio_abandoned_carts schema from 157_commerce_os.
 */
export async function upsertAbandonedCartSnapshot(
  db: SupabaseClient,
  input: {
    storeId: string;
    vendorId: string;
    cartId: string;
    email?: string | null;
    items: unknown;
    subtotal: number;
  }
): Promise<void> {
  try {
    // Prefer update by cart_id when present; else insert
    const { data: existing } = await cosTable(db, "jimvio_abandoned_carts")
      .select("id")
      .eq("cart_id", input.cartId)
      .maybeSingle();

    const payload = {
      store_id: input.storeId,
      vendor_id: input.vendorId,
      cart_id: input.cartId,
      customer_email: input.email ?? null,
      cart_snapshot: {
        items: input.items ?? [],
        subtotal: input.subtotal,
        currency: "USD",
      },
      recovered: false,
      consent_marketing: false,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      await cosTable(db, "jimvio_abandoned_carts")
        .update(payload)
        .eq("id", existing.id);
    } else {
      await cosTable(db, "jimvio_abandoned_carts").insert(payload);
    }
  } catch {
    // Best-effort; abandoned tracking must not break add-to-cart
  }
}
