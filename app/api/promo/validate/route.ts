import { NextResponse } from "next/server";

const PROMO_RULES: Record<string, { type: "percent" | "fixed"; value: number; max?: number }> = {
  JIMVIO10: { type: "percent", value: 0.1 },
  JIMVIO20: { type: "percent", value: 0.2 },
  JIMVIO50: { type: "percent", value: 0.5 },
  WELCOME: { type: "percent", value: 0.1 },
  FREESHIP: { type: "fixed", value: 0 },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

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

    const rule = PROMO_RULES[code];
    if (!rule) {
      return NextResponse.json({ success: false, error: "Invalid promo code." }, { status: 404 });
    }

    let discount = 0;
    if (rule.type === "percent") {
      discount = Math.round(subtotal * rule.value);
    } else {
      discount = rule.value;
    }

    if (rule.max !== undefined) {
      discount = Math.min(discount, rule.max);
    }

    discount = clamp(discount, 0, subtotal);

    return NextResponse.json({ success: true, discount, currency, code });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Could not validate promo code." },
      { status: 500 }
    );
  }
}
