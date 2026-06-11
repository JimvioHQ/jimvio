"use client";
import React from "react";
import { TrendingProducts } from "@/components/dashboard/TrendingProducts";
import { TRENDING_PRODUCTS } from "@/data/dashboard";

export function HeroHighlights() {
  return (
    <div className="p-6 rounded-2xl bg-surface border border-border">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold">Marketplace Highlights</h3>
          <p className="text-sm text-text-muted">Trending products and quick actions from the marketplace.</p>
        </div>

        <div className="w-full lg:w-96">
          <TrendingProducts products={TRENDING_PRODUCTS} />
        </div>
      </div>
    </div>
  );
}

export default HeroHighlights;
