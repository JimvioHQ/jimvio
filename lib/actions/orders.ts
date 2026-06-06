
"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDefaultAffiliateCommissionPercent } from "@/lib/platform-settings";
import { normalizeProductSource } from "@/lib/sources/product-source";
import { getAdminDB } from "@/services/db";
import { revalidatePath } from "next/cache";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";

export async function createOrder(productId: string, quantity: number = 1) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/marketplace");
  }

  const { data: product } = await supabase
    .from("products")
    .select("*, vendors(*)")
    .eq("id", productId)
    .maybeSingle();

  if (!product) throw new Error("Product not found");

  const cookieStore = await cookies();
  const lastVideoId = cookieStore.get("jimvio_last_video_id")?.value;
  const refCode = cookieStore.get("jimvio_ref")?.value;

  let affiliateId = null;
  const defaultAffiliate = await getDefaultAffiliateCommissionPercent();
  let commissionRate = product.affiliate_commission_rate ?? defaultAffiliate;
  let commissionAmount = 0;

  if (refCode && product.affiliate_enabled) {
    if (refCode.startsWith("LNK-")) {
      const { data: link } = await supabase
        .from("affiliate_links")
        .select("affiliate_id, commission_rate")
        .eq("link_code", refCode)
        .maybeSingle();

      if (link) {
        affiliateId = link.affiliate_id;
        commissionRate = link.commission_rate || commissionRate;
      }
    } else {
      const { data: aff } = await supabase
        .from("affiliates")
        .select("id")
        .eq("affiliate_code", refCode)
        .maybeSingle();

      if (aff) affiliateId = aff.id;
    }
  }

  const basePrice = Number(product.price);
  const totalPrice = basePrice * quantity;
  if (affiliateId) {
    commissionAmount = (totalPrice * commissionRate) / 100;
  }

  // FIX 4: pass subtotal so orders row is consistent before trigger fires
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      buyer_id: user.id,
      vendor_id: product.vendor_id,
      subtotal: totalPrice,           // ← added
      total_amount: totalPrice,
      currency: product.currency ?? "USD",
      status: "pending",
      payment_status: "pending",
      integration_source: product.source === "shopify" ? "shopify" : "manual",
      metadata: lastVideoId ? { video_id: lastVideoId } : {},
    })
    .select()
    .single();

  if (orderError) throw orderError;

  const src = normalizeProductSource(
    (product as { source?: string | null }).source
  );
  const meta =
    (product as { source_metadata?: Record<string, unknown> | null })
      .source_metadata ?? {};

  const shopifyMeta =
    product.source === "shopify"
      ? {
        shopify_variant_id: product.shopify_variant_id ?? null,
        shopify_product_id: product.shopify_product_id ?? null,
      }
      : {};

  // FIX 1: pull first image from product images array
  const productImage = Array.isArray(product.images) && product.images.length > 0
    ? (product.images[0] as any)?.url ?? (product.images[0] as any) ?? null
    : null;

  const { error: itemError } = await supabase.from("order_items").insert({
    order_id: order.id,
    product_id: product.id,
    vendor_id: product.vendor_id,
    product_name: product.name,
    product_image: productImage,                        // FIX 1: was missing
    product_type: product.product_type ?? "physical",  // FIX 2: was missing
    pricing_type: product.pricing_type ?? "one_time",  // FIX 3: was missing
    billing_period: product.pricing_type === "recurring"
      ? (product.billing_period ?? "monthly")          // FIX 3: satisfy CHECK constraint
      : null,
    quantity,
    unit_price: product.price,
    total_price: totalPrice,
    affiliate_id: affiliateId,
    affiliate_commission_rate: commissionRate,
    affiliate_commission_amount: commissionAmount,
    product_source: src,
    source_metadata: { ...meta, ...shopifyMeta },
    metadata: lastVideoId ? { video_id: lastVideoId } : {},
  });

  if (itemError) {
    // Roll back the order if item insert fails
    await supabase.from("orders").delete().eq("id", order.id);
    throw itemError;
  }

  return { orderId: order.id };
}

export async function markOrderPaidAction(formData: FormData) {
  const orderId = formData.get("orderId") as string;
  if (!orderId) return;

  const admin = getAdminDB();
  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id, total_amount, currency, payment_status, buyer_id")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    throw new Error("Order not found");
  }

  if (order.payment_status === "paid" || order.payment_status === "completed") {
    return;
  }

  const { data: existingTx } = await admin
    .from("transactions")
    .select("id, status, provider_transaction_id")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let providerTransactionId = existingTx?.provider_transaction_id ??
    `manual-${orderId}-${Date.now()}`;

  if (!existingTx || existingTx.status !== "pending") {
    await admin.from("transactions").insert({
      user_id: order.buyer_id ?? "",
      order_id: orderId,
      provider_transaction_id: providerTransactionId,
      provider: "manual",
      type: "payment",
      status: "pending",
      amount: Number(order.total_amount) || 0,
      currency: order.currency ?? "USD",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  await finalizeOrderPayment(admin, orderId, {
    providerTransactionId,
    providerReference: providerTransactionId,
    paidAtIso: new Date().toISOString(),
    notifyUserId: order.buyer_id,
    amountForMessage: Number(order.total_amount) || 0,
    paymentProvider: "manual",
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

export async function resolveFailedCreditAction(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  const admin = getAdminDB();

  type FailedCreditUpdate = {
    resolved?: boolean;
    resolved_at?: string | null;
  };

  await admin
    .from("failed_wallet_credits")
    .update({ resolved: true, resolved_at: new Date().toISOString() } as FailedCreditUpdate)
    .eq("id", id);

  revalidatePath("/admin/payments/failed-credits");
  revalidatePath("/admin/payments");
}