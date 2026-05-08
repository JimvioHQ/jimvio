// lib/actions/payment-confirmed.ts

import { createClient } from "@/lib/supabase/server";
import { grantDigitalAccess } from "./digital-access";

type JoinedProduct = {
    digital_file_url: string | null;
    pricing_type: string | null;
    billing_period: string | null;
    source_metadata: Record<string, unknown> | null;
} | null;

type JoinedOrder = {
    buyer_id: string;
} | null;

function resolveJoin<T>(raw: T | T[]): T | null {
    if (raw == null) return null;
    return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

export async function handlePaymentConfirmed(orderId: string) {
    const supabase = await createClient();

    const { data: items, error } = await supabase
        .from("order_items")
        .select(`
      id,
      product_id,
      product_type,
      source_metadata,
      digital_download_url,
      pricing_type,
      billing_period,
      orders!inner ( buyer_id ),
      products (
        digital_file_url,
        pricing_type,
        billing_period,
        source_metadata
      )
    `)
        .eq("order_id", orderId)
        .eq("product_type", "digital");

    if (error) {
        console.error("[handlePaymentConfirmed] Failed to fetch items:", error);
        throw new Error(`Failed to fetch order items: ${error.message}`);
    }

    if (!items?.length) return;

    for (const item of items) {
        // Supabase types all joins as arrays at the TS level regardless of cardinality
        // resolveJoin handles both the type system and any unexpected runtime shape
        const order = resolveJoin(item.orders as unknown as JoinedOrder | JoinedOrder[]);
        const product = resolveJoin(item.products as unknown as JoinedProduct | JoinedProduct[]);

        if (!order?.buyer_id) {
            console.warn("[handlePaymentConfirmed] Missing buyer_id, skipping item:", item.id);
            continue;
        }

        if (!item.product_id) {
            console.warn("[handlePaymentConfirmed] Missing product_id, skipping item:", item.id);
            continue;
        }

        const itemMeta = (item.source_metadata as Record<string, unknown> | null) ?? {};
        const productMeta = (product?.source_metadata as Record<string, unknown> | null) ?? {};

        const subtype =
            (itemMeta.product_subtype as string | undefined) ??
            (productMeta.product_subtype as string | undefined) ??
            null;

        const accessUrl =
            item.digital_download_url ??
            product?.digital_file_url ??
            null;

        const pricingType =
            item.pricing_type ??
            product?.pricing_type ??
            "one_time";

        const billingPeriod =
            item.billing_period ??
            product?.billing_period ??
            null;

        await grantDigitalAccess({
            userId: order.buyer_id,
            productId: item.product_id,
            orderItemId: item.id,
            orderId,
            accessUrl,
            subtype,
            pricingType,
            billingPeriod,
        });
    }
}