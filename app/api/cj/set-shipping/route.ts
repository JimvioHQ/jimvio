import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { CJ_CUSTOMER_MESSAGES, logCjInternalError, sanitizeCustomerError } from "@/lib/cj/customer-errors";
import {
    fetchCjCheckoutFreightRates,
    findMatchingCheckoutShippingRate,
    type CheckoutShippingSelection,
    type CjFreightProduct,
} from "@/lib/cj/checkout-shipping";

// Expected, user-facing errors — logged at debug level, not as errors
class UserError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "UserError";
    }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CartItemInput {
    variantId: string;
    quantity: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function buildProductsFromVariants(
    cartItems: CartItemInput[]
): Promise<{ products: CjFreightProduct[]; skipped: string[] }> {
    const supabase = createServiceRoleClient();

    const variantIds = cartItems.map((item) => item.variantId).filter(Boolean);
    if (!variantIds.length) throw new Error("No variant IDs provided");

    const { data: variants, error } = await supabase
        .from("product_variants")
        .select("id, cj_vid, weight, source_metadata")
        .in("id", variantIds);

    if (error) throw new Error(`Variant lookup failed: ${error.message}`);
    if (!variants?.length) throw new Error("No matching variants found");

    const variantMap = new Map(
        variants.map((variant) => [
            variant.id,
            {
                cj_vid:
                    ((variant.source_metadata as { cj_vid?: string } | null)?.cj_vid) ??
                    (variant.cj_vid as string | null) ??
                    null,
                weight: Number(variant.weight ?? 0),
            },
        ])
    );

    const skipped: string[] = [];
    const products = cartItems
        .map((item): CjFreightProduct | null => {
            const variant = variantMap.get(item.variantId);
            if (!variant?.cj_vid) {
                skipped.push(item.variantId);
                return null;
            }
            return {
                vid: variant.cj_vid,
                quantity: item.quantity,
                weight: variant.weight > 0 ? variant.weight : 100,
            };
        })
        .filter((product): product is CjFreightProduct => product !== null);

    if (!products.length) {
        throw new Error("No valid CJ variants found for shipping calculation");
    }

    return { products, skipped };
}

// ─── Operation A: fetch shipping rates ────────────────────────────────────────

async function fetchRates(
    destCountryCode: string,
    cartItems: CartItemInput[],
    orderCurrency = "USD"
): Promise<{ rates: Awaited<ReturnType<typeof fetchCjCheckoutFreightRates>>["rates"]; skipped: string[] }> {
    const { products, skipped } = await buildProductsFromVariants(cartItems);
    const { rates } = await fetchCjCheckoutFreightRates({
        destCountryCode,
        products,
        orderCurrency,
    });
    return { rates, skipped };
}

async function saveSelection(
    orderIds: string[],
    shippingOption: CheckoutShippingSelection,
    buyerId: string,
    fallbackCountryCode?: string
): Promise<{ priceUSD: number; name: string }> {
    const supabase = createServiceRoleClient();

    const { data: orders, error } = await supabase
        .from("orders")
        .select(
            "id, buyer_id, payment_status, shipping_address, metadata, order_items(variant_id, quantity, product_source)"
        )
        .in("id", orderIds);

    if (error) throw new Error(`Order verification failed: ${error.message}`);
    if (!orders?.length) throw new UserError("No matching orders found");

    const unauthorized = orders.filter((o) => o.buyer_id !== buyerId);
    if (unauthorized.length) {
        throw new UserError("Unauthorized: orders do not belong to this user");
    }

    const alreadyPaid = orders.filter((o) => o.payment_status === "paid" || o.payment_status === "completed");
    if (alreadyPaid.length) {
        throw new UserError("Cannot change shipping on a paid order");
    }

    // Re-derive cart from the orders so the buyer can't tamper with variants/qty
    const cartItems: CartItemInput[] = orders.flatMap((o: any) =>
        (o.order_items ?? [])
            .filter((it: any) => it.product_source === "cj")
            .map((it: any) => ({ variantId: it.variant_id, quantity: it.quantity }))
    );

    if (!cartItems.length) throw new UserError("No shippable items found on these orders");

    const destCountryCode =
        (orders[0] as any)?.shipping_address?.country_code ??
        fallbackCountryCode ??
        null;
    if (!destCountryCode) {
        throw new UserError(
            "Cannot verify shipping rates: no country code on the order or in the request"
        );
    }

    // Re-quote — this is the trusted price (no currency conversion needed here)
    const { rates } = await fetchRates(destCountryCode, cartItems, "USD");
    const trusted = findMatchingCheckoutShippingRate(rates, shippingOption);

    if (!trusted) {
        throw new UserError(
            "Selected shipping option no longer available. Please choose again."
        );
    }

    const { error: updateErr } = await supabase
        .from("orders")
        .update({
            cj_shipping_method: trusted.name,
            cj_supplier_cost: trusted.priceUSD,
            updated_at: new Date().toISOString(),
        })
        .in("id", orderIds);

    if (!updateErr) {
        for (const order of orders) {
            const existingMeta =
                order && typeof (order as any).metadata === "object" && (order as any).metadata
                    ? ((order as any).metadata as Record<string, unknown>)
                    : {};
            await supabase
                .from("orders")
                .update({
                    metadata: {
                        ...existingMeta,
                        cj_logistic_code: trusted.channelId,
                        cj_shipping_cost_usd: trusted.priceUSD,
                    },
                })
                .eq("id", order.id);
        }
    }

    if (updateErr) {
        throw new Error(`Failed to save shipping method: ${updateErr.message}`);
    }

    return { priceUSD: trusted.priceUSD, name: trusted.name };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    let logOrderId: string | undefined;
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await req.json().catch(() => null);
        if (!body || typeof body !== "object") {
            return NextResponse.json(
                { success: false, error: "Invalid JSON body" },
                { status: 400 }
            );
        }

        // ── Save operation ───────────────────────────────────────────────────
        if (body.orderIds && body.shippingOption) {
            const { orderIds, shippingOption, destCountryCode } = body;
            logOrderId = Array.isArray(orderIds) ? orderIds[0] : undefined;
            if (!Array.isArray(orderIds) || !orderIds.length) {
                return NextResponse.json(
                    { success: false, error: "orderIds must be a non-empty array" },
                    { status: 400 }
                );
            }
            if (!shippingOption?.name) {
                return NextResponse.json(
                    { success: false, error: "shippingOption.name is required" },
                    { status: 400 }
                );
            }

            const result = await saveSelection(
                orderIds,
                shippingOption,
                user.id,
                typeof destCountryCode === "string" ? destCountryCode : undefined
            );
            return NextResponse.json({ success: true, ...result });
        }

        // ── Fetch operation ──────────────────────────────────────────────────
        if (body.destCountryCode && body.cartItems) {
            const {
                destCountryCode,
                cartItems,
                orderCurrency = "USD",
            } = body;

            if (
                typeof destCountryCode !== "string" ||
                destCountryCode.length !== 2
            ) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "destCountryCode must be a 2-letter country code",
                    },
                    { status: 400 }
                );
            }
            if (!Array.isArray(cartItems) || !cartItems.length) {
                return NextResponse.json(
                    { success: false, error: "cartItems must be a non-empty array" },
                    { status: 400 }
                );
            }

            const { rates, skipped } = await fetchRates(
                destCountryCode,
                cartItems,
                orderCurrency
            );
            return NextResponse.json({ success: true, rates, skipped });
        }

        return NextResponse.json(
            { success: false, error: "Invalid request shape" },
            { status: 400 }
        );
    } catch (err: any) {
        if (err instanceof UserError) {
            return NextResponse.json(
                { success: false, error: err.message },
                { status: 400 }
            );
        }
        await logCjInternalError({
            action: "set_shipping",
            message: "CJ set-shipping route failed during checkout",
            error: err,
            orderId: logOrderId,
        });
        console.error("[/api/cj/set-shipping]", err);
        const message = sanitizeCustomerError(err, CJ_CUSTOMER_MESSAGES.shippingSave);
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        );
    }
}