
// import React from "react";
// import Link from "next/link";
// import { getAdminProducts } from "@/services/db";
// import { formatCurrency } from "@/lib/utils";
// import type { ProductStatus } from "@/types/db";
// import { PageHeader } from "@/components/ui/admin";
// import { ProductsTable } from "@/components/admin/products-table";
// import { ProductsFilters } from "@/components/admin/products-filters";

// export const dynamic = "force-dynamic";

// function StatCard({ label, value, sub, color = "var(--color-accent)" }: {
//   label: string; value: string | number; sub?: string; color?: string;
// }) {
//   return (
//     <div className="relative overflow-hidden rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-4">
//       <svg aria-hidden="true" className="absolute bottom-0 right-0 opacity-10 pointer-events-none" width="80" height="80" viewBox="0 0 80 80" fill="none">
//         <circle cx="80" cy="80" r="55" stroke={color} strokeWidth="1.5" />
//         <circle cx="80" cy="80" r="30" stroke={color} strokeWidth="1.5" />
//       </svg>
//       <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
//         {label}
//       </p>
//       <p className="mt-3 text-[26px] font-semibold text-[var(--color-text-primary)] leading-none">
//         {value}
//       </p>
//       {sub && <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">{sub}</p>}
//     </div>
//   );
// }

// export default async function AdminProductsPage({
//   searchParams,
// }: {
//   searchParams: Promise<{ q?: string; status?: ProductStatus | "all"; sort?: string; order?: string; featured?: string }>;
// }) {
//   const { q, status, sort = "created_at", order = "desc", featured } = await searchParams;
//   const { products: allProducts, total } = await getAdminProducts(q, 100, status, featured, sort, order as "asc" | "desc");

//   const activeCount = allProducts.filter((p: any) => p.status === "active").length;
//   const featuredCount = allProducts.filter((p: any) => p.is_featured).length;
//   const totalValue = allProducts.reduce((s: number, p: any) => s + Number(p.price ?? 0), 0);

//   let products = [...allProducts];
//   if (status && status !== "all") products = products.filter((p: any) => (p.status ?? "draft") === status);
//   if (featured === "1") products = products.filter((p: any) => p.is_featured);
//   products.sort((a: any, b: any) => {
//     let av = a[sort] ?? "", bv = b[sort] ?? "";
//     if (sort === "price") { av = Number(av); bv = Number(bv); }
//     if (av < bv) return order === "asc" ? -1 : 1;
//     if (av > bv) return order === "asc" ? 1 : -1;
//     return 0;
//   });

//   return (
//     <div className="space-y-6">
//       <PageHeader
//         eyebrow="Admin · Commerce"
//         title="Products"
//         subtitle="View, search, filter and moderate all product listings"
//         actions={
//           <Link
//             href="/admin/products/import/cj"
//             className="inline-flex items-center gap-2.5 h-9 px-4 rounded-lg bg-[var(--color-accent)] text-[var(--color-surface)] text-[13px] font-semibold transition-colors hover:bg-orange-500"
//           >
//             <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-[14px]">
//               +
//             </span>
//             import product
//           </Link>
//         }
//       />

//       <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
//         <StatCard label="Total products" value={total} sub="all time" />
//         <StatCard label="Active listings" value={activeCount} sub={`${Math.round((activeCount / (total || 1)) * 100)}% of total`} color="#22c55e" />
//         <StatCard label="Featured" value={featuredCount} color="#f59e0b" />
//         <StatCard label="Catalog value" value={formatCurrency(totalValue)} sub="sum of all prices" color="#3b82f6" />
//       </div>

//       <ProductsFilters
//         q={q} status={status} featured={featured}
//         sort={sort} order={order}
//         total={total} filtered={products.length}
//       />

//       <ProductsTable
//         products={products} total={products.length}
//         sort={sort} order={order} query={q}
//       />
//     </div>
//   );
// }
import React from "react";
import Link from "next/link";
import { getAdminProducts } from "@/services/db";
import type { ProductStatus } from "@/types/db";
import { PageHeader } from "@/components/ui/admin";
import { ProductsTable } from "@/components/admin/products-table";
import { ProductsFilters } from "@/components/admin/products-filters";

export const dynamic = "force-dynamic";

function StatCard({
  label, value, sub, color = "var(--color-accent)",
}: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-4">
      <svg
        aria-hidden="true"
        className="absolute bottom-0 right-0 opacity-10 pointer-events-none"
        width="80" height="80" viewBox="0 0 80 80" fill="none"
      >
        <circle cx="80" cy="80" r="55" stroke={color} strokeWidth="1.5" />
        <circle cx="80" cy="80" r="30" stroke={color} strokeWidth="1.5" />
      </svg>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className="mt-3 text-[26px] font-semibold text-[var(--color-text-primary)] leading-none">
        {value}
      </p>
      {sub && <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">{sub}</p>}
    </div>
  );
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: ProductStatus | "all";
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

  const { products, total, totalActive, totalFeatured } = await getAdminProducts({
    q: sp.q,
    status: sp.status,
    featured: sp.featured,
    sort: sp.sort,
    order: (sp.order as "asc" | "desc") ?? "desc",
    page,
    pageSize,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin · Commerce"
        title="Products"
        subtitle="View, search, filter and moderate all product listings"
        actions={
          <Link
            href="/admin/products/import/cj"
            className="inline-flex items-center gap-2.5 h-9 px-4 rounded-lg bg-[var(--color-accent)] text-[var(--color-surface)] text-[13px] font-semibold transition-colors hover:bg-orange-500"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-[14px]">
              +
            </span>
            import product
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard label="Total products" value={total} sub="matching filters" />
        <StatCard
          label="Active listings"
          value={totalActive}
          sub={`${Math.round((totalActive / (total || 1)) * 100)}% of total`}
          color="#22c55e"
        />
        <StatCard label="Featured" value={totalFeatured} color="#f59e0b" />
        <StatCard label="Showing" value={products.length} sub={`page ${page}`} color="#3b82f6" />
      </div>

      <ProductsFilters
        q={sp.q}
        status={sp.status}
        featured={sp.featured}
        sort={sp.sort ?? "created_at"}
        order={sp.order ?? "desc"}
        total={total}
        filtered={products.length}
      />

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