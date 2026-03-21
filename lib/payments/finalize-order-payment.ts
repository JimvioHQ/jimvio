import type { SupabaseClient } from "@supabase/supabase-js";
import { createShopifyOrder, attachShopifyOrdersToJimvioOrder } from "@/services/shopifyOrderCreation";
import { getShopifyPlatformCommissionFallback } from "@/lib/platform-settings";

export type FinalizePaymentContext = {
  providerTransactionId: string;
  providerReference: string;
  paidAtIso: string;
  notifyUserId?: string | null;
  amountForMessage?: number | null;
  webhookReference?: string;
  /** When checkout used NowPayments (crypto). */
  nowpaymentsPaymentId?: number | null;
};

/**
 * Idempotent per order: if already paid and Shopify side already linked (when applicable), skips work.
 */
export async function finalizeOrderPayment(
  db: SupabaseClient,
  orderId: string,
  ctx: FinalizePaymentContext
): Promise<{ type: "regular" | "shopify" | "skipped" }> {
  const { data: order, error: orderError } = await db
    .from("orders")
    .select(
      `
      *,
      order_items (
        id,
        product_id,
        vendor_id,
        product_name,
        quantity,
        unit_price,
        total_price,
        shopify_variant_id,
        shopify_product_id,
        affiliate_id,
        affiliate_commission_rate,
        affiliate_commission_amount
      ),
      profiles (
        full_name,
        email,
        phone
      )
    `
    )
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  const isPaid = order.payment_status === "completed";
  const orderItems = (order.order_items ?? []) as Array<{
    id: string;
    vendor_id: string;
    shopify_variant_id: number | null;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    affiliate_id: string | null;
    affiliate_commission_rate: number | null;
    affiliate_commission_amount: number | null;
    product_id: string | null;
  }>;

  const shopifyItems = orderItems.filter((item) => item.shopify_variant_id != null);
  const hasShopifyBridge =
    order.shopify_order_id != null || (Array.isArray(order.shopify_order_ids) && order.shopify_order_ids.length > 0);

  if (isPaid && (shopifyItems.length === 0 || hasShopifyBridge)) {
    return { type: "skipped" };
  }

  /** Paid via provider but Shopify push failed earlier — finish Shopify only. */
  const recoveryShopifyOnly = isPaid && shopifyItems.length > 0 && !hasShopifyBridge;

  const buyerProfile = order.profiles as { full_name?: string | null; email?: string | null; phone?: string | null } | null;
  const buyerName = (buyerProfile?.full_name || "Unknown User").split(" ");
  const shipping = order.shipping_address as
    | {
        address1?: string;
        address2?: string;
        city?: string;
        country?: string;
        country_code?: string;
        zip?: string;
        phone?: string;
      }
    | null;

  const iremboRef = ctx.providerTransactionId;
  const paymentRefDisplay = ctx.providerReference;

  if (shopifyItems.length === 0) {
    if (isPaid) {
      return { type: "skipped" };
    }
    const regularPatch: Record<string, unknown> = {
      payment_status: "completed",
      status: "confirmed",
      paid_at: ctx.paidAtIso,
      updated_at: new Date().toISOString(),
    };
    if (ctx.nowpaymentsPaymentId != null) {
      regularPatch.nowpayments_payment_id = ctx.nowpaymentsPaymentId;
    } else {
      regularPatch.irembopay_transaction_id = iremboRef;
      regularPatch.irembopay_reference = paymentRefDisplay;
    }
    await db.from("orders").update(regularPatch).eq("id", orderId);

    const affItems = orderItems.filter((i) => i.affiliate_id != null);
    for (const item of affItems) {
      if (item.affiliate_id && item.affiliate_commission_amount) {
        await db.from("affiliate_commissions").insert({
          affiliate_id: item.affiliate_id,
          order_id: orderId,
          order_item_id: item.id,
          product_id: item.product_id,
          vendor_id: item.vendor_id,
          commission_rate: item.affiliate_commission_rate,
          order_amount: item.total_price,
          commission_amount: item.affiliate_commission_amount,
          status: "pending",
        });

        await db.rpc("increment_affiliate_earnings", {
          p_affiliate_id: item.affiliate_id,
          p_amount: item.affiliate_commission_amount,
        });
      }
    }

    if (ctx.notifyUserId) {
      await db.from("notifications").insert({
        user_id: ctx.notifyUserId,
        type: "order",
        title: "Payment Confirmed!",
        message: `Your payment${ctx.amountForMessage != null ? ` of RWF ${Number(ctx.amountForMessage).toLocaleString()}` : ""} has been confirmed. Order is being processed.`,
        data: { order_id: orderId, reference: ctx.webhookReference },
        action_url: `/dashboard/orders/${orderId}`,
      });
    }

    return { type: "regular" };
  }

  const itemsByVendor = shopifyItems.reduce<Record<string, typeof shopifyItems>>((acc, item) => {
    if (!acc[item.vendor_id]) acc[item.vendor_id] = [];
    acc[item.vendor_id].push(item);
    return acc;
  }, {});

  const results = await Promise.allSettled(
    Object.entries(itemsByVendor).map(async ([vendorId, items]) => {
      const { data: creds } = await db.from("shopify_credentials").select("platform_commission_rate").eq("vendor_id", vendorId).single();

      const fallbackRate = await getShopifyPlatformCommissionFallback(db);
      const platformCommissionRate =
        creds?.platform_commission_rate != null ? Number(creds.platform_commission_rate) : fallbackRate;
      const vendorTotal = items.reduce((sum, i) => sum + Number(i.total_price), 0);

      return createShopifyOrder({
        jimvioOrderId: orderId,
        vendorId,
        buyer: {
          firstName: buyerName[0] || "Customer",
          lastName: buyerName.slice(1).join(" ") || "",
          email: buyerProfile?.email || "",
          phone: buyerProfile?.phone || shipping?.phone || "",
          address1: shipping?.address1 || "",
          address2: shipping?.address2 || "",
          city: shipping?.city || "",
          country: shipping?.country || "Rwanda",
          countryCode: shipping?.country_code || "RW",
          zip: shipping?.zip || "00000",
        },
        items: items.map((i) => ({
          shopifyVariantId: i.shopify_variant_id as number,
          quantity: i.quantity,
          unitPrice: Number(i.unit_price),
          productName: i.product_name,
        })),
        totalAmount: vendorTotal,
        currency: order.currency || "USD",
        iremboPaymentRef: iremboRef,
        platformCommissionRate,
      });
    })
  );

  const created = results
    .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof createShopifyOrder>>> => r.status === "fulfilled")
    .map((r) => r.value);

  if (created.length) {
    await attachShopifyOrdersToJimvioOrder(orderId, created);
  }

  if (!recoveryShopifyOnly) {
    const shopifyPatch: Record<string, unknown> = {
      payment_status: "completed",
      status: "processing",
      paid_at: ctx.paidAtIso,
      updated_at: new Date().toISOString(),
    };
    if (ctx.nowpaymentsPaymentId != null) {
      shopifyPatch.nowpayments_payment_id = ctx.nowpaymentsPaymentId;
    } else {
      shopifyPatch.irembopay_transaction_id = iremboRef;
      shopifyPatch.irembopay_reference = paymentRefDisplay;
    }
    await db.from("orders").update(shopifyPatch).eq("id", orderId);

    if (ctx.notifyUserId) {
      await db.from("notifications").insert({
        user_id: ctx.notifyUserId,
        type: "order",
        title: "Payment Confirmed!",
        message: `Your Shopify order${ctx.amountForMessage != null ? ` (RWF ${Number(ctx.amountForMessage).toLocaleString()})` : ""} is being fulfilled by the merchant.`,
        data: { order_id: orderId, reference: ctx.webhookReference },
        action_url: `/dashboard/orders/${orderId}`,
      });
    }
  }

  return { type: "shopify" };
}
