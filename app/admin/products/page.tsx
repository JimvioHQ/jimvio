
import React from "react";
import Link from "next/link";
import { getAdminProducts } from "@/services/db";
import { formatCurrency } from "@/lib/utils";
import { ProductsTable } from "@/components/admin/products-table";
import { ProductsFilters } from "@/components/admin/products-filters";

export const dynamic = "force-dynamic";

function StatCard({ label, value, sub, color = "var(--color-accent)" }: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div style={{ background: "var(--color-surface, #f8f8f7)", border: "0.5px solid var(--color-border)", borderRadius: 12, padding: "14px 18px", position: "relative", overflow: "hidden" }}>
      <svg aria-hidden="true" style={{ position: "absolute", bottom: 0, right: 0, opacity: 0.07, pointerEvents: "none" }} width="80" height="80" viewBox="0 0 80 80" fill="none">
        <circle cx="80" cy="80" r="55" stroke={color} strokeWidth="1.5" />
        <circle cx="80" cy="80" r="30" stroke={color} strokeWidth="1.5" />
      </svg>
      <p style={{ fontSize: 11, color: "var(--color-text-muted, #888)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 6px" }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 900, color: "var(--color-text-primary)", letterSpacing: "-0.03em", margin: 0, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: "var(--color-text-muted, #888)", margin: "4px 0 0" }}>{sub}</p>}
    </div>
  );
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string; order?: string; featured?: string }>;
}) {
  const { q, status, sort = "created_at", order = "desc", featured } = await searchParams;
  const { products: allProducts, total } = await getAdminProducts(q, 100);

  const activeCount = allProducts.filter((p: any) => p.status === "active").length;
  const featuredCount = allProducts.filter((p: any) => p.is_featured).length;
  const totalValue = allProducts.reduce((s: number, p: any) => s + Number(p.price ?? 0), 0);

  let products = [...allProducts];
  if (status && status !== "all") products = products.filter((p: any) => (p.status ?? "draft") === status);
  if (featured === "1") products = products.filter((p: any) => p.is_featured);
  products.sort((a: any, b: any) => {
    let av = a[sort] ?? "", bv = b[sort] ?? "";
    if (sort === "price") { av = Number(av); bv = Number(bv); }
    if (av < bv) return order === "asc" ? -1 : 1;
    if (av > bv) return order === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(253,80,0,0.1)", border: "1px solid rgba(253,80,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-accent, #fd5000)" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="1.5" y="4" width="13" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M1.5 7H14.5M5.5 4V2.5C5.5 2.2 5.7 2 6 2H10C10.3 2 10.5 2.2 10.5 2.5V4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.03em", color: "var(--color-text-primary)", margin: 0 }}>
              Products
            </h1>
          </div>
          <p style={{ fontSize: 13, color: "var(--color-text-muted, #888)", margin: 0 }}>
            View, search, filter and moderate all product listings
          </p>
        </div>
        <Link
          href="/admin/products/import/cj"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: "var(--color-accent, #fd5000)", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", boxShadow: "0 4px 14px rgba(253,80,0,0.25)" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          import product
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <StatCard label="Total products" value={total} sub="all time" />
        <StatCard label="Active listings" value={activeCount} sub={`${Math.round((activeCount / (total || 1)) * 100)}% of total`} color="#22c55e" />
        <StatCard label="Featured" value={featuredCount} color="#f59e0b" />
        <StatCard label="Catalog value" value={formatCurrency(totalValue)} sub="sum of all prices" color="#3b82f6" />
      </div>

      {/* Filters — Client Component */}
      <ProductsFilters
        q={q} status={status} featured={featured}
        sort={sort} order={order}
        total={total} filtered={products.length}
      />

      <ProductsTable
        products={products} total={total}
        sort={sort} order={order} query={q}
      />
    </div>
  );
}