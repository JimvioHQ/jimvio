import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrRefreshAccessToken } from "@/lib/cj/auth";
import { sanitizeShippingMethodName } from "@/lib/cj/customer-facing";
import { normalizeCountryCode } from "@/lib/geo/buyer-country";
import { mapCjFreightToShippingOptions } from "@/lib/shipping/cj-freight-options";
import {
  filterShippingOptions,
  type RegionalShippingOption,
} from "@/lib/shipping/regional-shipping";

const CJ_BASE_URL =
  process.env.CJ_API_BASE_URL ?? "https://developers.cjdropshipping.com/api2.0/v1";

function sanitizeStoredOptions(options: RegionalShippingOption[]): RegionalShippingOption[] {
  return options.map((o) => ({
    ...o,
    method_name: sanitizeShippingMethodName(o.method_name),
  }));
}

async function fetchLiveCjRates(params: {
  cjVid: string;
  cjPid?: string | null;
  country: string;
  quantity?: number;
}): Promise<RegionalShippingOption[]> {
  const token = await getOrRefreshAccessToken();
  const body: Record<string, unknown> = {
    startCountryCode: "CN",
    endCountryCode: params.country,
    quantity: params.quantity ?? 1,
    vid: params.cjVid,
  };
  if (params.cjPid) body.pid = params.cjPid;

  const res = await fetch(`${CJ_BASE_URL}/logistic/freightCalculate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CJ-Access-Token": token,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) return [];

  const json = await res.json();
  if (json.result !== true || !Array.isArray(json.data)) return [];

  return mapCjFreightToShippingOptions(json.data, {
    shipToCountry: params.country,
    shipFromCountry: "CN",
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: productId } = await params;
    const country =
      normalizeCountryCode(req.nextUrl.searchParams.get("country")) ?? "RW";
    const variantId = req.nextUrl.searchParams.get("variantId");

    const supabase = await createClient();

    const { data: product, error: productError } = await supabase
      .from("products")
      .select(
        `
        id, source,
        product_shipping_options (
          id, method_name, carrier, estimated_delivery,
          min_delivery_days, max_delivery_days,
          shipping_fee, currency, is_free_shipping, has_tracking, is_recommended,
          ship_from_name, ship_from_country, ship_to_country,
          is_active
        ),
        product_variants (
          id, cj_vid, cj_pid, weight, is_active
        )
      `,
      )
      .eq("id", productId)
      .maybeSingle();

    if (productError || !product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    const stored = sanitizeStoredOptions(
      filterShippingOptions(
        ((product.product_shipping_options ?? []) as RegionalShippingOption[]).filter(
          (o) => o.is_active !== false,
        ),
        country,
      ),
    );

    if (stored.length > 0) {
      return NextResponse.json({
        success: true,
        country,
        options: stored,
        source: "cached",
      });
    }

    if (product.source !== "cj") {
      return NextResponse.json({ success: true, country, options: [], source: "none" });
    }

    const variants = (product.product_variants ?? []).filter((v: any) => v.is_active !== false);
    const variant =
      (variantId ? variants.find((v: any) => v.id === variantId) : null) ??
      variants.find((v: any) => v.cj_vid) ??
      variants[0];

    const cjVid = variant?.cj_vid as string | null | undefined;
    if (!cjVid) {
      return NextResponse.json({ success: true, country, options: [], source: "none" });
    }

    const live = await fetchLiveCjRates({
      cjVid,
      cjPid: (variant?.cj_pid as string | null | undefined) ?? null,
      country,
    });

    return NextResponse.json({
      success: true,
      country,
      options: live,
      source: live.length > 0 ? "live" : "none",
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Could not load shipping for your region" },
      { status: 500 },
    );
  }
}
