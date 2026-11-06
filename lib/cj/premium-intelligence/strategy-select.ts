/** Pure selection rules for the strategy import (no server imports; unit-tested). */
import { STRATEGY_CATEGORIES, type StrategyCategoryId } from "@/lib/marketplace/catalog-strategy";
import { QUICK_FILTER_DEFAULTS } from "@/lib/cj/import-intelligence/quick-filter-intelligence";

export const STRATEGY_MIN_STOCK = 100;
export const STRATEGY_MIN_COST_USD = 3;
export const STRATEGY_MAX_COST_USD = 150;

export type StrategyKeyword = { category: StrategyCategoryId; keyword: string; target: number };

/** Priority-1 categories first, then priority 2; stable order for rotation. */
export function strategyKeywords(): StrategyKeyword[] {
  return [...STRATEGY_CATEGORIES]
    .sort((a, b) => a.priority - b.priority)
    .flatMap((c) => c.keywords.map((keyword) => ({ category: c.id, keyword, target: c.target })));
}

/** Keywords for this run: rotates every 2 hours so the whole list is covered in about a day. */
export function keywordsForRun(now: Date, perRun: number): StrategyKeyword[] {
  const all = strategyKeywords();
  const slot = Math.floor(now.getTime() / (2 * 60 * 60 * 1000));
  const start = (slot * perRun) % all.length;
  return Array.from({ length: Math.min(perRun, all.length) }, (_, i) => all[(start + i) % all.length]!);
}

function norm(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** The title must really be the searched product (all words, or the joined form like "smartwatch"). */
export function titleMatchesKeyword(title: string, keyword: string): boolean {
  const t = ` ${norm(title)} `;
  const words = norm(keyword).split(" ").filter((w) => w.length > 1);
  if (words.length === 0) return false;
  if (words.every((w) => t.includes(` ${w}`) || t.includes(`${w} `))) return true;
  return t.replace(/ /g, "").includes(words.join(""));
}

export type StrategyEvaluation = {
  qualified: boolean;
  reasons: string[];
  trending: boolean;
  supplierVerified: boolean;
};

export function evaluateStrategyRow(input: {
  title: string;
  keyword: string;
  stock: number;
  costUsd: number;
  trendScore: number;
  supplierScore: number;
  verifiedWarehouse: number | null;
  supplierVerifiedFlag: boolean;
}): StrategyEvaluation {
  const reasons: string[] = [];
  const trending = input.trendScore >= QUICK_FILTER_DEFAULTS.trendingMinAbsoluteScore && input.trendScore > 0;
  const supplierVerified = input.supplierScore >= 75 || input.verifiedWarehouse === 1 || input.supplierVerifiedFlag;
  if (!titleMatchesKeyword(input.title, input.keyword)) reasons.push("off_strategy");
  if (!trending) reasons.push("not_trending");
  if (!supplierVerified) reasons.push("supplier_not_verified");
  if (input.stock < STRATEGY_MIN_STOCK) reasons.push("low_stock");
  if (!(input.costUsd >= STRATEGY_MIN_COST_USD)) reasons.push("low_value");
  if (input.costUsd > STRATEGY_MAX_COST_USD) reasons.push("too_expensive");
  if (/[一-鿿]/.test(input.title) && norm(input.title).length < 8) reasons.push("untranslated_title");
  return { qualified: reasons.length === 0, reasons, trending, supplierVerified };
}

