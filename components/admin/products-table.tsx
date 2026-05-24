// "use client";

// import React, { useEffect, useState } from "react";
// import Link from "next/link";
// import { MoveProductDialog } from "@/components/admin/MoveProductDialog";
// import { EmptyState } from "@/components/ui/admin";
// import { formatCurrency } from "@/lib/utils";
// import { Edit2, SquarePen } from "lucide-react";

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
// function TrashIcon({ size = 13 }: { size?: number }) {
//     return (
//         <svg width={size} height={size} viewBox="0 0 13 13" fill="none" aria-hidden="true">
//             <path d="M2 3.5H11M4.5 3.5V2.5C4.5 2.2 4.7 2 5 2H8C8.3 2 8.5 2.2 8.5 2.5V3.5M5.5 6V9.5M7.5 6V9.5M3 3.5L3.5 10.5C3.5 10.8 3.7 11 4 11H9C9.3 11 9.5 10.8 9.5 10.5L10 3.5"
//                 stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
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

// // ─── Action button (link) ─────────────────────────────────────────────────────
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

// // ─── Delete action button ─────────────────────────────────────────────────────
// function DeleteButton({ onClick }: { onClick: () => void }) {
//     const [hovered, setHovered] = useState(false);
//     return (
//         <button
//             onClick={onClick}
//             title="Delete product"
//             onMouseEnter={() => setHovered(true)}
//             onMouseLeave={() => setHovered(false)}
//             style={{
//                 width: 30, height: 30, borderRadius: 6,
//                 display: "inline-flex", alignItems: "center", justifyContent: "center",
//                 border: `0.5px solid ${hovered ? "rgba(239,68,68,0.5)" : "var(--color-border)"}`,
//                 color: hovered ? "#ef4444" : "var(--color-text-muted, #888)",
//                 background: hovered ? "rgba(239,68,68,0.06)" : "var(--color-surface, #f8f8f7)",
//                 cursor: "pointer",
//                 transition: "border-color 150ms, color 150ms, background 150ms",
//             }}
//         >
//             <TrashIcon />
//         </button>
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

// // ─── Confirm delete dialog ────────────────────────────────────────────────────
// function ConfirmDeleteDialog({
//     open,
//     count,
//     productName,
//     onConfirm,
//     onCancel,
//     loading,
// }: {
//     open: boolean;
//     count: number;
//     productName?: string;
//     onConfirm: () => void;
//     onCancel: () => void;
//     loading: boolean;
// }) {
//     if (!open) return null;
//     const isBulk = count > 1;
//     const label = isBulk ? `${count} products` : `"${productName}"`;

//     return (
//         <div
//             onClick={onCancel}
//             style={{
//                 position: "fixed", inset: 0, zIndex: 50,
//                 background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)",
//                 display: "flex", alignItems: "center", justifyContent: "center",
//             }}
//         >
//             <div
//                 onClick={(e) => e.stopPropagation()}
//                 style={{
//                     background: "var(--color-bg, #fff)",
//                     border: "0.5px solid var(--color-border)",
//                     borderRadius: 14, padding: "28px 28px 22px",
//                     width: 360, maxWidth: "90vw",
//                     boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
//                 }}
//             >
//                 {/* Icon */}
//                 <div style={{
//                     width: 44, height: 44, borderRadius: 12,
//                     background: "rgba(239,68,68,0.08)",
//                     border: "0.5px solid rgba(239,68,68,0.2)",
//                     display: "flex", alignItems: "center", justifyContent: "center",
//                     marginBottom: 16, color: "#ef4444",
//                 }}>
//                     <TrashIcon size={20} />
//                 </div>

//                 <p style={{ fontWeight: 700, fontSize: 15, margin: "0 0 6px", color: "var(--color-text-primary)" }}>
//                     Delete {label}?
//                 </p>
//                 <p style={{ fontSize: 13, color: "var(--color-text-muted, #888)", margin: "0 0 22px", lineHeight: 1.5 }}>
//                     {isBulk
//                         ? `You're about to permanently delete ${count} products. This cannot be undone.`
//                         : `You're about to permanently delete this product. This cannot be undone.`
//                     }
//                 </p>

//                 <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
//                     <button
//                         onClick={onCancel}
//                         disabled={loading}
//                         style={{
//                             height: 34, padding: "0 16px", borderRadius: 7,
//                             border: "0.5px solid var(--color-border)",
//                             background: "var(--color-surface, #f8f8f7)",
//                             color: "var(--color-text-secondary)",
//                             fontSize: 13, fontWeight: 600,
//                             cursor: loading ? "not-allowed" : "pointer",
//                             opacity: loading ? 0.6 : 1,
//                         }}
//                     >
//                         Cancel
//                     </button>
//                     <button
//                         onClick={onConfirm}
//                         disabled={loading}
//                         style={{
//                             height: 34, padding: "0 16px", borderRadius: 7,
//                             border: "none",
//                             background: loading ? "rgba(239,68,68,0.5)" : "#ef4444",
//                             color: "#fff",
//                             fontSize: 13, fontWeight: 700,
//                             cursor: loading ? "not-allowed" : "pointer",
//                             display: "inline-flex", alignItems: "center", gap: 6,
//                             transition: "background 150ms",
//                         }}
//                     >
//                         {loading ? (
//                             <>
//                                 <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
//                                     style={{ animation: "pt-spin 0.7s linear infinite" }}>
//                                     <circle cx="6" cy="6" r="4.5" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
//                                     <path d="M6 1.5A4.5 4.5 0 0 1 10.5 6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
//                                 </svg>
//                                 Deleting…
//                             </>
//                         ) : (
//                             <>
//                                 <TrashIcon size={12} /> Delete
//                             </>
//                         )}
//                     </button>
//                 </div>
//             </div>
//             <style>{`@keyframes pt-spin { to { transform: rotate(360deg); } }`}</style>
//         </div>
//     );
// }

// // ─── Bulk action bar ──────────────────────────────────────────────────────────
// function BulkActionBar({ selectedIds, onClear, onMoveSuccess, onDeleteRequest }: {
//     selectedIds: string[];
//     onClear: () => void;
//     onMoveSuccess: () => void;
//     onDeleteRequest: () => void;
// }) {
//     if (selectedIds.length === 0) return null;

//     const ghostBtn: React.CSSProperties = {
//         height: 30, padding: "0 12px", borderRadius: 6,
//         background: "rgba(255,255,255,0.2)",
//         border: "0.5px solid rgba(255,255,255,0.35)",
//         color: "#fff", fontSize: 12, fontWeight: 700,
//         display: "inline-flex", alignItems: "center", gap: 5,
//         cursor: "pointer", transition: "background 150ms",
//     };

//     const dangerBtn: React.CSSProperties = {
//         height: 30, padding: "0 12px", borderRadius: 6,
//         background: "rgba(239,68,68,0.2)",
//         border: "0.5px solid rgba(239,68,68,0.45)",
//         color: "#fff", fontSize: 12, fontWeight: 700,
//         display: "inline-flex", alignItems: "center", gap: 5,
//         cursor: "pointer", transition: "background 150ms",
//     };

//     return (
//         <div style={{
//             display: "flex", alignItems: "center", justifyContent: "space-between",
//             padding: "10px 16px", gap: 12,
//             background: "var(--color-accent, #fd5000)",
//             color: "#fff", borderRadius: "12px 12px 0 0",
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
//                             style={ghostBtn}
//                             onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.3)")}
//                             onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.2)")}
//                         >
//                             <MoveIcon /> Move all to vendor
//                         </button>
//                     }
//                 />

//                 {/* Bulk delete */}
//                 <button
//                     onClick={onDeleteRequest}
//                     style={dangerBtn}
//                     onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.35)")}
//                     onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.2)")}
//                 >
//                     <TrashIcon size={12} /> Delete all
//                 </button>

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
// function TableRow({ p, selected, onSelect, onDeleteRequest }: {
//     p: any;
//     selected: boolean;
//     onSelect: (id: string) => void;
//     onDeleteRequest: (id: string, name: string) => void;
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
//                         <SquarePen size={14} />
//                     </ActionButton>
//                     <MoveProductDialog productId={p.id} currentVendorName={p.vendor_name} />
//                     <DeleteButton onClick={() => onDeleteRequest(p.id, p.name)} />
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

//     // Delete dialog state
//     const [deleteDialog, setDeleteDialog] = useState<{
//         open: boolean;
//         ids: string[];
//         productName?: string;
//         loading: boolean;
//     }>({ open: false, ids: [], loading: false });

//     // Reset page on dataset change
//     useEffect(() => { setPage(1); }, [products.length, sort, order]);
//     // Clear selection when products change (filter / sort applied)
//     useEffect(() => { setSelectedIds(new Set()); }, [products]);

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

//     // Open delete dialog — single row
//     function requestDeleteOne(id: string, name: string) {
//         setDeleteDialog({ open: true, ids: [id], productName: name, loading: false });
//     }

//     // Open delete dialog — bulk
//     function requestDeleteBulk() {
//         setDeleteDialog({ open: true, ids: [...selectedIds], productName: undefined, loading: false });
//     }

//     // Execute delete
//     async function confirmDelete() {
//         setDeleteDialog((d) => ({ ...d, loading: true }));
//         try {
//             await fetch("/api/admin/products/bulk-delete", {
//                 method: "DELETE",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({ ids: deleteDialog.ids }),
//             });
//             setSelectedIds((prev) => {
//                 const next = new Set(prev);
//                 deleteDialog.ids.forEach((id) => next.delete(id));
//                 return next;
//             });
//         } finally {
//             setDeleteDialog({ open: false, ids: [], loading: false });
//             window.location.reload();
//         }
//     }

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
//             {/* Confirm delete dialog */}
//             <ConfirmDeleteDialog
//                 open={deleteDialog.open}
//                 count={deleteDialog.ids.length}
//                 productName={deleteDialog.productName}
//                 onConfirm={confirmDelete}
//                 onCancel={() => setDeleteDialog((d) => ({ ...d, open: false }))}
//                 loading={deleteDialog.loading}
//             />

//             {/* Bulk action bar */}
//             <BulkActionBar
//                 selectedIds={[...selectedIds]}
//                 onClear={clearSelection}
//                 onMoveSuccess={clearSelection}
//                 onDeleteRequest={requestDeleteBulk}
//             />

//             <div style={{
//                 background: "var(--color-bg, #fff)",
//                 border: "0.5px solid var(--color-border)",
//                 borderRadius: hasBulk ? "0 0 12px 12px" : 12,
//                 overflow: "hidden",
//                 borderTop: hasBulk ? "none" : "0.5px solid var(--color-border)",
//             }}>
//                 <div className="overflow-x-auto">
//                     <table className="w-full text-[13px] border-collapse">
//                         <thead className="bg-[var(--color-surface-secondary)]/50">
//                             <tr className="border-b border-[var(--color-border)]">
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
//                             {paginated.length === 0 ? (
//                                 <tr>
//                                     <td colSpan={9} className="p-8">
//                                         <EmptyState
//                                             icon={<PackageIcon size={20} />}
//                                             title="No products match"
//                                             message="Try adjusting your filters or search term."
//                                         />
//                                     </td>
//                                 </tr>
//                             ) : paginated.map((p) => (
//                                 <TableRow
//                                     key={p.id}
//                                     p={p}
//                                     selected={selectedIds.has(p.id)}
//                                     onSelect={toggleOne}
//                                     onDeleteRequest={requestDeleteOne}
//                                 />
//                             ))}
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

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoveProductDialog } from "@/components/admin/MoveProductDialog";
import { EmptyState } from "@/components/ui/admin";
import { formatCurrency } from "@/lib/utils";
import { SquarePen, Trash2, ExternalLink, Star, ChevronLeft, ChevronRight, ChevronDown, Package, AlertCircle } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
    active: { label: "Active", dot: "#22c55e", bg: "rgba(34,197,94,0.1)", text: "#16a34a" },
    inactive: { label: "Inactive", dot: "#94a3b8", bg: "rgba(148,163,184,0.1)", text: "#64748b" },
    draft: { label: "Draft", dot: "#f59e0b", bg: "rgba(245,158,11,0.1)", text: "#d97706" },
    paused: { label: "Paused", dot: "#f59e0b", bg: "rgba(245,158,11,0.1)", text: "#d97706" },
    archived: { label: "Archived", dot: "#94a3b8", bg: "rgba(148,163,184,0.1)", text: "#64748b" },
    banned: { label: "Banned", dot: "#ef4444", bg: "rgba(239,68,68,0.1)", text: "#dc2626" },
};

const SOURCE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
    cj: { label: "CJ", bg: "rgba(168,85,247,0.1)", text: "#9333ea" },
    shopify: { label: "Shopify", bg: "rgba(34,197,94,0.1)", text: "#16a34a" },
    vendor: { label: "Vendor", bg: "rgba(99,102,241,0.08)", text: "#6366f1" },
};

function StatusBadge({ status }: { status?: string }) {
    const cfg = STATUS_CONFIG[status ?? "draft"] ?? STATUS_CONFIG.draft;
    return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
            style={{ background: cfg.bg, color: cfg.text }}>
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
            {cfg.label}
        </span>
    );
}

function SourceBadge({ source }: { source?: string }) {
    if (!source) return null;
    const cfg = SOURCE_CONFIG[source];
    if (!cfg) return null;
    return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase"
            style={{ background: cfg.bg, color: cfg.text }}>
            {cfg.label}
        </span>
    );
}

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
        <div className="w-9 h-9 rounded-lg flex-shrink-0 overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-secondary)] flex items-center justify-center text-[var(--color-text-muted)]">
            {src && !failed ? (
                <img
                    src={src}
                    alt={name}
                    onError={() => setFailed(true)}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                />
            ) : (
                <Package size={16} />
            )}
        </div>
    );
}

function VendorAvatar({ name, avatarUrl }: { name?: string; avatarUrl?: string }) {
    const [failed, setFailed] = useState(false);
    const initial = name?.charAt(0)?.toUpperCase() ?? "?";
    if (avatarUrl && !failed) {
        return (
            <img
                src={avatarUrl}
                alt={name ?? "Vendor"}
                onError={() => setFailed(true)}
                referrerPolicy="no-referrer"
                className="w-[22px] h-[22px] rounded-full object-cover flex-shrink-0 border border-[var(--color-border)]"
            />
        );
    }
    return (
        <span className="w-[22px] h-[22px] rounded-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)] inline-flex items-center justify-center text-[9px] font-bold text-[var(--color-text-secondary)] flex-shrink-0">
            {initial}
        </span>
    );
}

function Checkbox({ checked, indeterminate, onChange }: {
    checked: boolean; indeterminate?: boolean; onChange: () => void;
}) {
    const ref = React.useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (ref.current) ref.current.indeterminate = !!indeterminate;
    }, [indeterminate]);
    return (
        <input
            ref={ref}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            onClick={(e) => e.stopPropagation()}
            className="w-[15px] h-[15px] cursor-pointer rounded-sm flex-shrink-0"
            style={{ accentColor: "var(--color-accent, #fd5000)" }}
        />
    );
}

function ConfirmDeleteDialog({
    open, count, productName, onConfirm, onCancel, loading,
}: {
    open: boolean;
    count: number;
    productName?: string;
    onConfirm: () => void;
    onCancel: () => void;
    loading: boolean;
}) {
    useEffect(() => {
        if (!open) return;
        function handleKey(e: KeyboardEvent) {
            if (e.key === "Escape" && !loading) onCancel();
        }
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [open, loading, onCancel]);

    if (!open) return null;
    const isBulk = count > 1;
    const label = isBulk ? `${count} products` : `"${productName}"`;

    return (
        <div
            onClick={loading ? undefined : onCancel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm flex items-center justify-center"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-7 w-[360px] max-w-[90vw] shadow-2xl"
            >
                <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center mb-4 text-red-500">
                    <Trash2 size={20} />
                </div>
                <p id="delete-dialog-title" className="font-semibold text-[15px] mb-1.5 text-[var(--color-text-primary)]">
                    Archive {label}?
                </p>
                <p className="text-[13px] text-[var(--color-text-muted)] mb-5 leading-relaxed">
                    {isBulk
                        ? `You're about to archive ${count} products. They'll be hidden from the storefront but can be restored later.`
                        : `This product will be archived and hidden from the storefront. You can restore it later.`}
                </p>

                <div className="flex gap-2 justify-end">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="h-9 px-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] text-[13px] font-semibold hover:bg-[var(--color-surface-secondary)] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="h-9 px-4 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[13px] font-bold inline-flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="animate-spin">
                                    <circle cx="6" cy="6" r="4.5" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
                                    <path d="M6 1.5A4.5 4.5 0 0 1 10.5 6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                                Archiving…
                            </>
                        ) : (
                            <>
                                <Trash2 size={12} /> Archive
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

function BulkActionBar({ count, onClear, onMoveSuccess, onDeleteRequest, selectedIds }: {
    count: number;
    selectedIds: string[];
    onClear: () => void;
    onMoveSuccess: () => void;
    onDeleteRequest: () => void;
}) {
    if (count === 0) return null;
    return (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-[var(--color-accent)] text-white rounded-t-xl">
            <div className="flex items-center gap-2 text-[13px] font-semibold">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <rect x="2" y="2" width="12" height="12" rx="3" stroke="#fff" strokeWidth="1.3" />
                    <polyline points="5,8 7,10 11,6" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span><strong>{count}</strong> product{count !== 1 ? "s" : ""} selected</span>
            </div>
            <div className="flex items-center gap-2">
                <MoveProductDialog
                    productIds={selectedIds}
                    currentVendorName="Various vendors"
                    onSuccess={onMoveSuccess}
                    trigger={
                        <button className="h-[30px] px-3 rounded-md bg-white/20 hover:bg-white/30 border border-white/35 text-white text-[12px] font-bold inline-flex items-center gap-1.5">
                            Move to vendor
                        </button>
                    }
                />
                <button
                    onClick={onDeleteRequest}
                    className="h-[30px] px-3 rounded-md bg-red-500/30 hover:bg-red-500/40 border border-red-300/50 text-white text-[12px] font-bold inline-flex items-center gap-1.5"
                >
                    <Trash2 size={12} /> Archive all
                </button>
                <button
                    onClick={onClear}
                    className="h-[30px] px-2.5 rounded-md bg-white/15 hover:bg-white/25 border border-white/25 text-white text-[12px] font-semibold"
                >
                    Clear
                </button>
            </div>
        </div>
    );
}

function TableRow({ p, selected, onSelect, onDeleteRequest }: {
    p: any;
    selected: boolean;
    onSelect: (id: string) => void;
    onDeleteRequest: (id: string, name: string) => void;
}) {
    const lowStock = p.track_inventory && p.inventory_quantity <= (p.low_stock_threshold ?? 5);

    return (
        <tr
            className={`border-b border-[var(--color-border)] transition-colors ${selected ? "bg-orange-50/30" : "hover:bg-[var(--color-surface-secondary)]/50"}`}
        >
            <td className="py-2.5 pl-4 pr-2 w-9">
                <Checkbox checked={selected} onChange={() => onSelect(p.id)} />
            </td>

            <td className="py-2.5 pr-4">
                <div className="flex items-center gap-2.5">
                    <ProductThumb images={p.images} name={p.name} />
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-[13px] text-[var(--color-text-primary)] truncate max-w-[180px]">
                                {p.name}
                            </p>
                            <SourceBadge source={p.source} />
                            {lowStock && (
                                <span title="Low stock" className="inline-flex items-center text-amber-600">
                                    <AlertCircle size={12} />
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-[var(--color-text-muted)] truncate max-w-[200px]">
                            {p.slug}
                        </p>
                    </div>
                </div>
            </td>

            <td className="py-2.5 px-4 text-[var(--color-text-secondary)] whitespace-nowrap text-[13px]">
                {p.vendor_name ? (
                    <span className="inline-flex items-center gap-1.5">
                        <VendorAvatar name={p.vendor_name} avatarUrl={p.vendor_avatar_url} />
                        <span className="truncate max-w-[130px]">{p.vendor_name}</span>
                    </span>
                ) : (
                    <span className="text-[var(--color-text-muted)] italic text-[12px]">Unassigned</span>
                )}
            </td>

            <td className="py-2.5 px-4 font-bold text-[var(--color-text-primary)] whitespace-nowrap text-[13px]">
                {formatCurrency(Number(p.price ?? 0))}
                {p.compare_at_price && Number(p.compare_at_price) > Number(p.price) && (
                    <span className="text-[11px] text-[var(--color-text-muted)] line-through ml-1 font-normal">
                        {formatCurrency(Number(p.compare_at_price))}
                    </span>
                )}
            </td>

            <td className="py-2.5 px-4">
                <StatusBadge status={p.status} />
            </td>

            <td className="py-2.5 px-4">
                {p.product_type ? (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)] capitalize">
                        {p.product_type}
                    </span>
                ) : <span className="text-[var(--color-text-muted)] text-[12px]">—</span>}
            </td>

            <td className="py-2.5 px-4">
                {p.is_featured ? (
                    <Star size={14} className="text-amber-500" fill="currentColor" />
                ) : <span className="text-[var(--color-text-muted)] text-[12px]">—</span>}
            </td>

            <td className="py-2.5 px-4">
                {p.affiliate_enabled ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                        {p.affiliate_commission_rate ? `${p.affiliate_commission_rate}%` : "On"}
                    </span>
                ) : <span className="text-[var(--color-text-muted)] text-[12px]">—</span>}
            </td>

            <td className="py-2.5 px-4 text-right">
                <div className="inline-flex items-center gap-1.5">
                    <Link
                        href={`/marketplace/${p.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View on storefront"
                        className="w-7 h-7 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] inline-flex items-center justify-center transition-colors"
                    >
                        <ExternalLink size={12} />
                    </Link>
                    <Link
                        href={`/admin/products/${p.id}/edit`}
                        title="Edit product"
                        className="w-7 h-7 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] inline-flex items-center justify-center transition-colors"
                    >
                        <SquarePen size={13} />
                    </Link>
                    <MoveProductDialog productId={p.id} currentVendorName={p.vendor_name} />
                    <button
                        onClick={() => onDeleteRequest(p.id, p.name)}
                        title="Archive product"
                        className="w-7 h-7 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-red-300 hover:text-red-500 hover:bg-red-50 inline-flex items-center justify-center transition-colors"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            </td>
        </tr>
    );
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function Pagination({ page, pageSize, total, buildUrl, onPageSizeChange }: {
    page: number; pageSize: number; total: number;
    buildUrl: (page: number) => string;
    onPageSizeChange: (size: number) => void;
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

    return (
        <div className="px-4 py-3 border-t border-[var(--color-border)] flex items-center justify-between flex-wrap gap-2.5 bg-[var(--color-surface-secondary)]/50">
            <div className="flex items-center gap-2.5">
                <p className="text-[12px] text-[var(--color-text-muted)] whitespace-nowrap">
                    {total === 0 ? "No results" : `${from}–${to} of ${total}`}
                </p>
                <div className="flex items-center gap-1.5">
                    <span className="text-[12px] text-[var(--color-text-muted)] whitespace-nowrap">Rows</span>
                    <select
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                        className="h-7 pl-2 pr-6 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] text-[12px] text-[var(--color-text-primary)] cursor-pointer outline-none"
                    >
                        {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex items-center gap-1">
                {page > 1 ? (
                    <Link
                        href={buildUrl(page - 1)}
                        className="min-w-[32px] h-8 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-secondary)] inline-flex items-center justify-center hover:border-[var(--color-accent)]"
                    >
                        <ChevronLeft size={14} />
                    </Link>
                ) : (
                    <span className="min-w-[32px] h-8 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] inline-flex items-center justify-center opacity-40">
                        <ChevronLeft size={14} />
                    </span>
                )}

                {getPages().map((p, i) =>
                    p === "…" ? (
                        <span key={`ell-${i}`} className="w-8 text-center text-[13px] text-[var(--color-text-muted)]">…</span>
                    ) : (
                        <Link
                            key={p}
                            href={buildUrl(p as number)}
                            className={`min-w-[32px] h-8 rounded-md text-[13px] inline-flex items-center justify-center font-medium ${p === page
                                ? "bg-[var(--color-accent)] text-white border border-[var(--color-accent)]"
                                : "border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]"
                                }`}
                        >
                            {p}
                        </Link>
                    )
                )}

                {page < totalPages ? (
                    <Link
                        href={buildUrl(page + 1)}
                        className="min-w-[32px] h-8 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-secondary)] inline-flex items-center justify-center hover:border-[var(--color-accent)]"
                    >
                        <ChevronRight size={14} />
                    </Link>
                ) : (
                    <span className="min-w-[32px] h-8 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] inline-flex items-center justify-center opacity-40">
                        <ChevronRight size={14} />
                    </span>
                )}
            </div>
        </div>
    );
}

export function ProductsTable({
    products, total, page, pageSize, sort, order, query, searchParams,
}: {
    products: any[];
    total: number;
    page: number;
    pageSize: number;
    sort: string;
    order: string;
    query?: string;
    searchParams: Record<string, string | undefined>;
}) {
    const router = useRouter();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const [deleteDialog, setDeleteDialog] = useState<{
        open: boolean;
        ids: string[];
        productName?: string;
        loading: boolean;
    }>({ open: false, ids: [], loading: false });

    useEffect(() => { setSelectedIds(new Set()); }, [products]);

    const pageIds = products.map((p) => p.id);
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
            if (allSelected) pageIds.forEach((id) => next.delete(id));
            else pageIds.forEach((id) => next.add(id));
            return next;
        });
    }

    function clearSelection() { setSelectedIds(new Set()); }

    function requestDeleteOne(id: string, name: string) {
        setDeleteDialog({ open: true, ids: [id], productName: name, loading: false });
    }

    function requestDeleteBulk() {
        setDeleteDialog({ open: true, ids: [...selectedIds], productName: undefined, loading: false });
    }

    async function confirmDelete() {
        setDeleteDialog((d) => ({ ...d, loading: true }));
        try {
            const res = await fetch("/api/admin/products/bulk-delete", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: deleteDialog.ids }),
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                toast.error(data.error ?? "Could not archive products");
                setDeleteDialog((d) => ({ ...d, loading: false }));
                return;
            }

            const archived = data.archived ?? deleteDialog.ids.length;
            const skipped = data.skipped ?? 0;
            if (skipped > 0) {
                toast.success(`Archived ${archived}, skipped ${skipped} with active orders`);
            } else {
                toast.success(`Archived ${archived} product${archived !== 1 ? "s" : ""}`);
            }

            setSelectedIds(new Set());
            setDeleteDialog({ open: false, ids: [], loading: false });
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Network error");
            setDeleteDialog((d) => ({ ...d, loading: false }));
        }
    }

    const hasBulk = selectedIds.size > 0;

    function buildUrl(overrides: Record<string, string | number | undefined>): string {
        const params = new URLSearchParams();
        const merged = { ...searchParams, ...overrides };
        Object.entries(merged).forEach(([k, v]) => {
            if (v !== undefined && v !== "" && v !== "all") params.set(k, String(v));
        });
        const qs = params.toString();
        return qs ? `/admin/products?${qs}` : "/admin/products";
    }

    function SortLink({ col, children }: { col: string; children: React.ReactNode }) {
        const active = sort === col;
        const nextOrder = active && order === "asc" ? "desc" : "asc";
        return (
            <Link
                href={buildUrl({ sort: col, order: nextOrder, page: 1 })}
                className={`inline-flex items-center gap-1 ${active ? "text-[var(--color-accent)]" : "text-inherit"} no-underline`}
            >
                {children}
                {active ? (
                    <ChevronDown size={12} style={{ transform: order === "asc" ? "rotate(180deg)" : undefined }} />
                ) : (
                    <span className="w-3" />
                )}
            </Link>
        );
    }

    const thClass = "px-4 py-2.5 text-left text-[11px] font-bold tracking-wider uppercase text-[var(--color-text-muted)] whitespace-nowrap";

    return (
        <div>
            <ConfirmDeleteDialog
                open={deleteDialog.open}
                count={deleteDialog.ids.length}
                productName={deleteDialog.productName}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteDialog((d) => ({ ...d, open: false }))}
                loading={deleteDialog.loading}
            />

            <BulkActionBar
                count={selectedIds.size}
                selectedIds={[...selectedIds]}
                onClear={clearSelection}
                onMoveSuccess={clearSelection}
                onDeleteRequest={requestDeleteBulk}
            />

            <div className={`bg-[var(--color-bg)] border border-[var(--color-border)] overflow-hidden ${hasBulk ? "rounded-b-xl border-t-0" : "rounded-xl"}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-[13px] border-collapse">
                        <thead className="bg-[var(--color-surface-secondary)]/50">
                            <tr className="border-b border-[var(--color-border)]">
                                <th className={`${thClass} pl-4 pr-2 w-9`}>
                                    <Checkbox
                                        checked={allSelected}
                                        indeterminate={someSelected && !allSelected}
                                        onChange={toggleAll}
                                    />
                                </th>
                                <th className={`${thClass} pl-2`}><SortLink col="name">Product</SortLink></th>
                                <th className={thClass}>Vendor</th>
                                <th className={thClass}><SortLink col="price">Price</SortLink></th>
                                <th className={thClass}><SortLink col="status">Status</SortLink></th>
                                <th className={thClass}>Type</th>
                                <th className={thClass}>Featured</th>
                                <th className={thClass}>Affiliate</th>
                                <th className={`${thClass} text-right`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="p-8">
                                        <EmptyState
                                            icon={<Package size={20} />}
                                            title={query ? `No results for "${query}"` : "No products match"}
                                            message="Try adjusting your filters or search term."
                                        />
                                    </td>
                                </tr>
                            ) : products.map((p) => (
                                <TableRow
                                    key={p.id}
                                    p={p}
                                    selected={selectedIds.has(p.id)}
                                    onSelect={toggleOne}
                                    onDeleteRequest={requestDeleteOne}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>

                <Pagination
                    page={page}
                    pageSize={pageSize}
                    total={total}
                    buildUrl={(p) => buildUrl({ page: p })}
                    onPageSizeChange={(s) => router.push(buildUrl({ pageSize: s, page: 1 }))}
                />
            </div>
        </div>
    );
}