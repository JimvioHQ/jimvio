// // app/admin/products/page.tsx
// import React from "react";
// import Link from "next/link";
// import { getAdminProducts } from "@/services/db";
// import { Card, CardContent, CardHeader } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { formatCurrency } from "@/lib/utils";
// import { MoveProductDialog } from "@/components/admin/MoveProductDialog";

// export const dynamic = "force-dynamic";

// // ─── Status config ────────────────────────────────────────────────────────────
// const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
//   active:   { label: "Active",   dot: "#22c55e", bg: "rgba(34,197,94,0.1)",   text: "#16a34a" },
//   inactive: { label: "Inactive", dot: "#94a3b8", bg: "rgba(148,163,184,0.1)", text: "#64748b" },
//   draft:    { label: "Draft",    dot: "#f59e0b", bg: "rgba(245,158,11,0.1)",  text: "#d97706" },
//   banned:   { label: "Banned",   dot: "#ef4444", bg: "rgba(239,68,68,0.1)",   text: "#dc2626" },
// };

// function StatusBadge({ status }: { status?: string }) {
//   const cfg = STATUS_CONFIG[status ?? "draft"] ?? STATUS_CONFIG.draft;
//   return (
//     <span
//       style={{
//         display: "inline-flex", alignItems: "center", gap: "5px",
//         padding: "3px 8px", borderRadius: "999px",
//         background: cfg.bg, color: cfg.text,
//         fontSize: "11px", fontWeight: 600,
//       }}
//     >
//       <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
//       {cfg.label}
//     </span>
//   );
// }

// // ─── SVG icons ────────────────────────────────────────────────────────────────
// function SearchIcon() {
//   return (
//     <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
//       <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
//       <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
//     </svg>
//   );
// }
// function PackageIcon({ size = 14 }: { size?: number }) {
//   return (
//     <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
//       <rect x="1.5" y="4" width="13" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
//       <path d="M1.5 7H14.5" stroke="currentColor" strokeWidth="1.2" />
//       <path d="M5.5 4V2.5C5.5 2.2 5.7 2 6 2H10C10.3 2 10.5 2.2 10.5 2.5V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
//       <path d="M6.5 10H9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
//     </svg>
//   );
// }
// function FilterIcon() {
//   return (
//     <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
//       <path d="M1.5 3H12.5M3.5 7H10.5M5.5 11H8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
//     </svg>
//   );
// }
// function ExternalLinkIcon() {
//   return (
//     <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
//       <path d="M5 2H2C1.4 2 1 2.4 1 3V10C1 10.6 1.4 11 2 11H9C9.6 11 10 10.6 10 10V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
//       <path d="M7 1H11M11 1V5M11 1L5.5 6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
//     </svg>
//   );
// }
// function StarIcon() {
//   return (
//     <svg width="12" height="12" viewBox="0 0 12 12" fill="#f59e0b" aria-hidden="true">
//       <path d="M6 1L7.5 4.5H11L8.5 6.5L9.5 10L6 8L2.5 10L3.5 6.5L1 4.5H4.5L6 1Z" />
//     </svg>
//   );
// }
// function ChevronIcon({ dir = "down" }: { dir?: "up" | "down" }) {
//   return (
//     <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ transform: dir === "up" ? "rotate(180deg)" : undefined }}>
//       <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
//     </svg>
//   );
// }

// // ─── Stat card ────────────────────────────────────────────────────────────────
// function StatCard({ label, value, sub, color = "var(--color-accent)" }: {
//   label: string; value: string | number; sub?: string; color?: string;
// }) {
//   return (
//     <div style={{
//       background: "var(--color-surface, #f8f8f7)",
//       border: "0.5px solid var(--color-border)",
//       borderRadius: 12, padding: "14px 18px",
//       position: "relative", overflow: "hidden",
//     }}>
//       {/* Corner arc decoration */}
//       <svg aria-hidden="true" style={{ position: "absolute", bottom: 0, right: 0, opacity: 0.07, pointerEvents: "none" }} width="80" height="80" viewBox="0 0 80 80" fill="none">
//         <circle cx="80" cy="80" r="55" stroke={color} strokeWidth="1.5" />
//         <circle cx="80" cy="80" r="30" stroke={color} strokeWidth="1.5" />
//       </svg>
//       <p style={{ fontSize: 11, color: "var(--color-text-muted, #888)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 6px" }}>
//         {label}
//       </p>
//       <p style={{ fontSize: 26, fontWeight: 900, color: "var(--color-text-primary)", letterSpacing: "-0.03em", margin: 0, lineHeight: 1 }}>
//         {value}
//       </p>
//       {sub && <p style={{ fontSize: 11, color: "var(--color-text-muted, #888)", margin: "4px 0 0" }}>{sub}</p>}
//     </div>
//   );
// }

// // ─── Empty state ──────────────────────────────────────────────────────────────
// function EmptyState({ query }: { query?: string }) {
//   return (
//     <tr>
//       <td colSpan={7}>
//         <div style={{ padding: "48px 24px", textAlign: "center" }}>
//           <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true" style={{ margin: "0 auto 12px" }}>
//             <rect x="4" y="10" width="40" height="30" rx="4" stroke="var(--color-border)" strokeWidth="1.5" fill="var(--color-surface, #f8f8f7)" />
//             <path d="M4 18H44" stroke="var(--color-border)" strokeWidth="1.5" />
//             <path d="M14 10V6M34 10V6" stroke="var(--color-border)" strokeWidth="1.5" strokeLinecap="round" />
//             <circle cx="24" cy="32" r="6" stroke="var(--color-text-muted, #aaa)" strokeWidth="1.2" fill="none" />
//             <path d="M28.5 36.5L32 40" stroke="var(--color-text-muted, #aaa)" strokeWidth="1.5" strokeLinecap="round" />
//           </svg>
//           <p style={{ fontWeight: 700, fontSize: 15, color: "var(--color-text-primary)", margin: "0 0 4px" }}>
//             {query ? `No results for "${query}"` : "No products found"}
//           </p>
//           <p style={{ fontSize: 13, color: "var(--color-text-muted, #888)", margin: 0 }}>
//             {query ? "Try a different search term or clear the filter." : "Products will appear here once they are created."}
//           </p>
//         </div>
//       </td>
//     </tr>
//   );
// }

// // ─── Page ─────────────────────────────────────────────────────────────────────
// export default async function AdminProductsPage({
//   searchParams,
// }: {
//   searchParams: Promise<{
//     q?: string;
//     status?: string;
//     sort?: string;
//     order?: string;
//     featured?: string;
//   }>;
// }) {
//   const { q, status, sort = "created_at", order = "desc", featured } = await searchParams;
//   const { products: allProducts, total } = await getAdminProducts(q, 100);

//   // ── Client-side derived stats ─────────────────────────────────────────────
//   const activeCount   = allProducts.filter((p: any) => p.status === "active").length;
//   const featuredCount = allProducts.filter((p: any) => p.is_featured).length;
//   const totalValue    = allProducts.reduce((s: number, p: any) => s + Number(p.price ?? 0), 0);

//   // ── Filter by status and featured ────────────────────────────────────────
//   let products = [...allProducts];
//   if (status && status !== "all") products = products.filter((p: any) => (p.status ?? "draft") === status);
//   if (featured === "1") products = products.filter((p: any) => p.is_featured);

//   // ── Sort ─────────────────────────────────────────────────────────────────
//   products.sort((a: any, b: any) => {
//     let av = a[sort] ?? "", bv = b[sort] ?? "";
//     if (sort === "price") { av = Number(av); bv = Number(bv); }
//     if (av < bv) return order === "asc" ? -1 : 1;
//     if (av > bv) return order === "asc" ? 1 : -1;
//     return 0;
//   });

//   const thStyle: React.CSSProperties = {
//     padding: "10px 16px", textAlign: "left",
//     fontSize: 11, fontWeight: 700, letterSpacing: "0.07em",
//     textTransform: "uppercase", color: "var(--color-text-muted, #888)",
//     whiteSpace: "nowrap", userSelect: "none",
//   };

//   function SortLink({ col, children }: { col: string; children: React.ReactNode }) {
//     const active = sort === col;
//     const nextOrder = active && order === "asc" ? "desc" : "asc";
//     const params = new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), sort: col, order: nextOrder, ...(featured ? { featured } : {}) });
//     return (
//       <a href={`/admin/products?${params}`} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: active ? "var(--color-accent, #fd5000)" : "inherit", textDecoration: "none" }}>
//         {children}
//         {active ? <ChevronIcon dir={order === "asc" ? "up" : "down"} /> : <span style={{ width: 14 }} />}
//       </a>
//     );
//   }

//   return (
//     <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

//       {/* ── Page header ───────────────────────────────────────────────── */}
//       <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
//         <div>
//           <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
//             <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(253,80,0,0.1)", border: "1px solid rgba(253,80,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-accent, #fd5000)" }}>
//               <PackageIcon size={16} />
//             </div>
//             <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.03em", color: "var(--color-text-primary)", margin: 0 }}>
//               Products
//             </h1>
//           </div>
//           <p style={{ fontSize: 13, color: "var(--color-text-muted, #888)", margin: 0 }}>
//             View, search, filter and moderate all product listings
//           </p>
//         </div>
//         <Link
//           href="/admin/products/new"
//           style={{
//             display: "inline-flex", alignItems: "center", gap: 6,
//             padding: "8px 16px", borderRadius: 8,
//             background: "var(--color-accent, #fd5000)", color: "#fff",
//             fontSize: 13, fontWeight: 700, textDecoration: "none",
//             boxShadow: "0 4px 14px rgba(253,80,0,0.25)",
//           }}
//         >
//           <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
//             <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
//           </svg>
//           Add Product
//         </Link>
//       </div>

//       {/* ── Stat cards ────────────────────────────────────────────────── */}
//       <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
//         <StatCard label="Total products" value={total} sub="all time" />
//         <StatCard label="Active listings" value={activeCount} sub={`${Math.round((activeCount / (total || 1)) * 100)}% of total`} color="#22c55e" />
//         <StatCard label="Featured" value={featuredCount} color="#f59e0b" />
//         <StatCard label="Catalog value" value={formatCurrency(totalValue)} sub="sum of all prices" color="#3b82f6" />
//       </div>

//       {/* ── Filters + search ──────────────────────────────────────────── */}
//       <div style={{ background: "var(--color-surface, #f8f8f7)", border: "0.5px solid var(--color-border)", borderRadius: 12, padding: "14px 16px" }}>
//         <form method="get" action="/admin/products" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
//           {/* Preserve sort/order across filter submissions */}
//           {sort   && <input type="hidden" name="sort"  value={sort} />}
//           {order  && <input type="hidden" name="order" value={order} />}

//           {/* Search */}
//           <div style={{ position: "relative", flex: "1 1 220px", minWidth: 0 }}>
//             <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted, #aaa)", pointerEvents: "none" }}>
//               <SearchIcon />
//             </span>
//             <input
//               name="q"
//               defaultValue={q ?? ""}
//               placeholder="Search by name or slug…"
//               style={{
//                 width: "100%", boxSizing: "border-box",
//                 height: 36, paddingLeft: 32, paddingRight: 12,
//                 border: "0.5px solid var(--color-border)",
//                 borderRadius: 8, fontSize: 13,
//                 background: "var(--color-bg, #fff)",
//                 color: "var(--color-text-primary)",
//                 outline: "none",
//               }}
//             />
//           </div>

//           {/* Status filter */}
//           <div style={{ position: "relative" }}>
//             <select
//               name="status"
//               defaultValue={status ?? "all"}
//               style={{
//                 height: 36, padding: "0 30px 0 10px", appearance: "none",
//                 border: "0.5px solid var(--color-border)", borderRadius: 8,
//                 fontSize: 13, background: "var(--color-bg, #fff)",
//                 color: "var(--color-text-primary)", cursor: "pointer", outline: "none",
//               }}
//             >
//               <option value="all">All statuses</option>
//               <option value="active">Active</option>
//               <option value="draft">Draft</option>
//               <option value="inactive">Inactive</option>
//               <option value="banned">Banned</option>
//             </select>
//             <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--color-text-muted, #aaa)" }}>
//               <ChevronIcon />
//             </span>
//           </div>

//           {/* Featured toggle */}
//           <label style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 12px", border: "0.5px solid var(--color-border)", borderRadius: 8, cursor: "pointer", fontSize: 13, background: featured === "1" ? "rgba(245,158,11,0.08)" : "var(--color-bg, #fff)", color: featured === "1" ? "#d97706" : "var(--color-text-secondary)" }}>
//             <input type="checkbox" name="featured" value="1" defaultChecked={featured === "1"} style={{ display: "none" }} />
//             <StarIcon />
//             Featured only
//           </label>

//           <button
//             type="submit"
//             style={{
//               height: 36, padding: "0 14px", borderRadius: 8,
//               background: "var(--color-accent, #fd5000)", color: "#fff",
//               border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer",
//               display: "inline-flex", alignItems: "center", gap: 6,
//             }}
//           >
//             <FilterIcon />
//             Apply
//           </button>

//           {(q || status || featured) && (

//               <a href="/admin/products"
//               style={{ height: 36, padding: "0 12px", borderRadius: 8, display: "inline-flex", alignItems: "center", fontSize: 13, color: "var(--color-text-muted, #888)", border: "0.5px solid var(--color-border)", textDecoration: "none", background: "var(--color-bg, #fff)" }}
//             >
//               Clear
//             </a>
//           )}

//           <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--color-text-muted, #888)", whiteSpace: "nowrap" }}>
//             {products.length} of {total} product{total !== 1 ? "s" : ""}
//           </span>
//         </form>
//       </div>

//       {/* ── Table ─────────────────────────────────────────────────────── */}
//       <div style={{ background: "var(--color-bg, #fff)", border: "0.5px solid var(--color-border)", borderRadius: 12, overflow: "hidden" }}>
//         <div style={{ overflowX: "auto" }}>
//           <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
//             <thead>
//               <tr style={{ borderBottom: "0.5px solid var(--color-border)", background: "var(--color-surface, #f8f8f7)" }}>
//                 <th style={thStyle}><SortLink col="name">Product</SortLink></th>
//                 <th style={thStyle}>Vendor</th>
//                 <th style={thStyle}><SortLink col="price">Price</SortLink></th>
//                 <th style={thStyle}><SortLink col="status">Status</SortLink></th>
//                 <th style={thStyle}>Type</th>
//                 <th style={thStyle}>Featured</th>
//                 <th style={thStyle}>Affiliate</th>
//                 <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {products.length === 0 ? (
//                 <EmptyState query={q} />
//               ) : (
//                 products.map((p: any, i: number) => (
//                   <tr
//                     key={p.id}
//                     style={{
//                       borderBottom: i < products.length - 1 ? "0.5px solid var(--color-border)" : "none",
//                       transition: "background 150ms",
//                     }}
//                     onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface, #f8f8f7)")}
//                     onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
//                   >
//                     {/* Product */}
//                     <td style={{ padding: "12px 16px" }}>
//                       <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//                         {/* Thumbnail or placeholder */}
//                         <div style={{
//                           width: 36, height: 36, borderRadius: 8, flexShrink: 0, overflow: "hidden",
//                           background: "rgba(253,80,0,0.06)", border: "0.5px solid var(--color-border)",
//                           display: "flex", alignItems: "center", justifyContent: "center",
//                           color: "rgba(253,80,0,0.35)",
//                         }}>
//                           {p.images?.[0] ? (
//                             <img src={p.images[0]} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
//                           ) : (
//                             <PackageIcon size={16} />
//                           )}
//                         </div>
//                         <div style={{ minWidth: 0 }}>
//                           <p style={{ fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180, color: "var(--color-text-primary)" }}>
//                             {p.name}
//                           </p>
//                           <p style={{ fontSize: 11, color: "var(--color-text-muted, #888)", margin: 0, fontFamily: "monospace" }}>
//                             {p.slug}
//                           </p>
//                         </div>
//                       </div>
//                     </td>

//                     {/* Vendor */}
//                     <td style={{ padding: "12px 16px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
//                       {p.vendor_name ? (
//                         <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
//                           <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--color-surface, #f0f0ee)", border: "0.5px solid var(--color-border)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "var(--color-text-secondary)", flexShrink: 0 }}>
//                             {p.vendor_name.charAt(0).toUpperCase()}
//                           </span>
//                           {p.vendor_name}
//                         </span>
//                       ) : (
//                         <span style={{ color: "var(--color-text-muted, #aaa)", fontStyle: "italic", fontSize: 12 }}>Unassigned</span>
//                       )}
//                     </td>

//                     {/* Price */}
//                     <td style={{ padding: "12px 16px", fontWeight: 700, color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>
//                       {formatCurrency(Number(p.price ?? 0))}
//                       {p.compare_at_price && Number(p.compare_at_price) > Number(p.price) && (
//                         <span style={{ fontSize: 11, color: "var(--color-text-muted, #aaa)", textDecoration: "line-through", marginLeft: 4, fontWeight: 400 }}>
//                           {formatCurrency(Number(p.compare_at_price))}
//                         </span>
//                       )}
//                     </td>

//                     {/* Status */}
//                     <td style={{ padding: "12px 16px" }}>
//                       <StatusBadge status={p.status} />
//                     </td>

//                     {/* Type */}
//                     <td style={{ padding: "12px 16px" }}>
//                       {p.product_type ? (
//                         <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "var(--color-surface, #f0f0ee)", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border)", textTransform: "capitalize" }}>
//                           {p.product_type}
//                         </span>
//                       ) : (
//                         <span style={{ color: "var(--color-text-muted, #aaa)", fontSize: 12 }}>—</span>
//                       )}
//                     </td>

//                     {/* Featured */}
//                     <td style={{ padding: "12px 16px" }}>
//                       {p.is_featured ? (
//                         <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "rgba(245,158,11,0.1)", color: "#d97706", border: "0.5px solid rgba(245,158,11,0.2)" }}>
//                           <StarIcon /> Featured
//                         </span>
//                       ) : (
//                         <span style={{ color: "var(--color-text-muted, #aaa)", fontSize: 12 }}>—</span>
//                       )}
//                     </td>

//                     {/* Affiliate */}
//                     <td style={{ padding: "12px 16px" }}>
//                       {p.affiliate_enabled ? (
//                         <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "rgba(59,130,246,0.08)", color: "#2563eb", border: "0.5px solid rgba(59,130,246,0.2)" }}>
//                           <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
//                             <path d="M5 1V9M3 3.5C3 2.7 3.9 2 5 2S7 2.7 7 3.5 6.1 5 5 5 3 5.7 3 6.5 3.9 8 5 8s2-.7 2-1.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
//                           </svg>
//                           {p.affiliate_commission_rate ? `${p.affiliate_commission_rate}%` : "On"}
//                         </span>
//                       ) : (
//                         <span style={{ color: "var(--color-text-muted, #aaa)", fontSize: 12 }}>—</span>
//                       )}
//                     </td>

//                     {/* Actions */}
//                     <td style={{ padding: "12px 16px", textAlign: "right" }}>
//                       <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
//                         {/* View on storefront */}
//                         <a
//                           href={`/marketplace/${p.slug}`}
//                           target="_blank"
//                           rel="noopener noreferrer"
//                           title="View on storefront"
//                           style={{
//                             width: 30, height: 30, borderRadius: 6, display: "inline-flex",
//                             alignItems: "center", justifyContent: "center",
//                             border: "0.5px solid var(--color-border)",
//                             color: "var(--color-text-muted, #888)", textDecoration: "none",
//                             background: "var(--color-surface, #f8f8f7)",
//                             transition: "border-color 150ms, color 150ms",
//                           }}
//                           onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-accent, #fd5000)"; (e.currentTarget as HTMLElement).style.color = "var(--color-accent, #fd5000)"; }}
//                           onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted, #888)"; }}
//                         >
//                           <ExternalLinkIcon />
//                         </a>

//                         {/* Edit */}
//                         <a
//                           href={`/admin/products/${p.id}/edit`}
//                           title="Edit product"
//                           style={{
//                             width: 30, height: 30, borderRadius: 6, display: "inline-flex",
//                             alignItems: "center", justifyContent: "center",
//                             border: "0.5px solid var(--color-border)",
//                             color: "var(--color-text-muted, #888)", textDecoration: "none",
//                             background: "var(--color-surface, #f8f8f7)",
//                             transition: "border-color 150ms, color 150ms",
//                           }}
//                           onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-accent, #fd5000)"; (e.currentTarget as HTMLElement).style.color = "var(--color-accent, #fd5000)"; }}
//                           onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted, #888)"; }}
//                         >
//                           <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
//                             <path d="M9 2L11 4L4.5 10.5H2.5V8.5L9 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
//                           </svg>
//                         </a>

//                         {/* Move vendor dialog */}
//                         <MoveProductDialog productId={p.id} currentVendorName={p.vendor_name} />
//                       </div>
//                     </td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>

//         {/* Table footer */}
//         {products.length > 0 && (
//           <div style={{ padding: "10px 16px", borderTop: "0.5px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--color-surface, #f8f8f7)" }}>
//             <p style={{ fontSize: 12, color: "var(--color-text-muted, #888)", margin: 0 }}>
//               Showing <strong>{products.length}</strong> of <strong>{total}</strong> products
//             </p>
//             <p style={{ fontSize: 12, color: "var(--color-text-muted, #888)", margin: 0 }}>
//               Sorted by <strong>{sort}</strong> {order === "asc" ? "↑" : "↓"}
//             </p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// app/admin/products/page.tsx
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
          href="/admin/products/new"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: "var(--color-accent, #fd5000)", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", boxShadow: "0 4px 14px rgba(253,80,0,0.25)" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Add Product
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

      {/* Table — Client Component */}
      <ProductsTable
        products={products} total={total}
        sort={sort} order={order} query={q}
      />
    </div>
  );
}