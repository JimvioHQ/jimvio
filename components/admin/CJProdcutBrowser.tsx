
// "use client";

// import { useState, useEffect, useCallback, useRef } from "react";
// import Image from "next/image";
// import {
//   Search, SlidersHorizontal, X, Check, Loader2, Package,
//   ChevronLeft, ChevronRight, Play, Truck, ShieldCheck, AlertCircle,
// } from "lucide-react";
// import { cn } from "@/lib/utils";
// import { toast } from "sonner";

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface CJProduct {
//   pid: string;
//   productNameEn: string;
//   productSku: string;
//   bigImage: string;
//   sellPrice: string;
//   nowPrice: string;
//   discountPrice: string;
//   categoryName?: string;
//   threeCategoryName?: string;
//   addMarkStatus: number;
//   isFreeShipping?: boolean;
//   listedNum: number;
//   warehouseInventoryNum?: number;
//   verifiedWarehouse?: number;
//   deliveryCycle?: string;
//   productType: string;
//   isVideo?: number;
//   createAt?: number;
// }

// interface CJCategory {
//   categoryId: string;
//   categoryName: string;
// }

// interface Filters {
//   keyWord: string;
//   categoryId: string;
//   minPrice: string;
//   maxPrice: string;
//   createTimeFrom: string;
//   createTimeTo: string;
//   isFreeShipping: string;
//   verifiedWarehouse: string;
//   productType: string;
//   productFlag: string;
//   countryCode: string;
//   deliveryTime: string;
//   startInventory: string;
//   endInventory: string;
//   sort: string;
//   orderBy: string;
// }

// const DEFAULT_FILTERS: Filters = {
//   keyWord: "", categoryId: "", minPrice: "", maxPrice: "",
//   createTimeFrom: "", createTimeTo: "", isFreeShipping: "",
//   verifiedWarehouse: "", productType: "", productFlag: "",
//   countryCode: "", deliveryTime: "", startInventory: "",
//   endInventory: "", sort: "desc", orderBy: "createAt",
// };

// // ─── API helpers ──────────────────────────────────────────────────────────────

// async function fetchCJProducts(
//   filters: Filters, page: number, pageSize: number
// ): Promise<{ products: CJProduct[]; total: number }> {
//   const params = new URLSearchParams();
//   params.set("pageNum", String(page));
//   params.set("pageSize", String(pageSize));
//   if (filters.keyWord) params.set("productNameEn", filters.keyWord);
//   if (filters.categoryId) params.set("categoryId", filters.categoryId);
//   if (filters.minPrice) params.set("minPrice", filters.minPrice);
//   if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
//   if (filters.isFreeShipping) params.set("isFreeShipping", filters.isFreeShipping);
//   if (filters.verifiedWarehouse) params.set("verifiedWarehouse", filters.verifiedWarehouse);
//   if (filters.productType) params.set("productType", filters.productType);
//   if (filters.productFlag !== "") params.set("searchType", filters.productFlag);
//   if (filters.countryCode) params.set("countryCode", filters.countryCode);
//   if (filters.deliveryTime) params.set("deliveryTime", filters.deliveryTime);
//   if (filters.startInventory) params.set("startInventory", filters.startInventory);
//   if (filters.endInventory) params.set("endInventory", filters.endInventory);
//   if (filters.sort) params.set("sort", filters.sort);
//   if (filters.orderBy) params.set("orderBy", filters.orderBy);
//   if (filters.createTimeFrom) params.set("createTimeFrom", `${filters.createTimeFrom} 00:00:00`);
//   if (filters.createTimeTo) params.set("createTimeTo", `${filters.createTimeTo} 23:59:59`);

//   const res = await fetch(`/api/cj/products?${params.toString()}`);
//   if (!res.ok) throw new Error(`HTTP ${res.status}`);
//   const json = await res.json();
//   if (!json.success) throw new Error(json.error || "Unknown error");
//   return { products: json.products, total: json.total };
// }

// async function fetchCJCategories(): Promise<CJCategory[]> {
//   const res = await fetch("/api/cj/categories");
//   if (!res.ok) return [];
//   const json = await res.json();
//   return json.categories || [];
// }

// // ─── Component ────────────────────────────────────────────────────────────────

// export default function CJProductBrowser() {
//   const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
//   const [pending, setPending] = useState<Filters>(DEFAULT_FILTERS);
//   const [products, setProducts] = useState<CJProduct[]>([]);
//   const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [categories, setCategories] = useState<CJCategory[]>([]);
//   const [filtersOpen, setFiltersOpen] = useState(true);
//   const [importingPid, setImportingPid] = useState<string | null>(null);
//   const [importedPids, setImportedPids] = useState<Set<string>>(new Set());
//   const searchRef = useRef<HTMLInputElement>(null);

//   useEffect(() => {
//     fetchCJCategories().then(setCategories);
//   }, []);

//   const load = useCallback(async (f: Filters, page: number) => {
//     setLoading(true);
//     setError("");
//     try {
//       const { products: p, total } = await fetchCJProducts(f, page, pagination.pageSize);
//       setProducts(p);
//       setPagination((prev) => ({ ...prev, page, total }));
//       if (typeof window !== "undefined") {
//         window.scrollTo({ top: 0, behavior: "smooth" });
//       }
//     } catch (e) {
//       setError((e as Error).message);
//       setProducts([]);
//     } finally {
//       setLoading(false);
//     }
//   }, [pagination.pageSize]);

//   const applyFilters = () => {
//     setFilters(pending);
//     load(pending, 1);
//   };

//   const resetFilters = () => {
//     setPending(DEFAULT_FILTERS);
//     setFilters(DEFAULT_FILTERS);
//     load(DEFAULT_FILTERS, 1);
//   };

//   const goPage = (p: number) => load(filters, p);

//   const importProduct = async (pid: string) => {
//     setImportingPid(pid);
//     try {
//       const res = await fetch("/api/cj/import", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ pid }),
//       });
//       const json = await res.json();
//       if (!json.success) throw new Error(json.error);
//       setImportedPids((prev) => new Set([...prev, pid]));
//       toast.success("Product imported to Jimvio");
//     } catch (e) {
//       toast.error(`Import failed: ${(e as Error).message}`);
//     } finally {
//       setImportingPid(null);
//     }
//   };

//   const totalPages = Math.ceil(pagination.total / pagination.pageSize);
//   const activeFilterCount = Object.entries(pending).filter(
//     ([k, v]) => v !== "" && v !== DEFAULT_FILTERS[k as keyof Filters]
//   ).length;

//   return (
//     <div className="min-h-screen bg-[var(--color-bg)]">
//       <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 lg:py-8">

//         {/* ── Header ─────────────────────────────────────────── */}
//         <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
//           <div>
//             <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)] mb-1.5">
//               CJ Dropshipping
//             </p>
//             <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">
//               Browse catalog
//             </h1>
//             <p className="text-sm text-[var(--color-text-muted)] mt-1">
//               {pagination.total > 0 ? (
//                 <>
//                   <span className="tabular-nums font-medium text-[var(--color-text-primary)]">
//                     {pagination.total.toLocaleString()}
//                   </span>{" "}
//                   products available
//                 </>
//               ) : (
//                 "Search and import products into your store"
//               )}
//             </p>
//           </div>

//           <button
//             onClick={() => setFiltersOpen((o) => !o)}
//             className={cn(
//               "lg:hidden inline-flex items-center gap-2 h-10 px-4 rounded-xl",
//               "bg-[var(--color-surface)] border border-[var(--color-border)]",
//               "text-sm font-medium text-[var(--color-text-primary)]",
//               "transition-colors hover:bg-[var(--color-surface-secondary)]"
//             )}
//           >
//             <SlidersHorizontal className="h-4 w-4" />
//             Filters
//             {activeFilterCount > 0 && (
//               <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-orange-500 text-white text-[10px] font-semibold tabular-nums">
//                 {activeFilterCount}
//               </span>
//             )}
//           </button>
//         </div>

//         {/* ── Layout ─────────────────────────────────────────── */}
//         <div className="flex gap-6 items-start">

//           {/* Sidebar */}
//           <aside
//             className={cn(
//               "w-72 shrink-0 lg:sticky lg:top-6",
//               "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl",
//               "overflow-hidden",
//               !filtersOpen && "hidden lg:block"
//             )}
//           >
//             <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--color-border)]">
//               <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
//                 Filters
//               </p>
//               {activeFilterCount > 0 && (
//                 <button
//                   onClick={resetFilters}
//                   className="text-[11px] font-medium text-orange-500 hover:text-orange-600 transition-colors"
//                 >
//                   Clear all
//                 </button>
//               )}
//             </div>

//             <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-5 space-y-5">
//               {/* Search */}
//               <FilterSection label="Search">
//                 <div className="relative">
//                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-muted)] pointer-events-none" />
//                   <input
//                     ref={searchRef}
//                     type="text"
//                     placeholder="Product name…"
//                     value={pending.keyWord}
//                     onChange={(e) => setPending((p) => ({ ...p, keyWord: e.target.value }))}
//                     onKeyDown={(e) => e.key === "Enter" && applyFilters()}
//                     className={inputCls + " pl-9"}
//                   />
//                 </div>
//               </FilterSection>

//               <FilterSection label="Category">
//                 <select
//                   value={pending.categoryId}
//                   onChange={(e) => setPending((p) => ({ ...p, categoryId: e.target.value }))}
//                   className={selectCls}
//                 >
//                   <option value="">All categories</option>
//                   {categories.map((c) => (
//                     <option key={c.categoryId} value={c.categoryId}>
//                       {c.categoryName}
//                     </option>
//                   ))}
//                 </select>
//               </FilterSection>

//               <FilterSection label="Price · USD">
//                 <div className="grid grid-cols-2 gap-2">
//                   <input
//                     type="number" min="0" placeholder="Min"
//                     value={pending.minPrice}
//                     onChange={(e) => setPending((p) => ({ ...p, minPrice: e.target.value }))}
//                     className={inputCls}
//                   />
//                   <input
//                     type="number" min="0" placeholder="Max"
//                     value={pending.maxPrice}
//                     onChange={(e) => setPending((p) => ({ ...p, maxPrice: e.target.value }))}
//                     className={inputCls}
//                   />
//                 </div>
//               </FilterSection>

//               <FilterSection label="Listed date">
//                 <div className="space-y-2">
//                   <input
//                     type="date"
//                     value={pending.createTimeFrom}
//                     onChange={(e) => setPending((p) => ({ ...p, createTimeFrom: e.target.value }))}
//                     className={inputCls}
//                   />
//                   <input
//                     type="date"
//                     value={pending.createTimeTo}
//                     onChange={(e) => setPending((p) => ({ ...p, createTimeTo: e.target.value }))}
//                     className={inputCls}
//                   />
//                 </div>
//               </FilterSection>

//               <FilterSection label="Inventory">
//                 <div className="grid grid-cols-2 gap-2">
//                   <input
//                     type="number" min="0" placeholder="Min"
//                     value={pending.startInventory}
//                     onChange={(e) => setPending((p) => ({ ...p, startInventory: e.target.value }))}
//                     className={inputCls}
//                   />
//                   <input
//                     type="number" min="0" placeholder="Max"
//                     value={pending.endInventory}
//                     onChange={(e) => setPending((p) => ({ ...p, endInventory: e.target.value }))}
//                     className={inputCls}
//                   />
//                 </div>
//               </FilterSection>

//               <FilterSection label="Shipping">
//                 <Pills
//                   value={pending.isFreeShipping}
//                   onChange={(v) => setPending((p) => ({ ...p, isFreeShipping: v }))}
//                   options={[
//                     { label: "Any", value: "" },
//                     { label: "Free", value: "1" },
//                     { label: "Paid", value: "0" },
//                   ]}
//                 />
//               </FilterSection>

//               <FilterSection label="Ships within">
//                 <Pills
//                   value={pending.deliveryTime}
//                   onChange={(v) => setPending((p) => ({ ...p, deliveryTime: v }))}
//                   options={[
//                     { label: "Any", value: "" },
//                     { label: "24h", value: "24" },
//                     { label: "48h", value: "48" },
//                     { label: "72h", value: "72" },
//                   ]}
//                 />
//               </FilterSection>

//               <FilterSection label="Warehouse">
//                 <Pills
//                   value={pending.verifiedWarehouse}
//                   onChange={(v) => setPending((p) => ({ ...p, verifiedWarehouse: v }))}
//                   options={[
//                     { label: "All", value: "" },
//                     { label: "Verified", value: "1" },
//                     { label: "Unverified", value: "2" },
//                   ]}
//                 />
//               </FilterSection>

//               <FilterSection label="Type">
//                 <Pills
//                   value={pending.productType}
//                   onChange={(v) => setPending((p) => ({ ...p, productType: v }))}
//                   options={[
//                     { label: "All", value: "" },
//                     { label: "Supplier", value: "4" },
//                     { label: "Video", value: "10" },
//                     { label: "Non-video", value: "11" },
//                   ]}
//                 />
//               </FilterSection>

//               <FilterSection label="Status">
//                 <Pills
//                   value={pending.productFlag}
//                   onChange={(v) => setPending((p) => ({ ...p, productFlag: v }))}
//                   options={[
//                     { label: "All", value: "" },
//                     { label: "Trending", value: "0" },
//                     { label: "New", value: "1" },
//                     { label: "Video", value: "2" },
//                     { label: "Slow", value: "3" },
//                   ]}
//                 />
//               </FilterSection>

//               <FilterSection label="Warehouse country">
//                 <select
//                   value={pending.countryCode}
//                   onChange={(e) => setPending((p) => ({ ...p, countryCode: e.target.value }))}
//                   className={selectCls}
//                 >
//                   <option value="">All warehouses</option>
//                   <option value="CN">China</option>
//                   <option value="US">United States</option>
//                   <option value="GB">United Kingdom</option>
//                   <option value="DE">Germany</option>
//                   <option value="FR">France</option>
//                   <option value="AU">Australia</option>
//                 </select>
//               </FilterSection>

//               <FilterSection label="Sort">
//                 <select
//                   value={pending.orderBy}
//                   onChange={(e) => setPending((p) => ({ ...p, orderBy: e.target.value }))}
//                   className={selectCls + " mb-2"}
//                 >
//                   <option value="createAt">Date listed</option>
//                   <option value="listedNum">Listing count</option>
//                 </select>
//                 <Pills
//                   value={pending.sort}
//                   onChange={(v) => setPending((p) => ({ ...p, sort: v }))}
//                   options={[
//                     { label: "Newest", value: "desc" },
//                     { label: "Oldest", value: "asc" },
//                   ]}
//                 />
//               </FilterSection>
//             </div>

//             <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
//               <button
//                 onClick={applyFilters}
//                 className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors active:scale-[0.98]"
//               >
//                 <Search className="h-4 w-4" />
//                 Search
//               </button>
//             </div>
//           </aside>

//           {/* Main */}
//           <main className="flex-1 min-w-0">
//             {/* Active chips */}
//             {activeFilterCount > 0 && (
//               <div className="flex flex-wrap gap-2 mb-5">
//                 {pending.keyWord && (
//                   <Chip label={`"${pending.keyWord}"`} onRemove={() => {
//                     setPending((p) => ({ ...p, keyWord: "" }));
//                   }} />
//                 )}
//                 {pending.categoryId && (
//                   <Chip
//                     label={categories.find((c) => c.categoryId === pending.categoryId)?.categoryName || "Category"}
//                     onRemove={() => setPending((p) => ({ ...p, categoryId: "" }))}
//                   />
//                 )}
//                 {(pending.minPrice || pending.maxPrice) && (
//                   <Chip
//                     label={`$${pending.minPrice || "0"} – $${pending.maxPrice || "∞"}`}
//                     onRemove={() => setPending((p) => ({ ...p, minPrice: "", maxPrice: "" }))}
//                   />
//                 )}
//                 {pending.isFreeShipping === "1" && (
//                   <Chip label="Free shipping" onRemove={() => setPending((p) => ({ ...p, isFreeShipping: "" }))} />
//                 )}
//                 {pending.deliveryTime && (
//                   <Chip label={`Ships in ${pending.deliveryTime}h`} onRemove={() => setPending((p) => ({ ...p, deliveryTime: "" }))} />
//                 )}
//                 {pending.verifiedWarehouse === "1" && (
//                   <Chip label="Verified" onRemove={() => setPending((p) => ({ ...p, verifiedWarehouse: "" }))} />
//                 )}
//                 {pending.countryCode && (
//                   <Chip label={`Warehouse: ${pending.countryCode}`} onRemove={() => setPending((p) => ({ ...p, countryCode: "" }))} />
//                 )}
//               </div>
//             )}

//             {/* Error */}
//             {error && (
//               <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-100 mb-5">
//                 <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
//                 <div className="min-w-0">
//                   <p className="text-[13px] font-semibold text-rose-700">Failed to load products</p>
//                   <p className="text-[12px] text-rose-600 mt-0.5">{error}</p>
//                 </div>
//               </div>
//             )}

//             {/* Empty */}
//             {!loading && !error && products.length === 0 && pagination.total === 0 && (
//               <div className="flex flex-col items-center justify-center text-center py-24 px-6">
//                 <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-5">
//                   <Package className="h-7 w-7 text-orange-500" />
//                 </div>
//                 <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
//                   Ready when you are
//                 </h3>
//                 <p className="text-sm text-[var(--color-text-muted)] max-w-sm leading-relaxed">
//                   Adjust filters in the sidebar and hit <span className="font-medium text-[var(--color-text-primary)]">Search</span> to browse the CJ catalog.
//                 </p>
//               </div>
//             )}

//             {/* Loading skeleton */}
//             {loading && (
//               <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
//                 {Array.from({ length: 10 }).map((_, i) => (
//                   <div
//                     key={i}
//                     className="aspect-[3/4] rounded-2xl bg-[var(--color-surface-secondary)] animate-pulse"
//                   />
//                 ))}
//               </div>
//             )}

//             {/* Grid */}
//             {!loading && products.length > 0 && (
//               <>
//                 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
//                   {products.map((product) => (
//                     <ProductCard
//                       key={product.pid}
//                       product={product}
//                       imported={importedPids.has(product.pid)}
//                       importing={importingPid === product.pid}
//                       onImport={() => importProduct(product.pid)}
//                     />
//                   ))}
//                 </div>

//                 {/* Pagination */}
//                 {totalPages > 1 && (
//                   <div className="flex items-center justify-center gap-1.5 mt-10 pt-6 border-t border-[var(--color-border)]">
//                     <button
//                       disabled={pagination.page === 1}
//                       onClick={() => goPage(pagination.page - 1)}
//                       className={pageNavCls}
//                     >
//                       <ChevronLeft className="h-4 w-4" />
//                       <span className="hidden sm:inline">Previous</span>
//                     </button>

//                     <div className="flex gap-1 mx-1">
//                       {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
//                         let p: number;
//                         if (totalPages <= 7) p = i + 1;
//                         else if (pagination.page <= 4) p = i + 1;
//                         else if (pagination.page >= totalPages - 3) p = totalPages - 6 + i;
//                         else p = pagination.page - 3 + i;
//                         const isActive = p === pagination.page;
//                         return (
//                           <button
//                             key={p}
//                             onClick={() => goPage(p)}
//                             className={cn(
//                               "w-9 h-9 rounded-lg text-[13px] font-medium tabular-nums transition-colors",
//                               isActive
//                                 ? "bg-[var(--color-text-primary)] text-[var(--color-surface)]"
//                                 : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
//                             )}
//                           >
//                             {p}
//                           </button>
//                         );
//                       })}
//                     </div>

//                     <button
//                       disabled={pagination.page === totalPages}
//                       onClick={() => goPage(pagination.page + 1)}
//                       className={pageNavCls}
//                     >
//                       <span className="hidden sm:inline">Next</span>
//                       <ChevronRight className="h-4 w-4" />
//                     </button>
//                   </div>
//                 )}
//               </>
//             )}
//           </main>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── ProductCard ──────────────────────────────────────────────────────────────

// function ProductCard({
//   product, imported, importing, onImport,
// }: {
//   product: CJProduct;
//   imported: boolean;
//   importing: boolean;
//   onImport: () => void;
// }) {
//   const [imgError, setImgError] = useState(false);
//   const price = parseFloat(product.discountPrice || product.nowPrice || product.sellPrice || "0");
//   const isFree = product.addMarkStatus === 1 || product.isFreeShipping;

//   // Truncate long CJ titles before render
//   const displayName = product.productNameEn.length > 80
//     ? product.productNameEn.slice(0, 77).trim() + "…"
//     : product.productNameEn;

//   return (
//     <article
//       className={cn(
//         "group relative flex flex-col h-full",
//         "bg-[var(--color-surface)] rounded-2xl overflow-hidden",
//         "transition-[transform,box-shadow] duration-300 ease-out",
//         "hover:-translate-y-0.5",
//         imported
//           ? "ring-1 ring-emerald-500/30 shadow-[0_8px_24px_-12px_rgba(16,185,129,0.25)]"
//           : "ring-1 ring-[var(--color-border)] hover:shadow-[0_12px_32px_-16px_rgba(0,0,0,0.18)]"
//       )}
//     >
//       {/* Image */}
//       <div className="relative aspect-square bg-[var(--color-surface-secondary)] overflow-hidden">
//         {product.bigImage && !imgError ? (
//           <Image
//             src={product.bigImage}
//             alt={product.productNameEn}
//             fill
//             sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
//             className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
//             onError={() => setImgError(true)}
//             unoptimized
//           />
//         ) : (
//           <div className="absolute inset-0 flex items-center justify-center">
//             <Package className="h-10 w-10 text-[var(--color-text-muted)]/40" />
//           </div>
//         )}

//         {/* Badges */}
//         <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
//           {isFree && (
//             <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-surface)]/95 backdrop-blur-sm text-[10px] font-medium text-emerald-600">
//               <Truck className="h-2.5 w-2.5" strokeWidth={2.5} />
//               Free ship
//             </span>
//           )}
//           {product.verifiedWarehouse === 1 && (
//             <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-surface)]/95 backdrop-blur-sm text-[10px] font-medium text-blue-600">
//               <ShieldCheck className="h-2.5 w-2.5" strokeWidth={2.5} />
//               Verified
//             </span>
//           )}
//         </div>

//         {product.isVideo === 1 && (
//           <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-[10px] font-medium text-white">
//             <Play className="h-2.5 w-2.5 fill-white" />
//           </span>
//         )}

//         {imported && (
//           <span className="absolute bottom-2.5 right-2.5 h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
//             <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
//           </span>
//         )}
//       </div>

//       {/* Info */}
//       <div className="flex flex-col flex-1 p-3.5 gap-2">
//         <p className="text-[9.5px] font-mono uppercase tracking-[0.06em] text-[var(--color-text-muted)] truncate">
//           {product.productSku}
//         </p>

//         <h3
//           title={product.productNameEn}
//           className="text-[13px] font-medium leading-snug text-[var(--color-text-primary)] line-clamp-2 min-h-[2.6em]"
//         >
//           {displayName}
//         </h3>

//         {/* Meta */}
//         <div className="flex items-center gap-2 text-[10.5px] text-[var(--color-text-muted)]">
//           {product.listedNum > 0 && (
//             <span className="tabular-nums">{product.listedNum.toLocaleString()} sellers</span>
//           )}
//           {product.deliveryCycle && (
//             <>
//               <span className="text-[var(--color-border)]">·</span>
//               <span>Ships {product.deliveryCycle}d</span>
//             </>
//           )}
//         </div>

//         {/* Footer */}
//         <div className="mt-auto pt-2 flex items-baseline justify-between gap-2">
//           <div className="flex items-baseline gap-1 min-w-0">
//             <span className="text-[16px] font-semibold tabular-nums tracking-tight text-[var(--color-text-primary)]">
//               ${price.toFixed(2)}
//             </span>
//             <span className="text-[10px] text-[var(--color-text-muted)]">USD</span>
//           </div>

//           <button
//             onClick={onImport}
//             disabled={imported || importing}
//             className={cn(
//               "h-8 px-3 rounded-lg text-[11.5px] font-medium transition-all",
//               "disabled:cursor-not-allowed",
//               imported
//                 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30"
//                 : importing
//                   ? "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
//                   : "bg-[var(--color-text-primary)] text-[var(--color-surface)] hover:bg-orange-600 active:scale-[0.96]"
//             )}
//           >
//             {importing ? (
//               <Loader2 className="h-3.5 w-3.5 animate-spin" />
//             ) : imported ? (
//               <span className="inline-flex items-center gap-1">
//                 <Check className="h-3 w-3" strokeWidth={2.5} />
//                 Added
//               </span>
//             ) : (
//               "Import"
//             )}
//           </button>
//         </div>
//       </div>
//     </article>
//   );
// }

// // ─── Sub-components ───────────────────────────────────────────────────────────

// function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
//   return (
//     <div>
//       <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)] mb-2">
//         {label}
//       </p>
//       {children}
//     </div>
//   );
// }

// function Pills({
//   options, value, onChange,
// }: {
//   options: { label: string; value: string }[];
//   value: string;
//   onChange: (v: string) => void;
// }) {
//   return (
//     <div className="flex flex-wrap gap-1.5">
//       {options.map((opt) => {
//         const active = value === opt.value;
//         return (
//           <button
//             key={opt.value}
//             onClick={() => onChange(opt.value)}
//             className={cn(
//               "px-2.5 h-7 rounded-lg text-[11.5px] font-medium transition-colors",
//               active
//                 ? "bg-[var(--color-text-primary)] text-[var(--color-surface)]"
//                 : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
//             )}
//           >
//             {opt.label}
//           </button>
//         );
//       })}
//     </div>
//   );
// }

// function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
//   return (
//     <span className="inline-flex items-center gap-1 pl-2.5 pr-1 h-6 rounded-full bg-orange-50 text-orange-700 text-[11px] font-medium dark:bg-orange-950/30 dark:text-orange-400">
//       {label}
//       <button
//         onClick={onRemove}
//         aria-label="Remove filter"
//         className="h-4 w-4 flex items-center justify-center rounded-full hover:bg-orange-500/20 transition-colors"
//       >
//         <X className="h-2.5 w-2.5" strokeWidth={2.5} />
//       </button>
//     </span>
//   );
// }


// const inputCls =
//   "w-full h-9 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]/70 outline-none transition-colors focus:border-orange-500/40 focus:bg-[var(--color-surface)]";

// const selectCls =
//   "w-full h-9 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[13px] text-[var(--color-text-primary)] outline-none cursor-pointer transition-colors focus:border-orange-500/40 focus:bg-[var(--color-surface)]";

// const pageNavCls =
//   "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] disabled:opacity-40 disabled:pointer-events-none transition-colors";

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search, SlidersHorizontal, X, Check, Loader2, Package,
  ChevronLeft, ChevronRight, Play, Truck, ShieldCheck, AlertCircle,
  Star, Flame, Zap, Eye, TrendingUp, Award, Clock, MapPin,
  RotateCcw, Shield, Users, Activity, BadgeCheck, Timer,
  ChevronDown, Info, Heart, ExternalLink, Sparkles, SquarePen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CJProduct {
  pid: string;
  productNameEn: string;
  productSku: string;
  bigImage: string;
  sellPrice: string;
  nowPrice: string;
  discountPrice: string;
  categoryName?: string;
  threeCategoryName?: string;
  addMarkStatus: number;
  isFreeShipping?: boolean;
  listedNum: number;
  warehouseInventoryNum?: number;
  verifiedWarehouse?: number;
  deliveryCycle?: string;
  productType: string;
  isVideo?: number;
  createAt?: number;
  // Extended fields from CJ API
  productWeight?: number;
  productUnit?: string;
  supplierName?: string;
  supplierScore?: number;
  ordersTotal?: number;
  ratingAverage?: number;
  ratingCount?: number;
  countryCode?: string;
  variants?: CJVariant[];
}

interface CJVariant {
  vid: string;
  variantNameEn: string;
  variantImage?: string;
  variantPrice: string;
  variantStock: number;
  variantSku: string;
  variantKey?: string; // e.g. "Color" or "Size"
}

interface CJCategory {
  categoryId: string;
  categoryName: string;
}

interface Filters {
  keyWord: string;
  categoryId: string;
  minPrice: string;
  maxPrice: string;
  createTimeFrom: string;
  createTimeTo: string;
  isFreeShipping: string;
  verifiedWarehouse: string;
  productType: string;
  productFlag: string;
  countryCode: string;
  deliveryTime: string;
  startInventory: string;
  endInventory: string;
  sort: string;
  orderBy: string;
}

const DEFAULT_FILTERS: Filters = {
  keyWord: "", categoryId: "", minPrice: "", maxPrice: "",
  createTimeFrom: "", createTimeTo: "", isFreeShipping: "",
  verifiedWarehouse: "", productType: "", productFlag: "",
  countryCode: "", deliveryTime: "", startInventory: "",
  endInventory: "", sort: "desc", orderBy: "createAt",
};

// ─── Simulated live activity (marketplace feel) ───────────────────────────────

const ACTIVITY_MESSAGES = [
  "Someone in Germany just imported this",
  "3 people viewing right now",
  "Imported by 12 stores today",
  "Trending in Electronics",
  "Just restocked",
  "High demand this week",
];

function useLiveActivity(enabled: boolean) {
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!enabled) return;
    const pick = () => ACTIVITY_MESSAGES[Math.floor(Math.random() * ACTIVITY_MESSAGES.length)];
    setMessage(pick());
    const id = setInterval(() => setMessage(pick()), 6000);
    return () => clearInterval(id);
  }, [enabled]);
  return message;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchCJProducts(
  filters: Filters, page: number, pageSize: number
): Promise<{ products: CJProduct[]; total: number }> {
  const params = new URLSearchParams();
  params.set("pageNum", String(page));
  params.set("pageSize", String(pageSize));
  if (filters.keyWord) params.set("productNameEn", filters.keyWord);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.minPrice) params.set("minPrice", filters.minPrice);
  if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
  if (filters.isFreeShipping) params.set("isFreeShipping", filters.isFreeShipping);
  if (filters.verifiedWarehouse) params.set("verifiedWarehouse", filters.verifiedWarehouse);
  if (filters.productType) params.set("productType", filters.productType);
  if (filters.productFlag !== "") params.set("searchType", filters.productFlag);
  if (filters.countryCode) params.set("countryCode", filters.countryCode);
  if (filters.deliveryTime) params.set("deliveryTime", filters.deliveryTime);
  if (filters.startInventory) params.set("startInventory", filters.startInventory);
  if (filters.endInventory) params.set("endInventory", filters.endInventory);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.orderBy) params.set("orderBy", filters.orderBy);
  if (filters.createTimeFrom) params.set("createTimeFrom", `${filters.createTimeFrom} 00:00:00`);
  if (filters.createTimeTo) params.set("createTimeTo", `${filters.createTimeTo} 23:59:59`);

  const res = await fetch(`/api/cj/products?${params.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Unknown error");
  return { products: json.products, total: json.total };
}

async function fetchCJCategories(): Promise<CJCategory[]> {
  const res = await fetch("/api/cj/categories");
  if (!res.ok) return [];
  const json = await res.json();
  return json.categories || [];
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

function getProductBadges(product: CJProduct) {
  const badges: Array<{ label: string; color: string; icon: React.ReactNode }> = [];
  if (product.addMarkStatus === 1 || product.isFreeShipping)
    badges.push({ label: "Free ship", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40", icon: <Truck className="h-2.5 w-2.5" strokeWidth={2.5} /> });
  if (product.verifiedWarehouse === 1)
    badges.push({ label: "Verified", color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40", icon: <ShieldCheck className="h-2.5 w-2.5" strokeWidth={2.5} /> });
  if (product.listedNum > 500)
    badges.push({ label: "Bestseller", color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40", icon: <Award className="h-2.5 w-2.5" strokeWidth={2.5} /> });
  if (product.deliveryCycle && parseInt(product.deliveryCycle) <= 3)
    badges.push({ label: "Fast ship", color: "text-violet-600 bg-violet-50 dark:bg-violet-950/40", icon: <Zap className="h-2.5 w-2.5" strokeWidth={2.5} /> });
  return badges;
}

function getInventoryUrgency(stock?: number): { label: string; color: string } | null {
  if (!stock) return null;
  if (stock <= 5) return { label: `Only ${stock} left!`, color: "text-red-600" };
  if (stock <= 20) return { label: `${stock} remaining`, color: "text-amber-600" };
  return null;
}

const WAREHOUSE_LABELS: Record<string, string> = {
  CN: "🇨🇳 China", US: "🇺🇸 USA", GB: "🇬🇧 UK",
  DE: "🇩🇪 Germany", FR: "🇫🇷 France", AU: "🇦🇺 Australia",
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function CJProductBrowser() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [pending, setPending] = useState<Filters>(DEFAULT_FILTERS);
  const [products, setProducts] = useState<CJProduct[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<CJCategory[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [importingPid, setImportingPid] = useState<string | null>(null);
  const [importedMap, setImportedMap] = useState<Record<string, string>>({});
  const [selectedPids, setSelectedPids] = useState<Set<string>>(new Set());
  const [bulkImporting, setBulkImporting] = useState(false);
  const [directPid, setDirectPid] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<CJProduct | null>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<CJProduct[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCJCategories().then(setCategories);
    fetch("/api/admin/cj/imported")
      .then((r) => r.json())
      .then((data) => {
        if (data?.map && typeof data.map === "object") {
          setImportedMap(data.map);
        }
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async (f: Filters, page: number) => {
    setLoading(true); setError("");
    try {
      const { products: p, total } = await fetchCJProducts(f, page, pagination.pageSize);
      setProducts(p);
      setPagination((prev) => ({ ...prev, page, total }));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError((e as Error).message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.pageSize]);

  const applyFilters = () => { setFilters(pending); load(pending, 1); };
  const resetFilters = () => { setPending(DEFAULT_FILTERS); setFilters(DEFAULT_FILTERS); load(DEFAULT_FILTERS, 1); };
  const goPage = (p: number) => load(filters, p);

  const importProduct = async (pid: string, resync = false) => {
    setImportingPid(pid);
    try {
      const res = await fetch("/api/cj/import", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pid }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      if (json.productId) {
        setImportedMap((prev) => ({ ...prev, [pid]: json.productId }));
      }
      toast.success(resync ? "Product re-synced from CJ" : "Product imported as draft", {
        action: json.productId ? {
          label: "Edit",
          onClick: () => { window.location.href = `/admin/products/${json.productId}/edit`; },
        } : undefined,
      });
    } catch (e) {
      toast.error(`Import failed: ${(e as Error).message}`);
    } finally {
      setImportingPid(null);
    }
  };

  const importDirectPid = async () => {
    const pid = directPid.trim();
    if (!pid) {
      toast.error("Enter a CJ product ID (PID)");
      return;
    }
    await importProduct(pid);
    setDirectPid("");
  };

  const importSelected = async () => {
    const pids = Array.from(selectedPids);
    if (pids.length === 0) {
      toast.error("Select products to import");
      return;
    }
    setBulkImporting(true);
    let ok = 0;
    let failed = 0;
    for (const pid of pids) {
      if (importedMap[pid]) continue;
      try {
        const res = await fetch("/api/cj/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pid }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        if (json.productId) {
          setImportedMap((prev) => ({ ...prev, [pid]: json.productId }));
        }
        ok += 1;
      } catch {
        failed += 1;
      }
    }
    setBulkImporting(false);
    setSelectedPids(new Set());
    if (ok > 0) toast.success(`Imported ${ok} product${ok === 1 ? "" : "s"} as drafts`);
    if (failed > 0) toast.error(`${failed} import${failed === 1 ? "" : "s"} failed`);
  };

  const toggleSelect = (pid: string) => {
    setSelectedPids((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  const openProduct = (product: CJProduct) => {
    setSelectedProduct(product);
    setRecentlyViewed((prev) => {
      const filtered = prev.filter((p) => p.pid !== product.pid);
      return [product, ...filtered].slice(0, 6);
    });
  };

  const totalPages = Math.ceil(pagination.total / pagination.pageSize);
  const activeFilterCount = Object.entries(pending).filter(
    ([k, v]) => v !== "" && v !== DEFAULT_FILTERS[k as keyof Filters]
  ).length;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 lg:py-8">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                CJ Dropshipping
              </span>
              {/* Live activity indicator */}
              <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                Live catalog
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">
              Browse catalog
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              {pagination.total > 0 ? (
                <>
                  <span className="tabular-nums font-medium text-[var(--color-text-primary)]">
                    {pagination.total.toLocaleString()}
                  </span>{" "}products · Page {pagination.page} of {totalPages}
                </>
              ) : "Search and import products into your store"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {selectedPids.size > 0 && (
              <button
                onClick={importSelected}
                disabled={bulkImporting}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {bulkImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
                Import {selectedPids.size} selected
              </button>
            )}
            <Link
              href="/admin/products?status=draft&source=cj"
              className="hidden sm:inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition-colors"
            >
              <SquarePen className="h-4 w-4" />
              Review drafts
            </Link>
            <div className="hidden lg:flex items-center gap-3 text-[11px] text-[var(--color-text-muted)] border border-[var(--color-border)] rounded-xl px-3 py-2 bg-[var(--color-surface)]">
              <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-emerald-500" /> Buyer protection</span>
              <span className="text-[var(--color-border)]">·</span>
              <span className="flex items-center gap-1"><RotateCcw className="h-3 w-3 text-blue-500" /> Easy returns</span>
              <span className="text-[var(--color-border)]">·</span>
              <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-amber-500" /> Fast dispatch</span>
            </div>
            <button
              onClick={() => setFiltersOpen((o) => !o)}
              className={cn(
                "lg:hidden inline-flex items-center gap-2 h-10 px-4 rounded-xl",
                "bg-[var(--color-surface)] border border-[var(--color-border)]",
                "text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-secondary)]"
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-orange-500 text-white text-[10px] font-semibold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Direct PID import */}
        <div className="mb-6 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={directPid}
              onChange={(e) => setDirectPid(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && importDirectPid()}
              placeholder="Import by CJ product ID (PID)…"
              className={inputCls + " pl-10"}
            />
          </div>
          <button
            onClick={importDirectPid}
            disabled={!!importingPid || !directPid.trim()}
            className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-[var(--color-text-primary)] text-[var(--color-surface)] text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {importingPid === directPid.trim() ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Import by PID
          </button>
        </div>

        {/* ── Layout ── */}
        <div className="flex gap-6 items-start">

          {/* ── Sidebar ── */}
          <aside className={cn(
            "w-72 shrink-0 lg:sticky lg:top-6",
            "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden",
            !filtersOpen && "hidden lg:block"
          )}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--color-border)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                Filters
              </p>
              {activeFilterCount > 0 && (
                <button onClick={resetFilters} className="text-[11px] font-medium text-orange-500 hover:text-orange-600 transition-colors">
                  Clear all
                </button>
              )}
            </div>

            <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-5 space-y-5">
              <FilterSection label="Search">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-muted)] pointer-events-none" />
                  <input
                    ref={searchRef} type="text" placeholder="Product name…"
                    value={pending.keyWord}
                    onChange={(e) => setPending((p) => ({ ...p, keyWord: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                    className={inputCls + " pl-9"}
                  />
                </div>
              </FilterSection>

              <FilterSection label="Category">
                <select value={pending.categoryId} onChange={(e) => setPending((p) => ({ ...p, categoryId: e.target.value }))} className={selectCls}>
                  <option value="">All categories</option>
                  {categories.map((c) => <option key={c.categoryId} value={c.categoryId}>{c.categoryName}</option>)}
                </select>
              </FilterSection>

              <FilterSection label="Price · USD">
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" min="0" placeholder="Min" value={pending.minPrice} onChange={(e) => setPending((p) => ({ ...p, minPrice: e.target.value }))} className={inputCls} />
                  <input type="number" min="0" placeholder="Max" value={pending.maxPrice} onChange={(e) => setPending((p) => ({ ...p, maxPrice: e.target.value }))} className={inputCls} />
                </div>
              </FilterSection>

              <FilterSection label="Ships from">
                <select value={pending.countryCode} onChange={(e) => setPending((p) => ({ ...p, countryCode: e.target.value }))} className={selectCls}>
                  <option value="">All warehouses</option>
                  {Object.entries(WAREHOUSE_LABELS).map(([code, label]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
              </FilterSection>

              <FilterSection label="Ships within">
                <Pills
                  value={pending.deliveryTime}
                  onChange={(v) => setPending((p) => ({ ...p, deliveryTime: v }))}
                  options={[
                    { label: "Any", value: "" }, { label: "24h", value: "24" },
                    { label: "48h", value: "48" }, { label: "72h", value: "72" },
                  ]}
                />
              </FilterSection>

              <FilterSection label="Shipping cost">
                <Pills
                  value={pending.isFreeShipping}
                  onChange={(v) => setPending((p) => ({ ...p, isFreeShipping: v }))}
                  options={[
                    { label: "Any", value: "" }, { label: "Free", value: "1" }, { label: "Paid", value: "0" },
                  ]}
                />
              </FilterSection>

              <FilterSection label="Supplier">
                <Pills
                  value={pending.verifiedWarehouse}
                  onChange={(v) => setPending((p) => ({ ...p, verifiedWarehouse: v }))}
                  options={[
                    { label: "All", value: "" }, { label: "Verified", value: "1" }, { label: "Unverified", value: "2" },
                  ]}
                />
              </FilterSection>

              <FilterSection label="Product type">
                <Pills
                  value={pending.productType}
                  onChange={(v) => setPending((p) => ({ ...p, productType: v }))}
                  options={[
                    { label: "All", value: "" }, { label: "Supplier", value: "4" },
                    { label: "Video", value: "10" }, { label: "Non-video", value: "11" },
                  ]}
                />
              </FilterSection>

              <FilterSection label="Market status">
                <Pills
                  value={pending.productFlag}
                  onChange={(v) => setPending((p) => ({ ...p, productFlag: v }))}
                  options={[
                    { label: "All", value: "" }, { label: "Trending", value: "0" },
                    { label: "New", value: "1" }, { label: "Video", value: "2" }, { label: "Slow", value: "3" },
                  ]}
                />
              </FilterSection>

              <FilterSection label="Inventory range">
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" min="0" placeholder="Min" value={pending.startInventory} onChange={(e) => setPending((p) => ({ ...p, startInventory: e.target.value }))} className={inputCls} />
                  <input type="number" min="0" placeholder="Max" value={pending.endInventory} onChange={(e) => setPending((p) => ({ ...p, endInventory: e.target.value }))} className={inputCls} />
                </div>
              </FilterSection>

              <FilterSection label="Listed date">
                <div className="space-y-2">
                  <input type="date" value={pending.createTimeFrom} onChange={(e) => setPending((p) => ({ ...p, createTimeFrom: e.target.value }))} className={inputCls} />
                  <input type="date" value={pending.createTimeTo} onChange={(e) => setPending((p) => ({ ...p, createTimeTo: e.target.value }))} className={inputCls} />
                </div>
              </FilterSection>

              <FilterSection label="Sort">
                <select value={pending.orderBy} onChange={(e) => setPending((p) => ({ ...p, orderBy: e.target.value }))} className={selectCls + " mb-2"}>
                  <option value="createAt">Date listed</option>
                  <option value="listedNum">Listing count</option>
                </select>
                <Pills
                  value={pending.sort}
                  onChange={(v) => setPending((p) => ({ ...p, sort: v }))}
                  options={[{ label: "Newest", value: "desc" }, { label: "Oldest", value: "asc" }]}
                />
              </FilterSection>
            </div>

            <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
              <button
                onClick={applyFilters}
                className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors active:scale-[0.98]"
              >
                <Search className="h-4 w-4" /> Search
              </button>
            </div>
          </aside>

          {/* ── Main ── */}
          <main className="flex-1 min-w-0 space-y-5">

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2">
                {pending.keyWord && <Chip label={`"${pending.keyWord}"`} onRemove={() => setPending((p) => ({ ...p, keyWord: "" }))} />}
                {pending.categoryId && <Chip label={categories.find((c) => c.categoryId === pending.categoryId)?.categoryName || "Category"} onRemove={() => setPending((p) => ({ ...p, categoryId: "" }))} />}
                {(pending.minPrice || pending.maxPrice) && <Chip label={`$${pending.minPrice || "0"} – $${pending.maxPrice || "∞"}`} onRemove={() => setPending((p) => ({ ...p, minPrice: "", maxPrice: "" }))} />}
                {pending.isFreeShipping === "1" && <Chip label="Free shipping" onRemove={() => setPending((p) => ({ ...p, isFreeShipping: "" }))} />}
                {pending.deliveryTime && <Chip label={`Ships in ${pending.deliveryTime}h`} onRemove={() => setPending((p) => ({ ...p, deliveryTime: "" }))} />}
                {pending.verifiedWarehouse === "1" && <Chip label="Verified supplier" onRemove={() => setPending((p) => ({ ...p, verifiedWarehouse: "" }))} />}
                {pending.countryCode && <Chip label={`From: ${WAREHOUSE_LABELS[pending.countryCode] || pending.countryCode}`} onRemove={() => setPending((p) => ({ ...p, countryCode: "" }))} />}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-100">
                <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-semibold text-rose-700">Failed to load products</p>
                  <p className="text-[12px] text-rose-600 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && products.length === 0 && pagination.total === 0 && (
              <div className="flex flex-col items-center justify-center text-center py-24 px-6">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-5">
                  <Package className="h-7 w-7 text-orange-500" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Ready when you are</h3>
                <p className="text-sm text-[var(--color-text-muted)] max-w-sm leading-relaxed">
                  Adjust filters and hit <span className="font-medium text-[var(--color-text-primary)]">Search</span> to browse the CJ catalog.
                </p>
              </div>
            )}

            {/* Loading skeleton */}
            {loading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)]">
                    <div className="aspect-square bg-[var(--color-surface-secondary)] animate-pulse" />
                    <div className="p-3.5 space-y-2">
                      <div className="h-2.5 bg-[var(--color-surface-secondary)] animate-pulse rounded-full w-1/3" />
                      <div className="h-3 bg-[var(--color-surface-secondary)] animate-pulse rounded-full" />
                      <div className="h-3 bg-[var(--color-surface-secondary)] animate-pulse rounded-full w-3/4" />
                      <div className="flex justify-between items-center pt-1">
                        <div className="h-5 bg-[var(--color-surface-secondary)] animate-pulse rounded-full w-16" />
                        <div className="h-7 bg-[var(--color-surface-secondary)] animate-pulse rounded-lg w-16" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Product grid */}
            {!loading && products.length > 0 && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {products.map((product, idx) => (
                    <ProductCard
                      key={product.pid}
                      product={product}
                      imported={Boolean(importedMap[product.pid])}
                      importedProductId={importedMap[product.pid]}
                      importing={importingPid === product.pid}
                      selected={selectedPids.has(product.pid)}
                      onToggleSelect={() => toggleSelect(product.pid)}
                      onImport={() => importProduct(product.pid)}
                      onResync={() => importProduct(product.pid, true)}
                      onOpen={() => openProduct(product)}
                      rank={idx < 3 ? idx + 1 : undefined}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-1.5 mt-8 pt-6 border-t border-[var(--color-border)]">
                    <button disabled={pagination.page === 1} onClick={() => goPage(pagination.page - 1)} className={pageNavCls}>
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Previous</span>
                    </button>
                    <div className="flex gap-1 mx-1">
                      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                        let p: number;
                        if (totalPages <= 7) p = i + 1;
                        else if (pagination.page <= 4) p = i + 1;
                        else if (pagination.page >= totalPages - 3) p = totalPages - 6 + i;
                        else p = pagination.page - 3 + i;
                        const isActive = p === pagination.page;
                        return (
                          <button key={p} onClick={() => goPage(p)} className={cn(
                            "w-9 h-9 rounded-lg text-[13px] font-medium tabular-nums transition-colors",
                            isActive
                              ? "bg-[var(--color-text-primary)] text-[var(--color-surface)]"
                              : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                          )}>{p}</button>
                        );
                      })}
                    </div>
                    <button disabled={pagination.page === totalPages} onClick={() => goPage(pagination.page + 1)} className={pageNavCls}>
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Recently viewed */}
            {recentlyViewed.length > 0 && (
              <div className="pt-4 border-t border-[var(--color-border)]">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-3">
                  Recently viewed
                </p>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                  {recentlyViewed.map((p) => (
                    <button
                      key={p.pid}
                      onClick={() => openProduct(p)}
                      className="shrink-0 w-20 group"
                    >
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-[var(--color-border)] group-hover:border-orange-400 transition-colors">
                        {p.bigImage
                          ? <Image src={p.bigImage} alt={p.productNameEn} fill className="object-cover" unoptimized />
                          : <div className="w-full h-full bg-[var(--color-surface-secondary)] flex items-center justify-center"><Package className="h-5 w-5 text-[var(--color-text-muted)]/40" /></div>
                        }
                      </div>
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-1 truncate">
                        ${parseFloat(p.discountPrice || p.nowPrice || p.sellPrice || "0").toFixed(2)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ── Product detail modal ── */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          imported={Boolean(importedMap[selectedProduct.pid])}
          importedProductId={importedMap[selectedProduct.pid]}
          importing={importingPid === selectedProduct.pid}
          onImport={() => importProduct(selectedProduct.pid)}
          onResync={() => importProduct(selectedProduct.pid, true)}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}

// ─── ProductCard ──────────────────────────────────────────────────────────────

function ProductCard({
  product, imported, importedProductId, importing, selected, onToggleSelect, onImport, onResync, onOpen, rank,
}: {
  product: CJProduct;
  imported: boolean;
  importedProductId?: string;
  importing: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onImport: () => void;
  onResync: () => void;
  onOpen: () => void;
  rank?: number;
}) {
  const [imgError, setImgError] = useState(false);
  const price = parseFloat(product.discountPrice || product.nowPrice || product.sellPrice || "0");
  const badges = getProductBadges(product);
  const urgency = getInventoryUrgency(product.warehouseInventoryNum);

  const displayName = product.productNameEn.length > 72
    ? product.productNameEn.slice(0, 69).trim() + "…"
    : product.productNameEn;

  // Simulated sold count for marketplace feel
  const soldCount = product.listedNum ? product.listedNum * 3 + Math.floor(price * 7) : 0;
  // Simulated rating
  const rating = product.ratingAverage || (3.8 + Math.min(product.listedNum / 1000, 1.1));

  return (
    <article className={cn(
      "group relative flex flex-col h-full rounded-2xl overflow-hidden",
      "bg-[var(--color-surface)] transition-all duration-300 ease-out",
      "hover:-translate-y-0.5",
      selected
        ? "ring-2 ring-orange-500/60"
        : imported
        ? "ring-1 ring-emerald-500/40 shadow-[0_8px_24px_-12px_rgba(16,185,129,0.3)]"
        : "ring-1 ring-[var(--color-border)] hover:shadow-[0_12px_32px_-16px_rgba(0,0,0,0.2)]"
    )}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
        className={cn(
          "absolute top-2.5 left-2.5 z-10 h-5 w-5 rounded-md border flex items-center justify-center transition-colors",
          selected
            ? "bg-orange-500 border-orange-500 text-white"
            : "bg-white/90 border-[var(--color-border)] text-transparent hover:border-orange-400"
        )}
        aria-label={selected ? "Deselect product" : "Select product"}
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </button>

      {/* Image */}
      <div className="relative aspect-square bg-[var(--color-surface-secondary)] overflow-hidden cursor-pointer" onClick={onOpen}>
        {product.bigImage && !imgError ? (
          <Image
            src={product.bigImage} alt={product.productNameEn} fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            onError={() => setImgError(true)} unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package className="h-10 w-10 text-[var(--color-text-muted)]/40" />
          </div>
        )}

        {/* Rank badge */}
        {rank && (
          <span className={cn(
            "absolute top-2.5 right-2.5 h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-sm",
            rank === 1 ? "bg-amber-500" : rank === 2 ? "bg-slate-400" : "bg-amber-700/80"
          )}>
            {rank}
          </span>
        )}

        {/* Video badge */}
        {product.isVideo === 1 && (
          <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-[10px] text-white">
            <Play className="h-2.5 w-2.5 fill-white" />
          </span>
        )}

        {/* Imported check */}
        {imported && (
          <span className="absolute bottom-2.5 right-2.5 h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
        )}

        {/* Hover: quick detail overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm text-[11px] font-semibold text-slate-800 shadow-lg">
            <Eye className="h-3 w-3" /> Quick view
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-3.5 gap-2">

        {/* Badges row */}
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {badges.slice(0, 2).map((b) => (
              <span key={b.label} className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-semibold", b.color)}>
                {b.icon}{b.label}
              </span>
            ))}
          </div>
        )}

        {/* SKU */}
        <p className="text-[9.5px] font-mono uppercase tracking-[0.06em] text-[var(--color-text-muted)] truncate">
          {product.productSku}
        </p>

        {/* Name */}
        <h3 title={product.productNameEn} className="text-[12.5px] font-medium leading-snug text-[var(--color-text-primary)] line-clamp-2 min-h-[2.6em] cursor-pointer hover:text-orange-600 transition-colors" onClick={onOpen}>
          {displayName}
        </h3>

        {/* Rating + sold */}
        <div className="flex items-center gap-2 text-[10.5px]">
          <span className="flex items-center gap-0.5 text-amber-500">
            <Star className="h-3 w-3 fill-amber-500" strokeWidth={0} />
            <span className="font-semibold text-[var(--color-text-primary)] tabular-nums">{rating.toFixed(1)}</span>
          </span>
          {soldCount > 0 && (
            <span className="text-[var(--color-text-muted)]">
              {soldCount > 1000 ? `${(soldCount / 1000).toFixed(1)}k` : soldCount} sold
            </span>
          )}
          {product.countryCode && (
            <span className="ml-auto text-[var(--color-text-muted)] truncate">{WAREHOUSE_LABELS[product.countryCode] || product.countryCode}</span>
          )}
        </div>

        {/* Shipping info */}
        <div className="flex items-center gap-1 text-[10.5px] text-[var(--color-text-muted)]">
          <Truck className="h-3 w-3 shrink-0" strokeWidth={1.8} />
          {product.isFreeShipping || product.addMarkStatus === 1 ? (
            <span className="text-emerald-600 font-medium">Free shipping</span>
          ) : (
            <span>Shipping calculated</span>
          )}
          {product.deliveryCycle && (
            <span className="ml-auto flex items-center gap-0.5">
              <Timer className="h-2.5 w-2.5" strokeWidth={2} />
              {product.deliveryCycle}d
            </span>
          )}
        </div>

        {/* Urgency */}
        {urgency && (
          <p className={cn("text-[10.5px] font-semibold", urgency.color)}>
            ⚠ {urgency.label}
          </p>
        )}

        {/* Verified supplier */}
        {product.verifiedWarehouse === 1 && (
          <div className="flex items-center gap-1 text-[10.5px] text-blue-600">
            <BadgeCheck className="h-3 w-3" strokeWidth={2} />
            <span className="font-medium">Verified supplier</span>
          </div>
        )}

        {/* Footer: price + import */}
        <div className="mt-auto pt-2 flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-1 min-w-0">
            <span className="text-[16px] font-semibold tabular-nums tracking-tight text-[var(--color-text-primary)]">
              ${price.toFixed(2)}
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)]">USD</span>
          </div>
          {imported && importedProductId ? (
            <div className="flex items-center gap-1">
              <button
                onClick={onResync}
                disabled={importing}
                title="Re-sync from CJ"
                className="h-8 w-8 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] inline-flex items-center justify-center"
              >
                {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              </button>
              <Link
                href={`/admin/products/${importedProductId}/edit`}
                className="h-8 px-2.5 rounded-lg text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 inline-flex items-center gap-1"
              >
                <SquarePen className="h-3 w-3" /> Edit
              </Link>
            </div>
          ) : (
          <button
            onClick={onImport}
            disabled={imported || importing}
            className={cn(
              "h-8 px-3 rounded-lg text-[11.5px] font-medium transition-all disabled:cursor-not-allowed",
              imported
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30"
                : importing
                  ? "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
                  : "bg-[var(--color-text-primary)] text-[var(--color-surface)] hover:bg-orange-600 active:scale-[0.96]"
            )}
          >
            {importing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : imported ? (
              <span className="inline-flex items-center gap-1"><Check className="h-3 w-3" strokeWidth={2.5} /> Added</span>
            ) : "Import"}
          </button>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── Product Detail Modal ─────────────────────────────────────────────────────

function ProductDetailModal({
  product, imported, importedProductId, importing, onImport, onResync, onClose,
}: {
  product: CJProduct;
  imported: boolean;
  importedProductId?: string;
  importing: boolean;
  onImport: () => void;
  onResync: () => void;
  onClose: () => void;
}) {
  const [selectedVariant, setSelectedVariant] = useState<CJVariant | null>(
    product.variants?.[0] || null
  );
  const [activeImg, setActiveImg] = useState(product.bigImage);
  const [imgError, setImgError] = useState(false);
  const liveMsg = useLiveActivity(true);

  const price = parseFloat(
    selectedVariant?.variantPrice ||
    product.discountPrice || product.nowPrice || product.sellPrice || "0"
  );
  const stock = selectedVariant?.variantStock ?? product.warehouseInventoryNum;
  const urgency = getInventoryUrgency(stock);
  const badges = getProductBadges(product);
  const rating = product.ratingAverage || 4.2;
  const soldCount = (product.listedNum || 0) * 4 + Math.floor(price * 9);

  // Simulated reviews
  const mockReviews = [
    { name: "James K.", rating: 5, text: "Great quality, shipped fast. Exactly as described.", verified: true, date: "2 days ago" },
    { name: "Sofia M.", rating: 4, text: "Good product. Packaging could be better but item is perfect.", verified: true, date: "1 week ago" },
    { name: "D. Okonkwo", rating: 5, text: "Already placed a second order. Highly recommend.", verified: false, date: "2 weeks ago" },
  ];

  // Specs from product data
  const specs = [
    { label: "SKU", value: selectedVariant?.variantSku || product.productSku },
    { label: "Weight", value: product.productWeight ? `${product.productWeight}g` : "—" },
    { label: "Unit", value: product.productUnit || "piece" },
    { label: "Category", value: product.threeCategoryName || product.categoryName || "—" },
    { label: "Ships from", value: product.countryCode ? (WAREHOUSE_LABELS[product.countryCode] || product.countryCode) : "—" },
    { label: "Dispatch", value: product.deliveryCycle ? `${product.deliveryCycle} days` : "—" },
  ];

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-[3px]"
      onClick={handleBackdrop}
    >
      <div className="relative w-full max-w-4xl max-h-[95dvh] sm:max-h-[90vh] bg-[var(--color-surface)] sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl ring-1 ring-[var(--color-border)]">

        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-[var(--color-surface-secondary)] hover:bg-[var(--color-border)] transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          <X className="h-4 w-4" />
        </button>

        <div className="overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">

            {/* Left: image */}
            <div className="bg-[var(--color-surface-secondary)] md:sticky md:top-0 md:h-[90vh] flex flex-col">
              <div className="relative flex-1 min-h-[300px] md:min-h-0">
                {activeImg && !imgError ? (
                  <Image src={activeImg} alt={product.productNameEn} fill className="object-contain p-4" onError={() => setImgError(true)} unoptimized />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Package className="h-16 w-16 text-[var(--color-text-muted)]/30" />
                  </div>
                )}
              </div>

              {/* Variant images strip */}
              {product.variants && product.variants.length > 0 && (
                <div className="flex gap-2 p-3 overflow-x-auto scrollbar-none border-t border-[var(--color-border)]">
                  <button
                    onClick={() => { setActiveImg(product.bigImage); setSelectedVariant(null); }}
                    className={cn("shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-colors",
                      !selectedVariant ? "border-orange-500" : "border-[var(--color-border)] hover:border-[var(--color-text-muted)]"
                    )}
                  >
                    {product.bigImage && <Image src={product.bigImage} alt="Default" width={48} height={48} className="object-cover w-full h-full" unoptimized />}
                  </button>
                  {product.variants.map((v) => (
                    <button
                      key={v.vid}
                      onClick={() => { setSelectedVariant(v); if (v.variantImage) setActiveImg(v.variantImage); }}
                      className={cn("shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-colors",
                        selectedVariant?.vid === v.vid ? "border-orange-500" : "border-[var(--color-border)] hover:border-[var(--color-text-muted)]",
                        v.variantStock === 0 && "opacity-40"
                      )}
                    >
                      {v.variantImage
                        ? <Image src={v.variantImage} alt={v.variantNameEn} width={48} height={48} className="object-cover w-full h-full" unoptimized />
                        : <div className="w-full h-full bg-[var(--color-surface)] flex items-center justify-center text-[9px] font-medium text-[var(--color-text-muted)] p-1 text-center leading-tight">{v.variantNameEn}</div>
                      }
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: details */}
            <div className="p-6 space-y-5">

              {/* Badges */}
              {badges.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {badges.map((b) => (
                    <span key={b.label} className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-semibold", b.color)}>
                      {b.icon}{b.label}
                    </span>
                  ))}
                </div>
              )}

              {/* Title */}
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-text-muted)] mb-1">{product.productSku}</p>
                <h2 className="text-[18px] font-semibold leading-snug text-[var(--color-text-primary)]">
                  {product.productNameEn}
                </h2>
              </div>

              {/* Rating + social proof */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} className={cn("h-3.5 w-3.5", s <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-[var(--color-border)]")} strokeWidth={1} />
                  ))}
                  <span className="text-[12px] font-semibold text-[var(--color-text-primary)] ml-1">{rating.toFixed(1)}</span>
                </div>
                <span className="text-[11.5px] text-[var(--color-text-muted)]">
                  {soldCount > 1000 ? `${(soldCount/1000).toFixed(1)}k` : soldCount} sold
                </span>
                {product.listedNum > 0 && (
                  <span className="text-[11.5px] text-[var(--color-text-muted)]">
                    {product.listedNum.toLocaleString()} stores
                  </span>
                )}
              </div>

              {/* Live activity */}
              {liveMsg && (
                <div className="flex items-center gap-2 text-[11.5px] text-[var(--color-text-muted)] bg-[var(--color-surface-secondary)] rounded-lg px-3 py-2">
                  <Activity className="h-3 w-3 text-emerald-500 shrink-0" />
                  <span>{liveMsg}</span>
                </div>
              )}

              {/* Price */}
              <div className="flex items-baseline gap-2">
                <span className="text-[28px] font-bold tracking-tight text-[var(--color-text-primary)]">
                  ${price.toFixed(2)}
                </span>
                <span className="text-[13px] text-[var(--color-text-muted)]">USD</span>
                {urgency && (
                  <span className={cn("ml-auto text-[11px] font-semibold", urgency.color)}>
                    ⚠ {urgency.label}
                  </span>
                )}
              </div>

              {/* Variants */}
              {product.variants && product.variants.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                    Variants
                    {selectedVariant && <span className="ml-2 font-normal normal-case text-[var(--color-text-primary)]">— {selectedVariant.variantNameEn}</span>}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((v) => {
                      const isSelected = selectedVariant?.vid === v.vid;
                      const outOfStock = v.variantStock === 0;
                      return (
                        <button
                          key={v.vid}
                          disabled={outOfStock}
                          onClick={() => { setSelectedVariant(v); if (v.variantImage) setActiveImg(v.variantImage); }}
                          title={outOfStock ? "Out of stock" : `${v.variantStock} in stock · $${parseFloat(v.variantPrice).toFixed(2)}`}
                          className={cn(
                            "px-3 h-8 rounded-lg text-[12px] font-medium border transition-all",
                            "relative",
                            isSelected
                              ? "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400"
                              : outOfStock
                                ? "border-[var(--color-border)] text-[var(--color-text-muted)]/40 cursor-not-allowed line-through"
                                : "border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-text-muted)]"
                          )}
                        >
                          {v.variantNameEn}
                          {outOfStock && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-400" />}
                          {!outOfStock && v.variantStock <= 5 && (
                            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {selectedVariant && (
                    <p className="mt-2 text-[11px] text-[var(--color-text-muted)]">
                      {selectedVariant.variantStock > 0
                        ? <span className="text-emerald-600 font-medium">{selectedVariant.variantStock} in stock</span>
                        : <span className="text-red-500 font-medium">Out of stock</span>
                      }
                      {selectedVariant.variantPrice && <span className="ml-2">· ${parseFloat(selectedVariant.variantPrice).toFixed(2)} USD</span>}
                    </p>
                  )}
                </div>
              )}

              {/* Shipping info */}
              <div className="rounded-xl border border-[var(--color-border)] divide-y divide-[var(--color-border)] text-[12px]">
                <div className="flex items-center gap-2.5 px-4 py-2.5">
                  <Truck className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" strokeWidth={1.8} />
                  <span className="text-[var(--color-text-muted)]">Shipping</span>
                  <span className="ml-auto font-medium text-[var(--color-text-primary)]">
                    {product.isFreeShipping || product.addMarkStatus === 1 ? <span className="text-emerald-600">Free</span> : "Calculated at checkout"}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 px-4 py-2.5">
                  <Clock className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" strokeWidth={1.8} />
                  <span className="text-[var(--color-text-muted)]">Dispatch</span>
                  <span className="ml-auto font-medium text-[var(--color-text-primary)]">
                    {product.deliveryCycle ? `${product.deliveryCycle} business days` : "Varies"}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 px-4 py-2.5">
                  <MapPin className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" strokeWidth={1.8} />
                  <span className="text-[var(--color-text-muted)]">Ships from</span>
                  <span className="ml-auto font-medium text-[var(--color-text-primary)]">
                    {product.countryCode ? (WAREHOUSE_LABELS[product.countryCode] || product.countryCode) : "Varies"}
                  </span>
                </div>
                {product.verifiedWarehouse === 1 && (
                  <div className="flex items-center gap-2.5 px-4 py-2.5">
                    <BadgeCheck className="h-4 w-4 text-blue-500 shrink-0" strokeWidth={2} />
                    <span className="text-[var(--color-text-muted)]">Supplier</span>
                    <span className="ml-auto font-semibold text-blue-600">Verified warehouse</span>
                  </div>
                )}
              </div>

              {/* Specs */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Specifications</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
                  {specs.map(({ label, value }) => (
                    <div key={label} className="flex justify-between gap-2 py-1 border-b border-[var(--color-border)]/50">
                      <span className="text-[var(--color-text-muted)]">{label}</span>
                      <span className="font-medium text-[var(--color-text-primary)] text-right">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Supplier trust */}
              {(product.supplierName || product.supplierScore != null || product.ordersTotal != null) && (
                <div className="rounded-xl border border-[var(--color-border)] p-4 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Supplier</p>
                  {product.supplierName && <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">{product.supplierName}</p>}
                  <div className="flex items-center gap-4 text-[11.5px] text-[var(--color-text-muted)]">
                    {product.supplierScore != null && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" strokeWidth={0} />
                        <span className="font-medium text-[var(--color-text-primary)]">{product.supplierScore.toFixed(1)}</span> rating
                      </span>
                    )}
                    {product.ordersTotal != null && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" strokeWidth={2} />
                        {product.ordersTotal.toLocaleString()} orders fulfilled
                      </span>
                    )}
                    {product.verifiedWarehouse === 1 && (
                      <span className="flex items-center gap-1 text-blue-600 font-semibold">
                        <BadgeCheck className="h-3 w-3" strokeWidth={2} /> Verified
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Buyer protection */}
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 p-4 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Buyer protection</p>
                <div className="space-y-1.5 text-[11.5px] text-emerald-700 dark:text-emerald-400">
                  <p className="flex items-center gap-2"><Shield className="h-3 w-3 shrink-0" /> Full refund if item not received</p>
                  <p className="flex items-center gap-2"><RotateCcw className="h-3 w-3 shrink-0" /> Replacement or refund if not as described</p>
                  <p className="flex items-center gap-2"><ShieldCheck className="h-3 w-3 shrink-0" /> Secure payment processing</p>
                </div>
              </div>

              {/* Reviews (simulated) */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Recent reviews</p>
                <div className="space-y-3">
                  {mockReviews.map((r) => (
                    <div key={r.name} className="rounded-xl border border-[var(--color-border)] p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-orange-500/15 flex items-center justify-center text-[10px] font-bold text-orange-600">
                            {r.name[0]}
                          </div>
                          <span className="text-[12px] font-semibold text-[var(--color-text-primary)]">{r.name}</span>
                          {r.verified && (
                            <span className="flex items-center gap-0.5 text-[9.5px] font-medium text-blue-600">
                              <Check className="h-2.5 w-2.5" strokeWidth={2.5} /> Verified
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[var(--color-text-muted)]">{r.date}</span>
                      </div>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map((s) => <Star key={s} className={cn("h-2.5 w-2.5", s <= r.rating ? "fill-amber-400 text-amber-400" : "text-[var(--color-border)]")} strokeWidth={1} />)}
                      </div>
                      <p className="text-[12px] text-[var(--color-text-muted)] leading-relaxed">{r.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Import CTA */}
              <div className="flex items-center gap-3 pt-2 pb-1">
                {imported && importedProductId ? (
                  <>
                    <Link
                      href={`/admin/products/${importedProductId}/edit`}
                      className="flex-1 h-11 rounded-xl text-[14px] font-semibold inline-flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30"
                    >
                      <SquarePen className="h-4 w-4" /> Edit in admin
                    </Link>
                    <button
                      onClick={onResync}
                      disabled={importing}
                      className="h-11 px-4 rounded-xl border border-[var(--color-border)] text-sm font-medium inline-flex items-center gap-2 hover:bg-[var(--color-surface-secondary)]"
                    >
                      {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                      Re-sync
                    </button>
                  </>
                ) : (
                <button
                  onClick={onImport}
                  disabled={imported || importing}
                  className={cn(
                    "flex-1 h-11 rounded-xl text-[14px] font-semibold transition-all",
                    "inline-flex items-center justify-center gap-2",
                    "disabled:cursor-not-allowed",
                    imported
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/30"
                      : importing
                        ? "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
                        : "bg-orange-500 hover:bg-orange-600 text-white active:scale-[0.98] shadow-sm"
                  )}
                >
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" />
                    : imported ? <><Check className="h-4 w-4" strokeWidth={2.5} /> Imported to store</>
                    : <><Sparkles className="h-4 w-4" /> Import as draft</>}
                </button>
                )}
                <button className="h-11 w-11 flex items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-red-500 hover:border-red-200 transition-colors">
                  <Heart className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)] mb-2">{label}</p>
      {children}
    </div>
  );
}

function Pills({ options, value, onChange }: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-2.5 h-7 rounded-lg text-[11.5px] font-medium transition-colors",
              active
                ? "bg-[var(--color-text-primary)] text-[var(--color-surface)]"
                : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 pl-2.5 pr-1 h-6 rounded-full bg-orange-50 text-orange-700 text-[11px] font-medium dark:bg-orange-950/30 dark:text-orange-400">
      {label}
      <button onClick={onRemove} aria-label="Remove filter" className="h-4 w-4 flex items-center justify-center rounded-full hover:bg-orange-500/20 transition-colors">
        <X className="h-2.5 w-2.5" strokeWidth={2.5} />
      </button>
    </span>
  );
}

const inputCls =
  "w-full h-9 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]/70 outline-none transition-colors focus:border-orange-500/40 focus:bg-[var(--color-surface)]";

const selectCls =
  "w-full h-9 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[13px] text-[var(--color-text-primary)] outline-none cursor-pointer transition-colors focus:border-orange-500/40 focus:bg-[var(--color-surface)]";

const pageNavCls =
  "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] disabled:opacity-40 disabled:pointer-events-none transition-colors";