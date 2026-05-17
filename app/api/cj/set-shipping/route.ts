import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CartItemInput {
    variantId: string;
    quantity: number;
}

interface CJShippingOption {
    optionId: string;
    channelId: string;
    name: string;
    arrivalDays: string;
    priceUSD: number;
}

interface CJRateRow {
    logisticName?: string;
    logisticAbbreviation?: string;
    logisticAging?: string;
    logisticPrice?: number | string;
    logisticCode?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getCJToken(): Promise<string> {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "cj_credentials")
        .single();

    if (error) throw new Error(`CJ credentials lookup failed: ${error.message}`);

    const value = data?.value as any;
    const token = value?.access_token as string | undefined;
    const expiresAt = value?.token_expires_at as string | undefined;

    if (!token) throw new Error("CJ credentials not configured");

    if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
        console.warn("[CJ] access_token expired at", expiresAt);
    }

    return token;
}

function toPriceUSD(v: unknown): number {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
        const n = Number(v.replace(/[^\d.]/g, ""));
        return Number.isFinite(n) ? n : 0;
    }
    return 0;
}

function formatAging(aging: string | undefined): string | null {
    if (!aging) return null;
    return aging.replace(/\s+/g, "").replace(/–|—/g, "-");
}

// ─── Operation A: fetch shipping rates ────────────────────────────────────────

async function fetchRates(
    destCountryCode: string,
    cartItems: CartItemInput[]
): Promise<{ rates: CJShippingOption[]; skipped: string[] }> {
    const supabase = createServiceRoleClient();

    const variantIds = cartItems.map((i) => i.variantId).filter(Boolean);
    if (!variantIds.length) throw new Error("No variant IDs provided");

    const { data: variants, error } = await supabase
        .from("product_variants")
        .select("id, cj_vid, weight, source_metadata")
        .in("id", variantIds);

    if (error) throw new Error(`Variant lookup failed: ${error.message}`);
    if (!variants?.length) throw new Error("No matching variants found");

    const variantMap = new Map(
        variants.map((v) => [
            v.id,
            {
                cj_vid:
                    ((v.source_metadata as any)?.cj_vid as string | undefined) ??
                    (v.cj_vid as string | null) ??
                    null,
                weight: Number(v.weight ?? 0),
            },
        ])
    );

    const skipped: string[] = [];
    const products = cartItems
        .map((item) => {
            const v = variantMap.get(item.variantId);
            if (!v?.cj_vid) {
                skipped.push(item.variantId);
                return null;
            }
            return {
                vid: v.cj_vid,
                quantity: item.quantity,
                weight: v.weight > 0 ? v.weight : 100,
            };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);

    if (!products.length) {
        throw new Error("No valid CJ variants found for shipping calculation");
    }

    const token = await getCJToken();

    const res = await fetch(`${CJ_BASE}/logistic/freightCalculate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "CJ-Access-Token": token,
        },
        body: JSON.stringify({
            startCountryCode: "CN",
            endCountryCode: destCountryCode,
            products,
        }),
        signal: AbortSignal.timeout(8000),
    });

    const json = await res.json().catch(() => ({} as any));

    if (!res.ok || json?.result === false) {
        const msg = json?.message ?? `HTTP ${res.status}`;
        throw new Error(`CJ shipping API error: ${msg}`);
    }

    const raw: CJRateRow[] = Array.isArray(json?.data) ? json.data : [];

    if (process.env.NODE_ENV !== "production") {
        console.log(
            "[CJ raw rates]",
            JSON.stringify(
                raw.map((r) => ({
                    name: r.logisticName,
                    aging: r.logisticAging,
                    price: r.logisticPrice,
                })),
                null,
                2
            )
        );
    }

    const rates: CJShippingOption[] = raw.map((r, idx) => ({
        optionId: `${r.logisticCode ?? r.logisticAbbreviation ?? r.logisticName ?? "opt"}-${idx}`,
        channelId: r.logisticCode ?? r.logisticAbbreviation ?? r.logisticName ?? "",
        name: r.logisticName ?? "Standard Shipping",
        arrivalDays: formatAging(r.logisticAging) ?? "",
        priceUSD: toPriceUSD(r.logisticPrice),
    }));

    rates.sort((a, b) => a.priceUSD - b.priceUSD);

    return { rates, skipped };
}

// ─── Operation B: save shipping selection ─────────────────────────────────────
// SECURITY: re-fetch rates server-side and use the trusted USD price, not the
// price sent in the request body. Buyer-supplied prices are never trusted.

async function saveSelection(
    orderIds: string[],
    shippingOption: { optionId?: string; channelId?: string; name: string },
    buyerId: string
): Promise<{ priceUSD: number; name: string }> {
    const supabase = createServiceRoleClient();

    const { data: orders, error } = await supabase
        .from("orders")
        .select(
            "id, buyer_id, payment_status, shipping_address, order_items(variant_id, quantity, product_source)"
        )
        .in("id", orderIds);

    if (error) throw new Error(`Order verification failed: ${error.message}`);
    if (!orders?.length) throw new Error("No matching orders found");

    const unauthorized = orders.filter((o) => o.buyer_id !== buyerId);
    if (unauthorized.length) {
        throw new Error("Unauthorized: orders do not belong to this user");
    }

    const alreadyPaid = orders.filter((o) => o.payment_status === "paid");
    if (alreadyPaid.length) {
        throw new Error("Cannot change shipping on a paid order");
    }

    // Re-derive cart from the orders so the buyer can't tamper with variants/qty
    const cartItems: CartItemInput[] = orders.flatMap((o: any) =>
        (o.order_items ?? [])
            .filter((it: any) => it.product_source === "cj")
            .map((it: any) => ({ variantId: it.variant_id, quantity: it.quantity }))
    );

    if (!cartItems.length) throw new Error("No CJ items found on these orders");

    // Use destination from the first order's saved address
    const destCountryCode =
        (orders[0] as any)?.shipping_address?.country_code ?? null;
    if (!destCountryCode) {
        throw new Error("Shipping address not saved — cannot verify rates");
    }

    // Re-quote — this is the trusted price
    const { rates } = await fetchRates(destCountryCode, cartItems);
    const trusted = rates.find(
        (r) =>
            r.optionId === shippingOption.optionId ||
            r.channelId === shippingOption.channelId ||
            r.name === shippingOption.name
    );

    if (!trusted) {
        throw new Error(
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

    if (updateErr) {
        throw new Error(`Failed to save shipping method: ${updateErr.message}`);
    }

    return { priceUSD: trusted.priceUSD, name: trusted.name };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
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

        // Save operation
        if (body.orderIds && body.shippingOption) {
            const { orderIds, shippingOption } = body;

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

            const result = await saveSelection(orderIds, shippingOption, user.id);
            return NextResponse.json({ success: true, ...result });
        }

        // Fetch operation
        if (body.destCountryCode && body.cartItems) {
            const { destCountryCode, cartItems } = body;

            if (typeof destCountryCode !== "string" || destCountryCode.length !== 2) {
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

            const { rates, skipped } = await fetchRates(destCountryCode, cartItems);
            return NextResponse.json({ success: true, rates, skipped });
        }

        return NextResponse.json(
            { success: false, error: "Invalid request shape" },
            { status: 400 }
        );
    } catch (err: any) {
        console.error("[/api/cj/set-shipping]", err);
        return NextResponse.json(
            { success: false, error: err.message ?? "Internal server error" },
            { status: 500 }
        );
    }
}