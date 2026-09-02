import type { SupabaseClient } from "@supabase/supabase-js";
import { PLATFORM_CURRENCY, toPlatformUsd } from "@/lib/currency/platform";

const UNPAID = new Set(["pending", "failed"]);

/**
 * Convert an unpaid marketplace order into canonical USD.
 * Never touches paid / completed historical orders.
 */
export async function ensurePendingOrderPlatformCurrency(
  admin: SupabaseClient,
  orderId: string,
): Promise<void> {
  const { data: order, error } = await admin
    .from("orders")
    .select("id, currency, payment_status, subtotal, total_amount, shipping_amount, discount_amount")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) return;
  if (!UNPAID.has(String(order.payment_status ?? ""))) return;
  if ((order.currency ?? "").toUpperCase() === PLATFORM_CURRENCY) return;

  const from = order.currency;
  const { data: items } = await admin
    .from("order_items")
    .select("id, unit_price, total_price, quantity")
    .eq("order_id", orderId);

  for (const item of items ?? []) {
    const unit = toPlatformUsd(Number(item.unit_price), from);
    const qty = Number(item.quantity) || 1;
    await admin
      .from("order_items")
      .update({
        unit_price: unit,
        total_price: Math.round(unit * qty * 100) / 100,
      })
      .eq("id", item.id);
  }

  await admin
    .from("orders")
    .update({
      currency: PLATFORM_CURRENCY,
      subtotal: toPlatformUsd(Number(order.subtotal), from),
      total_amount: toPlatformUsd(Number(order.total_amount), from),
      shipping_amount: order.shipping_amount == null
        ? order.shipping_amount
        : toPlatformUsd(Number(order.shipping_amount), from),
      discount_amount: order.discount_amount == null
        ? order.discount_amount
        : toPlatformUsd(Number(order.discount_amount), from),
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .in("payment_status", ["pending", "failed"]);
}
