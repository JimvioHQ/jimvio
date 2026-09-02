
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CJ_CUSTOMER_MESSAGES, logCjInternalError, sanitizeCustomerError } from "@/lib/cj/customer-errors";
import {
  fetchCjCheckoutFreightRates,
  isCheckoutShippingCoverageError,
  toCheckoutFreightProducts,
} from "@/lib/cj/checkout-shipping";
import { isJimvioUuid, usableCjVid } from "@/lib/cj/variant-vid";
import { normalizeCountryCode } from "@/lib/geo/buyer-country";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface CartItemInput {
    productId?: string;
    variantId?: string;
    cjVid?: string;
    quantity: number;
    weight?: number;
}

interface RateRequest {
    destCountryCode: string;
    orderCurrency?: string;
    cartItems: CartItemInput[];
}

function metaVid(meta: unknown): string | null {
    if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
    const record = meta as Record<string, unknown>;
    return usableCjVid(record.cj_vid);
}

function metaWeight(meta: unknown): number | undefined {
    if (!meta || typeof meta !== "object" || Array.isArray(meta)) return undefined;
    const record = meta as Record<string, unknown>;
    const value = Number(record.cj_weight);
    return Number.isFinite(value) && value > 0 ? value : undefined;
}

async function resolveCartFreightLines(items: CartItemInput[]) {
    const resolved: Array<{ vid: string; quantity: number; weight?: number }> = [];
    const missing: CartItemInput[] = [];

    for (const item of items) {
        if (!item.quantity || item.quantity <= 0) continue;
        const vid = usableCjVid(item.cjVid);
        if (vid) {
            resolved.push({
                vid,
                quantity: item.quantity,
                weight: item.weight,
            });
            continue;
        }
        missing.push(item);
    }

    if (missing.length === 0) return resolved;

    const admin = createAdminClient();
    const variantIds = [...new Set(missing.map((item) => item.variantId).filter(isJimvioUuid))];
    const productIds = [...new Set(missing.map((item) => item.productId).filter(isJimvioUuid))];

    const variantById = new Map<string, { cj_vid: string | null; weight: number | null; source_metadata: unknown; product_id: string }>();
    const variantsByProduct = new Map<string, Array<{ cj_vid: string | null; weight: number | null; source_metadata: unknown }>>();

    if (variantIds.length > 0) {
        const { data } = await admin
            .from("product_variants")
            .select("id, product_id, cj_vid, weight, source_metadata")
            .in("id", variantIds);
        for (const row of data ?? []) {
            variantById.set(row.id as string, {
                cj_vid: (row.cj_vid as string | null) ?? null,
                weight: (row.weight as number | null) ?? null,
                source_metadata: row.source_metadata,
                product_id: row.product_id as string,
            });
        }
    }

    if (productIds.length > 0) {
        const { data } = await admin
            .from("product_variants")
            .select("product_id, cj_vid, weight, source_metadata, is_active")
            .in("product_id", productIds)
            .eq("is_active", true);
        for (const row of data ?? []) {
            const productId = row.product_id as string;
            const list = variantsByProduct.get(productId) ?? [];
            list.push({
                cj_vid: (row.cj_vid as string | null) ?? null,
                weight: (row.weight as number | null) ?? null,
                source_metadata: row.source_metadata,
            });
            variantsByProduct.set(productId, list);
        }
    }

    for (const item of missing) {
        const fromVariant = item.variantId ? variantById.get(item.variantId) : undefined;
        const productVariants = item.productId ? variantsByProduct.get(item.productId) ?? [] : [];
        const fallbackVariant =
            fromVariant ??
            productVariants.find((row) => usableCjVid(row.cj_vid) || metaVid(row.source_metadata)) ??
            productVariants[0];

        const vid =
            usableCjVid(fromVariant?.cj_vid) ??
            metaVid(fromVariant?.source_metadata) ??
            usableCjVid(fallbackVariant?.cj_vid) ??
            metaVid(fallbackVariant?.source_metadata);

        if (!vid) continue;

        const weight =
            (typeof item.weight === "number" && item.weight > 0 ? item.weight : undefined) ??
            (typeof fromVariant?.weight === "number" && fromVariant.weight > 0 ? fromVariant.weight : undefined) ??
            metaWeight(fromVariant?.source_metadata) ??
            (typeof fallbackVariant?.weight === "number" && fallbackVariant.weight > 0
                ? fallbackVariant.weight
                : undefined);

        resolved.push({
            vid,
            quantity: item.quantity,
            weight,
        });
    }

    return resolved;
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const body: RateRequest = await req.json();
        const destCountryCode = normalizeCountryCode(body.destCountryCode);
        const orderCurrency = (body.orderCurrency ?? "USD").trim() || "USD";
        const cartItems = body.cartItems;

        if (!destCountryCode) {
            return NextResponse.json(
                { success: false, error: "Please choose a valid shipping country." },
                { status: 400 }
            );
        }

        if (!cartItems?.length) {
            return NextResponse.json(
                { success: false, error: "Your order has no items to ship." },
                { status: 400 }
            );
        }

        const resolved = await resolveCartFreightLines(cartItems);
        const products = toCheckoutFreightProducts(resolved);

        if (!products.length) {
            return NextResponse.json(
                { success: false, error: "Please choose your product options before checkout." },
                { status: 400 }
            );
        }

        const { rates, unavailable } = await fetchCjCheckoutFreightRates({
            destCountryCode,
            products,
            orderCurrency,
        });

        return NextResponse.json({
            success: true,
            rates,
            unavailable: unavailable === true || rates.length === 0,
            message:
                rates.length === 0
                    ? CJ_CUSTOMER_MESSAGES.shippingUnavailable
                    : undefined,
        });
    } catch (e) {
        if (isCheckoutShippingCoverageError(e)) {
            return NextResponse.json({
                success: true,
                rates: [],
                unavailable: true,
                message: CJ_CUSTOMER_MESSAGES.shippingUnavailable,
            });
        }
        await logCjInternalError({
            action: "shipping_rates",
            message: "Failed to fetch CJ shipping rates during checkout",
            error: e,
        });
        const fallback = /timeout|abort|timed out/i.test(
            e instanceof Error ? e.message : String(e)
        )
            ? CJ_CUSTOMER_MESSAGES.shippingTimeout
            : CJ_CUSTOMER_MESSAGES.shippingRates;
        const message = sanitizeCustomerError(e, fallback);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
