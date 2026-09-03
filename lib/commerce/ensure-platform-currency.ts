import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PLATFORM_CURRENCY,
  looksLikeRwfasUsd,
  toPlatformUsd,
} from "@/lib/currency/platform";

const UNPAID = new Set(["pending", "failed"]);

/**
 * Convert an unpaid marketplace order into canonical USD.
 * Never touches paid / completed historical orders.
 *
 * Also repairs unpaid orders already tagged USD that still hold raw RWF catalog
 * amounts (cart $11.28 → checkout $14,100 bug).
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

  const orderCurrency = (order.currency ?? "").toUpperCase();
  const needsCurrencyFlip = orderCurrency !== PLATFORM_CURRENCY;

  const { data: items } = await admin
    .from("order_items")
    .select("id, unit_price, total_price, quantity, product_id, products(price, currency)")
    .eq("order_id", orderId);

  let repairedAny = false;
  let newSubtotal = 0;

  for (const item of items ?? []) {
    const qty = Number(item.quantity) || 1;
    const product = Array.isArray(item.products) ? item.products[0] : item.products;
    const catalogPrice = product?.price != null ? Number(product.price) : null;
    const catalogCurrency =
      product && typeof product === "object" && "currency" in product
        ? (product as { currency?: string | null }).currency
        : null;
    const unitRaw = Number(item.unit_price);

    let unit = unitRaw;
    let itemRepaired = false;
    if (needsCurrencyFlip) {
      unit = toPlatformUsd(unitRaw, order.currency);
      itemRepaired = true;
    } else if (looksLikeRwfasUsd(unitRaw, catalogPrice, catalogCurrency)) {
      unit = toPlatformUsd(unitRaw, "RWF");
      itemRepaired = true;
    }

    unit = Math.round(unit * 100) / 100;
    const total = Math.round(unit * qty * 100) / 100;
    newSubtotal += total;

    if (itemRepaired) {
      repairedAny = true;
      await admin
        .from("order_items")
        .update({
          unit_price: unit,
          total_price: total,
        })
        .eq("id", item.id);
    }
  }

  if (!needsCurrencyFlip && !repairedAny) return;

  const shipping =
    order.shipping_amount == null
      ? null
      : needsCurrencyFlip
        ? toPlatformUsd(Number(order.shipping_amount), order.currency)
        : Number(order.shipping_amount);
  const discount =
    order.discount_amount == null
      ? 0
      : needsCurrencyFlip
        ? toPlatformUsd(Number(order.discount_amount), order.currency)
        : Number(order.discount_amount);

  const totalAmount =
    Math.round((newSubtotal + Number(shipping ?? 0) - Number(discount ?? 0)) * 100) / 100;

  await admin
    .from("orders")
    .update({
      currency: PLATFORM_CURRENCY,
      subtotal: Math.round(newSubtotal * 100) / 100,
      total_amount: totalAmount,
      shipping_amount: shipping,
      discount_amount: discount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .in("payment_status", ["pending", "failed"]);
}
