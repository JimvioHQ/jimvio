const RATE_TYPES = new Set(["flat", "free", "price"]);

export type ShippingRateInput = {
  name?: string;
  rate_type?: string;
  price?: number;
  currency?: string;
  min_order_amount?: number | null;
  max_order_amount?: number | null;
};

export function normalizeCountryCodes(raw: string[] | undefined): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of raw ?? []) {
    const code = String(value).trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code) || seen.has(code)) continue;
    seen.add(code);
    out.push(code);
  }
  return out;
}

/** Empty country list means "all destinations" and conflicts with any other zone. */
export function overlappingCountries(
  existingZones: string[][],
  incoming: string[],
): string[] {
  if (!existingZones.length) return [];
  if (incoming.length === 0) return ["ALL"];
  const incomingSet = new Set(incoming);
  const hits = new Set<string>();
  for (const zone of existingZones) {
    if (zone.length === 0) {
      for (const code of incoming) hits.add(code);
      continue;
    }
    for (const code of zone) {
      const upper = code.toUpperCase();
      if (incomingSet.has(upper)) hits.add(upper);
    }
  }
  return [...hits];
}

export function validateShippingRate(
  rate: ShippingRateInput,
): { ok: true; rate_type: "flat" | "free" | "price"; price: number; currency: string; min_order_amount: number | null; max_order_amount: number | null; name: string } | { ok: false; error: string } {
  const rateType = (rate.rate_type || "flat").toLowerCase();
  if (!RATE_TYPES.has(rateType)) {
    return { ok: false, error: "Unsupported rate type. Use flat, free, or price-based." };
  }
  const name = (rate.name || "").trim();
  if (!name) return { ok: false, error: "Rate name is required." };
  const currency = (rate.currency || "USD").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    return { ok: false, error: "Currency must be a 3-letter code." };
  }
  const min =
    rate.min_order_amount == null ? null : Number(rate.min_order_amount);
  const max =
    rate.max_order_amount == null ? null : Number(rate.max_order_amount);
  if (min != null && (!Number.isFinite(min) || min < 0)) {
    return { ok: false, error: "Minimum order amount must be zero or greater." };
  }
  if (max != null && (!Number.isFinite(max) || max < 0)) {
    return { ok: false, error: "Maximum order amount must be zero or greater." };
  }
  if (min != null && max != null && max < min) {
    return { ok: false, error: "Maximum order amount must be at least the minimum." };
  }
  if (rateType === "price" && min == null && max == null) {
    return {
      ok: false,
      error: "Price-based rates need a minimum or maximum order amount.",
    };
  }
  const rawPrice = Number(rate.price ?? 0);
  if (rateType !== "free" && (!Number.isFinite(rawPrice) || rawPrice < 0)) {
    return { ok: false, error: "Enter a valid shipping amount." };
  }
  return {
    ok: true,
    rate_type: rateType as "flat" | "free" | "price",
    price: rateType === "free" ? 0 : Math.round(rawPrice * 100) / 100,
    currency,
    min_order_amount: min,
    max_order_amount: max,
    name: name.slice(0, 120),
  };
}

export type ShippingChoice = {
  amount: number;
  source: "store" | "supplier" | "none";
  error?: string;
};

/**
 * Authoritative shipping amount. Client totals are never accepted on their own.
 * Supplier quotes are used only when a verified amount was already resolved.
 * Merchant orders use configured zone rates. Missing rates stay unpaid.
 */
export function selectAuthoritativeShipping(input: {
  fulfillment: "merchant" | "supplier" | "digital";
  quotes: Array<{ price: number }>;
  proposed?: number;
  verifiedSupplierShipping?: number | null;
}): ShippingChoice {
  if (input.fulfillment === "digital") {
    return { amount: 0, source: "none" };
  }
  if (input.fulfillment === "supplier") {
    const amount = input.verifiedSupplierShipping;
    if (amount == null || !Number.isFinite(amount) || amount < 0) {
      return {
        amount: 0,
        source: "supplier",
        error: "Select a delivery method before paying.",
      };
    }
    return { amount: Math.round(amount * 100) / 100, source: "supplier" };
  }
  if (!input.quotes.length) {
    if (typeof input.proposed === "number" && input.proposed > 0) {
      return {
        amount: 0,
        source: "none",
        error: "No shipping rate is configured for this destination.",
      };
    }
    return {
      amount: 0,
      source: "none",
      error: "No shipping rate is configured for this destination.",
    };
  }
  const proposed = input.proposed;
  if (typeof proposed === "number" && proposed > 0) {
    const match = input.quotes.find((q) => Math.abs(q.price - proposed) < 0.009);
    if (!match) {
      return {
        amount: 0,
        source: "store",
        error: "Selected shipping rate is not available for this destination.",
      };
    }
    return { amount: match.price, source: "store" };
  }
  // No positive client selection. Use the cheapest configured store rate.
  return { amount: input.quotes[0]!.price, source: "store" };
}
