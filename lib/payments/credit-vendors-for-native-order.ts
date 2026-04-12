import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeProductSource } from "@/lib/sources/product-source";
import { loadSupplierSourcesSettings, resolveCommissionPercentForLine } from "@/lib/sources/supplier-settings";
import { isShopifyFulfillmentLine } from "@/lib/order-fulfillment/after-payment";

export type NativeOrderItemForCredit = {
  vendor_id: string;
  total_price: number | string;
  /** From `order_items.product_source` — drives commission tier */
  product_source?: string | null;
  shopify_variant_id?: number | null;
};

/**
 * Credits vendor wallets for lines not fulfilled via Shopify (vendor + CJ native lines on Jimvio checkout).
 * Idempotent per order + vendor via unique `transactions.reference` EARN-{orderId}-{vendorId}.
 */
export async function creditVendorWalletsForNativeOrder(
  db: SupabaseClient,
  params: {
    orderId: string;
    orderNumber: string;
    currency: string;
    paymentProvider: string | null;
    providerTransactionId: string;
    items: NativeOrderItemForCredit[];
  }
): Promise<void> {
  const lines = params.items.filter((i) => {
    if (!i.vendor_id) return false;
    return !isShopifyFulfillmentLine({
      product_source: i.product_source,
      shopify_variant_id: i.shopify_variant_id ?? null,
    });
  });
  if (!lines.length) return;

  const settings = await loadSupplierSourcesSettings(db);
  const byVendor = new Map<string, number>();
  const commissionMeta = new Map<string, { gross: number; blendedRate: number }>();

  for (const item of lines) {
    const vendorId = item.vendor_id;
    const gross = Number(item.total_price);
    const src = normalizeProductSource(item.product_source);
    const rate = await resolveCommissionPercentForLine(db, settings, src, vendorId);
    const earn = gross * (1 - rate / 100);
    if (!Number.isFinite(earn) || earn < 0) continue;
    byVendor.set(vendorId, (byVendor.get(vendorId) ?? 0) + earn);
    const prev = commissionMeta.get(vendorId);
    if (prev) {
      const newGross = prev.gross + gross;
      const blended = newGross > 0 ? ((prev.blendedRate * prev.gross + rate * gross) / newGross) : rate;
      commissionMeta.set(vendorId, { gross: newGross, blendedRate: blended });
    } else {
      commissionMeta.set(vendorId, { gross, blendedRate: rate });
    }
  }

  const currency = (params.currency || "RWF").toUpperCase();
  const provider = (params.paymentProvider || "jimvio").toLowerCase();

  for (const [vendorId, vendorEarnings] of byVendor) {
    const ref = `EARN-${params.orderId}-${vendorId}`;
    const { data: existing } = await db.from("transactions").select("id").eq("reference", ref).maybeSingle();
    if (existing) continue;

    if (!Number.isFinite(vendorEarnings) || vendorEarnings <= 0) continue;

    const { data: vendor } = await db.from("vendors").select("user_id").eq("id", vendorId).single();
    if (!vendor?.user_id) continue;

    const meta = commissionMeta.get(vendorId);
    const commissionRate = meta?.blendedRate ?? 0;
    const vendorTotal = meta?.gross ?? 0;

    const { data: wallet } = await db
      .from("wallets")
      .select("available_balance, pending_balance, total_earned")
      .eq("user_id", vendor.user_id)
      .maybeSingle();

    const now = new Date().toISOString();

    if (wallet) {
      await db
        .from("wallets")
        .update({
          pending_balance: Number(wallet.pending_balance || 0) + vendorEarnings,
          total_earned: Number(wallet.total_earned || 0) + vendorEarnings,
          updated_at: now,
        })
        .eq("user_id", vendor.user_id);
    } else {
      await db.from("wallets").insert({
        user_id: vendor.user_id,
        available_balance: 0,
        total_earned: vendorEarnings,
        pending_balance: vendorEarnings,
        total_paid: 0,
        currency,
      });
    }

    await db.from("transactions").insert({
      user_id: vendor.user_id,
      reference: ref,
      type: "vendor_earning",
      amount: vendorEarnings,
      currency,
      status: "pending",
      provider,
      provider_transaction_id: params.providerTransactionId,
      description: `Pending Escrow: Earnings from order ${params.orderNumber} (~${commissionRate.toFixed(1)}% avg platform fee)`,
      order_id: params.orderId,
      metadata: {
        vendor_id: vendorId,
        vendor_total: vendorTotal,
        commission_rate: commissionRate,
        commission_amount: vendorTotal * (commissionRate / 100),
        vendor_earnings: vendorEarnings,
        source: "native_marketplace",
      },
    });
  }
}

/**
 * Safe when payment is already completed: idempotent via unique `EARN-{orderId}-{vendorId}` refs.
 */
export async function ensureNativeVendorCreditsApplied(
  db: SupabaseClient,
  orderId: string,
  ctx: { providerTransactionId: string; paymentProvider: string | null }
): Promise<void> {
  const { data: order, error } = await db
    .from("orders")
    .select(
      `
      id,
      order_number,
      currency,
      order_items ( vendor_id, total_price, shopify_variant_id, product_source )
    `
    )
    .eq("id", orderId)
    .single();

  if (error || !order) return;

  const items = (order.order_items ?? []) as Array<{
    vendor_id: string;
    total_price: number | string;
    shopify_variant_id: number | null;
    product_source?: string | null;
  }>;
  if (!items.length) return;

  const walletLines = items.filter(
    (i) =>
      !isShopifyFulfillmentLine({
        product_source: i.product_source,
        shopify_variant_id: i.shopify_variant_id,
      })
  );
  if (!walletLines.length) return;

  await creditVendorWalletsForNativeOrder(db, {
    orderId: order.id,
    orderNumber: String(order.order_number ?? orderId),
    currency: String(order.currency ?? "RWF"),
    paymentProvider: ctx.paymentProvider,
    providerTransactionId: ctx.providerTransactionId,
    items: walletLines.map((i) => ({
      vendor_id: i.vendor_id,
      total_price: i.total_price,
      product_source: i.product_source,
      shopify_variant_id: i.shopify_variant_id,
    })),
  });
}
