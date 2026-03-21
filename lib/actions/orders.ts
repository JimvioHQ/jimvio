"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDefaultAffiliateCommissionPercent } from "@/lib/platform-settings";

export async function createOrder(productId: string, quantity: number = 1) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/marketplace");
  }

  const { data: product } = await supabase.from("products").select("*, vendors(*)").eq("id", productId).maybeSingle();

  if (!product) throw new Error("Product not found");

  const cookieStore = await cookies();
  const refCode = cookieStore.get("jimvio_ref")?.value;
  let affiliateId = null;
  const defaultAffiliate = await getDefaultAffiliateCommissionPercent();
  let commissionRate = product.affiliate_commission_rate ?? defaultAffiliate;
  let commissionAmount = 0;

  if (refCode && product.affiliate_enabled) {
    const { data: link } = await supabase
      .from("affiliate_links")
      .select("affiliate_id, commission_rate")
      .eq("link_code", refCode)
      .single();

    if (link) {
      affiliateId = link.affiliate_id;
      commissionRate = link.commission_rate || commissionRate;
    }
  }

  const basePrice = Number(product.price);
  const totalPrice = basePrice * quantity;
  if (affiliateId) {
    commissionAmount = (totalPrice * commissionRate) / 100;
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      buyer_id: user.id,
      vendor_id: product.vendor_id,
      total_amount: totalPrice,
      currency: product.currency ?? "RWF",
      status: "pending",
      payment_status: "pending",
      integration_source: product.source === "shopify" ? "shopify" : "manual",
    })
    .select()
    .single();

  if (orderError) throw orderError;

  await supabase.from("order_items").insert({
    order_id: order.id,
    product_id: product.id,
    vendor_id: product.vendor_id,
    product_name: product.name,
    quantity,
    unit_price: product.price,
    total_price: totalPrice,
    affiliate_id: affiliateId,
    affiliate_commission_rate: commissionRate,
    affiliate_commission_amount: commissionAmount,
    shopify_variant_id: product.shopify_variant_id ?? null,
    shopify_product_id: product.shopify_product_id ?? null,
  });

  return { orderId: order.id };
}
