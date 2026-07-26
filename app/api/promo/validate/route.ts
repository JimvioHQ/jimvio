import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** Legacy hardcoded fallbacks if promo_codes table is empty / migration pending. */
const LEGACY_PROMO_RULES: Record<string, { type: "percent" | "fixed"; value: number; max?: number }> = {
  JIMVIO10: { type: "percent", value: 10 },
  JIMVIO20: { type: "percent", value: 20 },
  JIMVIO50: { type: "percent", value: 50 },
  WELCOME: { type: "percent", value: 10 },
  FREESHIP: { type: "fixed", value: 0 },
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    const subtotal = Number(body.subtotal);
    const currency = typeof body.currency === "string" ? body.currency.trim().toUpperCase() : "USD";

    if (!code) {
      return NextResponse.json({ success: false, error: "Promo code is required." }, { status: 400 });
    }

    if (!Number.isFinite(subtotal) || subtotal < 0) {
      return NextResponse.json({ success: false, error: "Invalid order total." }, { status: 400 });
    }

    let discountType: "percent" | "fixed" | null = null;
    let discountValue = 0;
    let maxDiscount: number | null = null;
    let minSubtotal = 0;

    try {
      const admin = createServiceRoleClient() as any;
      const { data: promo } = await admin
        .from("promo_codes")
        .select(
          "code, discount_type, discount_value, max_discount, min_subtotal, currency, is_active, starts_at, ends_at, usage_limit, usage_count"
        )
        .eq("code", code)
        .eq("is_active", true)
        .maybeSingle();

      if (promo) {
        const now = Date.now();
        if (promo.starts_at && new Date(promo.starts_at).getTime() > now) {
          return NextResponse.json({ success: false, error: "Promo code is not active yet." }, { status: 400 });
        }
        if (promo.ends_at && new Date(promo.ends_at).getTime() < now) {
          return NextResponse.json({ success: false, error: "Promo code has expired." }, { status: 400 });
        }
        if (
          promo.usage_limit != null &&
          Number(promo.usage_count ?? 0) >= Number(promo.usage_limit)
        ) {
          return NextResponse.json({ success: false, error: "Promo code usage limit reached." }, { status: 400 });
        }
        if (promo.currency && promo.currency.toUpperCase() !== currency) {
          return NextResponse.json(
            { success: false, error: `Promo code is only valid for ${promo.currency}.` },
            { status: 400 }
          );
        }
        discountType = promo.discount_type as "percent" | "fixed";
        discountValue = Number(promo.discount_value);
        maxDiscount = promo.max_discount != null ? Number(promo.max_discount) : null;
        minSubtotal = Number(promo.min_subtotal ?? 0);
      }
    } catch {
      // table may not exist yet — fall through to legacy
    }

    if (!discountType) {
      const legacy = LEGACY_PROMO_RULES[code];
      if (!legacy) {
        return NextResponse.json({ success: false, error: "Invalid promo code." }, { status: 404 });
      }
      discountType = legacy.type;
      discountValue = legacy.value;
      maxDiscount = legacy.max ?? null;
    }

    if (subtotal < minSubtotal) {
      return NextResponse.json(
        { success: false, error: `Minimum order total is ${minSubtotal}.` },
        { status: 400 }
      );
    }

    let discount = 0;
    if (discountType === "percent") {
      discount = Math.round(subtotal * (discountValue / 100));
    } else {
      discount = discountValue;
    }

    if (maxDiscount != null) {
      discount = Math.min(discount, maxDiscount);
    }

    discount = clamp(discount, 0, subtotal);

    return NextResponse.json({ success: true, discount, currency, code });
  } catch {
    return NextResponse.json(
      { success: false, error: "Could not validate promo code." },
      { status: 500 }
    );
  }
}
