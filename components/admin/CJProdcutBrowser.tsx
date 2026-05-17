// "use client"

// import { useState, useEffect, useCallback, useRef } from "react"

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface CJProduct {
//   pid: string
//   productNameEn: string
//   productSku: string
//   bigImage: string
//   sellPrice: string
//   nowPrice: string
//   discountPrice: string
//   categoryName?: string
//   threeCategoryName?: string
//   addMarkStatus: number        // 1 = free shipping
//   isFreeShipping?: boolean
//   listedNum: number
//   warehouseInventoryNum?: number
//   verifiedWarehouse?: number
//   deliveryCycle?: string
//   productType: string
//   isVideo?: number
//   createAt?: number
// }

// interface CJCategory {
//   categoryId: string
//   categoryName: string
//   categoryFirstName?: string
//   categorySecondName?: string
// }

// interface Filters {
//   keyWord: string
//   categoryId: string
//   minPrice: string
//   maxPrice: string
//   createTimeFrom: string       // yyyy-MM-dd
//   createTimeTo: string
//   isFreeShipping: string       // "" | "1" | "0"
//   verifiedWarehouse: string    // "" | "1" | "2"
//   productType: string          // "" | "4" | "10" | "11"
//   productFlag: string          // "" | "0" | "1" | "2" | "3"
//   countryCode: string
//   deliveryTime: string         // "" | "24" | "48" | "72"
//   startInventory: string
//   endInventory: string
//   sort: string                 // "desc" | "asc"
//   orderBy: string              // "createAt" | "listedNum"
// }

// interface PaginationState {
//   page: number
//   pageSize: number
//   total: number
// }

// // ─── Default filter state ─────────────────────────────────────────────────────

// const DEFAULT_FILTERS: Filters = {
//   keyWord: "",
//   categoryId: "",
//   minPrice: "",
//   maxPrice: "",
//   createTimeFrom: "",
//   createTimeTo: "",
//   isFreeShipping: "",
//   verifiedWarehouse: "",
//   productType: "",
//   productFlag: "",
//   countryCode: "",
//   deliveryTime: "",
//   startInventory: "",
//   endInventory: "",
//   sort: "desc",
//   orderBy: "createAt",
// }

// // ─── API call helper ──────────────────────────────────────────────────────────

// async function fetchCJProducts(
//   filters: Filters,
//   page: number,
//   pageSize: number
// ): Promise<{ products: CJProduct[]; total: number }> {
//   const params = new URLSearchParams()

//   params.set("pageNum", String(page))
//   params.set("pageSize", String(pageSize))

//   if (filters.keyWord) params.set("productNameEn", filters.keyWord)
//   if (filters.categoryId) params.set("categoryId", filters.categoryId)
//   if (filters.minPrice) params.set("minPrice", filters.minPrice)
//   if (filters.maxPrice) params.set("maxPrice", filters.maxPrice)
//   if (filters.isFreeShipping) params.set("isFreeShipping", filters.isFreeShipping)
//   if (filters.verifiedWarehouse) params.set("verifiedWarehouse", filters.verifiedWarehouse)
//   if (filters.productType) params.set("productType", filters.productType)
//   if (filters.productFlag !== "") params.set("searchType", filters.productFlag)
//   if (filters.countryCode) params.set("countryCode", filters.countryCode)
//   if (filters.deliveryTime) params.set("deliveryTime", filters.deliveryTime)
//   if (filters.startInventory) params.set("startInventory", filters.startInventory)
//   if (filters.endInventory) params.set("endInventory", filters.endInventory)
//   if (filters.sort) params.set("sort", filters.sort)
//   if (filters.orderBy) params.set("orderBy", filters.orderBy)

//   // Date range → timestamps
//   if (filters.createTimeFrom) {
//     params.set("createTimeFrom", `${filters.createTimeFrom} 00:00:00`)
//   }
//   if (filters.createTimeTo) {
//     params.set("createTimeTo", `${filters.createTimeTo} 23:59:59`)
//   }

//   const res = await fetch(`/api/cj/products?${params.toString()}`)
//   if (!res.ok) throw new Error(`HTTP ${res.status}`)
//   const json = await res.json()
//   if (!json.success) throw new Error(json.error || "Unknown error")
//   return { products: json.products, total: json.total }
// }

// async function fetchCJCategories(): Promise<CJCategory[]> {
//   const res = await fetch("/api/cj/categories")
//   if (!res.ok) return []
//   const json = await res.json()
//   return json.categories || []
// }

// // ─── Component ────────────────────────────────────────────────────────────────

// export default function CJProductBrowser() {
//   const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
//   const [pending, setPending] = useState<Filters>(DEFAULT_FILTERS)
//   const [products, setProducts] = useState<CJProduct[]>([])
//   const [pagination, setPagination] = useState<PaginationState>({ page: 1, pageSize: 20, total: 0 })
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState("")
//   const [categories, setCategories] = useState<CJCategory[]>([])
//   const [filtersOpen, setFiltersOpen] = useState(true)
//   const [importingPid, setImportingPid] = useState<string | null>(null)
//   const [importedPids, setImportedPids] = useState<Set<string>>(new Set())
//   const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)
//   const searchRef = useRef<HTMLInputElement>(null)

//   // Load categories on mount
//   useEffect(() => {
//     fetchCJCategories().then(setCategories)
//   }, [])

//   // Fetch products whenever filters or page changes
//   const load = useCallback(async (f: Filters, page: number) => {
//     setLoading(true)
//     setError("")
//     try {
//       const { products: p, total } = await fetchCJProducts(f, page, pagination.pageSize)
//       setProducts(p)
//       setPagination((prev) => ({ ...prev, page, total }))
//     } catch (e) {
//       setError((e as Error).message)
//       setProducts([])
//     } finally {
//       setLoading(false)
//     }
//   }, [pagination.pageSize])

//   const applyFilters = () => {
//     setFilters(pending)
//     load(pending, 1)
//   }

//   const resetFilters = () => {
//     setPending(DEFAULT_FILTERS)
//     setFilters(DEFAULT_FILTERS)
//     load(DEFAULT_FILTERS, 1)
//   }

//   const goPage = (p: number) => load(filters, p)

//   const showToast = (msg: string, type: "success" | "error") => {
//     setToast({ msg, type })
//     setTimeout(() => setToast(null), 3500)
//   }

//   const importProduct = async (pid: string) => {
//     setImportingPid(pid)
//     try {
//       const res = await fetch("/api/cj/import", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ pid }),
//       })
//       const json = await res.json()
//       if (!json.success) throw new Error(json.error)
//       setImportedPids((prev) => new Set([...prev, pid]))
//       showToast("Product imported to Jimvio!", "success")
//     } catch (e) {
//       showToast(`Import failed: ${(e as Error).message}`, "error")
//     } finally {
//       setImportingPid(null)
//     }
//   }

//   const totalPages = Math.ceil(pagination.total / pagination.pageSize)
//   const activeFilterCount = Object.entries(pending).filter(
//     ([k, v]) => v !== "" && v !== DEFAULT_FILTERS[k as keyof Filters]
//   ).length

//   return (
//     <div style={styles.root}>
//       {/* Toast */}
//       {toast && (
//         <div style={{ ...styles.toast, background: toast.type === "success" ? "#10b981" : "#ef4444" }}>
//           {toast.type === "success" ? "✓" : "✗"} {toast.msg}
//         </div>
//       )}

//       {/* Header */}
//       <div style={styles.header}>
//         <div>
//           <h1 style={styles.title}>CJ Product Browser</h1>
//           <p style={styles.subtitle}>
//             {pagination.total > 0
//               ? `${pagination.total.toLocaleString()} products found`
//               : "Search and import CJ products into Jimvio"}
//           </p>
//         </div>
//         <div style={styles.headerActions}>
//           <button
//             style={styles.filterToggle}
//             onClick={() => setFiltersOpen((o) => !o)}
//           >
//             <FilterIcon />
//             Filters
//             {activeFilterCount > 0 && (
//               <span style={styles.badge}>{activeFilterCount}</span>
//             )}
//           </button>
//         </div>
//       </div>

//       <div style={styles.layout}>
//         {/* ── Filter Panel ─────────────────────────────────────── */}
//         {filtersOpen && (
//           <aside style={styles.sidebar}>
//             <div style={styles.sidebarHeader}>
//               <span style={styles.sidebarTitle}>Filters</span>
//               <button style={styles.resetBtn} onClick={resetFilters}>
//                 Reset all
//               </button>
//             </div>

//             {/* Search */}
//             <FilterSection label="Search">
//               <input
//                 ref={searchRef}
//                 style={styles.input}
//                 placeholder="Product name or keyword..."
//                 value={pending.keyWord}
//                 onChange={(e) => setPending((p) => ({ ...p, keyWord: e.target.value }))}
//                 onKeyDown={(e) => e.key === "Enter" && applyFilters()}
//               />
//             </FilterSection>

//             {/* Category */}
//             <FilterSection label="Category">
//               <select
//                 style={styles.select}
//                 value={pending.categoryId}
//                 onChange={(e) => setPending((p) => ({ ...p, categoryId: e.target.value }))}
//               >
//                 <option value="">All categories</option>
//                 {categories.map((c) => (
//                   <option key={c.categoryId} value={c.categoryId}>
//                     {c.categoryName}
//                   </option>
//                 ))}
//               </select>
//             </FilterSection>

//             {/* Price range */}
//             <FilterSection label="Price range (USD)">
//               <div style={styles.row}>
//                 <input
//                   style={{ ...styles.input, flex: 1 }}
//                   placeholder="Min"
//                   type="number"
//                   min="0"
//                   value={pending.minPrice}
//                   onChange={(e) => setPending((p) => ({ ...p, minPrice: e.target.value }))}
//                 />
//                 <span style={styles.rangeSep}>–</span>
//                 <input
//                   style={{ ...styles.input, flex: 1 }}
//                   placeholder="Max"
//                   type="number"
//                   min="0"
//                   value={pending.maxPrice}
//                   onChange={(e) => setPending((p) => ({ ...p, maxPrice: e.target.value }))}
//                 />
//               </div>
//             </FilterSection>

//             {/* Date range */}
//             <FilterSection label="Listed date range">
//               <label style={styles.label}>From</label>
//               <input
//                 style={{ ...styles.input, marginBottom: 8 }}
//                 type="date"
//                 value={pending.createTimeFrom}
//                 onChange={(e) => setPending((p) => ({ ...p, createTimeFrom: e.target.value }))}
//               />
//               <label style={styles.label}>To</label>
//               <input
//                 style={styles.input}
//                 type="date"
//                 value={pending.createTimeTo}
//                 onChange={(e) => setPending((p) => ({ ...p, createTimeTo: e.target.value }))}
//               />
//             </FilterSection>

//             {/* Inventory range */}
//             <FilterSection label="Inventory range">
//               <div style={styles.row}>
//                 <input
//                   style={{ ...styles.input, flex: 1 }}
//                   placeholder="Min stock"
//                   type="number"
//                   min="0"
//                   value={pending.startInventory}
//                   onChange={(e) => setPending((p) => ({ ...p, startInventory: e.target.value }))}
//                 />
//                 <span style={styles.rangeSep}>–</span>
//                 <input
//                   style={{ ...styles.input, flex: 1 }}
//                   placeholder="Max stock"
//                   type="number"
//                   min="0"
//                   value={pending.endInventory}
//                   onChange={(e) => setPending((p) => ({ ...p, endInventory: e.target.value }))}
//                 />
//               </div>
//             </FilterSection>

//             {/* Shipping */}
//             <FilterSection label="Shipping">
//               <RadioGroup
//                 value={pending.isFreeShipping}
//                 onChange={(v) => setPending((p) => ({ ...p, isFreeShipping: v }))}
//                 options={[
//                   { label: "All", value: "" },
//                   { label: "Free shipping", value: "1" },
//                   { label: "Paid shipping", value: "0" },
//                 ]}
//               />
//             </FilterSection>

//             {/* Delivery time */}
//             <FilterSection label="Ships within">
//               <RadioGroup
//                 value={pending.deliveryTime}
//                 onChange={(v) => setPending((p) => ({ ...p, deliveryTime: v }))}
//                 options={[
//                   { label: "Any", value: "" },
//                   { label: "24 hours", value: "24" },
//                   { label: "48 hours", value: "48" },
//                   { label: "72 hours", value: "72" },
//                 ]}
//               />
//             </FilterSection>

//             {/* Warehouse verification */}
//             <FilterSection label="Warehouse">
//               <RadioGroup
//                 value={pending.verifiedWarehouse}
//                 onChange={(v) => setPending((p) => ({ ...p, verifiedWarehouse: v }))}
//                 options={[
//                   { label: "All", value: "" },
//                   { label: "Verified only", value: "1" },
//                   { label: "Unverified only", value: "2" },
//                 ]}
//               />
//             </FilterSection>

//             {/* Product type */}
//             <FilterSection label="Product type">
//               <RadioGroup
//                 value={pending.productType}
//                 onChange={(v) => setPending((p) => ({ ...p, productType: v }))}
//                 options={[
//                   { label: "All", value: "" },
//                   { label: "Supplier products", value: "4" },
//                   { label: "Video products", value: "10" },
//                   { label: "Non-video", value: "11" },
//                 ]}
//               />
//             </FilterSection>

//             {/* Product flag */}
//             <FilterSection label="Product status">
//               <RadioGroup
//                 value={pending.productFlag}
//                 onChange={(v) => setPending((p) => ({ ...p, productFlag: v }))}
//                 options={[
//                   { label: "All", value: "" },
//                   { label: "Trending", value: "0" },
//                   { label: "New arrivals", value: "1" },
//                   { label: "Video products", value: "2" },
//                   { label: "Slow-moving", value: "3" },
//                 ]}
//               />
//             </FilterSection>

//             {/* Warehouse country */}
//             <FilterSection label="Warehouse country">
//               <select
//                 style={styles.select}
//                 value={pending.countryCode}
//                 onChange={(e) => setPending((p) => ({ ...p, countryCode: e.target.value }))}
//               >
//                 <option value="">All warehouses</option>
//                 <option value="CN">China (CN)</option>
//                 <option value="US">United States (US)</option>
//                 <option value="GB">United Kingdom (GB)</option>
//                 <option value="DE">Germany (DE)</option>
//                 <option value="FR">France (FR)</option>
//                 <option value="AU">Australia (AU)</option>
//               </select>
//             </FilterSection>

//             {/* Sort */}
//             <FilterSection label="Sort by">
//               <select
//                 style={{ ...styles.select, marginBottom: 8 }}
//                 value={pending.orderBy}
//                 onChange={(e) => setPending((p) => ({ ...p, orderBy: e.target.value }))}
//               >
//                 <option value="createAt">Date listed</option>
//                 <option value="listedNum">Listing count</option>
//               </select>
//               <RadioGroup
//                 value={pending.sort}
//                 onChange={(v) => setPending((p) => ({ ...p, sort: v }))}
//                 options={[
//                   { label: "Newest first", value: "desc" },
//                   { label: "Oldest first", value: "asc" },
//                 ]}
//               />
//             </FilterSection>

//             {/* Apply */}
//             <button style={styles.applyBtn} onClick={applyFilters}>
//               Search Products
//             </button>
//           </aside>
//         )}

//         {/* ── Product Grid ──────────────────────────────────────── */}
//         <main style={styles.main}>
//           {/* Active filter chips */}
//           {activeFilterCount > 0 && (
//             <div style={styles.chips}>
//               {pending.keyWord && <Chip label={`"${pending.keyWord}"`} onRemove={() => { setPending((p) => ({ ...p, keyWord: "" })); }} />}
//               {pending.categoryId && <Chip label={`Category: ${categories.find((c) => c.categoryId === pending.categoryId)?.categoryName || pending.categoryId}`} onRemove={() => setPending((p) => ({ ...p, categoryId: "" }))} />}
//               {(pending.minPrice || pending.maxPrice) && <Chip label={`$${pending.minPrice || "0"} – $${pending.maxPrice || "∞"}`} onRemove={() => setPending((p) => ({ ...p, minPrice: "", maxPrice: "" }))} />}
//               {pending.createTimeFrom && <Chip label={`From ${pending.createTimeFrom}`} onRemove={() => setPending((p) => ({ ...p, createTimeFrom: "" }))} />}
//               {pending.createTimeTo && <Chip label={`To ${pending.createTimeTo}`} onRemove={() => setPending((p) => ({ ...p, createTimeTo: "" }))} />}
//               {pending.isFreeShipping === "1" && <Chip label="Free shipping" onRemove={() => setPending((p) => ({ ...p, isFreeShipping: "" }))} />}
//               {pending.deliveryTime && <Chip label={`Ships in ${pending.deliveryTime}h`} onRemove={() => setPending((p) => ({ ...p, deliveryTime: "" }))} />}
//               {pending.verifiedWarehouse === "1" && <Chip label="Verified warehouse" onRemove={() => setPending((p) => ({ ...p, verifiedWarehouse: "" }))} />}
//               {pending.countryCode && <Chip label={`Warehouse: ${pending.countryCode}`} onRemove={() => setPending((p) => ({ ...p, countryCode: "" }))} />}
//             </div>
//           )}

//           {/* States */}
//           {error && (
//             <div style={styles.errorBox}>
//               <span style={{ fontSize: 20 }}>⚠️</span>
//               <div>
//                 <strong>Failed to load products</strong>
//                 <p style={{ margin: "4px 0 0", color: "#991b1b", fontSize: 13 }}>{error}</p>
//               </div>
//             </div>
//           )}

//           {!loading && !error && products.length === 0 && pagination.total === 0 && (
//             <div style={styles.emptyState}>
//               <div style={styles.emptyIcon}>📦</div>
//               <h3 style={styles.emptyTitle}>No products yet</h3>
//               <p style={styles.emptyText}>
//                 Set your filters and click <strong>Search Products</strong> to browse CJ's catalog.
//               </p>
//             </div>
//           )}

//           {/* Loading skeleton */}
//           {loading && (
//             <div style={styles.grid}>
//               {Array.from({ length: 12 }).map((_, i) => (
//                 <div key={i} style={styles.skeleton} />
//               ))}
//             </div>
//           )}

//           {/* Product grid */}
//           {!loading && products.length > 0 && (
//             <>
//               <div style={styles.grid}>
//                 {products.map((product) => (
//                   <ProductCard
//                     key={product.pid}
//                     product={product}
//                     imported={importedPids.has(product.pid)}
//                     importing={importingPid === product.pid}
//                     onImport={() => importProduct(product.pid)}
//                   />
//                 ))}
//               </div>

//               {/* Pagination */}
//               {totalPages > 1 && (
//                 <div style={styles.pagination}>
//                   <button
//                     style={{ ...styles.pageBtn, opacity: pagination.page === 1 ? 0.4 : 1 }}
//                     disabled={pagination.page === 1}
//                     onClick={() => goPage(pagination.page - 1)}
//                   >
//                     ← Prev
//                   </button>

//                   {/* Page numbers */}
//                   <div style={styles.pageNumbers}>
//                     {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
//                       let p: number
//                       if (totalPages <= 7) {
//                         p = i + 1
//                       } else if (pagination.page <= 4) {
//                         p = i + 1
//                       } else if (pagination.page >= totalPages - 3) {
//                         p = totalPages - 6 + i
//                       } else {
//                         p = pagination.page - 3 + i
//                       }
//                       return (
//                         <button
//                           key={p}
//                           style={{
//                             ...styles.pageNum,
//                             background: p === pagination.page ? "#0f172a" : "transparent",
//                             color: p === pagination.page ? "#fff" : "#64748b",
//                           }}
//                           onClick={() => goPage(p)}
//                         >
//                           {p}
//                         </button>
//                       )
//                     })}
//                   </div>

//                   <button
//                     style={{ ...styles.pageBtn, opacity: pagination.page === totalPages ? 0.4 : 1 }}
//                     disabled={pagination.page === totalPages}
//                     onClick={() => goPage(pagination.page + 1)}
//                   >
//                     Next →
//                   </button>
//                 </div>
//               )}
//             </>
//           )}
//         </main>
//       </div>
//     </div>
//   )
// }

// // ─── Product Card ──────────────────────────────────────────────────────────────

// function ProductCard({
//   product,
//   imported,
//   importing,
//   onImport,
// }: {
//   product: CJProduct
//   imported: boolean
//   importing: boolean
//   onImport: () => void
// }) {
//   const price = parseFloat(product.discountPrice || product.nowPrice || product.sellPrice || "0")

//   return (
//     <div style={styles.card}>
//       {/* Image */}
//       <div style={styles.cardImageWrap}>
//         {product.bigImage ? (
//           <img
//             src={product.bigImage}
//             alt={product.productNameEn}
//             style={styles.cardImage}
//             loading="lazy"
//           />
//         ) : (
//           <div style={styles.cardImagePlaceholder}>📦</div>
//         )}
//         {product.addMarkStatus === 1 || product.isFreeShipping ? (
//           <span style={styles.freeShippingBadge}>Free shipping</span>
//         ) : null}
//         {product.isVideo === 1 && (
//           <span style={styles.videoBadge}>▶ Video</span>
//         )}
//       </div>

//       {/* Info */}
//       <div style={styles.cardBody}>
//         <p style={styles.cardSku}>{product.productSku}</p>
//         <h3 style={styles.cardTitle}>{product.productNameEn}</h3>

//         {product.threeCategoryName && (
//           <p style={styles.cardCategory}>{product.threeCategoryName}</p>
//         )}

//         <div style={styles.cardMeta}>
//           {product.listedNum > 0 && (
//             <span style={styles.metaTag}>
//               {product.listedNum.toLocaleString()} sellers
//             </span>
//           )}
//           {product.verifiedWarehouse === 1 && (
//             <span style={{ ...styles.metaTag, background: "#dcfce7", color: "#166534" }}>
//               ✓ Verified
//             </span>
//           )}
//           {product.deliveryCycle && (
//             <span style={styles.metaTag}>
//               Ships {product.deliveryCycle}d
//             </span>
//           )}
//         </div>

//         <div style={styles.cardFooter}>
//           <span style={styles.cardPrice}>
//             ${price.toFixed(2)}
//             <span style={styles.cardCurrency}> USD</span>
//           </span>
//           <button
//             style={{
//               ...styles.importBtn,
//               background: imported ? "#f0fdf4" : "#0f172a",
//               color: imported ? "#16a34a" : "#fff",
//               border: imported ? "1px solid #bbf7d0" : "none",
//               cursor: importing ? "wait" : "pointer",
//               opacity: importing ? 0.7 : 1,
//             }}
//             onClick={onImport}
//             disabled={imported || importing}
//           >
//             {importing ? "Importing..." : imported ? "✓ Imported" : "Import"}
//           </button>
//         </div>
//       </div>
//     </div>
//   )
// }

// // ─── Filter Section ───────────────────────────────────────────────────────────

// function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
//   return (
//     <div style={styles.filterSection}>
//       <p style={styles.filterLabel}>{label}</p>
//       {children}
//     </div>
//   )
// }

// // ─── Radio Group ──────────────────────────────────────────────────────────────

// function RadioGroup({
//   options,
//   value,
//   onChange,
// }: {
//   options: { label: string; value: string }[]
//   value: string
//   onChange: (v: string) => void
// }) {
//   return (
//     <div style={styles.radioGroup}>
//       {options.map((opt) => (
//         <button
//           key={opt.value}
//           style={{
//             ...styles.radioBtn,
//             background: value === opt.value ? "#0f172a" : "transparent",
//             color: value === opt.value ? "#fff" : "#475569",
//             border: `1px solid ${value === opt.value ? "#0f172a" : "#e2e8f0"}`,
//           }}
//           onClick={() => onChange(opt.value)}
//         >
//           {opt.label}
//         </button>
//       ))}
//     </div>
//   )
// }

// // ─── Filter Chip ──────────────────────────────────────────────────────────────

// function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
//   return (
//     <span style={styles.chip}>
//       {label}
//       <button style={styles.chipRemove} onClick={onRemove}>×</button>
//     </span>
//   )
// }

// // ─── Filter Icon ──────────────────────────────────────────────────────────────

// function FilterIcon() {
//   return (
//     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//       <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
//     </svg>
//   )
// }

// // ─── Styles ───────────────────────────────────────────────────────────────────

// const styles: Record<string, React.CSSProperties> = {
//   root: {
//     fontFamily: "'DM Sans', -apple-system, sans-serif",
//     background: "#f8fafc",
//     minHeight: "100vh",
//     padding: "24px",
//     color: "#0f172a",
//   },
//   toast: {
//     position: "fixed",
//     top: 24,
//     right: 24,
//     zIndex: 9999,
//     color: "#fff",
//     padding: "12px 20px",
//     borderRadius: 10,
//     fontSize: 14,
//     fontWeight: 500,
//     boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
//   },
//   header: {
//     display: "flex",
//     alignItems: "flex-start",
//     justifyContent: "space-between",
//     marginBottom: 24,
//   },
//   title: {
//     fontSize: 26,
//     fontWeight: 700,
//     margin: 0,
//     letterSpacing: "-0.5px",
//   },
//   subtitle: {
//     fontSize: 14,
//     color: "#64748b",
//     margin: "4px 0 0",
//   },
//   headerActions: {
//     display: "flex",
//     gap: 10,
//     alignItems: "center",
//   },
//   filterToggle: {
//     display: "flex",
//     alignItems: "center",
//     gap: 6,
//     padding: "8px 14px",
//     background: "#fff",
//     border: "1px solid #e2e8f0",
//     borderRadius: 8,
//     fontSize: 13,
//     fontWeight: 500,
//     cursor: "pointer",
//     color: "#374151",
//   },
//   badge: {
//     background: "#0f172a",
//     color: "#fff",
//     borderRadius: 99,
//     fontSize: 11,
//     fontWeight: 700,
//     padding: "1px 6px",
//     marginLeft: 2,
//   },
//   layout: {
//     display: "flex",
//     gap: 20,
//     alignItems: "flex-start",
//   },
//   sidebar: {
//     width: 260,
//     flexShrink: 0,
//     background: "#fff",
//     borderRadius: 12,
//     border: "1px solid #e2e8f0",
//     padding: "16px",
//     position: "sticky",
//     top: 20,
//     maxHeight: "calc(100vh - 60px)",
//     overflowY: "auto",
//   },
//   sidebarHeader: {
//     display: "flex",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 16,
//     paddingBottom: 12,
//     borderBottom: "1px solid #f1f5f9",
//   },
//   sidebarTitle: {
//     fontWeight: 700,
//     fontSize: 15,
//   },
//   resetBtn: {
//     background: "none",
//     border: "none",
//     fontSize: 12,
//     color: "#94a3b8",
//     cursor: "pointer",
//     padding: 0,
//   },
//   filterSection: {
//     marginBottom: 18,
//     paddingBottom: 18,
//     borderBottom: "1px solid #f1f5f9",
//   },
//   filterLabel: {
//     fontSize: 11,
//     fontWeight: 700,
//     textTransform: "uppercase",
//     letterSpacing: "0.08em",
//     color: "#94a3b8",
//     margin: "0 0 8px",
//   },
//   label: {
//     fontSize: 12,
//     color: "#64748b",
//     display: "block",
//     marginBottom: 4,
//   },
//   input: {
//     width: "100%",
//     padding: "7px 10px",
//     border: "1px solid #e2e8f0",
//     borderRadius: 7,
//     fontSize: 13,
//     color: "#0f172a",
//     outline: "none",
//     background: "#f8fafc",
//     boxSizing: "border-box",
//   },
//   select: {
//     width: "100%",
//     padding: "7px 10px",
//     border: "1px solid #e2e8f0",
//     borderRadius: 7,
//     fontSize: 13,
//     color: "#0f172a",
//     outline: "none",
//     background: "#f8fafc",
//     cursor: "pointer",
//   },
//   row: {
//     display: "flex",
//     alignItems: "center",
//     gap: 8,
//   },
//   rangeSep: {
//     color: "#94a3b8",
//     fontSize: 14,
//     flexShrink: 0,
//   },
//   radioGroup: {
//     display: "flex",
//     flexWrap: "wrap",
//     gap: 5,
//   },
//   radioBtn: {
//     padding: "4px 10px",
//     borderRadius: 6,
//     fontSize: 12,
//     cursor: "pointer",
//     transition: "all 0.15s",
//     fontWeight: 500,
//   },
//   applyBtn: {
//     width: "100%",
//     padding: "10px",
//     background: "#0f172a",
//     color: "#fff",
//     border: "none",
//     borderRadius: 8,
//     fontSize: 14,
//     fontWeight: 600,
//     cursor: "pointer",
//     marginTop: 4,
//   },
//   main: {
//     flex: 1,
//     minWidth: 0,
//   },
//   chips: {
//     display: "flex",
//     flexWrap: "wrap",
//     gap: 8,
//     marginBottom: 16,
//   },
//   chip: {
//     display: "inline-flex",
//     alignItems: "center",
//     gap: 6,
//     padding: "4px 10px",
//     background: "#eff6ff",
//     color: "#1d4ed8",
//     borderRadius: 99,
//     fontSize: 12,
//     fontWeight: 500,
//     border: "1px solid #bfdbfe",
//   },
//   chipRemove: {
//     background: "none",
//     border: "none",
//     cursor: "pointer",
//     color: "#93c5fd",
//     fontSize: 16,
//     lineHeight: 1,
//     padding: 0,
//     fontWeight: 700,
//   },
//   errorBox: {
//     display: "flex",
//     gap: 12,
//     alignItems: "flex-start",
//     padding: 16,
//     background: "#fef2f2",
//     border: "1px solid #fecaca",
//     borderRadius: 10,
//     marginBottom: 20,
//     color: "#991b1b",
//     fontSize: 14,
//   },
//   emptyState: {
//     textAlign: "center",
//     padding: "80px 20px",
//     color: "#64748b",
//   },
//   emptyIcon: {
//     fontSize: 48,
//     marginBottom: 16,
//   },
//   emptyTitle: {
//     fontSize: 20,
//     fontWeight: 700,
//     color: "#0f172a",
//     margin: "0 0 8px",
//   },
//   emptyText: {
//     fontSize: 14,
//     margin: 0,
//     lineHeight: 1.6,
//   },
//   grid: {
//     display: "grid",
//     gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
//     gap: 16,
//   },
//   skeleton: {
//     height: 280,
//     background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
//     backgroundSize: "200% 100%",
//     animation: "shimmer 1.4s infinite",
//     borderRadius: 12,
//   },
//   card: {
//     background: "#fff",
//     border: "1px solid #e2e8f0",
//     borderRadius: 12,
//     overflow: "hidden",
//     display: "flex",
//     flexDirection: "column",
//     transition: "box-shadow 0.2s, transform 0.2s",
//   },
//   cardImageWrap: {
//     position: "relative",
//     height: 180,
//     background: "#f8fafc",
//     overflow: "hidden",
//   },
//   cardImage: {
//     width: "100%",
//     height: "100%",
//     objectFit: "cover",
//   },
//   cardImagePlaceholder: {
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     height: "100%",
//     fontSize: 36,
//     color: "#cbd5e1",
//   },
//   freeShippingBadge: {
//     position: "absolute",
//     top: 8,
//     left: 8,
//     background: "#10b981",
//     color: "#fff",
//     fontSize: 10,
//     fontWeight: 700,
//     padding: "2px 7px",
//     borderRadius: 99,
//     textTransform: "uppercase",
//     letterSpacing: "0.05em",
//   },
//   videoBadge: {
//     position: "absolute",
//     top: 8,
//     right: 8,
//     background: "rgba(0,0,0,0.7)",
//     color: "#fff",
//     fontSize: 10,
//     fontWeight: 600,
//     padding: "2px 7px",
//     borderRadius: 99,
//   },
//   cardBody: {
//     padding: "12px",
//     display: "flex",
//     flexDirection: "column",
//     flex: 1,
//   },
//   cardSku: {
//     fontSize: 10,
//     color: "#94a3b8",
//     margin: "0 0 4px",
//     fontFamily: "monospace",
//     textTransform: "uppercase",
//     letterSpacing: "0.05em",
//   },
//   cardTitle: {
//     fontSize: 13,
//     fontWeight: 600,
//     margin: "0 0 6px",
//     color: "#0f172a",
//     lineHeight: 1.4,
//     display: "-webkit-box",
//     WebkitLineClamp: 2,
//     WebkitBoxOrient: "vertical",
//     overflow: "hidden",
//   },
//   cardCategory: {
//     fontSize: 11,
//     color: "#64748b",
//     margin: "0 0 8px",
//   },
//   cardMeta: {
//     display: "flex",
//     flexWrap: "wrap",
//     gap: 4,
//     marginBottom: 10,
//     flex: 1,
//   },
//   metaTag: {
//     fontSize: 10,
//     padding: "2px 6px",
//     background: "#f1f5f9",
//     color: "#475569",
//     borderRadius: 4,
//     fontWeight: 500,
//   },
//   cardFooter: {
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "space-between",
//     gap: 8,
//   },
//   cardPrice: {
//     fontSize: 16,
//     fontWeight: 700,
//     color: "#0f172a",
//   },
//   cardCurrency: {
//     fontSize: 11,
//     fontWeight: 400,
//     color: "#64748b",
//   },
//   importBtn: {
//     padding: "6px 12px",
//     borderRadius: 6,
//     fontSize: 12,
//     fontWeight: 600,
//     cursor: "pointer",
//     transition: "all 0.15s",
//     whiteSpace: "nowrap",
//   },
//   pagination: {
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     gap: 8,
//     marginTop: 32,
//     paddingTop: 24,
//     borderTop: "1px solid #e2e8f0",
//   },
//   pageBtn: {
//     padding: "8px 16px",
//     background: "#fff",
//     border: "1px solid #e2e8f0",
//     borderRadius: 8,
//     fontSize: 13,
//     fontWeight: 500,
//     cursor: "pointer",
//     color: "#374151",
//   },
//   pageNumbers: {
//     display: "flex",
//     gap: 4,
//   },
//   pageNum: {
//     width: 36,
//     height: 36,
//     borderRadius: 8,
//     border: "1px solid transparent",
//     fontSize: 13,
//     cursor: "pointer",
//     fontWeight: 500,
//   },
// }

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  Search, SlidersHorizontal, X, Check, Loader2, Package,
  ChevronLeft, ChevronRight, Play, Truck, ShieldCheck, AlertCircle,
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

// ─── Component ────────────────────────────────────────────────────────────────

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
  const [importedPids, setImportedPids] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCJCategories().then(setCategories);
  }, []);

  const load = useCallback(async (f: Filters, page: number) => {
    setLoading(true);
    setError("");
    try {
      const { products: p, total } = await fetchCJProducts(f, page, pagination.pageSize);
      setProducts(p);
      setPagination((prev) => ({ ...prev, page, total }));
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (e) {
      setError((e as Error).message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.pageSize]);

  const applyFilters = () => {
    setFilters(pending);
    load(pending, 1);
  };

  const resetFilters = () => {
    setPending(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    load(DEFAULT_FILTERS, 1);
  };

  const goPage = (p: number) => load(filters, p);

  const importProduct = async (pid: string) => {
    setImportingPid(pid);
    try {
      const res = await fetch("/api/cj/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pid }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setImportedPids((prev) => new Set([...prev, pid]));
      toast.success("Product imported to Jimvio");
    } catch (e) {
      toast.error(`Import failed: ${(e as Error).message}`);
    } finally {
      setImportingPid(null);
    }
  };

  const totalPages = Math.ceil(pagination.total / pagination.pageSize);
  const activeFilterCount = Object.entries(pending).filter(
    ([k, v]) => v !== "" && v !== DEFAULT_FILTERS[k as keyof Filters]
  ).length;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 lg:py-8">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)] mb-1.5">
              CJ Dropshipping
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">
              Browse catalog
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              {pagination.total > 0 ? (
                <>
                  <span className="tabular-nums font-medium text-[var(--color-text-primary)]">
                    {pagination.total.toLocaleString()}
                  </span>{" "}
                  products available
                </>
              ) : (
                "Search and import products into your store"
              )}
            </p>
          </div>

          <button
            onClick={() => setFiltersOpen((o) => !o)}
            className={cn(
              "lg:hidden inline-flex items-center gap-2 h-10 px-4 rounded-xl",
              "bg-[var(--color-surface)] border border-[var(--color-border)]",
              "text-sm font-medium text-[var(--color-text-primary)]",
              "transition-colors hover:bg-[var(--color-surface-secondary)]"
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-orange-500 text-white text-[10px] font-semibold tabular-nums">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* ── Layout ─────────────────────────────────────────── */}
        <div className="flex gap-6 items-start">

          {/* Sidebar */}
          <aside
            className={cn(
              "w-72 shrink-0 lg:sticky lg:top-6",
              "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl",
              "overflow-hidden",
              !filtersOpen && "hidden lg:block"
            )}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--color-border)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                Filters
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="text-[11px] font-medium text-orange-500 hover:text-orange-600 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-5 space-y-5">
              {/* Search */}
              <FilterSection label="Search">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-muted)] pointer-events-none" />
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Product name…"
                    value={pending.keyWord}
                    onChange={(e) => setPending((p) => ({ ...p, keyWord: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                    className={inputCls + " pl-9"}
                  />
                </div>
              </FilterSection>

              <FilterSection label="Category">
                <select
                  value={pending.categoryId}
                  onChange={(e) => setPending((p) => ({ ...p, categoryId: e.target.value }))}
                  className={selectCls}
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.categoryId} value={c.categoryId}>
                      {c.categoryName}
                    </option>
                  ))}
                </select>
              </FilterSection>

              <FilterSection label="Price · USD">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number" min="0" placeholder="Min"
                    value={pending.minPrice}
                    onChange={(e) => setPending((p) => ({ ...p, minPrice: e.target.value }))}
                    className={inputCls}
                  />
                  <input
                    type="number" min="0" placeholder="Max"
                    value={pending.maxPrice}
                    onChange={(e) => setPending((p) => ({ ...p, maxPrice: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </FilterSection>

              <FilterSection label="Listed date">
                <div className="space-y-2">
                  <input
                    type="date"
                    value={pending.createTimeFrom}
                    onChange={(e) => setPending((p) => ({ ...p, createTimeFrom: e.target.value }))}
                    className={inputCls}
                  />
                  <input
                    type="date"
                    value={pending.createTimeTo}
                    onChange={(e) => setPending((p) => ({ ...p, createTimeTo: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </FilterSection>

              <FilterSection label="Inventory">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number" min="0" placeholder="Min"
                    value={pending.startInventory}
                    onChange={(e) => setPending((p) => ({ ...p, startInventory: e.target.value }))}
                    className={inputCls}
                  />
                  <input
                    type="number" min="0" placeholder="Max"
                    value={pending.endInventory}
                    onChange={(e) => setPending((p) => ({ ...p, endInventory: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </FilterSection>

              <FilterSection label="Shipping">
                <Pills
                  value={pending.isFreeShipping}
                  onChange={(v) => setPending((p) => ({ ...p, isFreeShipping: v }))}
                  options={[
                    { label: "Any", value: "" },
                    { label: "Free", value: "1" },
                    { label: "Paid", value: "0" },
                  ]}
                />
              </FilterSection>

              <FilterSection label="Ships within">
                <Pills
                  value={pending.deliveryTime}
                  onChange={(v) => setPending((p) => ({ ...p, deliveryTime: v }))}
                  options={[
                    { label: "Any", value: "" },
                    { label: "24h", value: "24" },
                    { label: "48h", value: "48" },
                    { label: "72h", value: "72" },
                  ]}
                />
              </FilterSection>

              <FilterSection label="Warehouse">
                <Pills
                  value={pending.verifiedWarehouse}
                  onChange={(v) => setPending((p) => ({ ...p, verifiedWarehouse: v }))}
                  options={[
                    { label: "All", value: "" },
                    { label: "Verified", value: "1" },
                    { label: "Unverified", value: "2" },
                  ]}
                />
              </FilterSection>

              <FilterSection label="Type">
                <Pills
                  value={pending.productType}
                  onChange={(v) => setPending((p) => ({ ...p, productType: v }))}
                  options={[
                    { label: "All", value: "" },
                    { label: "Supplier", value: "4" },
                    { label: "Video", value: "10" },
                    { label: "Non-video", value: "11" },
                  ]}
                />
              </FilterSection>

              <FilterSection label="Status">
                <Pills
                  value={pending.productFlag}
                  onChange={(v) => setPending((p) => ({ ...p, productFlag: v }))}
                  options={[
                    { label: "All", value: "" },
                    { label: "Trending", value: "0" },
                    { label: "New", value: "1" },
                    { label: "Video", value: "2" },
                    { label: "Slow", value: "3" },
                  ]}
                />
              </FilterSection>

              <FilterSection label="Warehouse country">
                <select
                  value={pending.countryCode}
                  onChange={(e) => setPending((p) => ({ ...p, countryCode: e.target.value }))}
                  className={selectCls}
                >
                  <option value="">All warehouses</option>
                  <option value="CN">China</option>
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                  <option value="AU">Australia</option>
                </select>
              </FilterSection>

              <FilterSection label="Sort">
                <select
                  value={pending.orderBy}
                  onChange={(e) => setPending((p) => ({ ...p, orderBy: e.target.value }))}
                  className={selectCls + " mb-2"}
                >
                  <option value="createAt">Date listed</option>
                  <option value="listedNum">Listing count</option>
                </select>
                <Pills
                  value={pending.sort}
                  onChange={(v) => setPending((p) => ({ ...p, sort: v }))}
                  options={[
                    { label: "Newest", value: "desc" },
                    { label: "Oldest", value: "asc" },
                  ]}
                />
              </FilterSection>
            </div>

            <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
              <button
                onClick={applyFilters}
                className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors active:scale-[0.98]"
              >
                <Search className="h-4 w-4" />
                Search
              </button>
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 min-w-0">
            {/* Active chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {pending.keyWord && (
                  <Chip label={`"${pending.keyWord}"`} onRemove={() => {
                    setPending((p) => ({ ...p, keyWord: "" }));
                  }} />
                )}
                {pending.categoryId && (
                  <Chip
                    label={categories.find((c) => c.categoryId === pending.categoryId)?.categoryName || "Category"}
                    onRemove={() => setPending((p) => ({ ...p, categoryId: "" }))}
                  />
                )}
                {(pending.minPrice || pending.maxPrice) && (
                  <Chip
                    label={`$${pending.minPrice || "0"} – $${pending.maxPrice || "∞"}`}
                    onRemove={() => setPending((p) => ({ ...p, minPrice: "", maxPrice: "" }))}
                  />
                )}
                {pending.isFreeShipping === "1" && (
                  <Chip label="Free shipping" onRemove={() => setPending((p) => ({ ...p, isFreeShipping: "" }))} />
                )}
                {pending.deliveryTime && (
                  <Chip label={`Ships in ${pending.deliveryTime}h`} onRemove={() => setPending((p) => ({ ...p, deliveryTime: "" }))} />
                )}
                {pending.verifiedWarehouse === "1" && (
                  <Chip label="Verified" onRemove={() => setPending((p) => ({ ...p, verifiedWarehouse: "" }))} />
                )}
                {pending.countryCode && (
                  <Chip label={`Warehouse: ${pending.countryCode}`} onRemove={() => setPending((p) => ({ ...p, countryCode: "" }))} />
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-100 mb-5">
                <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-rose-700">Failed to load products</p>
                  <p className="text-[12px] text-rose-600 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Empty */}
            {!loading && !error && products.length === 0 && pagination.total === 0 && (
              <div className="flex flex-col items-center justify-center text-center py-24 px-6">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-5">
                  <Package className="h-7 w-7 text-orange-500" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                  Ready when you are
                </h3>
                <p className="text-sm text-[var(--color-text-muted)] max-w-sm leading-relaxed">
                  Adjust filters in the sidebar and hit <span className="font-medium text-[var(--color-text-primary)]">Search</span> to browse the CJ catalog.
                </p>
              </div>
            )}

            {/* Loading skeleton */}
            {loading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-[3/4] rounded-2xl bg-[var(--color-surface-secondary)] animate-pulse"
                  />
                ))}
              </div>
            )}

            {/* Grid */}
            {!loading && products.length > 0 && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {products.map((product) => (
                    <ProductCard
                      key={product.pid}
                      product={product}
                      imported={importedPids.has(product.pid)}
                      importing={importingPid === product.pid}
                      onImport={() => importProduct(product.pid)}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-1.5 mt-10 pt-6 border-t border-[var(--color-border)]">
                    <button
                      disabled={pagination.page === 1}
                      onClick={() => goPage(pagination.page - 1)}
                      className={pageNavCls}
                    >
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
                          <button
                            key={p}
                            onClick={() => goPage(p)}
                            className={cn(
                              "w-9 h-9 rounded-lg text-[13px] font-medium tabular-nums transition-colors",
                              isActive
                                ? "bg-[var(--color-text-primary)] text-[var(--color-surface)]"
                                : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                            )}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      disabled={pagination.page === totalPages}
                      onClick={() => goPage(pagination.page + 1)}
                      className={pageNavCls}
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

// ─── ProductCard ──────────────────────────────────────────────────────────────

function ProductCard({
  product, imported, importing, onImport,
}: {
  product: CJProduct;
  imported: boolean;
  importing: boolean;
  onImport: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const price = parseFloat(product.discountPrice || product.nowPrice || product.sellPrice || "0");
  const isFree = product.addMarkStatus === 1 || product.isFreeShipping;

  // Truncate long CJ titles before render
  const displayName = product.productNameEn.length > 80
    ? product.productNameEn.slice(0, 77).trim() + "…"
    : product.productNameEn;

  return (
    <article
      className={cn(
        "group relative flex flex-col h-full",
        "bg-[var(--color-surface)] rounded-2xl overflow-hidden",
        "transition-[transform,box-shadow] duration-300 ease-out",
        "hover:-translate-y-0.5",
        imported
          ? "ring-1 ring-emerald-500/30 shadow-[0_8px_24px_-12px_rgba(16,185,129,0.25)]"
          : "ring-1 ring-[var(--color-border)] hover:shadow-[0_12px_32px_-16px_rgba(0,0,0,0.18)]"
      )}
    >
      {/* Image */}
      <div className="relative aspect-square bg-[var(--color-surface-secondary)] overflow-hidden">
        {product.bigImage && !imgError ? (
          <Image
            src={product.bigImage}
            alt={product.productNameEn}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            onError={() => setImgError(true)}
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package className="h-10 w-10 text-[var(--color-text-muted)]/40" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {isFree && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-surface)]/95 backdrop-blur-sm text-[10px] font-medium text-emerald-600">
              <Truck className="h-2.5 w-2.5" strokeWidth={2.5} />
              Free ship
            </span>
          )}
          {product.verifiedWarehouse === 1 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-surface)]/95 backdrop-blur-sm text-[10px] font-medium text-blue-600">
              <ShieldCheck className="h-2.5 w-2.5" strokeWidth={2.5} />
              Verified
            </span>
          )}
        </div>

        {product.isVideo === 1 && (
          <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-[10px] font-medium text-white">
            <Play className="h-2.5 w-2.5 fill-white" />
          </span>
        )}

        {imported && (
          <span className="absolute bottom-2.5 right-2.5 h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-3.5 gap-2">
        <p className="text-[9.5px] font-mono uppercase tracking-[0.06em] text-[var(--color-text-muted)] truncate">
          {product.productSku}
        </p>

        <h3
          title={product.productNameEn}
          className="text-[13px] font-medium leading-snug text-[var(--color-text-primary)] line-clamp-2 min-h-[2.6em]"
        >
          {displayName}
        </h3>

        {/* Meta */}
        <div className="flex items-center gap-2 text-[10.5px] text-[var(--color-text-muted)]">
          {product.listedNum > 0 && (
            <span className="tabular-nums">{product.listedNum.toLocaleString()} sellers</span>
          )}
          {product.deliveryCycle && (
            <>
              <span className="text-[var(--color-border)]">·</span>
              <span>Ships {product.deliveryCycle}d</span>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-auto pt-2 flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-1 min-w-0">
            <span className="text-[16px] font-semibold tabular-nums tracking-tight text-[var(--color-text-primary)]">
              ${price.toFixed(2)}
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)]">USD</span>
          </div>

          <button
            onClick={onImport}
            disabled={imported || importing}
            className={cn(
              "h-8 px-3 rounded-lg text-[11.5px] font-medium transition-all",
              "disabled:cursor-not-allowed",
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
              <span className="inline-flex items-center gap-1">
                <Check className="h-3 w-3" strokeWidth={2.5} />
                Added
              </span>
            ) : (
              "Import"
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)] mb-2">
        {label}
      </p>
      {children}
    </div>
  );
}

function Pills({
  options, value, onChange,
}: {
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
      <button
        onClick={onRemove}
        aria-label="Remove filter"
        className="h-4 w-4 flex items-center justify-center rounded-full hover:bg-orange-500/20 transition-colors"
      >
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