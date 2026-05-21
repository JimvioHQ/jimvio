
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrRefreshAccessToken } from "@/lib/cj/auth";

interface CartItemInput {
    variantId?: string;
    cjVid?: string;
    quantity: number;
    weight?: number; // grams
}

interface RateRequest {
    destCountryCode: string;
    orderCurrency: string;
    cartItems: CartItemInput[];
}

// Fetch the exchange rate from USD to the target currency.
// Falls back to 1 (no conversion) if the fetch fails.
async function getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) return 1;

    try {
        const res = await fetch(
            `https://api.exchangerate-api.com/v4/latest/${fromCurrency.toUpperCase()}`
        );
        if (!res.ok) throw new Error("Exchange rate fetch failed");
        const data = await res.json();
        return data.rates?.[toCurrency.toUpperCase()] ?? 1;
    } catch {
        return 1;
    }
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


        const CJ_API_KEY = await getOrRefreshAccessToken();
        const CJ_BASE_URL = process.env.CJ_API_BASE_URL ?? "https://developers.cjdropshipping.com/api2.0/v1";

        const totalWeight = cartItems.reduce((sum, item) => {
            return sum + (item.weight ?? 0) * item.quantity;
        }, 0);

        const cjPayload = {
            startCountryCode: "CN",
            endCountryCode: destCountryCode,
            products: cartItems.map((item) => ({
                vid: item.cjVid ?? item.variantId,
                quantity: item.quantity,
            })),
            weight: totalWeight || 100,
        };

        console.log(cjPayload);


        const cjRes = await fetch(`${CJ_BASE_URL}/logistic/freightCalculate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "CJ-Access-Token": CJ_API_KEY,
            },
            body: JSON.stringify(cjPayload),
        });
        if (!cjRes.ok) {
            return NextResponse.json({ success: true, rates: [] });
        }

        const cjData = await cjRes.json();

        if (cjData.result !== true) {
            return NextResponse.json({ success: true, rates: [], error: cjData.message });
        }
        const rawRates: any[] = cjData.data ?? [];
        const fxRate = await getExchangeRate("USD", orderCurrency);
        
        const rates = rawRates.map((r: any) => ({
            optionId: r.logisticName ?? r.channelName,
            channelId: r.channelCode ?? r.logisticCode,
            name: r.logisticName ?? r.channelName,
            arrivalDays: String(r.agingMax ?? r.days ?? "7-14"),
            priceUSD: Number(r.logisticPrice ?? r.price ?? 0),
            priceLocal: Number(((r.logisticPrice ?? r.price ?? 0) * fxRate).toFixed(2)),
            localCurrency: orderCurrency.toUpperCase(),
            fxRate,
        }));

        rates.sort((a, b) => a.priceLocal - b.priceLocal);

        return NextResponse.json({ success: true, rates });
    } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to fetch shipping rates";
        console.error("[/api/cj/shipping-rates]", e);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}