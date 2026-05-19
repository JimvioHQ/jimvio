// lib/cj/sync-shipping.ts

import { getCJToken } from "@/lib/cj/client";
import type { SupabaseClient } from "@supabase/supabase-js";

const CJ_API_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

const TARGET_COUNTRIES = ["RW", "US", "GB", "DE", "FR", "NG", "KE", "ZA", "AE", "CA", "UG", "TZ"];

interface CJFreightOption {
    logisticsName: string;
    logisticsCompanyName: string;
    countryCode: string;
    startCountryCode: string;
    trackingType: number;         // 0=none, 1=partial, 2=full
    logisticsTime: string;        // "7-12" or "10"
    freight: number;              // USD
    isFreeFreight: boolean;
    remark: string | null;
}

interface CJFreightResponse {
    result: boolean;
    data: CJFreightOption[];
}

export async function syncProductShipping(
    supabase: SupabaseClient<any, any, any>,
    productId: string,
    cjPid: string,
    cjVid: string,
    quantity: number = 1,
): Promise<{ synced: number; failed: string[] }> {

    // Get token from your existing helper
    const token = await getCJToken(supabase);

    const rows: any[] = [];
    const failed: string[] = [];

    await Promise.allSettled(
        TARGET_COUNTRIES.map(async (countryCode) => {
            try {
                const res = await fetch(`${CJ_API_BASE}/logistic/freightCalculate`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "CJ-Access-Token": token,
                    },
                    body: JSON.stringify({
                        startCountryCode: "CN",
                        endCountryCode: countryCode,
                        quantity,
                        vid: cjVid,
                        pid: cjPid,
                    }),
                });

                const data = (await res.json()) as CJFreightResponse;
                if (!data.result || !data.data?.length) {
                    failed.push(countryCode);
                    return;
                }

                for (const option of data.data) {
                    // Parse "7-12" or "10" into min/max days
                    const parts = option.logisticsTime?.split("-").map(Number) ?? [];
                    const minDays = parts[0] ?? null;
                    const maxDays = parts[1] ?? parts[0] ?? null;

                    rows.push({
                        product_id: productId,
                        source: "cj",
                        source_method_id: option.logisticsName,
                        ship_from_country: option.startCountryCode ?? "CN",
                        ship_from_name: "CJ Warehouse",
                        ship_to_country: countryCode,
                        method_name: option.logisticsName,
                        carrier: option.logisticsCompanyName ?? null,
                        has_tracking: option.trackingType === 2,
                        min_delivery_days: minDays,
                        max_delivery_days: maxDays,
                        shipping_fee: option.freight ?? 0,
                        currency: "USD",
                        is_free_shipping: option.isFreeFreight ?? false,
                        is_recommended: false,   // set below
                        is_active: true,
                        remark: option.remark ?? null,
                        synced_at: new Date().toISOString(),
                    });
                }
            } catch (err) {
                console.error(`[CJ shipping] ${countryCode} failed:`, err);
                failed.push(countryCode);
            }
        })
    );

    if (rows.length === 0) return { synced: 0, failed };

    // Mark cheapest option per destination as recommended
    const byCountry = new Map<string, any[]>();
    for (const row of rows) {
        if (!byCountry.has(row.ship_to_country)) byCountry.set(row.ship_to_country, []);
        byCountry.get(row.ship_to_country)!.push(row);
    }
    for (const options of byCountry.values()) {
        // Prefer free shipping, then cheapest, then fastest
        const best = options.reduce((a, b) => {
            if (a.is_free_shipping && !b.is_free_shipping) return a;
            if (!a.is_free_shipping && b.is_free_shipping) return b;
            return a.shipping_fee <= b.shipping_fee ? a : b;
        });
        best.is_recommended = true;
    }

    const { error } = await supabase
        .from("product_shipping_options")
        .upsert(rows, {
            onConflict: "product_id,ship_to_country,method_name",
            ignoreDuplicates: false,
        });

    if (error) throw new Error(`Shipping upsert failed: ${error.message}`);

    return { synced: rows.length, failed };
}