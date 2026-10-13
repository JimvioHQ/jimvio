import type { CJProduct, HealthLabel } from "./types";
import { normalizeCjVideoUrls } from "@/lib/cj/product-videos";
import { quoteJimvioBasePrice } from "@/lib/pricing/jimvio-base-price";

export function productCostUsd(p: CJProduct): number {
  return parseFloat(p.discountPrice || p.nowPrice || p.sellPrice || "0") || 0;
}

export function calculateProfitMetrics(p: CJProduct) {
  const cjCost = productCostUsd(p);
  const quote = quoteJimvioBasePrice(cjCost);
  const suggestedSelling = quote.ok ? quote.jimvioBasePriceUsd : 0;
  const estimatedProfit = Math.round((suggestedSelling - cjCost) * 100) / 100;
  const marginPercent =
    suggestedSelling > 0
      ? Math.round((estimatedProfit / suggestedSelling) * 100)
      : 0;
  const roi =
    cjCost > 0 ? Math.round((estimatedProfit / cjCost) * 100) : 0;

  return {
    cjCost,
    shippingCost: 0,
    shippingQuoted: false as const,
    suggestedSelling,
    estimatedProfit,
    marginPercent,
    roi,
  };
}

export function getHealthLabel(score: number): HealthLabel {
  if (score >= 95) return "excellent";
  if (score >= 80) return "good";
  if (score >= 60) return "warning";
  return "poor";
}

export const HEALTH_LABELS: Record<
  HealthLabel,
  { label: string; emoji: string; color: string }
> = {
  excellent: { label: "Excellent", emoji: "🟢", color: "#10b981" },
  good: { label: "Good", emoji: "🟡", color: "#eab308" },
  warning: { label: "Warning", emoji: "🟠", color: "#f97316" },
  poor: { label: "Poor", emoji: "🔴", color: "#ef4444" },
};

export function calculateHealthScore(p: CJProduct): number {
  const scores: number[] = [];

  scores.push(p.bigImage?.startsWith("http") ? 85 : 20);

  const hasVideo = productHasVideo(p);
  scores.push(hasVideo ? 100 : 30);

  const descScore = p.threeCategoryName ? 70 : 40;
  scores.push(Math.min(100, descScore + (p.listedNum > 50 ? 20 : 0)));

  let shipScore = 40;
  if (p.isFreeShipping || p.addMarkStatus === 1) shipScore += 30;
  if (p.countryCode && p.countryCode !== "CN") shipScore += 20;
  if (p.deliveryCycle && parseInt(p.deliveryCycle, 10) <= 7) shipScore += 10;
  scores.push(Math.min(100, shipScore));

  const reviewProxy = Math.min(100, Math.round((p.listedNum / 500) * 100));
  scores.push(reviewProxy > 20 ? reviewProxy : 35);

  scores.push(p.verifiedWarehouse === 1 ? 90 : 50);
  scores.push((p.variantCount ?? 0) > 1 ? 85 : 55);

  const stock = p.warehouseInventoryNum ?? 0;
  if (stock >= 500) scores.push(95);
  else if (stock >= 100) scores.push(80);
  else if (stock >= 20) scores.push(65);
  else if (stock > 0) scores.push(45);
  else scores.push(25);

  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function calculateSupplierScore(p: CJProduct): number {
  let score = 50;
  if (p.verifiedWarehouse === 1 || p.supplierVerified === true) score += 25;
  if (p.listedNum > 200) score += 15;
  if (p.listedNum > 1000) score += 10;
  if (p.warehouseInventoryNum && p.warehouseInventoryNum > 100) score += 10;
  return Math.min(100, score);
}

export function getMarketFit(p: CJProduct) {
  const code = (p.countryCode ?? "CN").toUpperCase();
  return {
    us: code === "US" || code === "CN",
    eu: ["DE", "FR", "EU", "CN"].includes(code),
    uk: ["GB", "CN"].includes(code),
    worldwide: code === "CN" || !p.countryCode,
  };
}

export function productHasVideo(p: CJProduct): boolean {
  if (Number(p.isVideo) === 1) return true;
  if ((p.videoCount ?? 0) > 0) return true;
  const fromUrl = normalizeCjVideoUrls(p.videoUrl);
  if (fromUrl.length > 0) return true;
  if (normalizeCjVideoUrls(p.videoList).length > 0) return true;
  return false;
}

export function getOrderVolume(p: CJProduct): number {
  return Math.max(0, p.listedNum ?? 0);
}

export function getFavoriteCount(p: CJProduct): number {
  return Math.max(0, p.favoriteCount ?? 0);
}

export function getReviewCount(p: CJProduct): number {
  if (typeof p.reviewCount === "number" && p.reviewCount >= 0) return p.reviewCount;
  return 0;
}

export function getRecentGrowthScore(p: CJProduct): number {
  if (!p.createAt || p.createAt <= 0) return 0;
  const ageDays = (Date.now() - p.createAt) / 86_400_000;
  if (ageDays > 90) return 0;
  return Math.round(Math.max(0, 90 - ageDays));
}

export function getReviewsWeight(p: CJProduct): number {
  const reviews = getReviewCount(p);
  if (reviews > 0) return Math.round(reviews * 1.5);
  return 0;
}

export function calculateTrendScore(p: CJProduct): number {
  return (
    getOrderVolume(p) +
    getFavoriteCount(p) +
    getRecentGrowthScore(p) +
    getReviewsWeight(p)
  );
}

export function hasVariants(p: CJProduct): boolean {
  return (p.variantCount ?? 0) > 1 || Boolean(p.productType && p.productType !== "ORDINARY");
}

export function isStockStable(p: CJProduct): boolean {
  const stock = p.warehouseInventoryNum ?? 0;
  return stock >= 50;
}

export function deliveryDays(p: CJProduct): number | null {
  if (!p.deliveryCycle) return null;
  const n = parseInt(p.deliveryCycle, 10);
  return Number.isNaN(n) ? null : n;
}

export const WAREHOUSE_LABELS: Record<string, string> = {
  CN: "China",
  US: "United States",
  GB: "United Kingdom",
  DE: "Germany",
  FR: "France",
  AU: "Australia",
  EU: "Europe",
};
