// services/paymentService.ts
// Shared payment handler called by both PesaPal and NowPayments
// after a payment is confirmed successful.
//
// Shopify: delegates to createShopifyOrder (which creates Shopify orders, credits the
// platform wallet, and inserts commission transactions — do not duplicate that here).

import { createClient } from "@supabase/supabase-js";
import { createShopifyOrder, attachShopifyOrdersToJimvioOrder } from "./shopifyOrderCreation";
import { getShopifyPlatformCommissionFallback } from "@/lib/platform-settings";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface PaymentSuccessParams {
  jimvioOrderId: string;
  paymentProvider: "pesapal" | "nowpayments";
  paymentRef: string;
  paymentId?: string;
}

export async function handleSuccessfulPayment(params: PaymentSuccessParams) {
  const { data: order, error } = await supabase
    .from("orders")
    .select(
      `
      *,
      order_items (
        id,
        vendor_id,
        product_name,
        quantity,
        unit_price,
        total_price,
        shopify_variant_id,
        shopify_product_id
      ),
      profiles!orders_buyer_id_fkey (
        full_name,
        email,
        phone
      )
    `
    )
    .eq("id", params.jimvioOrderId)
    .single();

  if (error || !order) {
    throw new Error(`Order not found: ${params.jimvioOrderId}`);
  }

  if (order.payment_status !== "paid") {
    console.warn(
      `[PaymentService] Skip — payment_status is not paid: ${params.jimvioOrderId} (${order.payment_status})`
    );
    return;
  }

  const hasShopifyBridge =
    order.shopify_order_id != null ||
    (Array.isArray(order.shopify_order_ids) && order.shopify_order_ids.length > 0);

  if (hasShopifyBridge) {
    console.log(`[PaymentService] Already processed (Shopify linked): ${params.jimvioOrderId}`);
    return;
  }

  type OrderItemRow = {
    id: string;
    vendor_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    shopify_variant_id: number | null;
    shopify_product_id: string | null;
  };

  const orderItems = (order.order_items ?? []) as OrderItemRow[];
  const shopifyItems = orderItems.filter((item) => item.shopify_variant_id != null);

  if (shopifyItems.length === 0) {
    console.log(`[PaymentService] No Shopify items in order: ${params.jimvioOrderId}`);
    return;
  }

  type ProfileRow = { full_name: string | null; email: string | null; phone: string | null };
  const rawProfiles = order.profiles as ProfileRow | ProfileRow[] | null;
  const buyerProfile = Array.isArray(rawProfiles) ? rawProfiles[0] : rawProfiles;

  const shipping = order.shipping_address as {
    address1?: string;
    address2?: string;
    city?: string;
    country?: string;
    country_code?: string;
    zip?: string;
    phone?: string;
  } | null;

  const buyerName = (buyerProfile?.full_name || "Customer").split(" ");

  const itemsByVendor = shopifyItems.reduce<Record<string, OrderItemRow[]>>((acc, item) => {
    if (!acc[item.vendor_id]) acc[item.vendor_id] = [];
    acc[item.vendor_id].push(item);
    return acc;
  }, {});

  const fallbackRate = await getShopifyPlatformCommissionFallback(supabase);

  const vendorEntries = Object.entries(itemsByVendor);

  const shopifyResults = await Promise.allSettled(
    vendorEntries.map(async ([vendorId, items]) => {
      const { data: creds } = await supabase
        .from("shopify_credentials")
        .select("platform_commission_rate")
        .eq("vendor_id", vendorId)
        .single();

      const platformCommissionRate =
        creds?.platform_commission_rate != null ? Number(creds.platform_commission_rate) : fallbackRate;

      const vendorTotal = items.reduce((sum, i) => sum + Number(i.total_price), 0);

      return createShopifyOrder({
        jimvioOrderId: params.jimvioOrderId,
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
        paymentReference: params.paymentRef,
        platformCommissionRate,
      });
    })
  );

  shopifyResults.forEach((result, index) => {
    if (result.status === "rejected") {
      const vendorId = vendorEntries[index]?.[0];
      console.error(`[PaymentService] Shopify order failed for vendor ${vendorId}:`, result.reason);
    }
  });

  const created = shopifyResults
    .filter(
      (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof createShopifyOrder>>> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value);

  if (created.length) {
    await attachShopifyOrdersToJimvioOrder(params.jimvioOrderId, created);
  }

  const fulfilledRows: Array<{
    vendorId: string;
    items: OrderItemRow[];
    shopifyOrderId: string;
  }> = [];
  vendorEntries.forEach(([vendorId, items], index) => {
    const r = shopifyResults[index];
    if (r.status === "fulfilled") {
      fulfilledRows.push({
        vendorId,
        items,
        shopifyOrderId: r.value.shopifyOrderId,
      });
    }
  });

  await Promise.allSettled(
    fulfilledRows.map(async ({ vendorId, items, shopifyOrderId }) => {
      const { data: vendor } = await supabase
        .from("vendors")
        .select("user_id")
        .eq("id", vendorId)
        .single();

      if (!vendor?.user_id) return;

      const { data: creds } = await supabase
        .from("shopify_credentials")
        .select("platform_commission_rate")
        .eq("vendor_id", vendorId)
        .single();

      const commissionRate =
        creds?.platform_commission_rate != null ? Number(creds.platform_commission_rate) : fallbackRate;

      const vendorTotal = items.reduce((s, i) => s + Number(i.total_price), 0);
      const vendorEarnings = vendorTotal * (1 - commissionRate / 100);

      const { data: wallet } = await supabase
        .from("wallets")
        .select("pending_balance, total_earned")
        .eq("user_id", vendor.user_id)
        .single();

      const now = new Date().toISOString();
      const currency = order.currency || "USD";

      if (wallet) {
        await supabase
          .from("wallets")
          .update({
            pending_balance: Number(wallet.pending_balance) + vendorEarnings,
            total_earned: Number(wallet.total_earned) + vendorEarnings,
            updated_at: now,
          })
          .eq("user_id", vendor.user_id);
      } else {
        await supabase.from("wallets").insert({
          user_id: vendor.user_id,
          pending_balance: vendorEarnings,
          total_earned: vendorEarnings,
          available_balance: 0,
          total_paid: 0,
          currency,
        });
      }

      const ref = `EARN-${params.jimvioOrderId}-${vendorId}`;

      await supabase.from("transactions").insert({
        user_id: vendor.user_id,
        reference: ref,
        type: "vendor_earning",
        amount: vendorEarnings,
        currency,
        status: "pending",
        provider: params.paymentProvider,
        description: `Earnings from order ${order.order_number} (${commissionRate}% commission deducted)`,
        order_id: params.jimvioOrderId,
        metadata: {
          vendor_id: vendorId,
          shopify_order_id: shopifyOrderId,
          vendor_total: vendorTotal,
          commission_rate: commissionRate,
          commission_amount: vendorTotal * (commissionRate / 100),
          vendor_earnings: vendorEarnings,
          line_count: items.length,
        },
      });
    })
  );

  console.log(
    `[PaymentService] ✓ Order ${params.jimvioOrderId} via ${params.paymentProvider}. Shopify orders created: ${created.length}`
  );
}

/**
 * Called when Shopify webhook confirms a vendor's order is fulfilled.
 * Moves that vendor's earnings from pending_balance → available_balance for the matching Shopify order.
 */
export async function releaseVendorEarnings(jimvioOrderId: string, shopifyOrderId: string) {
  const { data: txs } = await supabase
    .from("transactions")
    .select("id, user_id, amount, status, metadata")
    .eq("order_id", jimvioOrderId)
    .eq("type", "vendor_earning");

  type Meta = { shopify_order_id?: string };
  const tx = (txs ?? []).find((t) => {
    const m = t.metadata as Meta | null;
    return m?.shopify_order_id === shopifyOrderId;
  });

  if (!tx || tx.status === "completed") return;

  const vendorEarnings = Number(tx.amount);
  const userId = tx.user_id;

  const { data: wallet } = await supabase
    .from("wallets")
    .select("pending_balance, available_balance")
    .eq("user_id", userId)
    .single();

  if (!wallet) return;

  const pending = Number(wallet.pending_balance);
  const avail = Number(wallet.available_balance);
  const release = Math.min(vendorEarnings, Math.max(0, pending));

  await supabase
    .from("wallets")
    .update({
      pending_balance: Math.max(0, pending - release),
      available_balance: avail + release,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  await supabase
    .from("transactions")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("id", tx.id);
}
