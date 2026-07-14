"use client";

import React, { useCallback, useState } from "react";
import { Tile } from "@/components/ui/admin-server";
import {
  Package, Star, CheckCircle2, FileEdit, AlertTriangle,
} from "lucide-react";
import { AdminProductsTable } from "@/components/admin/products-table";

type StatsSnapshot = {
  catalogCount: number;
  totalActive: number;
  totalFeatured: number;
  draftCount: number;
  lowStockCount: number;
  activePct: number;
};

export function AdminProductsWorkspace({
  stats: initialStats,
  products,
  total,
  page,
  pageSize,
  sort,
  order,
  query,
  searchParams,
}: {
  stats: StatsSnapshot;
  products: any[];
  total: number;
  page: number;
  pageSize: number;
  sort: string;
  order: string;
  query?: string;
  searchParams: Record<string, string | undefined>;
}) {
  const [stats, setStats] = useState(initialStats);
  const [rows, setRows] = useState(products);

  React.useEffect(() => {
    setRows(products);
  }, [products]);

  React.useEffect(() => {
    setStats(initialStats);
  }, [
    initialStats.catalogCount,
    initialStats.totalActive,
    initialStats.totalFeatured,
    initialStats.draftCount,
    initialStats.lowStockCount,
    initialStats.activePct,
  ]);

  const handlePublished = useCallback(
    (publishedIds: string[]) => {
      if (publishedIds.length === 0) return;
      const idSet = new Set(publishedIds);
      setRows((prev) =>
        prev.map((p) =>
          idSet.has(p.id) ? { ...p, status: "active", is_active: true } : p
        )
      );
      setStats((s) => ({
        ...s,
        totalActive: s.totalActive + publishedIds.length,
        draftCount: Math.max(0, s.draftCount - publishedIds.length),
        activePct:
          s.catalogCount > 0
            ? Math.round(((s.totalActive + publishedIds.length) / s.catalogCount) * 100)
            : 0,
      }));
    },
    []
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Tile
          label="Catalog"
          value={stats.catalogCount.toLocaleString()}
          sublabel="All listings"
          icon={Package}
        />
        <Tile
          label="Active"
          value={stats.totalActive.toLocaleString()}
          sublabel={`${stats.activePct}% of catalog`}
          icon={CheckCircle2}
          tone="success"
        />
        <Tile
          label="Featured"
          value={stats.totalFeatured.toLocaleString()}
          sublabel="Highlighted"
          icon={Star}
        />
        <Tile
          label="Draft"
          value={stats.draftCount.toLocaleString()}
          sublabel="Not published"
          icon={FileEdit}
          tone={stats.draftCount > 0 ? "warn" : "default"}
        />
        <Tile
          label="Low stock"
          value={stats.lowStockCount.toLocaleString()}
          sublabel="Tracked · ≤5 units"
          icon={AlertTriangle}
          tone={stats.lowStockCount > 0 ? "warn" : "default"}
        />
        <Tile
          label="Matching"
          value={total.toLocaleString()}
          sublabel={`Page ${page} · ${rows.length} shown`}
          icon={Package}
        />
      </div>

      <AdminProductsTable
        products={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        sort={sort}
        order={order}
        query={query}
        searchParams={searchParams}
        onBulkPublished={handlePublished}
      />
    </div>
  );
}
