import { getVendorTokenByVendorId, buildShopifyHeaders, buildShopifyBaseUrl } from "@/lib/shopifyToken";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export interface ShopifyOrderInput {
  jimvioOrderId: string;
  vendorId: string;
  buyer: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address1: string;
    address2?: string;
    city: string;
    country: string;
    countryCode: string;
    zip: string;
  };
  items: {
    shopifyVariantId: number;
    quantity: number;
    unitPrice: number;
    productName: string;
  }[];
  totalAmount: number;
  currency: string;
  iremboPaymentRef: string;
  platformCommissionRate: number;
}

export interface ShopifyOrderCreated {
  shopifyOrderId: string;
  shopifyOrderNumber: number;
  commissionAmount: number;
  vendorReceives: number;
}

export async function createShopifyOrder(input: ShopifyOrderInput): Promise<ShopifyOrderCreated> {
  const creds = await getVendorTokenByVendorId(input.vendorId);
  const baseUrl = buildShopifyBaseUrl(creds.shopDomain, creds.apiVersion);
  const headers = buildShopifyHeaders(creds.accessToken);

  const commissionAmount = (input.totalAmount * input.platformCommissionRate) / 100;
  const vendorReceives = input.totalAmount - commissionAmount;

  const payload = {
    order: {
      financial_status: "paid",
      line_items: input.items.map((item) => ({
        variant_id: item.shopifyVariantId,
        quantity: item.quantity,
        price: item.unitPrice.toFixed(2),
        title: item.productName,
      })),
      shipping_address: {
        first_name: input.buyer.firstName,
        last_name: input.buyer.lastName,
        address1: input.buyer.address1,
        address2: input.buyer.address2 || "",
        city: input.buyer.city,
        country: input.buyer.country,
        country_code: input.buyer.countryCode,
        zip: input.buyer.zip,
        phone: input.buyer.phone || "",
      },
      customer: {
        first_name: input.buyer.firstName,
        last_name: input.buyer.lastName,
        email: input.buyer.email,
      },
      note: `Jimvio Order: ${input.jimvioOrderId}`,
      note_attributes: [
        { name: "jimvio_order_id", value: input.jimvioOrderId },
        { name: "payment_ref", value: input.iremboPaymentRef },
        { name: "platform", value: "Jimvio" },
        { name: "commission_rate", value: `${input.platformCommissionRate}%` },
        { name: "commission_amount", value: commissionAmount.toFixed(2) },
        { name: "vendor_receives", value: vendorReceives.toFixed(2) },
      ],
      send_receipt: false,
      send_fulfillment_receipt: false,
      currency: input.currency,
      total_price: input.totalAmount.toFixed(2),
    },
  };

  const res = await fetch(`${baseUrl}/orders.json`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Shopify order failed [${res.status}]: ${await res.text()}`);
  }

  const { order: shopifyOrder } = (await res.json()) as {
    order: { id: number; order_number: number };
  };

  const shopifyOrderId = String(shopifyOrder.id);
  const shopifyOrderNumber = shopifyOrder.order_number;

  const platformWalletUserId = process.env.JIMVIO_PLATFORM_WALLET_USER_ID;
  if (!platformWalletUserId) {
    console.warn("JIMVIO_PLATFORM_WALLET_USER_ID is not set — Shopify platform commission was not credited.");
  }
  if (platformWalletUserId) {
    const { data: wallet } = await supabase
      .from("wallets")
      .select("available_balance, total_earned")
      .eq("user_id", platformWalletUserId)
      .single();

    if (wallet) {
      await supabase
        .from("wallets")
        .update({
          available_balance: Number(wallet.available_balance) + commissionAmount,
          total_earned: Number(wallet.total_earned) + commissionAmount,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", platformWalletUserId);
    }

    await supabase.from("transactions").insert({
      user_id: platformWalletUserId,
      reference: `SHOPIFY-COMM-${input.jimvioOrderId}-${shopifyOrderId}`,
      type: "platform_commission",
      amount: commissionAmount,
      currency: input.currency,
      status: "completed",
      provider: "shopify",
      provider_transaction_id: input.iremboPaymentRef,
      description: `Platform commission (${input.platformCommissionRate}%) from Shopify order #${shopifyOrderNumber}`,
      order_id: input.jimvioOrderId,
      metadata: {
        shopify_order_id: shopifyOrderId,
        commission_rate: input.platformCommissionRate,
        vendor_id: input.vendorId,
        vendor_receives: vendorReceives,
      },
    });
  }

  return {
    shopifyOrderId,
    shopifyOrderNumber,
    commissionAmount,
    vendorReceives,
  };
}

export async function attachShopifyOrdersToJimvioOrder(
  jimvioOrderId: string,
  created: ShopifyOrderCreated[]
) {
  if (!created.length) return;

  const ids = created.map((c) => c.shopifyOrderId);
  const first = created[0];

  await supabase
    .from("orders")
    .update({
      shopify_order_id: created.length === 1 ? first.shopifyOrderId : null,
      shopify_order_number: created.length === 1 ? first.shopifyOrderNumber : null,
      shopify_order_ids: ids,
      shopify_fulfillment_status: "pending",
      integration_source: "shopify",
      updated_at: new Date().toISOString(),
    })
    .eq("id", jimvioOrderId);
}
