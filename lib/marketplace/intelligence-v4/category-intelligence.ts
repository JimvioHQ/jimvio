/**
 * Category Intelligence v4 — best categories by conversion, growth, revenue.
 */

import type { CategoryIntelligence } from "./types";

export interface CategoryRow {
  categoryId: string;
  categoryName: string;
  views: number;
  orders: number;
  revenue: number;
  refunds: number;
  productCount: number;
  previousOrders?: number;
}

export function computeCategoryIntelligence(rows: CategoryRow[]): CategoryIntelligence[] {
  return rows
    .map((row) => {
      const views = Math.max(1, row.views);
      const conversionRate = row.orders / views;
      const refundRate = row.orders > 0 ? row.refunds / row.orders : 0;
      const prev = row.previousOrders ?? 0;
      const growthRate =
        prev > 0 ? (row.orders - prev) / prev : row.orders > 0 ? 1 : 0;

      return {
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        conversionRate: Math.round(conversionRate * 10000) / 10000,
        revenueTotal: Math.round(row.revenue * 100) / 100,
        growthRate: Math.round(growthRate * 10000) / 10000,
        refundRate: Math.round(refundRate * 10000) / 10000,
        productCount: row.productCount,
      };
    })
    .sort((a, b) => b.revenueTotal - a.revenueTotal)
    .map((c, i) => ({ ...c, rank: i + 1 }));
}

export function topCategoriesBy(
  categories: CategoryIntelligence[],
  metric: "conversion" | "growth" | "revenue" | "refund"
): CategoryIntelligence[] {
  const sorted = [...categories];
  switch (metric) {
    case "conversion":
      return sorted.sort((a, b) => b.conversionRate - a.conversionRate);
    case "growth":
      return sorted.sort((a, b) => b.growthRate - a.growthRate);
    case "revenue":
      return sorted.sort((a, b) => b.revenueTotal - a.revenueTotal);
    case "refund":
      return sorted.sort((a, b) => a.refundRate - b.refundRate);
  }
}
