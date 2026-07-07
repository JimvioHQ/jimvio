/**
 * Duplicate Marketplace Protection v4 — hide duplicates, keep highest quality.
 */

import type { MarketplaceProductSignals } from "./types";

export const MARKETPLACE_DUPLICATE_THRESHOLD = 0.95;

export interface MarketplaceDuplicateCandidate {
  productId: string;
  name: string;
  cjPid?: string | null;
  imageUrl?: string | null;
  variantCount?: number;
  qualityScore: number;
}

export interface MarketplaceDuplicateResult {
  productId: string;
  duplicateOfProductId: string | null;
  similarity: number;
  hidden: boolean;
  reason: string;
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleSimilarity(a: string, b: string): number {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const wordsA = new Set(na.split(" ").filter((w) => w.length > 2));
  const wordsB = new Set(nb.split(" ").filter((w) => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? intersection / union : 0;
}

function imageSimilarity(a?: string | null, b?: string | null): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const baseA = a.split("?")[0].split("/").pop() ?? "";
  const baseB = b.split("?")[0].split("/").pop() ?? "";
  return baseA && baseB && baseA === baseB ? 0.9 : 0;
}

function variantSimilarity(a = 0, b = 0): number {
  if (a === 0 && b === 0) return 0.5;
  if (a === b) return 1;
  const max = Math.max(a, b, 1);
  return 1 - Math.abs(a - b) / max;
}

export function computeMarketplaceSimilarity(
  a: MarketplaceDuplicateCandidate,
  b: MarketplaceDuplicateCandidate
): number {
  if (a.cjPid && b.cjPid && a.cjPid === b.cjPid) return 1;
  if (a.productId === b.productId) return 1;

  const titleSim = titleSimilarity(a.name, b.name);
  const imgSim = imageSimilarity(a.imageUrl, b.imageUrl);
  const varSim = variantSimilarity(a.variantCount, b.variantCount);

  return titleSim * 0.5 + imgSim * 0.35 + varSim * 0.15;
}

export function resolveMarketplaceDuplicates(
  candidates: MarketplaceDuplicateCandidate[]
): MarketplaceDuplicateResult[] {
  const sorted = [...candidates].sort((a, b) => b.qualityScore - a.qualityScore);
  const kept = new Set<string>();
  const results: MarketplaceDuplicateResult[] = [];

  for (const product of sorted) {
    let duplicateOf: string | null = null;
    let bestSim = 0;

    for (const keeperId of kept) {
      const keeper = sorted.find((c) => c.productId === keeperId);
      if (!keeper) continue;
      const sim = computeMarketplaceSimilarity(product, keeper);
      if (sim >= MARKETPLACE_DUPLICATE_THRESHOLD && sim > bestSim) {
        bestSim = sim;
        duplicateOf = keeperId;
      }
    }

    const hidden = duplicateOf !== null;
    if (!hidden) kept.add(product.productId);

    results.push({
      productId: product.productId,
      duplicateOfProductId: duplicateOf,
      similarity: bestSim,
      hidden,
      reason: hidden
        ? `Duplicate of higher-quality product (${Math.round(bestSim * 100)}% similar)`
        : "Unique product",
    });
  }

  return results;
}

export function signalsToDuplicateCandidate(
  signals: MarketplaceProductSignals,
  qualityScore: number,
  imageUrl?: string | null,
  variantCount?: number
): MarketplaceDuplicateCandidate {
  return {
    productId: signals.productId,
    name: signals.name,
    cjPid: signals.cjPid,
    imageUrl,
    variantCount,
    qualityScore,
  };
}
