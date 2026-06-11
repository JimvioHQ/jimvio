"use client";
import React from "react";
import { TRENDING_PRODUCTS } from "@/data/dashboard";

export function TrendingGrid() {
  const products = TRENDING_PRODUCTS.slice(0, 4);
  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <h4 className="text-sm font-semibold mb-2">Featured Products</h4>
      <div className="grid grid-cols-2 gap-2">
        {products.map((p, i) => (
          <div key={i} className="p-2 rounded-md bg-white/3 border border-border flex gap-2 items-center">
            <div style={{ width: 52, height: 40, borderRadius: 6, background: p.imageColor || "#eee" }} />
            <div className="text-sm">
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-text-muted">{p.price}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TrendingGrid;
