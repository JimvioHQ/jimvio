/**
 * Smart Shipping Engine v4 — warehouse recommendations (read-only).
 */

import type { MarketplaceProductSignals, ShippingRecommendation, WarehouseCode } from "./types";

const WAREHOUSE_META: Record<WarehouseCode, { label: string; baseDays: number; risk: number }> = {
  US: { label: "United States", baseDays: 3, risk: 10 },
  EU: { label: "Europe", baseDays: 5, risk: 15 },
  UK: { label: "United Kingdom", baseDays: 4, risk: 12 },
  CN: { label: "China", baseDays: 12, risk: 25 },
};

function detectWarehouse(signals: MarketplaceProductSignals): WarehouseCode {
  const from = (signals.shippingFrom ?? "CN").toUpperCase();
  if (from.includes("US") || from === "USA") return "US";
  if (from.includes("GB") || from.includes("UK")) return "UK";
  if (["DE", "FR", "EU", "NL"].some((c) => from.includes(c))) return "EU";
  return "CN";
}

function scoreWarehouse(
  warehouse: WarehouseCode,
  customerCountry: string,
  signals: MarketplaceProductSignals
): { score: number; reason: string } {
  const meta = WAREHOUSE_META[warehouse];
  let score = 70;
  const cc = customerCountry.toUpperCase();

  if (warehouse === "US" && cc === "US") score += 20;
  if (warehouse === "UK" && (cc === "GB" || cc === "UK")) score += 20;
  if (warehouse === "EU" && ["DE", "FR", "NL", "EU"].includes(cc)) score += 18;
  if (warehouse === "CN") score -= 10;

  score -= meta.baseDays * 2;
  score -= meta.risk * 0.3;
  if (signals.isFreeShipping) score += 8;

  const days = signals.deliveryTime ? parseInt(signals.deliveryTime, 10) : null;
  if (days !== null && days <= 7) score += 10;

  const reason =
    score >= 85 ? "Nearest & fastest for customer"
    : score >= 70 ? "Good balance of speed and cost"
    : score >= 55 ? "Acceptable shipping option"
    : "Higher risk or longer delivery";

  return { score: Math.max(0, Math.min(100, Math.round(score))), reason };
}

export function recommendShipping(
  signals: MarketplaceProductSignals,
  customerCountry = "US"
): ShippingRecommendation {
  const current = detectWarehouse(signals);
  const warehouses: WarehouseCode[] = ["US", "EU", "UK", "CN"];

  const alternatives = warehouses.map((w) => {
    const { score, reason } = scoreWarehouse(w, customerCountry, signals);
    return {
      warehouse: w,
      label: WAREHOUSE_META[w].label,
      score,
      reason,
    };
  }).sort((a, b) => b.score - a.score);

  return {
    recommendedWarehouse: alternatives[0]?.warehouse ?? current,
    alternatives,
  };
}
