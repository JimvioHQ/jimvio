import type { CurrencyCode } from "@/lib/currency/config";

export interface PricingTier {
    minCostUSD: number;
    maxCostUSD: number;
    markupPct: number;
    affiliateNetProfitPct: number;
    label: string;
}

export const PRICING_TIERS: PricingTier[] = [
    { minCostUSD: 0, maxCostUSD: 10, markupPct: 0.90, affiliateNetProfitPct: 0.20, label: "Micro" },
    { minCostUSD: 10, maxCostUSD: 30, markupPct: 0.65, affiliateNetProfitPct: 0.25, label: "Low" },
    { minCostUSD: 30, maxCostUSD: 70, markupPct: 0.45, affiliateNetProfitPct: 0.30, label: "Mid" },
    { minCostUSD: 70, maxCostUSD: 150, markupPct: 0.35, affiliateNetProfitPct: 0.25, label: "High" },
    { minCostUSD: 150, maxCostUSD: Infinity, markupPct: 0.25, affiliateNetProfitPct: 0.20, label: "Premium" },
];


export function getTier(productCostUSD: number): PricingTier {
    return (
        PRICING_TIERS.find(t => productCostUSD >= t.minCostUSD && productCostUSD < t.maxCostUSD) ??
        PRICING_TIERS[PRICING_TIERS.length - 1]
    );
}

export interface GatewayFee {
    
    percent: number;
    flatUSD: number;
}

export const GATEWAY_FEES: Record<string, GatewayFee> = {
    pesapal: { percent: 0.035, flatUSD: 0 },
    flutterwave: { percent: 0.029, flatUSD: 0 },
    paypal: { percent: 0.044, flatUSD: 0.30 },
    pawapay: { percent: 0.025, flatUSD: 0 },
    nowpayments: { percent: 0.005, flatUSD: 0 },
    binancepay: { percent: 0.01, flatUSD: 0 },
};

export const DEFAULT_GATEWAY_FEE: GatewayFee = { percent: 0.04, flatUSD: 0.30 };

export const PRICING_GUARDRAILS = {
    minNetProfitUSD: 1.50,
    minNetMarginPct: 0.08,
    maxShippingShareOfPriceUSD: 0.40,
    maxArrivalDays: 30,
} as const;

export function roundTo99(amountUSD: number): number {
    if (amountUSD < 1) return Math.max(0.99, Math.round(amountUSD * 100) / 100);
    return Math.floor(amountUSD) + 0.99;
}

export interface SellPriceInput {
    productCostUSD: number;
    shippingCostUSD: number;
}

export interface SellPriceResult {
    tier: PricingTier;
    totalCostUSD: number;
    rawPriceUSD: number;
    sellPriceUSD: number;
}

export function computeSellPrice({ productCostUSD, shippingCostUSD }: SellPriceInput): SellPriceResult {
    const tier = getTier(productCostUSD);
    const totalCostUSD = productCostUSD + shippingCostUSD;
    const rawPriceUSD = totalCostUSD * (1 + tier.markupPct);
    return {
        tier,
        totalCostUSD,
        rawPriceUSD,
        sellPriceUSD: roundTo99(rawPriceUSD),
    };
}

export interface OrderEconomicsInput {
    sellPriceUSD: number;
    productCostUSD: number;
    shippingCostUSD: number;
    discountUSD?: number;
    gateway?: keyof typeof GATEWAY_FEES | string;
}

export interface OrderEconomicsResult {
    sellPriceUSD: number;
    productCostUSD: number;
    shippingCostUSD: number;
    discountUSD: number;
    gatewayFeeUSD: number;
    netProfitUSD: number;
    affiliateEarningUSD: number;
    jimvioEarningUSD: number;
    affiliateNetProfitPct: number;
    netMarginPct: number;
}

export function computeOrderEconomics(input: OrderEconomicsInput): OrderEconomicsResult {
    const { sellPriceUSD, productCostUSD, shippingCostUSD } = input;
    const discountUSD = input.discountUSD ?? 0;
    const fee = (input.gateway && GATEWAY_FEES[input.gateway]) || DEFAULT_GATEWAY_FEE;
    const chargedUSD = Math.max(0, sellPriceUSD - discountUSD);
    const gatewayFeeUSD = chargedUSD * fee.percent + fee.flatUSD;

    const netProfitUSD =
        chargedUSD - productCostUSD - shippingCostUSD - gatewayFeeUSD;

    const tier = getTier(productCostUSD);
    const safeNet = Math.max(0, netProfitUSD);
    const affiliateEarningUSD = safeNet * tier.affiliateNetProfitPct;
    const jimvioEarningUSD = safeNet - affiliateEarningUSD;
    const netMarginPct = chargedUSD > 0 ? netProfitUSD / chargedUSD : 0;

    return {
        sellPriceUSD,
        productCostUSD,
        shippingCostUSD,
        discountUSD,
        gatewayFeeUSD: round2(gatewayFeeUSD),
        netProfitUSD: round2(netProfitUSD),
        affiliateEarningUSD: round2(affiliateEarningUSD),
        jimvioEarningUSD: round2(jimvioEarningUSD),
        affiliateNetProfitPct: tier.affiliateNetProfitPct,
        netMarginPct,
    };
}

export interface ProductEligibilityInput {
    productCostUSD: number;
    shippingCostUSD: number;
    arrivalDays?: number;
    gateway?: string;
}

export interface ProductEligibilityResult {
    eligible: boolean;
    reasons: string[];
    preview: OrderEconomicsResult;
    pricing: SellPriceResult;
}

export function evaluateProduct(input: ProductEligibilityInput): ProductEligibilityResult {
    const pricing = computeSellPrice(input);
    const preview = computeOrderEconomics({
        sellPriceUSD: pricing.sellPriceUSD,
        productCostUSD: input.productCostUSD,
        shippingCostUSD: input.shippingCostUSD,
        gateway: input.gateway,
    });

    const reasons: string[] = [];
    if (preview.netProfitUSD < PRICING_GUARDRAILS.minNetProfitUSD) {
        reasons.push(`Net profit $${preview.netProfitUSD.toFixed(2)} is below $${PRICING_GUARDRAILS.minNetProfitUSD.toFixed(2)} minimum`);
    }
    if (preview.netMarginPct < PRICING_GUARDRAILS.minNetMarginPct) {
        reasons.push(`Net margin ${(preview.netMarginPct * 100).toFixed(1)}% is below ${(PRICING_GUARDRAILS.minNetMarginPct * 100).toFixed(0)}% minimum`);
    }
    if (input.shippingCostUSD / pricing.sellPriceUSD > PRICING_GUARDRAILS.maxShippingShareOfPriceUSD) {
        reasons.push("Shipping is too expensive relative to price");
    }
    if (input.arrivalDays && input.arrivalDays > PRICING_GUARDRAILS.maxArrivalDays) {
        reasons.push(`Delivery of ${input.arrivalDays} days exceeds ${PRICING_GUARDRAILS.maxArrivalDays}-day limit`);
    }

    return { eligible: reasons.length === 0, reasons, preview, pricing };
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}