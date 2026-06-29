
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CJ_CUSTOMER_MESSAGES, logCjInternalError, sanitizeCustomerError } from "@/lib/cj/customer-errors";
import { fetchCjCheckoutFreightRates } from "@/lib/cj/checkout-shipping";

interface CartItemInput {
    variantId?: string;
    cjVid?: string;
    quantity: number;
    weight?: number;
}

interface RateRequest {
    destCountryCode: string;
    orderCurrency: string;
    cartItems: CartItemInput[];
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const body: RateRequest = await req.json();
        const { destCountryCode, orderCurrency = "RWF", cartItems } = body;

        if (!destCountryCode) {
            return NextResponse.json(
                { success: false, error: "destCountryCode is required" },
                { status: 400 }
            );
        }

        if (!cartItems?.length) {
            return NextResponse.json(
                { success: false, error: "cartItems must not be empty" },
                { status: 400 }
            );
        }

        const products = cartItems
            .map((item) => ({
                vid: (item.cjVid ?? item.variantId ?? "").trim(),
                quantity: item.quantity,
                weight: item.weight,
            }))
            .filter((item) => item.vid && item.quantity > 0);

        if (!products.length) {
            return NextResponse.json(
                { success: false, error: "No valid CJ variants in cart" },
                { status: 400 }
            );
        }

        const { rates } = await fetchCjCheckoutFreightRates({
            destCountryCode,
            products,
            orderCurrency,
        });

        return NextResponse.json({ success: true, rates });
    } catch (e) {
        await logCjInternalError({
            action: "shipping_rates",
            message: "Failed to fetch CJ shipping rates during checkout",
            error: e,
        });
        const message = sanitizeCustomerError(e, CJ_CUSTOMER_MESSAGES.shippingRates);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
