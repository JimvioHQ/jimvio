
// "use client";

// import React, { useState } from "react";
// import Link from "next/link";
// import { MoveProductDialog } from "@/components/admin/MoveProductDialog";
// import { formatCurrency } from "@/lib/utils";

// // ─── Icons ────────────────────────────────────────────────────────────────────
// function PackageIcon({ size = 14 }: { size?: number }) {
//     return (
//         <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
//             <rect x="1.5" y="4" width="13" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
//             <path d="M1.5 7H14.5" stroke="currentColor" strokeWidth="1.2" />
//             <path d="M5.5 4V2.5C5.5 2.2 5.7 2 6 2H10C10.3 2 10.5 2.2 10.5 2.5V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
//             <path d="M6.5 10H9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
//         </svg>
//     );
// }
// function ExternalLinkIcon() {
//     return (
//         <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
//             <path d="M5 2H2C1.4 2 1 2.4 1 3V10C1 10.6 1.4 11 2 11H9C9.6 11 10 10.6 10 10V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
//             <path d="M7 1H11M11 1V5M11 1L5.5 6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
//         </svg>
//     );
// }
// function EditIcon() {
//     return (
//         <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
//             <path d="M9 2L11 4L4.5 10.5H2.5V8.5L9 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
//         </svg>
//     );
// }
// function StarIcon() {
//     return (
//         <svg width="12" height="12" viewBox="0 0 12 12" fill="#f59e0b" aria-hidden="true">
//             <path d="M6 1L7.5 4.5H11L8.5 6.5L9.5 10L6 8L2.5 10L3.5 6.5L1 4.5H4.5L6 1Z" />
//         </svg>
//     );
// }
// function ChevronLeftIcon() {
//     return (
//         <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
//             <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
//         </svg>
//     );
// }
// function ChevronRightIcon() {
//     return (
//         <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
//             <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
//         </svg>
//     );
// }
// function ChevronSortIcon({ dir = "down" }: { dir?: "up" | "down" }) {
//     return (
//         <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"
//             style={{ transform: dir === "up" ? "rotate(180deg)" : undefined }}>
//             <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
//         </svg>
//     );
// }
// function MoveIcon() {
//     return (
//         <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
//             <path d="M2 6.5H11M8 3.5L11 6.5L8 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
//             <path d="M5 3.5L2 6.5L5 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
//         </svg>
//     );
// }

// // ─── Status config ────────────────────────────────────────────────────────────
// const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
//     active: { label: "Active", dot: "#22c55e", bg: "rgba(34,197,94,0.1)", text: "#16a34a" },
//     inactive: { label: "Inactive", dot: "#94a3b8", bg: "rgba(148,163,184,0.1)", text: "#64748b" },
//     draft: { label: "Draft", dot: "#f59e0b", bg: "rgba(245,158,11,0.1)", text: "#d97706" },
//     banned: { label: "Banned", dot: "#ef4444", bg: "rgba(239,68,68,0.1)", text: "#dc2626" },
// };

// function StatusBadge({ status }: { status?: string }) {
//     const cfg = STATUS_CONFIG[status ?? "draft"] ?? STATUS_CONFIG.draft;
//     return (
//         <span style={{
//             display: "inline-flex", alignItems: "center", gap: 5,
//             padding: "3px 8px", borderRadius: 999,
//             background: cfg.bg, color: cfg.text,
//             fontSize: 11, fontWeight: 600,
//         }}>
//             <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
//             {cfg.label}
//         </span>
//     );
// }

// // ─── Product thumbnail ────────────────────────────────────────────────────────
// function parseImages(raw: unknown): string[] {
//     if (!raw) return [];
//     if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string" && x.startsWith("http"));
//     if (typeof raw === "string") {
//         try {
//             const parsed = JSON.parse(raw);
//             if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === "string" && x.startsWith("http"));
//         } catch {
//             if (raw.startsWith("http")) return [raw];
//         }
//     }
//     return [];
// }

// function ProductThumb({ images, name }: { images?: unknown; name: string }) {
//     const [failed, setFailed] = useState(false);
//     const urls = parseImages(images);
//     const src = urls[0] ?? null;
//     return (
//         <div style={{
//             width: 36, height: 36, borderRadius: 8, flexShrink: 0, overflow: "hidden",
//             background: "rgba(253,80,0,0.06)", border: "0.5px solid var(--color-border)",
//             display: "flex", alignItems: "center", justifyContent: "center",
//             color: "rgba(253,80,0,0.35)",
//         }}>
//             {src && !failed ? (
//                 <img src={src} alt={name} onError={() => setFailed(true)}
//                     style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
//             ) : (
//                 <PackageIcon size={16} />
//             )}
//         </div>
//     );
// }

// // ─── Vendor avatar ────────────────────────────────────────────────────────────
// function VendorAvatar({ name, avatarUrl }: { name?: string; avatarUrl?: string }) {
//     const [failed, setFailed] = useState(false);
//     const initial = name?.charAt(0)?.toUpperCase() ?? "?";
//     if (avatarUrl && !failed) {
//         return (
//             <img src={avatarUrl} alt={name ?? "Vendor"} onError={() => setFailed(true)}
//                 style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "0.5px solid var(--color-border)", display: "block" }} />
//         );
//     }
//     return (
//         <span style={{
//             width: 22, height: 22, borderRadius: "50%",
//             background: "var(--color-surface, #f0f0ee)",
//             border: "0.5px solid var(--color-border)",
//             display: "inline-flex", alignItems: "center", justifyContent: "center",
//             fontSize: 9, fontWeight: 700, color: "var(--color-text-secondary)", flexShrink: 0,
//         }}>
//             {initial}
//         </span>
//     );
// }

// // ─── Action button ────────────────────────────────────────────────────────────
// function ActionButton({ href, title, children, external }: {
//     href: string; title: string; children: React.ReactNode; external?: boolean;
// }) {
//     const [hovered, setHovered] = useState(false);
//     return (
//         <Link href={href} title={title}
//             target={external ? "_blank" : undefined}
//             rel={external ? "noopener noreferrer" : undefined}
//             onMouseEnter={() => setHovered(true)}
//             onMouseLeave={() => setHovered(false)}
//             style={{
//                 width: 30, height: 30, borderRadius: 6,
//                 display: "inline-flex", alignItems: "center", justifyContent: "center",
//                 border: `0.5px solid ${hovered ? "var(--color-accent, #fd5000)" : "var(--color-border)"}`,
//                 color: hovered ? "var(--color-accent, #fd5000)" : "var(--color-text-muted, #888)",
//                 textDecoration: "none", background: "var(--color-surface, #f8f8f7)",
//                 transition: "border-color 150ms, color 150ms",
//             }}
//         >
//             {children}
//         </Link>
//     );
// }

// // ─── Checkbox ────────────────────────────────────────────────────────────────
// function Checkbox({ checked, indeterminate, onChange }: {
//     checked: boolean; indeterminate?: boolean; onChange: () => void;
// }) {
//     const ref = React.useRef<HTMLInputElement>(null);
//     React.useEffect(() => {
//         if (ref.current) ref.current.indeterminate = !!indeterminate;
//     }, [indeterminate]);
//     return (
//         <input
//             ref={ref}
//             type="checkbox"
//             checked={checked}
//             onChange={onChange}
//             onClick={(e) => e.stopPropagation()}
//             style={{
//                 width: 15, height: 15, cursor: "pointer",
//                 accentColor: "var(--color-accent, #fd5000)",
//                 borderRadius: 3, flexShrink: 0,
//             }}
//         />
//     );
// }

// // ─── Bulk action bar ──────────────────────────────────────────────────────────
// function BulkActionBar({ selectedIds, onClear, onMoveSuccess }: {
//     selectedIds: string[];
//     onClear: () => void;
//     onMoveSuccess: () => void;
// }) {
//     if (selectedIds.length === 0) return null;
//     return (
//         <div style={{
//             display: "flex", alignItems: "center", justifyContent: "space-between",
//             padding: "10px 16px", gap: 12,
//             background: "var(--color-accent, #fd5000)",
//             color: "#fff",
//             borderRadius: "12px 12px 0 0",
//         }}>
//             {/* Count */}
//             <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
//                 <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
//                     <rect x="2" y="2" width="12" height="12" rx="3" stroke="#fff" strokeWidth="1.3" />
//                     <polyline points="5,8 7,10 11,6" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
//                 </svg>
//                 <span>
//                     <strong>{selectedIds.length}</strong> product{selectedIds.length !== 1 ? "s" : ""} selected
//                 </span>
//             </div>

//             {/* Actions */}
//             <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//                 {/* Bulk move */}
//                 <MoveProductDialog
//                     productIds={selectedIds}
//                     currentVendorName="Various vendors"
//                     onSuccess={onMoveSuccess}
//                     trigger={
//                         <button
//                             style={{
//                                 height: 30, padding: "0 12px", borderRadius: 6,
//                                 background: "rgba(255,255,255,0.2)",
//                                 border: "0.5px solid rgba(255,255,255,0.35)",
//                                 color: "#fff", fontSize: 12, fontWeight: 700,
//                                 display: "inline-flex", alignItems: "center", gap: 5,
//                                 cursor: "pointer", transition: "background 150ms",
//                             }}
//                             onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.3)")}
//                             onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.2)")}
//                         >
//                             <MoveIcon /> Move all to vendor
//                         </button>
//                     }
//                 />

//                 {/* Clear */}
//                 <button
//                     onClick={onClear}
//                     style={{
//                         height: 30, padding: "0 10px", borderRadius: 6,
//                         background: "rgba(255,255,255,0.15)",
//                         border: "0.5px solid rgba(255,255,255,0.25)",
//                         color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
//                         transition: "background 150ms",
//                     }}
//                     onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.25)")}
//                     onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.15)")}
//                 >
//                     Clear
//                 </button>
//             </div>
//         </div>
//     );
// }

// // ─── Table row ────────────────────────────────────────────────────────────────
// function TableRow({ p, selected, onSelect }: {
//     p: any; selected: boolean; onSelect: (id: string) => void;
// }) {
//     const [hovered, setHovered] = useState(false);
//     return (
//         <tr
//             onMouseEnter={() => setHovered(true)}
//             onMouseLeave={() => setHovered(false)}
//             style={{
//                 borderBottom: "0.5px solid var(--color-border)",
//                 background: selected
//                     ? "rgba(253,80,0,0.03)"
//                     : hovered ? "var(--color-surface, #f8f8f7)" : "transparent",
//                 transition: "background 150ms",
//             }}
//         >
//             {/* Checkbox */}
//             <td style={{ padding: "11px 8px 11px 16px", width: 36 }}>
//                 <Checkbox checked={selected} onChange={() => onSelect(p.id)} />
//             </td>

//             {/* Product */}
//             <td style={{ padding: "11px 16px 11px 8px" }}>
//                 <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//                     <ProductThumb images={p.images} name={p.name} />
//                     <div style={{ minWidth: 0 }}>
//                         <p style={{ fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180, color: "var(--color-text-primary)", fontSize: 13 }}>
//                             {p.name}
//                         </p>
//                         <p className="w-48 truncate" style={{ fontSize: 11, color: "var(--color-text-muted, #888)", margin: 0 }}>
//                             {p.slug}
//                         </p>
//                     </div>
//                 </div>
//             </td>

//             {/* Vendor */}
//             <td style={{ padding: "11px 16px", color: "var(--color-text-secondary)", whiteSpace: "nowrap", fontSize: 13 }}>
//                 {p.vendor_name ? (
//                     <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
//                         <VendorAvatar name={p.vendor_name} avatarUrl={p.vendor_avatar_url} />
//                         <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }}>
//                             {p.vendor_name}
//                         </span>
//                     </span>
//                 ) : (
//                     <span style={{ color: "var(--color-text-muted, #aaa)", fontStyle: "italic", fontSize: 12 }}>Unassigned</span>
//                 )}
//             </td>

//             {/* Price */}
//             <td style={{ padding: "11px 16px", fontWeight: 700, color: "var(--color-text-primary)", whiteSpace: "nowrap", fontSize: 13 }}>
//                 {formatCurrency(Number(p.price ?? 0))}
//                 {p.compare_at_price && Number(p.compare_at_price) > Number(p.price) && (
//                     <span style={{ fontSize: 11, color: "var(--color-text-muted, #aaa)", textDecoration: "line-through", marginLeft: 4, fontWeight: 400 }}>
//                         {formatCurrency(Number(p.compare_at_price))}
//                     </span>
//                 )}
//             </td>

//             {/* Status */}
//             <td style={{ padding: "11px 16px" }}>
//                 <StatusBadge status={p.status} />
//             </td>

//             {/* Type */}
//             <td style={{ padding: "11px 16px" }}>
//                 {p.product_type ? (
//                     <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "var(--color-surface, #f0f0ee)", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border)", textTransform: "capitalize" }}>
//                         {p.product_type}
//                     </span>
//                 ) : <span style={{ color: "var(--color-text-muted, #aaa)", fontSize: 12 }}>—</span>}
//             </td>

//             {/* Featured */}
//             <td style={{ padding: "11px 16px" }}>
//                 {p.is_featured ? (
//                     <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "rgba(245,158,11,0.1)", color: "#d97706", border: "0.5px solid rgba(245,158,11,0.2)" }}>
//                         <StarIcon /> Featured
//                     </span>
//                 ) : <span style={{ color: "var(--color-text-muted, #aaa)", fontSize: 12 }}>—</span>}
//             </td>

//             {/* Affiliate */}
//             <td style={{ padding: "11px 16px" }}>
//                 {p.affiliate_enabled ? (
//                     <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "rgba(59,130,246,0.08)", color: "#2563eb", border: "0.5px solid rgba(59,130,246,0.2)" }}>
//                         <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
//                             <path d="M5 1V9M3 3.5C3 2.7 3.9 2 5 2S7 2.7 7 3.5 6.1 5 5 5 3 5.7 3 6.5 3.9 8 5 8s2-.7 2-1.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
//                         </svg>
//                         {p.affiliate_commission_rate ? `${p.affiliate_commission_rate}%` : "On"}
//                     </span>
//                 ) : <span style={{ color: "var(--color-text-muted, #aaa)", fontSize: 12 }}>—</span>}
//             </td>

//             {/* Actions */}
//             <td style={{ padding: "11px 16px", textAlign: "right" }}>
//                 <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
//                     <ActionButton href={`/marketplace/${p.slug}`} title="View on storefront" external>
//                         <ExternalLinkIcon />
//                     </ActionButton>
//                     <ActionButton href={`/admin/products/${p.id}/edit`} title="Edit product">
//                         <EditIcon />
//                     </ActionButton>
//                     <MoveProductDialog productId={p.id} currentVendorName={p.vendor_name} />
//                 </div>
//             </td>
//         </tr>
//     );
// }

// // ─── Empty state ──────────────────────────────────────────────────────────────
// function EmptyState({ query }: { query?: string }) {
//     return (
//         <tr>
//             <td colSpan={9}>
//                 <div style={{ padding: "48px 24px", textAlign: "center" }}>
//                     <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true"
//                         style={{ margin: "0 auto 12px", display: "block" }}>
//                         <rect x="4" y="10" width="40" height="30" rx="4" stroke="var(--color-border)" strokeWidth="1.5" fill="var(--color-surface, #f8f8f7)" />
//                         <path d="M4 18H44" stroke="var(--color-border)" strokeWidth="1.5" />
//                         <circle cx="24" cy="32" r="6" stroke="var(--color-text-muted, #aaa)" strokeWidth="1.2" fill="none" />
//                         <path d="M28.5 36.5L32 40" stroke="var(--color-text-muted, #aaa)" strokeWidth="1.5" strokeLinecap="round" />
//                     </svg>
//                     <p style={{ fontWeight: 700, fontSize: 15, color: "var(--color-text-primary)", margin: "0 0 4px" }}>
//                         {query ? `No results for "${query}"` : "No products found"}
//                     </p>
//                     <p style={{ fontSize: 13, color: "var(--color-text-muted, #888)", margin: 0 }}>
//                         {query ? "Try a different search term or clear the filter." : "Products will appear here once created."}
//                     </p>
//                 </div>
//             </td>
//         </tr>
//     );
// }

// // ─── Pagination ───────────────────────────────────────────────────────────────
// const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }: {
//     page: number; pageSize: number; total: number;
//     onPageChange: (p: number) => void;
//     onPageSizeChange: (s: number) => void;
// }) {
//     const totalPages = Math.max(1, Math.ceil(total / pageSize));
//     const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
//     const to = Math.min(page * pageSize, total);

//     function getPages(): (number | "…")[] {
//         if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
//         const pages: (number | "…")[] = [1];
//         if (page > 3) pages.push("…");
//         for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
//         if (page < totalPages - 2) pages.push("…");
//         pages.push(totalPages);
//         return pages;
//     }

//     const btnBase: React.CSSProperties = {
//         minWidth: 32, height: 32, borderRadius: 6, fontSize: 13,
//         display: "inline-flex", alignItems: "center", justifyContent: "center",
//         border: "0.5px solid var(--color-border)",
//         background: "var(--color-bg, #fff)",
//         color: "var(--color-text-secondary)",
//         cursor: "pointer", padding: "0 6px",
//         transition: "border-color 150ms, background 150ms, color 150ms",
//         fontWeight: 500,
//     };

//     return (
//         <div style={{
//             padding: "12px 16px",
//             borderTop: "0.5px solid var(--color-border)",
//             display: "flex", alignItems: "center",
//             justifyContent: "space-between", flexWrap: "wrap", gap: 10,
//             background: "var(--color-surface, #f8f8f7)",
//         }}>
//             {/* Left */}
//             <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//                 <p style={{ fontSize: 12, color: "var(--color-text-muted, #888)", margin: 0, whiteSpace: "nowrap" }}>
//                     {total === 0 ? "No results" : `${from}–${to} of ${total}`}
//                 </p>
//                 <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
//                     <span style={{ fontSize: 12, color: "var(--color-text-muted, #888)", whiteSpace: "nowrap" }}>Rows</span>
//                     <select
//                         value={pageSize}
//                         onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
//                         style={{ height: 28, padding: "0 24px 0 8px", appearance: "none", border: "0.5px solid var(--color-border)", borderRadius: 6, fontSize: 12, background: "var(--color-bg, #fff)", color: "var(--color-text-primary)", cursor: "pointer", outline: "none" }}
//                     >
//                         {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
//                     </select>
//                 </div>
//             </div>

//             {/* Right */}
//             <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
//                 <button
//                     onClick={() => onPageChange(page - 1)}
//                     disabled={page === 1}
//                     style={{ ...btnBase, opacity: page === 1 ? 0.4 : 1, cursor: page === 1 ? "not-allowed" : "pointer" }}
//                 >
//                     <ChevronLeftIcon />
//                 </button>

//                 {getPages().map((p, i) =>
//                     p === "…" ? (
//                         <span key={`ell-${i}`} style={{ width: 32, textAlign: "center", fontSize: 13, color: "var(--color-text-muted, #aaa)" }}>…</span>
//                     ) : (
//                         <button
//                             key={p}
//                             onClick={() => onPageChange(p as number)}
//                             style={{
//                                 ...btnBase,
//                                 background: p === page ? "var(--color-accent, #fd5000)" : "var(--color-bg, #fff)",
//                                 color: p === page ? "#fff" : "var(--color-text-secondary)",
//                                 borderColor: p === page ? "var(--color-accent, #fd5000)" : "var(--color-border)",
//                                 fontWeight: p === page ? 700 : 500,
//                             }}
//                         >
//                             {p}
//                         </button>
//                     )
//                 )}

//                 <button
//                     onClick={() => onPageChange(page + 1)}
//                     disabled={page === totalPages}
//                     style={{ ...btnBase, opacity: page === totalPages ? 0.4 : 1, cursor: page === totalPages ? "not-allowed" : "pointer" }}
//                 >
//                     <ChevronRightIcon />
//                 </button>
//             </div>
//         </div>
//     );
// }

// // ─── Main export ──────────────────────────────────────────────────────────────
// export function ProductsTable({ products, total, sort, order, query }: {
//     products: any[];
//     total: number;
//     sort: string;
//     order: string;
//     query?: string;
// }) {
//     const [page, setPage] = useState(1);
//     const [pageSize, setPageSize] = useState(25);
//     const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

//     // Reset page on dataset change
//     React.useEffect(() => { setPage(1); }, [products.length, sort, order]);
//     // Clear selection when products change (filter / sort applied)
//     React.useEffect(() => { setSelectedIds(new Set()); }, [products]);

//     const paginated = products.slice((page - 1) * pageSize, page * pageSize);
//     const pageIds = paginated.map((p) => p.id);
//     const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
//     const someSelected = pageIds.some((id) => selectedIds.has(id));

//     function toggleOne(id: string) {
//         setSelectedIds((prev) => {
//             const next = new Set(prev);
//             next.has(id) ? next.delete(id) : next.add(id);
//             return next;
//         });
//     }

//     function toggleAll() {
//         setSelectedIds((prev) => {
//             const next = new Set(prev);
//             if (allSelected) {
//                 pageIds.forEach((id) => next.delete(id));
//             } else {
//                 pageIds.forEach((id) => next.add(id));
//             }
//             return next;
//         });
//     }

//     function clearSelection() { setSelectedIds(new Set()); }

//     const hasBulk = selectedIds.size > 0;

//     const thStyle: React.CSSProperties = {
//         padding: "10px 16px", textAlign: "left",
//         fontSize: 11, fontWeight: 700, letterSpacing: "0.07em",
//         textTransform: "uppercase", color: "var(--color-text-muted, #888)",
//         whiteSpace: "nowrap",
//     };

//     function SortLink({ col, children }: { col: string; children: React.ReactNode }) {
//         const active = sort === col;
//         const nextOrder = active && order === "asc" ? "desc" : "asc";
//         const params = new URLSearchParams({ ...(query ? { q: query } : {}), sort: col, order: nextOrder });
//         return (
//             <Link
//                 href={`/admin/products?${params}`}
//                 style={{ display: "inline-flex", alignItems: "center", gap: 4, color: active ? "var(--color-accent, #fd5000)" : "inherit", textDecoration: "none" }}
//             >
//                 {children}
//                 {active
//                     ? <ChevronSortIcon dir={order === "asc" ? "up" : "down"} />
//                     : <span style={{ width: 12 }} />
//                 }
//             </Link>
//         );
//     }

//     return (
//         <div>
//             {/* Bulk action bar — renders above table when rows selected */}
//             <BulkActionBar
//                 selectedIds={[...selectedIds]}
//                 onClear={clearSelection}
//                 onMoveSuccess={clearSelection}
//             />

//             <div style={{
//                 background: "var(--color-bg, #fff)",
//                 border: "0.5px solid var(--color-border)",
//                 // Seamlessly connect to bulk bar when active
//                 borderRadius: hasBulk ? "0 0 12px 12px" : 12,
//                 overflow: "hidden",
//                 // Subtle top border accent when bulk bar is showing
//                 borderTop: hasBulk ? "none" : "0.5px solid var(--color-border)",
//             }}>
//                 <div style={{ overflowX: "auto" }}>
//                     <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
//                         <thead>
//                             <tr style={{ borderBottom: "0.5px solid var(--color-border)", background: "var(--color-surface, #f8f8f7)" }}>
//                                 {/* Select-all */}
//                                 <th style={{ ...thStyle, padding: "10px 8px 10px 16px", width: 36 }}>
//                                     <Checkbox
//                                         checked={allSelected}
//                                         indeterminate={someSelected && !allSelected}
//                                         onChange={toggleAll}
//                                     />
//                                 </th>
//                                 <th style={{ ...thStyle, paddingLeft: 8 }}><SortLink col="name">Product</SortLink></th>
//                                 <th style={thStyle}>Vendor</th>
//                                 <th style={thStyle}><SortLink col="price">Price</SortLink></th>
//                                 <th style={thStyle}><SortLink col="status">Status</SortLink></th>
//                                 <th style={thStyle}>Type</th>
//                                 <th style={thStyle}>Featured</th>
//                                 <th style={thStyle}>Affiliate</th>
//                                 <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
//                             </tr>
//                         </thead>
//                         <tbody>
//                             {paginated.length === 0
//                                 ? <EmptyState query={query} />
//                                 : paginated.map((p) => (
//                                     <TableRow
//                                         key={p.id}
//                                         p={p}
//                                         selected={selectedIds.has(p.id)}
//                                         onSelect={toggleOne}
//                                     />
//                                 ))
//                             }
//                         </tbody>
//                     </table>
//                 </div>

//                 <Pagination
//                     page={page}
//                     pageSize={pageSize}
//                     total={products.length}
//                     onPageChange={setPage}
//                     onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
//                 />
//             </div>
//         </div>
//     );
// }

// components/admin/products-table.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MoveProductDialog } from "@/components/admin/MoveProductDialog";
import { formatCurrency } from "@/lib/utils";
import { Edit2, SquarePen } from "lucide-react";

// ─── Icons ────────────────────────────────────────────────────────────────────
function PackageIcon({ size = 14 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="1.5" y="4" width="13" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M1.5 7H14.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M5.5 4V2.5C5.5 2.2 5.7 2 6 2H10C10.3 2 10.5 2.2 10.5 2.5V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M6.5 10H9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
    );
}
function ExternalLinkIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M5 2H2C1.4 2 1 2.4 1 3V10C1 10.6 1.4 11 2 11H9C9.6 11 10 10.6 10 10V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <path d="M7 1H11M11 1V5M11 1L5.5 6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
function EditIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
            <path d="M9 2L11 4L4.5 10.5H2.5V8.5L9 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
function StarIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="#f59e0b" aria-hidden="true">
            <path d="M6 1L7.5 4.5H11L8.5 6.5L9.5 10L6 8L2.5 10L3.5 6.5L1 4.5H4.5L6 1Z" />
        </svg>
    );
}
function ChevronLeftIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
function ChevronRightIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
function ChevronSortIcon({ dir = "down" }: { dir?: "up" | "down" }) {
    return (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"
            style={{ transform: dir === "up" ? "rotate(180deg)" : undefined }}>
            <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
function MoveIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
            <path d="M2 6.5H11M8 3.5L11 6.5L8 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 3.5L2 6.5L5 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
function TrashIcon({ size = 13 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 13 13" fill="none" aria-hidden="true">
            <path d="M2 3.5H11M4.5 3.5V2.5C4.5 2.2 4.7 2 5 2H8C8.3 2 8.5 2.2 8.5 2.5V3.5M5.5 6V9.5M7.5 6V9.5M3 3.5L3.5 10.5C3.5 10.8 3.7 11 4 11H9C9.3 11 9.5 10.8 9.5 10.5L10 3.5"
                stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
    active: { label: "Active", dot: "#22c55e", bg: "rgba(34,197,94,0.1)", text: "#16a34a" },
    inactive: { label: "Inactive", dot: "#94a3b8", bg: "rgba(148,163,184,0.1)", text: "#64748b" },
    draft: { label: "Draft", dot: "#f59e0b", bg: "rgba(245,158,11,0.1)", text: "#d97706" },
    banned: { label: "Banned", dot: "#ef4444", bg: "rgba(239,68,68,0.1)", text: "#dc2626" },
};

function StatusBadge({ status }: { status?: string }) {
    const cfg = STATUS_CONFIG[status ?? "draft"] ?? STATUS_CONFIG.draft;
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 8px", borderRadius: 999,
            background: cfg.bg, color: cfg.text,
            fontSize: 11, fontWeight: 600,
        }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
            {cfg.label}
        </span>
    );
}

// ─── Product thumbnail ────────────────────────────────────────────────────────
function parseImages(raw: unknown): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string" && x.startsWith("http"));
    if (typeof raw === "string") {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === "string" && x.startsWith("http"));
        } catch {
            if (raw.startsWith("http")) return [raw];
        }
    }
    return [];
}

function ProductThumb({ images, name }: { images?: unknown; name: string }) {
    const [failed, setFailed] = useState(false);
    const urls = parseImages(images);
    const src = urls[0] ?? null;
    return (
        <div style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0, overflow: "hidden",
            background: "rgba(253,80,0,0.06)", border: "0.5px solid var(--color-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "rgba(253,80,0,0.35)",
        }}>
            {src && !failed ? (
                <img src={src} alt={name} onError={() => setFailed(true)}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            ) : (
                <PackageIcon size={16} />
            )}
        </div>
    );
}

// ─── Vendor avatar ────────────────────────────────────────────────────────────
function VendorAvatar({ name, avatarUrl }: { name?: string; avatarUrl?: string }) {
    const [failed, setFailed] = useState(false);
    const initial = name?.charAt(0)?.toUpperCase() ?? "?";
    if (avatarUrl && !failed) {
        return (
            <img src={avatarUrl} alt={name ?? "Vendor"} onError={() => setFailed(true)}
                style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "0.5px solid var(--color-border)", display: "block" }} />
        );
    }
    return (
        <span style={{
            width: 22, height: 22, borderRadius: "50%",
            background: "var(--color-surface, #f0f0ee)",
            border: "0.5px solid var(--color-border)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, fontWeight: 700, color: "var(--color-text-secondary)", flexShrink: 0,
        }}>
            {initial}
        </span>
    );
}

// ─── Action button (link) ─────────────────────────────────────────────────────
function ActionButton({ href, title, children, external }: {
    href: string; title: string; children: React.ReactNode; external?: boolean;
}) {
    const [hovered, setHovered] = useState(false);
    return (
        <Link href={href} title={title}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                width: 30, height: 30, borderRadius: 6,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                border: `0.5px solid ${hovered ? "var(--color-accent, #fd5000)" : "var(--color-border)"}`,
                color: hovered ? "var(--color-accent, #fd5000)" : "var(--color-text-muted, #888)",
                textDecoration: "none", background: "var(--color-surface, #f8f8f7)",
                transition: "border-color 150ms, color 150ms",
            }}
        >
            {children}
        </Link>
    );
}

// ─── Delete action button ─────────────────────────────────────────────────────
function DeleteButton({ onClick }: { onClick: () => void }) {
    const [hovered, setHovered] = useState(false);
    return (
        <button
            onClick={onClick}
            title="Delete product"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                width: 30, height: 30, borderRadius: 6,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                border: `0.5px solid ${hovered ? "rgba(239,68,68,0.5)" : "var(--color-border)"}`,
                color: hovered ? "#ef4444" : "var(--color-text-muted, #888)",
                background: hovered ? "rgba(239,68,68,0.06)" : "var(--color-surface, #f8f8f7)",
                cursor: "pointer",
                transition: "border-color 150ms, color 150ms, background 150ms",
            }}
        >
            <TrashIcon />
        </button>
    );
}

// ─── Checkbox ────────────────────────────────────────────────────────────────
function Checkbox({ checked, indeterminate, onChange }: {
    checked: boolean; indeterminate?: boolean; onChange: () => void;
}) {
    const ref = React.useRef<HTMLInputElement>(null);
    React.useEffect(() => {
        if (ref.current) ref.current.indeterminate = !!indeterminate;
    }, [indeterminate]);
    return (
        <input
            ref={ref}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            onClick={(e) => e.stopPropagation()}
            style={{
                width: 15, height: 15, cursor: "pointer",
                accentColor: "var(--color-accent, #fd5000)",
                borderRadius: 3, flexShrink: 0,
            }}
        />
    );
}

// ─── Confirm delete dialog ────────────────────────────────────────────────────
function ConfirmDeleteDialog({
    open,
    count,
    productName,
    onConfirm,
    onCancel,
    loading,
}: {
    open: boolean;
    count: number;
    productName?: string;
    onConfirm: () => void;
    onCancel: () => void;
    loading: boolean;
}) {
    if (!open) return null;
    const isBulk = count > 1;
    const label = isBulk ? `${count} products` : `"${productName}"`;

    return (
        <div
            onClick={onCancel}
            style={{
                position: "fixed", inset: 0, zIndex: 50,
                background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)",
                display: "flex", alignItems: "center", justifyContent: "center",
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "var(--color-bg, #fff)",
                    border: "0.5px solid var(--color-border)",
                    borderRadius: 14, padding: "28px 28px 22px",
                    width: 360, maxWidth: "90vw",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                }}
            >
                {/* Icon */}
                <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: "rgba(239,68,68,0.08)",
                    border: "0.5px solid rgba(239,68,68,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 16, color: "#ef4444",
                }}>
                    <TrashIcon size={20} />
                </div>

                <p style={{ fontWeight: 700, fontSize: 15, margin: "0 0 6px", color: "var(--color-text-primary)" }}>
                    Delete {label}?
                </p>
                <p style={{ fontSize: 13, color: "var(--color-text-muted, #888)", margin: "0 0 22px", lineHeight: 1.5 }}>
                    {isBulk
                        ? `You're about to permanently delete ${count} products. This cannot be undone.`
                        : `You're about to permanently delete this product. This cannot be undone.`
                    }
                </p>

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        style={{
                            height: 34, padding: "0 16px", borderRadius: 7,
                            border: "0.5px solid var(--color-border)",
                            background: "var(--color-surface, #f8f8f7)",
                            color: "var(--color-text-secondary)",
                            fontSize: 13, fontWeight: 600,
                            cursor: loading ? "not-allowed" : "pointer",
                            opacity: loading ? 0.6 : 1,
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        style={{
                            height: 34, padding: "0 16px", borderRadius: 7,
                            border: "none",
                            background: loading ? "rgba(239,68,68,0.5)" : "#ef4444",
                            color: "#fff",
                            fontSize: 13, fontWeight: 700,
                            cursor: loading ? "not-allowed" : "pointer",
                            display: "inline-flex", alignItems: "center", gap: 6,
                            transition: "background 150ms",
                        }}
                    >
                        {loading ? (
                            <>
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                                    style={{ animation: "pt-spin 0.7s linear infinite" }}>
                                    <circle cx="6" cy="6" r="4.5" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
                                    <path d="M6 1.5A4.5 4.5 0 0 1 10.5 6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                                Deleting…
                            </>
                        ) : (
                            <>
                                <TrashIcon size={12} /> Delete
                            </>
                        )}
                    </button>
                </div>
            </div>
            <style>{`@keyframes pt-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

// ─── Bulk action bar ──────────────────────────────────────────────────────────
function BulkActionBar({ selectedIds, onClear, onMoveSuccess, onDeleteRequest }: {
    selectedIds: string[];
    onClear: () => void;
    onMoveSuccess: () => void;
    onDeleteRequest: () => void;
}) {
    if (selectedIds.length === 0) return null;

    const ghostBtn: React.CSSProperties = {
        height: 30, padding: "0 12px", borderRadius: 6,
        background: "rgba(255,255,255,0.2)",
        border: "0.5px solid rgba(255,255,255,0.35)",
        color: "#fff", fontSize: 12, fontWeight: 700,
        display: "inline-flex", alignItems: "center", gap: 5,
        cursor: "pointer", transition: "background 150ms",
    };

    const dangerBtn: React.CSSProperties = {
        height: 30, padding: "0 12px", borderRadius: 6,
        background: "rgba(239,68,68,0.2)",
        border: "0.5px solid rgba(239,68,68,0.45)",
        color: "#fff", fontSize: 12, fontWeight: 700,
        display: "inline-flex", alignItems: "center", gap: 5,
        cursor: "pointer", transition: "background 150ms",
    };

    return (
        <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 16px", gap: 12,
            background: "var(--color-accent, #fd5000)",
            color: "#fff", borderRadius: "12px 12px 0 0",
        }}>
            {/* Count */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <rect x="2" y="2" width="12" height="12" rx="3" stroke="#fff" strokeWidth="1.3" />
                    <polyline points="5,8 7,10 11,6" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>
                    <strong>{selectedIds.length}</strong> product{selectedIds.length !== 1 ? "s" : ""} selected
                </span>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* Bulk move */}
                <MoveProductDialog
                    productIds={selectedIds}
                    currentVendorName="Various vendors"
                    onSuccess={onMoveSuccess}
                    trigger={
                        <button
                            style={ghostBtn}
                            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.3)")}
                            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.2)")}
                        >
                            <MoveIcon /> Move all to vendor
                        </button>
                    }
                />

                {/* Bulk delete */}
                <button
                    onClick={onDeleteRequest}
                    style={dangerBtn}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.35)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.2)")}
                >
                    <TrashIcon size={12} /> Delete all
                </button>

                {/* Clear */}
                <button
                    onClick={onClear}
                    style={{
                        height: 30, padding: "0 10px", borderRadius: 6,
                        background: "rgba(255,255,255,0.15)",
                        border: "0.5px solid rgba(255,255,255,0.25)",
                        color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
                        transition: "background 150ms",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.25)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.15)")}
                >
                    Clear
                </button>
            </div>
        </div>
    );
}

// ─── Table row ────────────────────────────────────────────────────────────────
function TableRow({ p, selected, onSelect, onDeleteRequest }: {
    p: any;
    selected: boolean;
    onSelect: (id: string) => void;
    onDeleteRequest: (id: string, name: string) => void;
}) {
    const [hovered, setHovered] = useState(false);
    return (
        <tr
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                borderBottom: "0.5px solid var(--color-border)",
                background: selected
                    ? "rgba(253,80,0,0.03)"
                    : hovered ? "var(--color-surface, #f8f8f7)" : "transparent",
                transition: "background 150ms",
            }}
        >
            {/* Checkbox */}
            <td style={{ padding: "11px 8px 11px 16px", width: 36 }}>
                <Checkbox checked={selected} onChange={() => onSelect(p.id)} />
            </td>

            {/* Product */}
            <td style={{ padding: "11px 16px 11px 8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <ProductThumb images={p.images} name={p.name} />
                    <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180, color: "var(--color-text-primary)", fontSize: 13 }}>
                            {p.name}
                        </p>
                        <p className="w-48 truncate" style={{ fontSize: 11, color: "var(--color-text-muted, #888)", margin: 0 }}>
                            {p.slug}
                        </p>
                    </div>
                </div>
            </td>

            {/* Vendor */}
            <td style={{ padding: "11px 16px", color: "var(--color-text-secondary)", whiteSpace: "nowrap", fontSize: 13 }}>
                {p.vendor_name ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <VendorAvatar name={p.vendor_name} avatarUrl={p.vendor_avatar_url} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }}>
                            {p.vendor_name}
                        </span>
                    </span>
                ) : (
                    <span style={{ color: "var(--color-text-muted, #aaa)", fontStyle: "italic", fontSize: 12 }}>Unassigned</span>
                )}
            </td>

            {/* Price */}
            <td style={{ padding: "11px 16px", fontWeight: 700, color: "var(--color-text-primary)", whiteSpace: "nowrap", fontSize: 13 }}>
                {formatCurrency(Number(p.price ?? 0))}
                {p.compare_at_price && Number(p.compare_at_price) > Number(p.price) && (
                    <span style={{ fontSize: 11, color: "var(--color-text-muted, #aaa)", textDecoration: "line-through", marginLeft: 4, fontWeight: 400 }}>
                        {formatCurrency(Number(p.compare_at_price))}
                    </span>
                )}
            </td>

            {/* Status */}
            <td style={{ padding: "11px 16px" }}>
                <StatusBadge status={p.status} />
            </td>

            {/* Type */}
            <td style={{ padding: "11px 16px" }}>
                {p.product_type ? (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "var(--color-surface, #f0f0ee)", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border)", textTransform: "capitalize" }}>
                        {p.product_type}
                    </span>
                ) : <span style={{ color: "var(--color-text-muted, #aaa)", fontSize: 12 }}>—</span>}
            </td>

            {/* Featured */}
            <td style={{ padding: "11px 16px" }}>
                {p.is_featured ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "rgba(245,158,11,0.1)", color: "#d97706", border: "0.5px solid rgba(245,158,11,0.2)" }}>
                        <StarIcon /> Featured
                    </span>
                ) : <span style={{ color: "var(--color-text-muted, #aaa)", fontSize: 12 }}>—</span>}
            </td>

            {/* Affiliate */}
            <td style={{ padding: "11px 16px" }}>
                {p.affiliate_enabled ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "rgba(59,130,246,0.08)", color: "#2563eb", border: "0.5px solid rgba(59,130,246,0.2)" }}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                            <path d="M5 1V9M3 3.5C3 2.7 3.9 2 5 2S7 2.7 7 3.5 6.1 5 5 5 3 5.7 3 6.5 3.9 8 5 8s2-.7 2-1.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                        </svg>
                        {p.affiliate_commission_rate ? `${p.affiliate_commission_rate}%` : "On"}
                    </span>
                ) : <span style={{ color: "var(--color-text-muted, #aaa)", fontSize: 12 }}>—</span>}
            </td>

            {/* Actions */}
            <td style={{ padding: "11px 16px", textAlign: "right" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <ActionButton href={`/marketplace/${p.slug}`} title="View on storefront" external>
                        <ExternalLinkIcon />
                    </ActionButton>
                    <ActionButton href={`/admin/products/${p.id}/edit`} title="Edit product">
                        <SquarePen size={14} />
                    </ActionButton>
                    <MoveProductDialog productId={p.id} currentVendorName={p.vendor_name} />
                    <DeleteButton onClick={() => onDeleteRequest(p.id, p.name)} />
                </div>
            </td>
        </tr>
    );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ query }: { query?: string }) {
    return (
        <tr>
            <td colSpan={9}>
                <div style={{ padding: "48px 24px", textAlign: "center" }}>
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true"
                        style={{ margin: "0 auto 12px", display: "block" }}>
                        <rect x="4" y="10" width="40" height="30" rx="4" stroke="var(--color-border)" strokeWidth="1.5" fill="var(--color-surface, #f8f8f7)" />
                        <path d="M4 18H44" stroke="var(--color-border)" strokeWidth="1.5" />
                        <circle cx="24" cy="32" r="6" stroke="var(--color-text-muted, #aaa)" strokeWidth="1.2" fill="none" />
                        <path d="M28.5 36.5L32 40" stroke="var(--color-text-muted, #aaa)" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <p style={{ fontWeight: 700, fontSize: 15, color: "var(--color-text-primary)", margin: "0 0 4px" }}>
                        {query ? `No results for "${query}"` : "No products found"}
                    </p>
                    <p style={{ fontSize: 13, color: "var(--color-text-muted, #888)", margin: 0 }}>
                        {query ? "Try a different search term or clear the filter." : "Products will appear here once created."}
                    </p>
                </div>
            </td>
        </tr>
    );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }: {
    page: number; pageSize: number; total: number;
    onPageChange: (p: number) => void;
    onPageSizeChange: (s: number) => void;
}) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);

    function getPages(): (number | "…")[] {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        const pages: (number | "…")[] = [1];
        if (page > 3) pages.push("…");
        for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
        if (page < totalPages - 2) pages.push("…");
        pages.push(totalPages);
        return pages;
    }

    const btnBase: React.CSSProperties = {
        minWidth: 32, height: 32, borderRadius: 6, fontSize: 13,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        border: "0.5px solid var(--color-border)",
        background: "var(--color-bg, #fff)",
        color: "var(--color-text-secondary)",
        cursor: "pointer", padding: "0 6px",
        transition: "border-color 150ms, background 150ms, color 150ms",
        fontWeight: 500,
    };

    return (
        <div style={{
            padding: "12px 16px",
            borderTop: "0.5px solid var(--color-border)",
            display: "flex", alignItems: "center",
            justifyContent: "space-between", flexWrap: "wrap", gap: 10,
            background: "var(--color-surface, #f8f8f7)",
        }}>
            {/* Left */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <p style={{ fontSize: 12, color: "var(--color-text-muted, #888)", margin: 0, whiteSpace: "nowrap" }}>
                    {total === 0 ? "No results" : `${from}–${to} of ${total}`}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, color: "var(--color-text-muted, #888)", whiteSpace: "nowrap" }}>Rows</span>
                    <select
                        value={pageSize}
                        onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
                        style={{ height: 28, padding: "0 24px 0 8px", appearance: "none", border: "0.5px solid var(--color-border)", borderRadius: 6, fontSize: 12, background: "var(--color-bg, #fff)", color: "var(--color-text-primary)", cursor: "pointer", outline: "none" }}
                    >
                        {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {/* Right */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page === 1}
                    style={{ ...btnBase, opacity: page === 1 ? 0.4 : 1, cursor: page === 1 ? "not-allowed" : "pointer" }}
                >
                    <ChevronLeftIcon />
                </button>

                {getPages().map((p, i) =>
                    p === "…" ? (
                        <span key={`ell-${i}`} style={{ width: 32, textAlign: "center", fontSize: 13, color: "var(--color-text-muted, #aaa)" }}>…</span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => onPageChange(p as number)}
                            style={{
                                ...btnBase,
                                background: p === page ? "var(--color-accent, #fd5000)" : "var(--color-bg, #fff)",
                                color: p === page ? "#fff" : "var(--color-text-secondary)",
                                borderColor: p === page ? "var(--color-accent, #fd5000)" : "var(--color-border)",
                                fontWeight: p === page ? 700 : 500,
                            }}
                        >
                            {p}
                        </button>
                    )
                )}

                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page === totalPages}
                    style={{ ...btnBase, opacity: page === totalPages ? 0.4 : 1, cursor: page === totalPages ? "not-allowed" : "pointer" }}
                >
                    <ChevronRightIcon />
                </button>
            </div>
        </div>
    );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function ProductsTable({ products, total, sort, order, query }: {
    products: any[];
    total: number;
    sort: string;
    order: string;
    query?: string;
}) {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Delete dialog state
    const [deleteDialog, setDeleteDialog] = useState<{
        open: boolean;
        ids: string[];
        productName?: string;
        loading: boolean;
    }>({ open: false, ids: [], loading: false });

    // Reset page on dataset change
    React.useEffect(() => { setPage(1); }, [products.length, sort, order]);
    // Clear selection when products change (filter / sort applied)
    React.useEffect(() => { setSelectedIds(new Set()); }, [products]);

    const paginated = products.slice((page - 1) * pageSize, page * pageSize);
    const pageIds = paginated.map((p) => p.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
    const someSelected = pageIds.some((id) => selectedIds.has(id));

    function toggleOne(id: string) {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    function toggleAll() {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (allSelected) {
                pageIds.forEach((id) => next.delete(id));
            } else {
                pageIds.forEach((id) => next.add(id));
            }
            return next;
        });
    }

    function clearSelection() { setSelectedIds(new Set()); }

    // Open delete dialog — single row
    function requestDeleteOne(id: string, name: string) {
        setDeleteDialog({ open: true, ids: [id], productName: name, loading: false });
    }

    // Open delete dialog — bulk
    function requestDeleteBulk() {
        setDeleteDialog({ open: true, ids: [...selectedIds], productName: undefined, loading: false });
    }

    // Execute delete
    async function confirmDelete() {
        setDeleteDialog((d) => ({ ...d, loading: true }));
        try {
            await fetch("/api/admin/products/bulk-delete", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: deleteDialog.ids }),
            });
            setSelectedIds((prev) => {
                const next = new Set(prev);
                deleteDialog.ids.forEach((id) => next.delete(id));
                return next;
            });
        } finally {
            setDeleteDialog({ open: false, ids: [], loading: false });
            window.location.reload();
        }
    }

    const hasBulk = selectedIds.size > 0;

    const thStyle: React.CSSProperties = {
        padding: "10px 16px", textAlign: "left",
        fontSize: 11, fontWeight: 700, letterSpacing: "0.07em",
        textTransform: "uppercase", color: "var(--color-text-muted, #888)",
        whiteSpace: "nowrap",
    };

    function SortLink({ col, children }: { col: string; children: React.ReactNode }) {
        const active = sort === col;
        const nextOrder = active && order === "asc" ? "desc" : "asc";
        const params = new URLSearchParams({ ...(query ? { q: query } : {}), sort: col, order: nextOrder });
        return (
            <Link
                href={`/admin/products?${params}`}
                style={{ display: "inline-flex", alignItems: "center", gap: 4, color: active ? "var(--color-accent, #fd5000)" : "inherit", textDecoration: "none" }}
            >
                {children}
                {active
                    ? <ChevronSortIcon dir={order === "asc" ? "up" : "down"} />
                    : <span style={{ width: 12 }} />
                }
            </Link>
        );
    }

    return (
        <div>
            {/* Confirm delete dialog */}
            <ConfirmDeleteDialog
                open={deleteDialog.open}
                count={deleteDialog.ids.length}
                productName={deleteDialog.productName}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteDialog((d) => ({ ...d, open: false }))}
                loading={deleteDialog.loading}
            />

            {/* Bulk action bar */}
            <BulkActionBar
                selectedIds={[...selectedIds]}
                onClear={clearSelection}
                onMoveSuccess={clearSelection}
                onDeleteRequest={requestDeleteBulk}
            />

            <div style={{
                background: "var(--color-bg, #fff)",
                border: "0.5px solid var(--color-border)",
                borderRadius: hasBulk ? "0 0 12px 12px" : 12,
                overflow: "hidden",
                borderTop: hasBulk ? "none" : "0.5px solid var(--color-border)",
            }}>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                            <tr style={{ borderBottom: "0.5px solid var(--color-border)", background: "var(--color-surface, #f8f8f7)" }}>
                                {/* Select-all */}
                                <th style={{ ...thStyle, padding: "10px 8px 10px 16px", width: 36 }}>
                                    <Checkbox
                                        checked={allSelected}
                                        indeterminate={someSelected && !allSelected}
                                        onChange={toggleAll}
                                    />
                                </th>
                                <th style={{ ...thStyle, paddingLeft: 8 }}><SortLink col="name">Product</SortLink></th>
                                <th style={thStyle}>Vendor</th>
                                <th style={thStyle}><SortLink col="price">Price</SortLink></th>
                                <th style={thStyle}><SortLink col="status">Status</SortLink></th>
                                <th style={thStyle}>Type</th>
                                <th style={thStyle}>Featured</th>
                                <th style={thStyle}>Affiliate</th>
                                <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.length === 0
                                ? <EmptyState query={query} />
                                : paginated.map((p) => (
                                    <TableRow
                                        key={p.id}
                                        p={p}
                                        selected={selectedIds.has(p.id)}
                                        onSelect={toggleOne}
                                        onDeleteRequest={requestDeleteOne}
                                    />
                                ))
                            }
                        </tbody>
                    </table>
                </div>

                <Pagination
                    page={page}
                    pageSize={pageSize}
                    total={products.length}
                    onPageChange={setPage}
                    onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
                />
            </div>
        </div>
    );
}