import React, { Suspense } from "react";
import Link from "next/link";
import { getAdminProducts, getAdminDB } from "@/services/db";
import type { ProductStatus } from "@/types/db";
import { PageHeader } from "@/components/ui/admin";
import { Tile } from "@/components/ui/admin-server";
import { ProductsTable } from "@/components/admin/products-table";
import { ProductFilterBar } from "@/components/admin/products/product-filter-bar";
import {
  Package, Star, CheckCircle2, FileEdit, AlertTriangle, Download,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: ProductStatus | "all";
    source?: string;
    sort?: string;
    order?: string;
    featured?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const pageSize = Math.min(100, Math.max(10, Number(sp.pageSize) || 25));
  const status = sp.status ?? "all";
  const source = sp.source ?? "all";

  const admin = getAdminDB();

  const [
    { products, total, totalActive, totalFeatured },
    { count: catalogTotal },
    { count: draftTotal },
    { count: lowStockTotal },
  ] = await Promise.all([
    getAdminProducts({
      q: sp.q,
      status,
      source,
      featured: sp.featured,
      sort: sp.sort,
      order: (sp.order as "asc" | "desc") ?? "desc",
      page,
      pageSize,
    }),
    admin.from("products").select("id", { count: "exact", head: true }).is("deleted_at", null),
    admin.from("products").select("id", { count: "exact", head: true }).eq("status", "draft").is("deleted_at", null),
    admin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("track_inventory", true)
      .eq("status", "active")
      .is("deleted_at", null)
      .lte("inventory_quantity", 5),
  ]);

  const catalogCount = catalogTotal ?? 0;
  const draftCount = draftTotal ?? 0;
  const lowStockCount = lowStockTotal ?? 0;
  const activePct = catalogCount > 0 ? Math.round((totalActive / catalogCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin · Commerce"
        title="Products"
        subtitle={`${catalogCount.toLocaleString()} in catalog · ${total.toLocaleString()} matching filters`}
        actions={
          <>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-medium bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] hover:bg-[var(--color-surface-secondary)] transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
            <Link
              href="/admin/products/import/cj"
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--color-accent)] text-[var(--color-surface)] text-[13px] font-semibold transition-colors hover:bg-orange-500"
            >
              Import from CJ
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Tile
          label="Catalog"
          value={catalogCount.toLocaleString()}
          sublabel="All listings"
          icon={Package}
        />
        <Tile
          label="Active"
          value={totalActive.toLocaleString()}
          sublabel={`${activePct}% of catalog`}
          icon={CheckCircle2}
          tone="success"
        />
        <Tile
          label="Featured"
          value={totalFeatured.toLocaleString()}
          sublabel="Highlighted"
          icon={Star}
        />
        <Tile
          label="Draft"
          value={draftCount.toLocaleString()}
          sublabel="Not published"
          icon={FileEdit}
          tone={draftCount > 0 ? "warn" : "default"}
        />
        <Tile
          label="Low stock"
          value={lowStockCount.toLocaleString()}
          sublabel="Tracked · ≤5 units"
          icon={AlertTriangle}
          tone={lowStockCount > 0 ? "warn" : "default"}
        />
        <Tile
          label="Matching"
          value={total.toLocaleString()}
          sublabel={`Page ${page} · ${products.length} shown`}
          icon={Package}
        />
      </div>

      <Suspense fallback={null}>
        <ProductFilterBar
          status={status}
          source={source}
          featured={sp.featured ?? "all"}
          search={(sp.q ?? "").trim()}
        />
      </Suspense>

      <ProductsTable
        products={products}
        total={total}
        page={page}
        pageSize={pageSize}
        sort={sp.sort ?? "created_at"}
        order={sp.order ?? "desc"}
        query={sp.q}
        searchParams={sp}
      />
    </div>
  );
}
