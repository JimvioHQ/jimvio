/**
 * Duplicate Detection v3 — blocks publish when similarity > 95%.
 */

import type { CJProduct, EnrichedProduct } from "./types";

export const DUPLICATE_THRESHOLD = 0.95;

export interface DuplicateMatch {
  pid: string;
  duplicatePid: string;
  similarity: number;
  blocked: boolean;
  reasons: string[];
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

function imageSimilarity(a: CJProduct, b: CJProduct): number {
  const imgA = a.bigImage ?? "";
  const imgB = b.bigImage ?? "";
  if (!imgA || !imgB) return 0;
  if (imgA === imgB) return 1;

  const baseA = imgA.split("?")[0].split("/").pop() ?? "";
  const baseB = imgB.split("?")[0].split("/").pop() ?? "";
  return baseA && baseB && baseA === baseB ? 0.9 : 0;
}

function variantSimilarity(a: CJProduct, b: CJProduct): number {
  const va = a.variantCount ?? 0;
  const vb = b.variantCount ?? 0;
  if (va === 0 && vb === 0) return 0.5;
  if (va === vb) return 1;
  const max = Math.max(va, vb, 1);
  return 1 - Math.abs(va - vb) / max;
}

export function computeSimilarity(a: CJProduct, b: CJProduct): number {
  if (a.pid === b.pid) return 1;

  if (a.productSku && b.productSku && a.productSku === b.productSku) return 1;

  const titleSim = titleSimilarity(a.productNameEn, b.productNameEn);
  const imgSim = imageSimilarity(a, b);
  const varSim = variantSimilarity(a, b);

  return titleSim * 0.5 + imgSim * 0.35 + varSim * 0.15;
}

export function detectDuplicate(
  product: EnrichedProduct,
  candidates: EnrichedProduct[]
): DuplicateMatch | null {
  let best: DuplicateMatch | null = null;

  for (const candidate of candidates) {
    if (candidate.pid === product.pid) continue;

    const similarity = computeSimilarity(product, candidate);
    if (similarity < DUPLICATE_THRESHOLD) continue;

    const reasons: string[] = [];
    if (titleSimilarity(product.productNameEn, candidate.productNameEn) >= 0.9) {
      reasons.push("Title match");
    }
    if (imageSimilarity(product, candidate) >= 0.9) {
      reasons.push("Image match");
    }
    if (product.productSku && product.productSku === candidate.productSku) {
      reasons.push("SKU match");
    }
    if (product.pid === candidate.pid) {
      reasons.push("PID match");
    }

    const match: DuplicateMatch = {
      pid: product.pid,
      duplicatePid: candidate.pid,
      similarity: Math.round(similarity * 1000) / 1000,
      blocked: similarity >= DUPLICATE_THRESHOLD,
      reasons,
    };

    if (!best || match.similarity > best.similarity) {
      best = match;
    }
  }

  return best;
}

export function detectDuplicateBatch(
  product: EnrichedProduct,
  candidates: EnrichedProduct[]
): DuplicateMatch | null {
  return detectDuplicate(product, candidates);
}
