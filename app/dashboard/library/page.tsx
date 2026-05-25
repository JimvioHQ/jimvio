
// "use client";

import { DigitalLibrary } from "@/components/library/digital-library"

// import React, {
//   useEffect, useRef, useState, useMemo, useCallback,
// } from "react";
// import Link from "next/link";
// import { useSearchParams, useRouter } from "next/navigation";
// import {
//   Download, Search, ExternalLink, FileText, Zap, Loader2,
//   BookOpen, Package, LayoutTemplate, Music, ImageIcon, Archive,
//   Copy, BarChart2, CheckCircle2, Clock, AlertTriangle, Sparkles,
//   Library, Grid3X3, RefreshCw, ChevronUp, ChevronDown,
//   Table2, XCircle, Camera, Star, ShoppingBag,
//   HardDrive, Store, Tag, RotateCcw, TrendingUp, Bell,
//   LayoutGrid, AlignJustify, ChevronsUpDown, CheckSquare, Square,
// } from "lucide-react";

// import { createClient } from "@/lib/supabase/client";
// import { cn } from "@/lib/utils";
// import { toast } from "sonner";

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface DigitalAccessRow {
//   id: string;
//   // access_url intentionally removed from client — use /api/files/access/:id
//   file_ready?: boolean | null;
//   subtype: string | null;
//   granted_at: string;
//   expires_at: string | null;
//   last_accessed_at?: string | null;
//   order_id?: string | null;
//   order_item_id?: string | null;
//   revoke_reason?: string | null;
//   products: {
//     id: string;
//     name: string;
//     images: string[] | null;
//     button_text: string | null;
//     pricing_type: string | null;
//     billing_period: string | null;
//     digital_file_size?: number | null;
//     tags?: string[] | null;
//     description?: string | null;
//     vendor_id?: string | null;
//   } | null;
//   order_items?: {
//     unit_price?: number | null;
//     total_price?: number | null;
//     download_count?: number | null;
//     variant_name?: string | null;
//     variant_id?: string | null;
//   } | null;
//   vendors?: {
//     business_name?: string | null;
//     business_logo?: string | null;
//   } | null;
//   lesson_progress?: {
//     completed_lessons: number;
//     total_lessons: number;
//     percent: number;
//   } | null;
//   user_review?: {
//     rating: number;
//     id: string;
//   } | null;
// }

// type Density  = "compact" | "comfortable";
// type FilterId = typeof FILTER_TABS[number]["id"];
// type SortKey  = "name" | "subtype" | "granted_at" | "expires_at" | "status" | "last_accessed_at";
// type SortDir  = "asc" | "desc";

// const PAGE_SIZE = 24;

// // ─── Subtype config ───────────────────────────────────────────────────────────

// function getSubtypeConfig(subtype: string | null) {
//   switch (subtype) {
//     case "course":
//       return { label: "Course",      icon: BookOpen,      color: "#2563eb", action: "continue"  as const, actionLabel: "Continue",  ActionIcon: BookOpen    };
//     case "software":
//       return { label: "Software",    icon: Zap,           color: "#7c3aed", action: "open"      as const, actionLabel: "Launch",    ActionIcon: ExternalLink };
//     case "ai-tools":
//       return { label: "AI Tool",     icon: Sparkles,      color: "#db2777", action: "open"      as const, actionLabel: "Open",      ActionIcon: ExternalLink };
//     case "templates":
//       return { label: "Template",    icon: LayoutTemplate, color: "#d97706", action: "download" as const, actionLabel: "Download",  ActionIcon: Download    };
//     case "ebooks":
//       return { label: "Ebook",       icon: FileText,      color: "#059669", action: "download"  as const, actionLabel: "Download",  ActionIcon: Download    };
//     case "music-audio":
//       return { label: "Audio",       icon: Music,         color: "#dc2626", action: "download"  as const, actionLabel: "Download",  ActionIcon: Download    };
//     case "graphics-design":
//       return { label: "Graphics",    icon: ImageIcon,     color: "#ea580c", action: "download"  as const, actionLabel: "Download",  ActionIcon: Download    };
//     case "photography":
//       return { label: "Photo",       icon: Camera,        color: "#0891b2", action: "download"  as const, actionLabel: "Download",  ActionIcon: Download    };
//     default:
//       return { label: "Asset",       icon: Package,       color: "#64748b", action: "open"      as const, actionLabel: "Access",    ActionIcon: ExternalLink };
//   }
// }

// const FILTER_TABS = [
//   { id: "all",             label: "All",        icon: Grid3X3      },
//   { id: "software",        label: "Software",   icon: Zap          },
//   { id: "ai-tools",        label: "AI Tools",   icon: Sparkles     },
//   { id: "course",          label: "Courses",    icon: BookOpen     },
//   { id: "ebooks",          label: "Ebooks",     icon: FileText     },
//   { id: "templates",       label: "Templates",  icon: LayoutTemplate },
//   { id: "music-audio",     label: "Audio",      icon: Music        },
//   { id: "graphics-design", label: "Graphics",   icon: ImageIcon    },
//   { id: "photography",     label: "Photo",      icon: Camera       },
//   { id: "other",           label: "Other",      icon: Package      },
// ] as const;

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// function isExpiredFn(row: DigitalAccessRow) {
//   return row.expires_at ? new Date(row.expires_at) < new Date() : false;
// }

// function daysUntilExpiryFn(row: DigitalAccessRow) {
//   if (!row.expires_at) return null;
//   return Math.ceil((new Date(row.expires_at).getTime() - Date.now()) / 86400000);
// }

// function formatFileSize(bytes: number): string {
//   if (bytes < 1024)            return `${bytes} B`;
//   if (bytes < 1024 * 1024)    return `${(bytes / 1024).toFixed(1)} KB`;
//   if (bytes < 1024 ** 3)      return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
//   return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
// }

// function formatCurrency(cents: number | null | undefined): string | null {
//   if (cents == null) return null;
//   return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
// }

// function getRevokeReasonLabel(reason: string | null | undefined): string | null {
//   if (!reason) return null;
//   switch (reason) {
//     case "refunded":             return "Refunded";
//     case "subscription_expired": return "Subscription expired";
//     case "manual":               return "Revoked";
//     default:                     return reason;
//   }
// }

// function proxyUrl(id: string) {
//   return `/api/files/access/${id}`;
// }

// // ─── Skeleton ─────────────────────────────────────────────────────────────────

// function CardSkeleton() {
//   return (
//     <div className="dl-card animate-pulse">
//       <div className="dl-card-thumb" style={{ backgroundColor: "var(--color-surface-secondary)" }} />
//       <div className="dl-card-body">
//         <div style={{ height: 13, width: "60%", borderRadius: 2, backgroundColor: "var(--color-surface-secondary)", marginBottom: 6 }} />
//         <div style={{ height: 11, width: "40%", borderRadius: 2, backgroundColor: "var(--color-surface-secondary)", marginBottom: 16 }} />
//         <div style={{ height: 32, width: "100%", borderRadius: 2, backgroundColor: "var(--color-surface-secondary)" }} />
//       </div>
//     </div>
//   );
// }

// function RowSkeleton() {
//   return (
//     <tr className="animate-pulse" style={{ borderBottom: "1px solid var(--color-border)" }}>
//       {[40, 180, 90, 100, 90, 70, 120].map((w, i) => (
//         <td key={i} className="py-3 px-3">
//           <div style={{ height: 12, width: w, borderRadius: 2, backgroundColor: "var(--color-surface-secondary)" }} />
//         </td>
//       ))}
//     </tr>
//   );
// }

// // ─── Error banner ─────────────────────────────────────────────────────────────

// function ErrorBanner({ onRetry }: { onRetry: () => void }) {
//   return (
//     <div className="dl-notice dl-notice--danger">
//       <AlertTriangle size={14} />
//       <span>Failed to load library.</span>
//       <button onClick={onRetry} className="dl-notice-action">Retry</button>
//     </div>
//   );
// }

// // ─── Expiry banner ────────────────────────────────────────────────────────────

// function ExpiryBanner({ items }: { items: DigitalAccessRow[] }) {
//   const [dismissed, setDismissed] = useState(false);
//   const expiring = items.filter(r => {
//     const d = daysUntilExpiryFn(r);
//     return d !== null && d > 0 && d <= 7;
//   });
//   if (expiring.length === 0 || dismissed) return null;
//   return (
//     <div className="dl-notice dl-notice--warn">
//       <Bell size={14} />
//       <span>
//         <strong>{expiring.length} item{expiring.length !== 1 ? "s" : ""}</strong> expiring within 7 days:&nbsp;
//         {expiring.map(r => r.products?.name).join(", ")}
//       </span>
//       <button onClick={() => setDismissed(true)} className="dl-notice-close"><XCircle size={13} /></button>
//     </div>
//   );
// }

// // ─── Recent shelf ─────────────────────────────────────────────────────────────

// function RecentShelf({ items, onAccess }: { items: DigitalAccessRow[]; onAccess: (id: string) => void }) {
//   const recent = useMemo(() =>
//     [...items]
//       .filter(r => r.last_accessed_at && !isExpiredFn(r))
//       .sort((a, b) => new Date(b.last_accessed_at!).getTime() - new Date(a.last_accessed_at!).getTime())
//       .slice(0, 6),
//     [items]
//   );
//   if (recent.length < 2) return null;

//   return (
//     <section className="dl-section">
//       <p className="dl-section-label"><TrendingUp size={11} /> Continue where you left off</p>
//       <div className="dl-shelf">
//         {recent.map(row => {
//           const config = getSubtypeConfig(row.subtype);
//           const img    = row.products?.images?.[0] ?? row.vendors?.business_logo ?? null;
//           const name   = row.products?.name ?? "Unknown";
//           const prog   = row.lesson_progress;

//           function handleAction() {
//             onAccess(row.id);
//             if (config.action === "continue") return; // handled by Link
//             window.open(proxyUrl(row.id), "_blank");
//           }

//           return (
//             <div key={row.id} className="dl-shelf-item">
//               <div className="dl-shelf-thumb">
//                 {img
//                   ? <img src={img} alt={name} />
//                   : <config.icon size={14} style={{ color: config.color }} />
//                 }
//               </div>
//               <div className="dl-shelf-meta">
//                 <span className="dl-shelf-name">{name}</span>
//                 {prog && prog.total_lessons > 0 ? (
//                   <div className="dl-progress-row">
//                     <div className="dl-progress-bar">
//                       <div className="dl-progress-fill" style={{ width: `${prog.percent}%`, backgroundColor: config.color }} />
//                     </div>
//                     <span>{prog.percent}%</span>
//                   </div>
//                 ) : (
//                   <span className="dl-shelf-sub">
//                     {row.last_accessed_at
//                       ? new Date(row.last_accessed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
//                       : ""}
//                   </span>
//                 )}
//               </div>
//               {config.action === "continue" ? (
//                 <Link href={`/dashboard/my-courses/${row.products?.id}`} onClick={() => onAccess(row.id)} className="dl-shelf-btn" style={{ color: config.color }}>
//                   <config.ActionIcon size={12} />
//                 </Link>
//               ) : (
//                 <button onClick={handleAction} className="dl-shelf-btn" style={{ color: config.color }}>
//                   <config.ActionIcon size={12} />
//                 </button>
//               )}
//             </div>
//           );
//         })}
//       </div>
//     </section>
//   );
// }

// // ─── Star rating ──────────────────────────────────────────────────────────────

// function StarRating({ productId, existingReview, onReviewLeft }: {
//   productId: string;
//   existingReview: { rating: number; id: string } | null | undefined;
//   onReviewLeft: (productId: string, rating: number) => void;
// }) {
//   const [hovered, setHovered] = useState(0);
//   const [submitted, setSubmitted] = useState(false);
//   const rating = existingReview?.rating ?? (submitted ? hovered : 0);
//   const locked = !!(submitted || existingReview);

//   return (
//     <div className="dl-stars">
//       {[1, 2, 3, 4, 5].map(s => (
//         <button
//           key={s}
//           disabled={locked}
//           onMouseEnter={() => !locked && setHovered(s)}
//           onMouseLeave={() => !locked && setHovered(0)}
//           onClick={() => { if (!locked) { setSubmitted(true); onReviewLeft(productId, s); } }}
//           className="dl-star"
//           style={{ color: s <= (locked ? rating : hovered) ? "#f59e0b" : "var(--color-border)" }}
//         >
//           <Star size={11} fill={s <= (locked ? rating : hovered) ? "#f59e0b" : "none"} />
//         </button>
//       ))}
//     </div>
//   );
// }

// // ─── Bulk bar ─────────────────────────────────────────────────────────────────

// function BulkBar({ selected, total, onSelectAll, onClear, onBulkCopy, onBulkDownload }: {
//   selected: Set<string>; total: number; onSelectAll: () => void; onClear: () => void;
//   onBulkCopy: () => void; onBulkDownload: () => void;
// }) {
//   const count = selected.size;
//   if (count === 0) return null;
//   return (
//     <div className="dl-bulk-bar">
//       <span className="dl-bulk-count">{count} selected</span>
//       <div className="dl-bulk-divider" />
//       <button onClick={onSelectAll} className="dl-bulk-link">Select all {total}</button>
//       <button onClick={onBulkCopy}     className="dl-btn dl-btn--ghost dl-btn--sm"><Copy size={12} /> Copy links</button>
//       <button onClick={onBulkDownload} className="dl-btn dl-btn--primary dl-btn--sm"><Download size={12} /> Download all</button>
//       <button onClick={onClear}        className="dl-bulk-close"><XCircle size={14} /></button>
//     </div>
//   );
// }

// // ─── Grid card ────────────────────────────────────────────────────────────────

// function GridCard({
//   row, highlight, index, selected, onToggleSelect, onAccess, onReviewLeft, density,
// }: {
//   row: DigitalAccessRow; highlight: boolean; index: number;
//   selected: boolean; onToggleSelect: (id: string) => void;
//   onAccess: (id: string) => void;
//   onReviewLeft: (productId: string, rating: number) => void;
//   density: Density;
// }) {
//   const product     = row.products;
//   const config      = getSubtypeConfig(row.subtype);
//   const isExpired   = isExpiredFn(row);
//   const daysLeft    = daysUntilExpiryFn(row);
//   const img         = product?.images?.[0] ?? row.vendors?.business_logo ?? null;
//   const name        = product?.name ?? "Unknown";
//   const vendor      = row.vendors?.business_name ?? null;
//   const vendorLogo  = row.vendors?.business_logo ?? null;
//   const dateLabel   = new Date(row.granted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
//   const pricePaid   = formatCurrency(row.order_items?.unit_price);
//   const fileSize    = product?.digital_file_size ? formatFileSize(product.digital_file_size) : null;
//   const dlCount     = row.order_items?.download_count ?? null;
//   const variantName = row.order_items?.variant_name ?? null;
//   const revokeLabel = getRevokeReasonLabel(row.revoke_reason);
//   const isSub       = product?.pricing_type === "subscription" || !!product?.billing_period;
//   const compact     = density === "compact";
//   const isReady     = row.file_ready !== false; // default true if not set

//   function handleCopy() {
//     navigator.clipboard.writeText(`${window.location.origin}${proxyUrl(row.id)}`);
//     toast.success("Link copied — works only when signed in");
//   }

//   function handleAction() {
//     onAccess(row.id);
//     window.open(proxyUrl(row.id), "_blank");
//   }

//   return (
//     <article
//       className={cn("dl-card", highlight && "dl-card--highlight", isExpired && "dl-card--expired", selected && "dl-card--selected")}
//       style={{ animationDelay: `${index * 30}ms` }}
//     >
//       {/* Checkbox */}
//       <button className="dl-card-check" onClick={() => onToggleSelect(row.id)}
//         style={{ backgroundColor: selected ? "var(--color-accent)" : undefined }}>
//         {selected ? <CheckSquare size={12} className="text-white" /> : <Square size={12} style={{ color: "rgba(255,255,255,0.7)" }} />}
//       </button>

//       {/* Order badge */}
//       {row.order_id && (
//         <Link href={`/dashboard/orders/${row.order_id}`} className="dl-card-order-badge"
//           onClick={e => e.stopPropagation()} title={`Order #${row.order_id}`}>
//           <ShoppingBag size={9} /> #{String(row.order_id).slice(-6)}
//         </Link>
//       )}

//       {/* Thumbnail */}
//       <div className={cn("dl-card-thumb", compact && "dl-card-thumb--compact")}>
//         {img ? (
//           <img src={img} alt={name} className="dl-card-img" />
//         ) : (
//           <div className="dl-card-thumb-placeholder">
//             <config.icon size={compact ? 18 : 24} style={{ color: config.color, opacity: 0.6 }} />
//           </div>
//         )}

//         {/* Status strip */}
//         <div className="dl-card-badges">
//           <span className="dl-badge" style={{ color: config.color, borderColor: config.color }}>
//             <config.icon size={9} /> {config.label}
//           </span>
//           {isExpired ? (
//             <span className="dl-badge dl-badge--danger"><AlertTriangle size={9} /> Expired</span>
//           ) : daysLeft !== null && daysLeft <= 7 ? (
//             <span className="dl-badge dl-badge--warn"><Clock size={9} /> {daysLeft}d left</span>
//           ) : isReady ? (
//             <span className="dl-badge dl-badge--ok"><CheckCircle2 size={9} /> Active</span>
//           ) : null}
//         </div>

//         {/* Course progress bar overlay */}
//         {row.lesson_progress && row.lesson_progress.total_lessons > 0 && (
//           <div className="dl-card-progress">
//             <div className="dl-card-progress-bar">
//               <div style={{ width: `${row.lesson_progress.percent}%`, backgroundColor: config.color }} />
//             </div>
//             <span>{row.lesson_progress.percent}%</span>
//           </div>
//         )}

//         {/* Hover overlay */}
//         {!isExpired && isReady && (
//           <div className="dl-card-hover">
//             {config.action === "continue" ? (
//               <Link href={`/dashboard/my-courses/${product?.id}`} onClick={() => onAccess(row.id)} className="dl-card-hover-btn">
//                 <config.ActionIcon size={13} /> {config.actionLabel}
//               </Link>
//             ) : (
//               <button onClick={handleAction} className="dl-card-hover-btn">
//                 <config.ActionIcon size={13} /> {config.actionLabel}
//               </button>
//             )}
//           </div>
//         )}
//       </div>

//       {/* Body */}
//       <div className="dl-card-body">
//         {/* Type stripe */}
//         <div className="dl-card-stripe" style={{ backgroundColor: config.color }} />

//         <p className="dl-card-name" title={name}>{name}</p>
//         {variantName && <p className="dl-card-variant">{variantName}</p>}

//         {vendor && (
//           <div className="dl-card-vendor">
//             {vendorLogo
//               ? <img src={vendorLogo} alt={vendor} className="dl-card-vendor-logo" />
//               : <Store size={10} style={{ color: "var(--color-text-muted)" }} />
//             }
//             <span>{vendor}</span>
//           </div>
//         )}

//         <div className="dl-card-meta-row">
//           <span>{dateLabel}</span>
//           {pricePaid && <span>{pricePaid}</span>}
//         </div>

//         {product?.tags && product.tags.length > 0 && (
//           <div className="dl-card-tags">
//             {product.tags.slice(0, 3).map(tag => (
//               <span key={tag} className="dl-tag"><Tag size={9} /> {tag}</span>
//             ))}
//           </div>
//         )}

//         {/* Expiry line */}
//         {row.expires_at && !isExpired && (
//           <p className="dl-card-expiry" style={{ color: isSub ? "var(--color-success)" : "var(--color-warning)" }}>
//             <Clock size={10} /> {isSub ? "Renews" : "Expires"} {new Date(row.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
//           </p>
//         )}
//         {!row.expires_at && <p className="dl-card-lifetime">Lifetime access</p>}
//         {revokeLabel && (
//           <p className="dl-card-revoke"><XCircle size={10} /> {revokeLabel}</p>
//         )}

//         {(fileSize || dlCount !== null) && (
//           <div className="dl-card-file-meta">
//             {fileSize   && <span><HardDrive size={10} /> {fileSize}</span>}
//             {dlCount !== null && <span><Download size={10} /> {dlCount}×</span>}
//           </div>
//         )}

//         {!isExpired && isReady && product?.id && (
//           <div className="dl-card-stars-row">
//             <StarRating productId={product.id} existingReview={row.user_review} onReviewLeft={onReviewLeft} />
//           </div>
//         )}

//         {/* Action row */}
//         <div className="dl-card-actions">
//           {isExpired ? (
//             <button disabled className="dl-btn dl-btn--ghost dl-btn--sm dl-btn--disabled" style={{ flex: 1 }}>
//               <AlertTriangle size={12} /> {revokeLabel ?? "Expired"}
//             </button>
//           ) : !isReady ? (
//             <button disabled className="dl-btn dl-btn--ghost dl-btn--sm dl-btn--disabled" style={{ flex: 1 }}>
//               <Loader2 size={12} className="animate-spin" /> Preparing…
//             </button>
//           ) : config.action === "continue" ? (
//             <Link href={`/dashboard/my-courses/${product?.id}`} onClick={() => onAccess(row.id)}
//               className="dl-btn dl-btn--primary dl-btn--sm" style={{ flex: 1, backgroundColor: config.color }}>
//               <config.ActionIcon size={12} /> {config.actionLabel}
//             </Link>
//           ) : (
//             <button onClick={handleAction} className="dl-btn dl-btn--primary dl-btn--sm" style={{ flex: 1, backgroundColor: config.color }}>
//               <config.ActionIcon size={12} /> {config.actionLabel}
//             </button>
//           )}

//           {!isExpired && isReady && (
//             config.action === "continue" ? (
//               <Link href={`/dashboard/my-courses/${product?.id}?tab=progress`} className="dl-btn dl-btn--icon dl-btn--sm">
//                 <BarChart2 size={13} />
//               </Link>
//             ) : (
//               <button onClick={handleCopy} className="dl-btn dl-btn--icon dl-btn--sm">
//                 <Copy size={13} />
//               </button>
//             )
//           )}
//         </div>

//         {row.order_id && (
//           <Link href={`/dashboard/orders/${row.order_id}`} className="dl-card-order-link">
//             <ShoppingBag size={10} /> Order #{String(row.order_id).slice(-8)}
//           </Link>
//         )}
//       </div>
//     </article>
//   );
// }

// // ─── Table view ───────────────────────────────────────────────────────────────

// function TableView({ rows, highlightId, selected, onToggleSelect, onAccess, onReviewLeft }: {
//   rows: DigitalAccessRow[];
//   highlightId: string | null;
//   selected: Set<string>;
//   onToggleSelect: (id: string) => void;
//   onAccess: (id: string) => void;
//   onReviewLeft: (productId: string, rating: number) => void;
// }) {
//   const [sortKey, setSortKey] = useState<SortKey>("granted_at");
//   const [sortDir, setSortDir] = useState<SortDir>("desc");

//   function toggleSort(key: SortKey) {
//     if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
//     else { setSortKey(key); setSortDir("asc"); }
//   }

//   const sorted = useMemo(() => [...rows].sort((a, b) => {
//     let av: string | number = "";
//     let bv: string | number = "";
//     switch (sortKey) {
//       case "name":           av = a.products?.name?.toLowerCase() ?? "";   bv = b.products?.name?.toLowerCase() ?? "";   break;
//       case "subtype":        av = a.subtype ?? "";                          bv = b.subtype ?? "";                          break;
//       case "granted_at":     av = new Date(a.granted_at).getTime();         bv = new Date(b.granted_at).getTime();         break;
//       case "expires_at":     av = a.expires_at ? new Date(a.expires_at).getTime() : Infinity; bv = b.expires_at ? new Date(b.expires_at).getTime() : Infinity; break;
//       case "last_accessed_at": av = a.last_accessed_at ? new Date(a.last_accessed_at).getTime() : 0; bv = b.last_accessed_at ? new Date(b.last_accessed_at).getTime() : 0; break;
//       case "status":         av = isExpiredFn(a) ? 1 : 0;                  bv = isExpiredFn(b) ? 1 : 0;                  break;
//     }
//     if (av < bv) return sortDir === "asc" ? -1 : 1;
//     if (av > bv) return sortDir === "asc" ? 1 : -1;
//     return 0;
//   }), [rows, sortKey, sortDir]);

//   const COLS: { key: SortKey; label: string; hide?: string }[] = [
//     { key: "name",            label: "Product"  },
//     { key: "subtype",         label: "Type",    hide: "sm"  },
//     { key: "granted_at",      label: "Claimed", hide: "md"  },
//     { key: "last_accessed_at",label: "Last used",hide: "lg" },
//     { key: "expires_at",      label: "Expires", hide: "xl"  },
//     { key: "status",          label: "Status"   },
//   ];

//   const allSelected = sorted.length > 0 && sorted.every(r => selected.has(r.id));

//   function SortIcon({ col }: { col: SortKey }) {
//     if (sortKey !== col) return <ChevronsUpDown size={11} style={{ opacity: 0.3 }} />;
//     return sortDir === "asc" ? <ChevronUp size={11} style={{ color: "var(--color-accent)" }} /> : <ChevronDown size={11} style={{ color: "var(--color-accent)" }} />;
//   }

//   return (
//     <div className="dl-table-wrap">
//       <table className="dl-table">
//         <thead>
//           <tr className="dl-table-head">
//             <th className="dl-th dl-th--check">
//               <button className="dl-check" onClick={() => sorted.forEach(r => onToggleSelect(r.id))}
//                 style={{ backgroundColor: allSelected ? "var(--color-accent)" : undefined }}>
//                 {allSelected && <CheckSquare size={10} className="text-white" />}
//               </button>
//             </th>
//             <th className="dl-th dl-th--thumb" />
//             {COLS.map(col => (
//               <th key={col.key} className={cn("dl-th", col.hide && `dl-th--hide-${col.hide}`)}>
//                 <button className="dl-th-btn" onClick={() => toggleSort(col.key)}>
//                   {col.label} <SortIcon col={col.key} />
//                 </button>
//               </th>
//             ))}
//             <th className="dl-th dl-th--hide-xl">Price</th>
//             <th className="dl-th dl-th--hide-xl">DL</th>
//             <th className="dl-th dl-th--right">Actions</th>
//           </tr>
//         </thead>
//         <tbody>
//           {sorted.map((row, i) => (
//             <TableRow
//               key={row.id}
//               row={row}
//               highlight={highlightId === row.id || highlightId === row.products?.id}
//               isLast={i === sorted.length - 1}
//               selected={selected.has(row.id)}
//               onToggleSelect={onToggleSelect}
//               onAccess={onAccess}
//               onReviewLeft={onReviewLeft}
//             />
//           ))}
//         </tbody>
//       </table>
//       <div className="dl-table-footer">
//         <span>{sorted.length} item{sorted.length !== 1 ? "s" : ""}</span>
//         <span>Click column to sort</span>
//       </div>
//     </div>
//   );
// }

// function TableRow({ row, highlight, isLast, selected, onToggleSelect, onAccess, onReviewLeft }: {
//   row: DigitalAccessRow; highlight: boolean; isLast: boolean;
//   selected: boolean; onToggleSelect: (id: string) => void;
//   onAccess: (id: string) => void;
//   onReviewLeft: (productId: string, rating: number) => void;
// }) {
//   const product     = row.products;
//   const config      = getSubtypeConfig(row.subtype);
//   const isExpired   = isExpiredFn(row);
//   const daysLeft    = daysUntilExpiryFn(row);
//   const img         = product?.images?.[0] ?? row.vendors?.business_logo ?? null;
//   const name        = product?.name ?? "Unknown";
//   const grantedLabel    = new Date(row.granted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
//   const expiryLabel     = row.expires_at ? new Date(row.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
//   const lastUsedLabel   = row.last_accessed_at ? new Date(row.last_accessed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Never";
//   const pricePaid       = formatCurrency(row.order_items?.unit_price);
//   const dlCount         = row.order_items?.download_count ?? null;
//   const variantName     = row.order_items?.variant_name ?? null;
//   const vendorName      = row.vendors?.business_name ?? null;
//   const vendorLogo      = row.vendors?.business_logo ?? null;
//   const revokeLabel     = getRevokeReasonLabel(row.revoke_reason);
//   const isReady         = row.file_ready !== false;

//   function handleCopy() {
//     navigator.clipboard.writeText(`${window.location.origin}${proxyUrl(row.id)}`);
//     toast.success("Link copied");
//   }

//   function handleAction() {
//     onAccess(row.id);
//     window.open(proxyUrl(row.id), "_blank");
//   }

//   return (
//     <tr
//       className={cn("dl-tr", isExpired && "dl-tr--expired", highlight && "dl-tr--highlight", !isLast && "dl-tr--border")}
//       style={{ backgroundColor: selected ? "var(--color-accent-subtle)" : undefined }}
//       onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-surface-secondary)"; }}
//       onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = selected ? "var(--color-accent-subtle)" : ""; }}
//     >
//       <td className="dl-td dl-td--check">
//         <button className="dl-check" onClick={() => onToggleSelect(row.id)}
//           style={{ backgroundColor: selected ? "var(--color-accent)" : undefined }}>
//           {selected && <CheckSquare size={10} className="text-white" />}
//         </button>
//       </td>
//       <td className="dl-td dl-td--thumb">
//         <div className="dl-row-thumb">
//           {img
//             ? <img src={img} alt={name} />
//             : <config.icon size={13} style={{ color: config.color }} />
//           }
//         </div>
//       </td>
//       <td className="dl-td dl-td--name">
//         <div className="dl-row-name-group">
//           <div className="dl-row-name-line">
//             {highlight && <span className="dl-row-dot" style={{ backgroundColor: "var(--color-success)" }} />}
//             <span className="dl-row-name" title={name}>{name}</span>
//             {variantName && <span className="dl-row-variant">{variantName}</span>}
//           </div>
//           {vendorName && (
//             <div className="dl-row-vendor">
//               {vendorLogo && <img src={vendorLogo} alt={vendorName} />}
//               <span>{vendorName}</span>
//             </div>
//           )}
//           {row.lesson_progress && row.lesson_progress.total_lessons > 0 && (
//             <div className="dl-row-progress">
//               <div className="dl-progress-bar" style={{ width: 60 }}>
//                 <div className="dl-progress-fill" style={{ width: `${row.lesson_progress.percent}%`, backgroundColor: config.color }} />
//               </div>
//               <span>{row.lesson_progress.percent}%</span>
//             </div>
//           )}
//           {!isExpired && isReady && product?.id && (
//             <StarRating productId={product.id} existingReview={row.user_review} onReviewLeft={onReviewLeft} />
//           )}
//         </div>
//       </td>
//       <td className="dl-td dl-td--hide-sm">
//         <span className="dl-type-pill" style={{ color: config.color, borderColor: `${config.color}33` }}>
//           <config.icon size={9} /> {config.label}
//         </span>
//       </td>
//       <td className="dl-td dl-td--hide-md dl-td--muted">{grantedLabel}</td>
//       <td className="dl-td dl-td--hide-lg" style={{ color: lastUsedLabel === "Never" ? "var(--color-text-muted)" : "var(--color-text-secondary)" }}>{lastUsedLabel}</td>
//       <td className="dl-td dl-td--hide-xl">
//         {revokeLabel ? (
//           <span className="dl-status dl-status--danger"><XCircle size={10} /> {revokeLabel}</span>
//         ) : row.expires_at ? (
//           <span style={{ color: isExpired ? "var(--color-danger)" : daysLeft !== null && daysLeft <= 7 ? "var(--color-warning)" : "var(--color-text-secondary)", fontSize: 12 }}>
//             {(isExpired || (daysLeft !== null && daysLeft <= 7)) && <Clock size={10} />} {expiryLabel}
//           </span>
//         ) : (
//           <span className="dl-td--muted" style={{ fontSize: 12 }}>Lifetime</span>
//         )}
//       </td>
//       <td className="dl-td">
//         {isExpired ? (
//           <span className="dl-status dl-status--danger"><AlertTriangle size={10} /> Expired</span>
//         ) : !isReady ? (
//           <span className="dl-status dl-status--warn"><Loader2 size={10} className="animate-spin" /> Preparing</span>
//         ) : (
//           <span className="dl-status dl-status--ok"><CheckCircle2 size={10} /> Active</span>
//         )}
//       </td>
//       <td className="dl-td dl-td--hide-xl dl-td--muted" style={{ fontSize: 12 }}>{pricePaid ?? "—"}</td>
//       <td className="dl-td dl-td--hide-xl dl-td--muted" style={{ fontSize: 12 }}>{dlCount !== null ? `${dlCount}×` : "—"}</td>
//       <td className="dl-td dl-td--right">
//         <div className="dl-row-actions">
//           {!isExpired && isReady ? (
//             config.action === "continue" ? (
//               <>
//                 <Link href={`/dashboard/my-courses/${product?.id}`} onClick={() => onAccess(row.id)}
//                   className="dl-btn dl-btn--primary dl-btn--sm" style={{ backgroundColor: config.color }}>
//                   <config.ActionIcon size={11} /> <span className="dl-btn-label">{config.actionLabel}</span>
//                 </Link>
//                 <Link href={`/dashboard/my-courses/${product?.id}?tab=progress`} className="dl-btn dl-btn--icon dl-btn--sm">
//                   <BarChart2 size={12} />
//                 </Link>
//               </>
//             ) : (
//               <>
//                 <button onClick={handleAction} className="dl-btn dl-btn--primary dl-btn--sm" style={{ backgroundColor: config.color }}>
//                   <config.ActionIcon size={11} /> <span className="dl-btn-label">{config.actionLabel}</span>
//                 </button>
//                 <button onClick={handleCopy} className="dl-btn dl-btn--icon dl-btn--sm">
//                   <Copy size={12} />
//                 </button>
//               </>
//             )
//           ) : (
//             <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>—</span>
//           )}
//         </div>
//       </td>
//     </tr>
//   );
// }

// // ─── Stats bar ────────────────────────────────────────────────────────────────

// function StatsBar({ items }: { items: DigitalAccessRow[] }) {
//   const total        = items.length;
//   const active       = items.filter(r => r.file_ready !== false && !isExpiredFn(r)).length;
//   const expired      = items.filter(r => isExpiredFn(r)).length;
//   const expiringSoon = items.filter(r => { const d = daysUntilExpiryFn(r); return d !== null && d > 0 && d <= 7; }).length;

//   return (
//     <div className="dl-stats">
//       <div className="dl-stat"><span className="dl-stat-val">{total}</span><span className="dl-stat-lbl">Total</span></div>
//       <div className="dl-stat-div" />
//       <div className="dl-stat"><span className="dl-stat-val" style={{ color: "var(--color-success)" }}>{active}</span><span className="dl-stat-lbl">Active</span></div>
//       {expiringSoon > 0 && (<><div className="dl-stat-div" /><div className="dl-stat"><span className="dl-stat-val" style={{ color: "var(--color-warning)" }}>{expiringSoon}</span><span className="dl-stat-lbl">Expiring</span></div></>)}
//       {expired > 0      && (<><div className="dl-stat-div" /><div className="dl-stat"><span className="dl-stat-val" style={{ color: "var(--color-danger)"  }}>{expired}</span><span className="dl-stat-lbl">Expired</span></div></>)}
//     </div>
//   );
// }

// // ─── Page ─────────────────────────────────────────────────────────────────────

// export default function DigitalLibraryPage() {
//   const searchParams = useSearchParams();
//   const router       = useRouter();
//   const highlightId  = searchParams.get("highlight") ?? searchParams.get("new") ?? null;

//   const [items,      setItems]      = useState<DigitalAccessRow[]>([]);
//   const [loading,    setLoading]    = useState(true);
//   const [loadError,  setLoadError]  = useState(false);
//   const [refreshing, setRefreshing] = useState(false);
//   const [search,     setSearch]     = useState("");
//   const [activeFilter, setActiveFilter] = useState<FilterId>("all");
//   const [viewMode, setViewMode] = useState<"grid" | "table">(() =>
//     typeof window !== "undefined" ? ((localStorage.getItem("dlv") as "grid" | "table") ?? "grid") : "grid"
//   );
//   const [density, setDensity] = useState<Density>(() =>
//     typeof window !== "undefined" ? ((localStorage.getItem("dld") as Density) ?? "comfortable") : "comfortable"
//   );
//   const [showExpired,   setShowExpired]   = useState(false);
//   const [sortKey,       setSortKey]       = useState<SortKey>("granted_at");
//   const [sortDir,       setSortDir]       = useState<SortDir>("desc");
//   const [page,          setPage]          = useState(1);
//   const [selected,      setSelected]      = useState<Set<string>>(new Set());
//   const [focusedIndex,  setFocusedIndex]  = useState(-1);

//   const searchRef   = useRef<HTMLInputElement>(null);
//   const highlightRef = useRef<HTMLDivElement>(null);
//   const channelRef  = useRef<any>(null);
//   const userIdRef   = useRef<string | null>(null);

//   function setViewModePersisted(m: "grid" | "table") { setViewMode(m); localStorage.setItem("dlv", m); }
//   function setDensityPersisted(d: Density)            { setDensity(d);  localStorage.setItem("dld", d); }

//   // ── Load ──
//  const load = useCallback(async (isRefresh = false) => {
//   if (isRefresh) setRefreshing(true); else setLoading(true);
//   setLoadError(false);

//   try {
//     const supabase = createClient();
//     const { data: { user }, error: authError } = await supabase.auth.getUser();

//     if (authError || !user) {
//       console.error("[DL] Auth error:", authError);
//       setLoading(false);
//       setRefreshing(false);
//       return;
//     }

//     userIdRef.current = user.id;

//     const { data, error } = await supabase
//       .from("digital_access")
//       .select(`
//         id, subtype, granted_at, expires_at, last_accessed_at,
//         order_id, order_item_id, revoke_reason,
//         products (
//           id, name, images, button_text, pricing_type, billing_period,
//           digital_file_size, tags, description,
//           vendors ( business_name, business_logo )
//         ),
//         order_items ( unit_price, total_price, download_count, variant_name, variant_id )
//       `)
//       .eq("user_id", user.id)
//       .is("revoked_at", null)
//       .order("granted_at", { ascending: false });

//     // Log the actual error so you can see what's wrong
//     if (error) {
//       console.error("[DL] Query error:", error.message, error.details, error.hint);
//       setLoadError(true);
//       setLoading(false);
//       setRefreshing(false);
//       return;
//     }

//     const rows = data ?? [];
//     const productIds = rows
//       .map((r: any) => {
//         const p = Array.isArray(r.products) ? r.products[0] : r.products;
//         return p?.id;
//       })
//       .filter(Boolean);

//     // lesson_progress — wrapped in try/catch separately so it
//     // doesn't kill the whole page if the table name is wrong
//     let progressMap: Record<string, { completed_lessons: number; total_lessons: number; percent: number }> = {};
//     if (productIds.length > 0) {
//       try {
//         const { data: pData, error: pErr } = await supabase
//           .from("lesson_progress")
//           .select("course_id, completed, community_courses!inner(total_lessons)")
//           .eq("user_id", user.id)
//           .in("course_id", productIds);

//         if (pErr) {
//           console.warn("[DL] lesson_progress error (non-fatal):", pErr.message);
//         } else if (pData) {
//           const grouped: Record<string, { completed: number; total: number }> = {};
//           (pData as any[]).forEach(p => {
//             if (!grouped[p.course_id]) {
//               grouped[p.course_id] = {
//                 completed: 0,
//                 total: p.community_courses?.total_lessons ?? 0,
//               };
//             }
//             if (p.completed) grouped[p.course_id].completed += 1;
//           });
//           Object.entries(grouped).forEach(([id, g]) => {
//             progressMap[id] = {
//               completed_lessons: g.completed,
//               total_lessons: g.total,
//               percent: g.total > 0 ? Math.round((g.completed / g.total) * 100) : 0,
//             };
//           });
//         }
//       } catch (e) {
//         console.warn("[DL] lesson_progress threw (non-fatal):", e);
//       }
//     }

//     // reviews — same pattern, non-fatal
//     let reviewMap: Record<string, { rating: number; id: string }> = {};
//     if (productIds.length > 0) {
//       try {
//         const { data: rData, error: rErr } = await supabase
//           .from("reviews")
//           .select("id, product_id, rating")
//           .eq("buyer_id", user.id)
//           .in("product_id", productIds);

//         if (rErr) {
//           console.warn("[DL] reviews error (non-fatal):", rErr.message);
//         } else if (rData) {
//           (rData as any[]).forEach(r => {
//             reviewMap[r.product_id] = { rating: r.rating, id: r.id };
//           });
//         }
//       } catch (e) {
//         console.warn("[DL] reviews threw (non-fatal):", e);
//       }
//     }

//     const resolved = rows.map((row: any) => {
//       const product   = Array.isArray(row.products)    ? (row.products[0]    ?? null) : row.products;
//       const vendor    = product?.vendors
//         ? (Array.isArray(product.vendors) ? product.vendors[0] : product.vendors)
//         : null;
//       const orderItem = Array.isArray(row.order_items) ? (row.order_items[0] ?? null) : row.order_items;

//       return {
//         ...row,
//         file_ready:      true, // assume ready; set false only if you add the column
//         products:        product ? { ...product, vendors: undefined } : null,
//         vendors:         vendor,
//         order_items:     orderItem,
//         lesson_progress: product?.id ? (progressMap[product.id] ?? null) : null,
//         user_review:     product?.id ? (reviewMap[product.id]   ?? null) : null,
//       } as DigitalAccessRow;
//     });

//     setItems(resolved);
//   } catch (e) {
//     console.error("[DL] Unexpected error:", e);
//     setLoadError(true);
//   } finally {
//     setLoading(false);
//     setRefreshing(false);
//   }
// }, []);

//   // ── Realtime ──
//   useEffect(() => {
//     const supabase = createClient();
//     let cancelled = false;
//     async function init() {
//       await load();
//       if (cancelled || !userIdRef.current) return;
//       if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
//       channelRef.current = supabase
//         .channel(`digital-access-${userIdRef.current}`)
//         .on("postgres_changes", { event: "*", schema: "public", table: "digital_access", filter: `user_id=eq.${userIdRef.current}` }, () => load())
//         .subscribe();
//     }
//     init();
//     return () => {
//       cancelled = true;
//       if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
//     };
//   }, [load]);

//   // ── Keyboard shortcuts ──
//   useEffect(() => {
//     function onKey(e: KeyboardEvent) {
//       if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); searchRef.current?.focus(); return; }
//       if (e.key === "Escape") {
//         if (search) setSearch("");
//         else if (selected.size > 0) setSelected(new Set());
//         else setFocusedIndex(-1);
//         return;
//       }
//       const target = e.target as HTMLElement;
//       if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
//       if (viewMode === "grid" && ["ArrowRight","ArrowLeft","ArrowDown","ArrowUp"].includes(e.key)) {
//         e.preventDefault();
//         setFocusedIndex(prev => {
//           const cols = window.innerWidth >= 1280 ? 4 : window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1;
//           if (e.key === "ArrowRight") return Math.min(prev + 1,    paginated.length - 1);
//           if (e.key === "ArrowLeft")  return Math.max(prev - 1,    0);
//           if (e.key === "ArrowDown")  return Math.min(prev + cols, paginated.length - 1);
//           if (e.key === "ArrowUp")    return Math.max(prev - cols, 0);
//           return prev;
//         });
//       }
//       if (e.key === "Enter" && focusedIndex >= 0 && paginated[focusedIndex]) {
//         const row = paginated[focusedIndex];
//         const config = getSubtypeConfig(row.subtype);
//         if (config.action === "continue") { router.push(`/dashboard/my-courses/${row.products?.id}`); return; }
//         window.open(proxyUrl(row.id), "_blank", "noopener,noreferrer");
//       }
//       if (e.key === " " && focusedIndex >= 0 && paginated[focusedIndex]) {
//         e.preventDefault();
//         toggleSelect(paginated[focusedIndex].id);
//       }
//     }
//     window.addEventListener("keydown", onKey);
//     return () => window.removeEventListener("keydown", onKey);
//   });

//   useEffect(() => {
//     if (highlightId && highlightRef.current) {
//       setTimeout(() => highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 400);
//     }
//   }, [highlightId, items]);

//   const handleAccess = useCallback(async (id: string) => {
//     const supabase = createClient();
//     const now = new Date().toISOString();
//     setItems(prev => prev.map(r => r.id === id ? { ...r, last_accessed_at: now } : r));
//     await supabase.from("digital_access").update({ last_accessed_at: now }).eq("id", id);
//   }, []);

//   const handleReviewLeft = useCallback(async (productId: string, rating: number) => {
//     const supabase = createClient();
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) return;
//     const { data, error } = await supabase
//       .from("reviews")
//       .upsert({ product_id: productId, buyer_id: user.id, rating }, { onConflict: "product_id,buyer_id" })
//       .select("id, rating").single();
//     if (!error && data) {
//       setItems(prev => prev.map(r => r.products?.id === productId ? { ...r, user_review: { rating: data.rating, id: data.id } } : r));
//       toast.success(`Rated ${rating}★`);
//     }
//   }, []);

//   // ── Filter + sort ──
//   const knownSubtypes = useMemo(() => new Set(FILTER_TABS.map(t => t.id).filter(id => id !== "all" && id !== "other")), []);

//   const filtered = useMemo(() => {
//     const q = search.toLowerCase().trim();
//     return items.filter(row => {
//       if (!showExpired && isExpiredFn(row)) return false;
//       const matchSearch = !q
//         || (row.products?.name ?? "").toLowerCase().includes(q)
//         || (row.products?.description ?? "").toLowerCase().includes(q)
//         || (row.products?.tags ?? []).join(" ").toLowerCase().includes(q);
//       const bucket = !row.subtype || !knownSubtypes.has(row.subtype as any) ? "other" : row.subtype;
//       return matchSearch && (activeFilter === "all" || bucket === activeFilter);
//     });
//   }, [items, search, activeFilter, showExpired, knownSubtypes]);

//   const sorted = useMemo(() => [...filtered].sort((a, b) => {
//     let av: string | number = "";
//     let bv: string | number = "";
//     switch (sortKey) {
//       case "name":           av = a.products?.name?.toLowerCase() ?? ""; bv = b.products?.name?.toLowerCase() ?? ""; break;
//       case "subtype":        av = a.subtype ?? "";                        bv = b.subtype ?? "";                        break;
//       case "granted_at":     av = new Date(a.granted_at).getTime();       bv = new Date(b.granted_at).getTime();       break;
//       case "expires_at":     av = a.expires_at ? new Date(a.expires_at).getTime() : Infinity; bv = b.expires_at ? new Date(b.expires_at).getTime() : Infinity; break;
//       case "last_accessed_at": av = a.last_accessed_at ? new Date(a.last_accessed_at).getTime() : 0; bv = b.last_accessed_at ? new Date(b.last_accessed_at).getTime() : 0; break;
//       case "status":         av = isExpiredFn(a) ? 1 : 0;                bv = isExpiredFn(b) ? 1 : 0;                break;
//     }
//     if (av < bv) return sortDir === "asc" ? -1 : 1;
//     if (av > bv) return sortDir === "asc" ? 1 : -1;
//     return 0;
//   }), [filtered, sortKey, sortDir]);

//   useEffect(() => { setPage(1); setFocusedIndex(-1); }, [search, activeFilter, showExpired, sortKey, sortDir]);

//   const paginated = sorted.slice(0, page * PAGE_SIZE);
//   const hasMore   = page * PAGE_SIZE < sorted.length;

//   const countBySubtype = useMemo(() =>
//     items.filter(r => showExpired || !isExpiredFn(r)).reduce<Record<string, number>>((acc, row) => {
//       const key = !row.subtype || !knownSubtypes.has(row.subtype as any) ? "other" : row.subtype;
//       acc[key] = (acc[key] ?? 0) + 1;
//       return acc;
//     }, {}),
//     [items, showExpired, knownSubtypes]
//   );

//   const expiredCount = items.filter(r => isExpiredFn(r)).length;

//   function handleSort(key: SortKey) {
//     if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
//     else { setSortKey(key); setSortDir("desc"); }
//   }

//   function toggleSelect(id: string) {
//     setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
//   }

//   function bulkCopy() {
//     const links = items.filter(r => selected.has(r.id)).map(r => `${window.location.origin}${proxyUrl(r.id)}`).join("\n");
//     if (!links) { toast.error("Nothing to copy"); return; }
//     navigator.clipboard.writeText(links);
//     toast.success(`Copied ${selected.size} link${selected.size !== 1 ? "s" : ""}`);
//   }

//   function bulkDownload() {
//     items.filter(r => selected.has(r.id)).forEach(r => window.open(proxyUrl(r.id), "_blank"));
//     toast.success("Downloads started");
//   }

//   const gridCols = density === "compact"
//     ? "dl-grid dl-grid--compact"
//     : "dl-grid dl-grid--comfortable";

//   // ── Loading ──
//   if (loading) {
//     return (
//       <>
//         <style>{DL_STYLES}</style>
//         <div className="dl-page">
//           <div className="dl-header dl-header--loading">
//             <div className="dl-header-left">
//               <div className="dl-skeleton" style={{ width: 36, height: 36 }} />
//               <div>
//                 <div className="dl-skeleton" style={{ width: 160, height: 22, marginBottom: 6 }} />
//                 <div className="dl-skeleton" style={{ width: 200, height: 13 }} />
//               </div>
//             </div>
//             <div className="dl-skeleton" style={{ width: 220, height: 34 }} />
//           </div>
//           <div className="dl-grid dl-grid--comfortable">
//             {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
//           </div>
//         </div>
//       </>
//     );
//   }

//   return (
//     <>
//       <style>{DL_STYLES}</style>

//       <BulkBar
//         selected={selected}
//         total={sorted.length}
//         onSelectAll={() => setSelected(new Set(sorted.map(r => r.id)))}
//         onClear={() => setSelected(new Set())}
//         onBulkCopy={bulkCopy}
//         onBulkDownload={bulkDownload}
//       />

//       <div className="dl-page">

//         {/* ── Header ── */}
//         <div className="dl-header">
//           <div className="dl-header-left">
//             <div className="dl-header-icon"><Library size={18} /></div>
//             <div>
//               <h1 className="dl-title">Digital Library</h1>
//               <p className="dl-subtitle">Your purchased products</p>
//             </div>
//           </div>
//           <div className="dl-header-controls">
//             {items.length > 0 && <StatsBar items={items} />}
//             <div className="dl-controls-group">
//               {expiredCount > 0 && (
//                 <button onClick={() => setShowExpired(v => !v)} className={cn("dl-btn dl-btn--ghost dl-btn--sm", showExpired && "dl-btn--active-danger")}>
//                   <AlertTriangle size={12} /> {showExpired ? "Hide" : "Show"} expired ({expiredCount})
//                 </button>
//               )}
//               {viewMode === "grid" && (
//                 <div className="dl-toggle-group">
//                   {([{ d: "comfortable" as Density, Icon: LayoutGrid }, { d: "compact" as Density, Icon: AlignJustify }] as const).map(({ d, Icon }) => (
//                     <button key={d} onClick={() => setDensityPersisted(d)} className={cn("dl-toggle-btn", density === d && "dl-toggle-btn--active")}>
//                       <Icon size={13} />
//                     </button>
//                   ))}
//                 </div>
//               )}
//               <button onClick={() => load(true)} disabled={refreshing} className="dl-btn dl-btn--icon dl-btn--sm">
//                 <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
//               </button>
//               <div className="dl-toggle-group">
//                 {([{ mode: "grid" as const, Icon: Grid3X3 }, { mode: "table" as const, Icon: Table2 }] as const).map(({ mode, Icon }) => (
//                   <button key={mode} onClick={() => setViewModePersisted(mode)} className={cn("dl-toggle-btn", viewMode === mode && "dl-toggle-btn--active")}>
//                     <Icon size={13} />
//                   </button>
//                 ))}
//               </div>
//               <div className="dl-search-wrap">
//                 <Search size={13} className="dl-search-icon" />
//                 <input
//                   ref={searchRef}
//                   placeholder="Search…"
//                   value={search}
//                   onChange={e => setSearch(e.target.value)}
//                   className="dl-search"
//                 />
//                 {search
//                   ? <button onClick={() => setSearch("")} className="dl-search-clear"><XCircle size={13} /></button>
//                   : <kbd className="dl-search-kbd">⌘K</kbd>
//                 }
//               </div>
//             </div>
//           </div>
//         </div>

//         {loadError && <ErrorBanner onRetry={() => load()} />}
//         <ExpiryBanner items={items} />
//         <RecentShelf items={items} onAccess={handleAccess} />

//         {/* ── Filter tabs ── */}
//         {items.length > 0 && (
//           <div className="dl-filters">
//             {FILTER_TABS.map(tab => {
//               const count = tab.id === "all"
//                 ? (showExpired ? items.length : items.filter(r => !isExpiredFn(r)).length)
//                 : (countBySubtype[tab.id] ?? 0);
//               if (tab.id !== "all" && count === 0) return null;
//               const isActive = activeFilter === tab.id;
//               return (
//                 <button
//                   key={tab.id}
//                   onClick={() => setActiveFilter(tab.id)}
//                   className={cn("dl-filter-btn", isActive && "dl-filter-btn--active")}
//                 >
//                   <tab.icon size={11} /> {tab.label} <span className="dl-filter-count">{count}</span>
//                 </button>
//               );
//             })}
//           </div>
//         )}

//         {/* ── Sort bar (grid only) ── */}
//         {sorted.length > 0 && viewMode === "grid" && (
//           <div className="dl-sort-bar">
//             <span className="dl-sort-label">Sort:</span>
//             {([
//               { key: "granted_at" as SortKey, label: "Date" },
//               { key: "name"       as SortKey, label: "Name" },
//               { key: "subtype"    as SortKey, label: "Type" },
//               { key: "expires_at" as SortKey, label: "Expiry" },
//               { key: "last_accessed_at" as SortKey, label: "Last used" },
//             ]).map(o => (
//               <button key={o.key} onClick={() => handleSort(o.key)} className={cn("dl-sort-btn", sortKey === o.key && "dl-sort-btn--active")}>
//                 {o.label}
//                 {sortKey === o.key && (sortDir === "asc" ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
//               </button>
//             ))}
//           </div>
//         )}

//         {/* ── Results label ── */}
//         {(search || activeFilter !== "all") && sorted.length > 0 && (
//           <p className="dl-results-label">
//             {sorted.length} result{sorted.length !== 1 ? "s" : ""}
//             {search && <> for <strong>"{search}"</strong></>}
//           </p>
//         )}

//         {/* ── Empty: no items ── */}
//         {items.length === 0 && !loadError && (
//           <div className="dl-empty">
//             <Library size={28} style={{ color: "var(--color-text-muted)", marginBottom: 12 }} />
//             <p className="dl-empty-title">Your library is empty</p>
//             <p className="dl-empty-sub">Products you purchase appear here with instant access.</p>
//             <Link href="/marketplace" className="dl-btn dl-btn--primary" style={{ marginTop: 20 }}>
//               <Sparkles size={13} /> Browse marketplace
//             </Link>
//           </div>
//         )}

//         {/* ── Empty: no results ── */}
//         {items.length > 0 && sorted.length === 0 && (
//           <div className="dl-empty">
//             <Search size={22} style={{ color: "var(--color-text-muted)", marginBottom: 12 }} />
//             <p className="dl-empty-title">No results</p>
//             <p className="dl-empty-sub">{search ? `Nothing matched "${search}"` : `No ${activeFilter} assets`}</p>
//             <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
//               {search        && <button onClick={() => setSearch("")}          className="dl-btn dl-btn--ghost dl-btn--sm">Clear search</button>}
//               {activeFilter !== "all" && <button onClick={() => setActiveFilter("all")} className="dl-btn dl-btn--ghost dl-btn--sm">Show all</button>}
//             </div>
//           </div>
//         )}

//         {/* ── Grid ── */}
//         {sorted.length > 0 && viewMode === "grid" && (
//           <>
//             <div className={gridCols}>
//               {paginated.map((row, i) => {
//                 const isHighlighted = highlightId === row.id || highlightId === row.products?.id;
//                 return (
//                   <div key={row.id} ref={isHighlighted ? highlightRef : undefined}
//                     style={focusedIndex === i ? { outline: "2px solid var(--color-accent)", outlineOffset: 3 } : undefined}>
//                     <GridCard
//                       row={row} highlight={isHighlighted} index={i}
//                       selected={selected.has(row.id)}
//                       onToggleSelect={toggleSelect}
//                       onAccess={handleAccess}
//                       onReviewLeft={handleReviewLeft}
//                       density={density}
//                     />
//                   </div>
//                 );
//               })}
//             </div>
//             {hasMore && (
//               <div className="dl-load-more">
//                 <span className="dl-results-label">Showing {paginated.length} of {sorted.length}</span>
//                 <button onClick={() => setPage(p => p + 1)} className="dl-btn dl-btn--ghost dl-btn--sm">
//                   Load {Math.min(PAGE_SIZE, sorted.length - paginated.length)} more
//                 </button>
//               </div>
//             )}
//             {sorted.length > 1 && (
//               <p className="dl-kb-hint">↑↓←→ navigate · Enter open · Space select · Esc clear</p>
//             )}
//           </>
//         )}

//         {/* ── Table ── */}
//         {sorted.length > 0 && viewMode === "table" && (
//           <TableView
//             rows={sorted}
//             highlightId={highlightId}
//             selected={selected}
//             onToggleSelect={toggleSelect}
//             onAccess={handleAccess}
//             onReviewLeft={handleReviewLeft}
//           />
//         )}

//       </div>
//     </>
//   );
// }

// // ─── Styles ───────────────────────────────────────────────────────────────────
// // Sharp, utilitarian, editorial — no excessive rounding, no gradient pills

// const DL_STYLES = `
// /* ── Layout ── */
// .dl-page {
//   max-width: 1200px;
//   margin: 0 auto;
//   padding: 32px 24px 80px;
//   display: flex;
//   flex-direction: column;
//   gap: 20px;
//   font-family: 'DM Sans', 'Geist', ui-sans-serif, system-ui, sans-serif;
// }

// /* ── Header ── */
// .dl-header {
//   display: flex;
//   align-items: flex-start;
//   justify-content: space-between;
//   gap: 16px;
//   flex-wrap: wrap;
// }
// .dl-header-left {
//   display: flex;
//   align-items: center;
//   gap: 14px;
// }
// .dl-header-icon {
//   width: 36px; height: 36px;
//   background: var(--color-text-primary);
//   color: var(--color-bg);
//   display: flex; align-items: center; justify-content: center;
//   border-radius: 4px;
//   flex-shrink: 0;
// }
// .dl-title {
//   font-size: 20px;
//   font-weight: 700;
//   letter-spacing: -0.4px;
//   color: var(--color-text-primary);
//   margin: 0;
//   line-height: 1.2;
// }
// .dl-subtitle {
//   font-size: 12px;
//   color: var(--color-text-muted);
//   margin: 2px 0 0;
// }
// .dl-header-controls {
//   display: flex;
//   flex-direction: column;
//   align-items: flex-end;
//   gap: 10px;
// }
// .dl-controls-group {
//   display: flex;
//   align-items: center;
//   gap: 6px;
//   flex-wrap: wrap;
//   justify-content: flex-end;
// }

// /* ── Stats ── */
// .dl-stats {
//   display: flex;
//   align-items: center;
//   gap: 12px;
// }
// .dl-stat { display: flex; flex-direction: column; align-items: flex-end; }
// .dl-stat-val { font-size: 18px; font-weight: 800; line-height: 1; letter-spacing: -0.5px; color: var(--color-text-primary); }
// .dl-stat-lbl { font-size: 10px; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
// .dl-stat-div { width: 1px; height: 28px; background: var(--color-border); }

// /* ── Notices ── */
// .dl-notice {
//   display: flex;
//   align-items: center;
//   gap: 8px;
//   padding: 10px 14px;
//   border-left: 3px solid;
//   font-size: 12px;
//   border-radius: 0;
// }
// .dl-notice--danger { border-color: var(--color-danger); background: rgba(229,72,77,0.05); color: var(--color-danger); }
// .dl-notice--warn   { border-color: var(--color-warning); background: rgba(240,180,41,0.05); color: var(--color-text-secondary); }
// .dl-notice-action  { margin-left: auto; font-size: 11px; font-weight: 700; text-decoration: underline; background: none; border: none; cursor: pointer; color: inherit; }
// .dl-notice-close   { margin-left: auto; background: none; border: none; cursor: pointer; color: var(--color-text-muted); display: flex; align-items: center; }

// /* ── Sections ── */
// .dl-section { display: flex; flex-direction: column; gap: 8px; }
// .dl-section-label {
//   font-size: 10px;
//   font-weight: 700;
//   text-transform: uppercase;
//   letter-spacing: 0.08em;
//   color: var(--color-text-muted);
//   display: flex;
//   align-items: center;
//   gap: 5px;
// }

// /* ── Recent shelf ── */
// .dl-shelf {
//   display: flex;
//   gap: 6px;
//   overflow-x: auto;
//   padding-bottom: 4px;
//   scrollbar-width: none;
// }
// .dl-shelf::-webkit-scrollbar { display: none; }
// .dl-shelf-item {
//   flex-shrink: 0;
//   display: flex;
//   align-items: center;
//   gap: 10px;
//   padding: 8px 10px;
//   border: 1px solid var(--color-border);
//   background: var(--color-surface);
//   min-width: 200px;
//   max-width: 240px;
//   transition: border-color 0.15s;
// }
// .dl-shelf-item:hover { border-color: var(--color-text-muted); }
// .dl-shelf-thumb {
//   width: 34px; height: 34px;
//   border: 1px solid var(--color-border);
//   display: flex; align-items: center; justify-content: center;
//   overflow: hidden;
//   flex-shrink: 0;
//   background: var(--color-surface-secondary);
// }
// .dl-shelf-thumb img { width: 100%; height: 100%; object-fit: cover; }
// .dl-shelf-meta { flex: 1; min-width: 0; }
// .dl-shelf-name { font-size: 12px; font-weight: 600; color: var(--color-text-primary); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
// .dl-shelf-sub  { font-size: 10px; color: var(--color-text-muted); }
// .dl-shelf-btn  { width: 28px; height: 28px; border: 1px solid var(--color-border); background: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: opacity 0.15s; }
// .dl-shelf-btn:hover { opacity: 0.7; }

// /* ── Progress ── */
// .dl-progress-row { display: flex; align-items: center; gap: 6px; margin-top: 3px; }
// .dl-progress-bar { flex: 1; height: 3px; background: var(--color-border); overflow: hidden; }
// .dl-progress-fill { height: 100%; transition: width 0.3s; }
// .dl-progress-row span { font-size: 10px; color: var(--color-text-muted); }

// /* ── Filters ── */
// .dl-filters {
//   display: flex;
//   gap: 4px;
//   flex-wrap: wrap;
// }
// .dl-filter-btn {
//   display: inline-flex;
//   align-items: center;
//   gap: 5px;
//   padding: 5px 10px;
//   font-size: 11px;
//   font-weight: 600;
//   border: 1px solid var(--color-border);
//   background: transparent;
//   color: var(--color-text-secondary);
//   cursor: pointer;
//   transition: all 0.12s;
//   border-radius: 2px;
// }
// .dl-filter-btn:hover { border-color: var(--color-text-muted); color: var(--color-text-primary); }
// .dl-filter-btn--active {
//   background: var(--color-text-primary);
//   border-color: var(--color-text-primary);
//   color: var(--color-bg);
// }
// .dl-filter-count {
//   font-size: 10px;
//   font-weight: 700;
//   padding: 1px 5px;
//   background: rgba(128,128,128,0.15);
//   border-radius: 2px;
// }
// .dl-filter-btn--active .dl-filter-count { background: rgba(255,255,255,0.2); }

// /* ── Sort bar ── */
// .dl-sort-bar {
//   display: flex;
//   align-items: center;
//   gap: 6px;
//   flex-wrap: wrap;
// }
// .dl-sort-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); }
// .dl-sort-btn {
//   display: inline-flex;
//   align-items: center;
//   gap: 3px;
//   padding: 3px 8px;
//   font-size: 11px;
//   border: 1px solid transparent;
//   background: transparent;
//   color: var(--color-text-muted);
//   cursor: pointer;
//   border-radius: 2px;
//   transition: all 0.12s;
// }
// .dl-sort-btn:hover { color: var(--color-text-primary); border-color: var(--color-border); }
// .dl-sort-btn--active { color: var(--color-text-primary); border-color: var(--color-border); font-weight: 600; }

// /* ── Grid ── */
// .dl-grid {
//   display: grid;
//   gap: 1px;
//   background: var(--color-border);
// }
// .dl-grid--comfortable { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
// .dl-grid--compact     { grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); }

// /* ── Card ── */
// .dl-card {
//   position: relative;
//   background: var(--color-surface);
//   display: flex;
//   flex-direction: column;
//   transition: transform 0.15s;
//   animation: dl-fadein 0.25s ease both;
// }
// @keyframes dl-fadein { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
// .dl-card:hover { z-index: 1; }
// .dl-card--expired  { opacity: 0.55; filter: grayscale(0.4); }
// .dl-card--highlight { outline: 2px solid var(--color-success); outline-offset: -2px; }
// .dl-card--selected  { outline: 2px solid var(--color-accent);  outline-offset: -2px; }

// .dl-card-check {
//   position: absolute;
//   top: 8px; right: 8px;
//   z-index: 10;
//   width: 22px; height: 22px;
//   border: 1px solid rgba(255,255,255,0.5);
//   background: rgba(0,0,0,0.4);
//   display: flex; align-items: center; justify-content: center;
//   cursor: pointer;
//   border-radius: 3px;
//   opacity: 0;
//   transition: opacity 0.15s;
// }
// .dl-card:hover .dl-card-check,
// .dl-card--selected .dl-card-check { opacity: 1; }

// .dl-card-order-badge {
//   position: absolute;
//   top: 8px; left: 8px;
//   z-index: 10;
//   display: flex; align-items: center; gap: 3px;
//   padding: 2px 6px;
//   font-size: 9px;
//   font-weight: 700;
//   background: rgba(0,0,0,0.55);
//   color: rgba(255,255,255,0.9);
//   border: 1px solid rgba(255,255,255,0.2);
//   text-decoration: none;
//   opacity: 0;
//   transition: opacity 0.15s;
// }
// .dl-card:hover .dl-card-order-badge { opacity: 1; }

// .dl-card-thumb {
//   position: relative;
//   aspect-ratio: 16/10;
//   background: var(--color-surface-secondary);
//   overflow: hidden;
// }
// .dl-card-thumb--compact { aspect-ratio: 4/3; }
// .dl-card-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
// .dl-card:hover .dl-card-img { transform: scale(1.03); }
// .dl-card-thumb-placeholder {
//   width: 100%; height: 100%;
//   display: flex; align-items: center; justify-content: center;
//   background: var(--color-surface-secondary);
// }

// .dl-card-badges {
//   position: absolute;
//   top: 8px; left: 8px;
//   display: flex; gap: 4px; flex-wrap: wrap;
//   max-width: calc(100% - 44px);
// }
// .dl-badge {
//   display: inline-flex;
//   align-items: center;
//   gap: 3px;
//   padding: 2px 6px;
//   font-size: 9px;
//   font-weight: 700;
//   text-transform: uppercase;
//   letter-spacing: 0.04em;
//   border: 1px solid;
//   background: rgba(0,0,0,0.45);
//   backdrop-filter: blur(4px);
//   border-radius: 2px;
// }
// .dl-badge--ok     { color: var(--color-success); border-color: var(--color-success); }
// .dl-badge--warn   { color: var(--color-warning); border-color: var(--color-warning); }
// .dl-badge--danger { color: var(--color-danger);  border-color: var(--color-danger);  }

// .dl-card-progress {
//   position: absolute;
//   bottom: 0; left: 0; right: 0;
//   padding: 6px 8px;
//   background: linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%);
//   display: flex; align-items: center; gap: 6px;
// }
// .dl-card-progress > .dl-progress-bar { flex: 1; background: rgba(255,255,255,0.2); }
// .dl-card-progress span { font-size: 10px; color: rgba(255,255,255,0.9); font-weight: 700; }

// .dl-card-hover {
//   position: absolute;
//   inset: 0;
//   background: rgba(0,0,0,0.55);
//   display: flex; align-items: center; justify-content: center;
//   opacity: 0;
//   transition: opacity 0.2s;
// }
// .dl-card:hover .dl-card-hover { opacity: 1; }
// .dl-card-hover-btn {
//   display: inline-flex;
//   align-items: center;
//   gap: 6px;
//   padding: 7px 14px;
//   font-size: 11px;
//   font-weight: 700;
//   color: white;
//   border: 1px solid rgba(255,255,255,0.4);
//   background: rgba(255,255,255,0.12);
//   cursor: pointer;
//   text-decoration: none;
//   transition: background 0.15s;
// }
// .dl-card-hover-btn:hover { background: rgba(255,255,255,0.22); }

// /* Card body */
// .dl-card-body { padding: 12px; display: flex; flex-direction: column; gap: 4px; flex: 1; }
// .dl-card-stripe { width: 24px; height: 2px; margin-bottom: 6px; }
// .dl-card-name {
//   font-size: 13px;
//   font-weight: 700;
//   color: var(--color-text-primary);
//   white-space: nowrap;
//   overflow: hidden;
//   text-overflow: ellipsis;
//   line-height: 1.3;
// }
// .dl-card-variant { font-size: 10px; color: var(--color-text-muted); }
// .dl-card-vendor  { display: flex; align-items: center; gap: 5px; font-size: 10px; color: var(--color-text-muted); }
// .dl-card-vendor img { width: 13px; height: 13px; object-fit: cover; }
// .dl-card-meta-row { display: flex; justify-content: space-between; font-size: 10px; color: var(--color-text-muted); margin-top: 2px; }
// .dl-card-tags { display: flex; gap: 3px; flex-wrap: wrap; margin-top: 2px; }
// .dl-tag {
//   display: inline-flex; align-items: center; gap: 2px;
//   padding: 1px 5px;
//   font-size: 9px;
//   border: 1px solid var(--color-border);
//   color: var(--color-text-muted);
//   border-radius: 2px;
// }
// .dl-card-expiry  { font-size: 10px; display: flex; align-items: center; gap: 3px; }
// .dl-card-lifetime { font-size: 10px; color: var(--color-text-muted); }
// .dl-card-revoke  { font-size: 10px; color: var(--color-danger); display: flex; align-items: center; gap: 3px; }
// .dl-card-file-meta { display: flex; gap: 10px; font-size: 10px; color: var(--color-text-muted); }
// .dl-card-file-meta span { display: flex; align-items: center; gap: 3px; }
// .dl-card-stars-row { margin-top: 2px; }
// .dl-card-actions { display: flex; gap: 4px; margin-top: 8px; }
// .dl-card-order-link { font-size: 10px; color: var(--color-text-muted); display: flex; align-items: center; gap: 3px; text-decoration: none; margin-top: 4px; }
// .dl-card-order-link:hover { text-decoration: underline; }

// /* ── Stars ── */
// .dl-stars { display: flex; align-items: center; gap: 2px; }
// .dl-star  { background: none; border: none; padding: 0; cursor: pointer; display: flex; align-items: center; transition: transform 0.1s; }
// .dl-star:not(:disabled):hover { transform: scale(1.2); }
// .dl-star:disabled { cursor: default; }

// /* ── Buttons ── */
// .dl-btn {
//   display: inline-flex;
//   align-items: center;
//   justify-content: center;
//   gap: 5px;
//   font-size: 12px;
//   font-weight: 600;
//   border: 1px solid var(--color-border);
//   background: var(--color-surface);
//   color: var(--color-text-primary);
//   cursor: pointer;
//   text-decoration: none;
//   transition: opacity 0.15s, border-color 0.15s;
//   border-radius: 2px;
//   padding: 0 14px;
//   height: 32px;
//   white-space: nowrap;
// }
// .dl-btn:hover { opacity: 0.8; }
// .dl-btn--primary { background: var(--color-text-primary); color: var(--color-bg); border-color: var(--color-text-primary); }
// .dl-btn--ghost   { background: transparent; }
// .dl-btn--icon    { padding: 0; width: 32px; }
// .dl-btn--sm      { height: 28px; font-size: 11px; padding: 0 10px; }
// .dl-btn--sm.dl-btn--icon { width: 28px; padding: 0; }
// .dl-btn--disabled { opacity: 0.4; cursor: not-allowed; }
// .dl-btn--active-danger { border-color: var(--color-danger); color: var(--color-danger); background: rgba(229,72,77,0.06); }
// .dl-btn-label { display: none; }
// @media (min-width: 768px) { .dl-btn-label { display: inline; } }

// /* ── Toggle groups ── */
// .dl-toggle-group { display: flex; border: 1px solid var(--color-border); }
// .dl-toggle-btn {
//   width: 30px; height: 30px;
//   display: flex; align-items: center; justify-content: center;
//   background: transparent;
//   border: none;
//   color: var(--color-text-muted);
//   cursor: pointer;
//   transition: all 0.12s;
// }
// .dl-toggle-btn--active {
//   background: var(--color-text-primary);
//   color: var(--color-bg);
// }

// /* ── Search ── */
// .dl-search-wrap { position: relative; }
// .dl-search-icon { position: absolute; left: 9px; top: 50%; transform: translateY(-50%); color: var(--color-text-muted); pointer-events: none; }
// .dl-search {
//   height: 30px;
//   padding: 0 28px 0 30px;
//   font-size: 12px;
//   border: 1px solid var(--color-border);
//   background: var(--color-surface);
//   color: var(--color-text-primary);
//   border-radius: 2px;
//   width: 180px;
//   transition: width 0.2s, border-color 0.15s;
//   outline: none;
// }
// .dl-search:focus { width: 240px; border-color: var(--color-text-muted); }
// .dl-search-clear { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--color-text-muted); display: flex; align-items: center; }
// .dl-search-kbd {
//   position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
//   font-size: 9px; padding: 1px 4px;
//   border: 1px solid var(--color-border);
//   color: var(--color-text-muted);
//   background: var(--color-surface-secondary);
//   pointer-events: none;
//   border-radius: 2px;
// }

// /* ── Table ── */
// .dl-table-wrap {
//   border: 1px solid var(--color-border);
//   overflow: hidden;
// }
// .dl-table { width: 100%; border-collapse: collapse; font-size: 12px; }
// .dl-table-head { background: var(--color-surface-secondary); }
// .dl-th { padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); border-bottom: 1px solid var(--color-border); white-space: nowrap; }
// .dl-th--check  { width: 36px; padding-left: 12px; }
// .dl-th--thumb  { width: 44px; }
// .dl-th--right  { text-align: right; padding-right: 12px; }
// .dl-th-btn     { display: inline-flex; align-items: center; gap: 4px; background: none; border: none; cursor: pointer; color: inherit; font: inherit; text-transform: inherit; letter-spacing: inherit; }
// .dl-th-btn:hover { color: var(--color-text-primary); }

// @media (max-width: 640px)  { .dl-th--hide-sm, .dl-td--hide-sm  { display: none; } }
// @media (max-width: 768px)  { .dl-th--hide-md, .dl-td--hide-md  { display: none; } }
// @media (max-width: 1024px) { .dl-th--hide-lg, .dl-td--hide-lg  { display: none; } }
// @media (max-width: 1280px) { .dl-th--hide-xl, .dl-td--hide-xl  { display: none; } }

// .dl-tr { background: var(--color-surface); transition: background 0.1s; }
// .dl-tr--border { border-bottom: 1px solid var(--color-border); }
// .dl-tr--expired   { opacity: 0.55; }
// .dl-tr--highlight { background: rgba(48,164,108,0.04); }

// .dl-td          { padding: 10px 10px; vertical-align: middle; }
// .dl-td--check   { width: 36px; padding-left: 12px; }
// .dl-td--thumb   { width: 44px; }
// .dl-td--name    { max-width: 200px; }
// .dl-td--muted   { color: var(--color-text-muted); }
// .dl-td--right   { text-align: right; padding-right: 12px; }

// .dl-check {
//   width: 18px; height: 18px;
//   border: 1px solid var(--color-border);
//   background: transparent;
//   display: flex; align-items: center; justify-content: center;
//   cursor: pointer;
//   border-radius: 2px;
//   transition: all 0.12s;
// }
// .dl-check:hover { border-color: var(--color-text-muted); }

// .dl-row-thumb {
//   width: 34px; height: 34px;
//   border: 1px solid var(--color-border);
//   display: flex; align-items: center; justify-content: center;
//   overflow: hidden;
//   background: var(--color-surface-secondary);
// }
// .dl-row-thumb img { width: 100%; height: 100%; object-fit: cover; }

// .dl-row-name-group { display: flex; flex-direction: column; gap: 2px; }
// .dl-row-name-line  { display: flex; align-items: center; gap: 6px; }
// .dl-row-dot        { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
// .dl-row-name       { font-weight: 600; color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }
// .dl-row-variant    { font-size: 10px; padding: 1px 5px; background: var(--color-surface-secondary); color: var(--color-text-muted); border-radius: 2px; flex-shrink: 0; }
// .dl-row-vendor     { display: flex; align-items: center; gap: 4px; font-size: 10px; color: var(--color-text-muted); }
// .dl-row-vendor img { width: 12px; height: 12px; object-fit: cover; }
// .dl-row-progress   { display: flex; align-items: center; gap: 6px; }
// .dl-row-progress span { font-size: 10px; color: var(--color-text-muted); }

// .dl-type-pill {
//   display: inline-flex; align-items: center; gap: 4px;
//   padding: 2px 7px;
//   font-size: 10px;
//   font-weight: 700;
//   text-transform: uppercase;
//   letter-spacing: 0.04em;
//   border: 1px solid;
//   border-radius: 2px;
//   white-space: nowrap;
// }

// .dl-status {
//   display: inline-flex; align-items: center; gap: 4px;
//   font-size: 10px;
//   font-weight: 700;
//   text-transform: uppercase;
//   letter-spacing: 0.04em;
// }
// .dl-status--ok     { color: var(--color-success); }
// .dl-status--warn   { color: var(--color-warning); }
// .dl-status--danger { color: var(--color-danger);  }

// .dl-row-actions { display: flex; align-items: center; justify-content: flex-end; gap: 4px; }

// .dl-table-footer {
//   display: flex; justify-content: space-between; align-items: center;
//   padding: 8px 12px;
//   border-top: 1px solid var(--color-border);
//   background: var(--color-surface-secondary);
//   font-size: 10px;
//   color: var(--color-text-muted);
// }

// /* ── Bulk bar ── */
// .dl-bulk-bar {
//   position: fixed;
//   bottom: 24px; left: 50%; transform: translateX(-50%);
//   z-index: 50;
//   display: flex; align-items: center; gap: 10px;
//   padding: 10px 16px;
//   background: var(--color-surface);
//   border: 1px solid var(--color-border);
//   box-shadow: 0 8px 32px rgba(0,0,0,0.15);
//   white-space: nowrap;
// }
// .dl-bulk-count   { font-size: 13px; font-weight: 700; color: var(--color-text-primary); }
// .dl-bulk-divider { width: 1px; height: 16px; background: var(--color-border); }
// .dl-bulk-link    { font-size: 11px; font-weight: 600; color: var(--color-accent); background: none; border: none; cursor: pointer; text-decoration: underline; }
// .dl-bulk-close   { background: none; border: none; cursor: pointer; color: var(--color-text-muted); display: flex; align-items: center; margin-left: 4px; }

// /* ── Empty ── */
// .dl-empty {
//   display: flex; flex-direction: column; align-items: center; justify-content: center;
//   padding: 60px 20px;
//   border: 1px dashed var(--color-border);
//   text-align: center;
// }
// .dl-empty-title { font-size: 15px; font-weight: 700; color: var(--color-text-primary); margin: 0 0 6px; }
// .dl-empty-sub   { font-size: 12px; color: var(--color-text-muted); max-width: 280px; }

// /* ── Misc ── */
// .dl-results-label { font-size: 11px; color: var(--color-text-muted); }
// .dl-results-label strong { color: var(--color-text-primary); }
// .dl-load-more { display: flex; align-items: center; gap: 12px; justify-content: center; padding-top: 8px; }
// .dl-kb-hint   { font-size: 10px; color: var(--color-text-muted); text-align: center; }
// .dl-skeleton  { border-radius: 2px; background: var(--color-surface-secondary); animation: dl-pulse 1.4s ease-in-out infinite; }
// @keyframes dl-pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
// .dl-header--loading { animation: dl-pulse 1.4s ease-in-out infinite; }
// `;

// import { DigitalLibrary } from '@/components/digital-library'


export const metadata = {
  title: 'My Library - Digital Assets',
  description: 'Manage your digital library with favorites, collections, and advanced features',
}

export default function LibraryPage() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DigitalLibrary />
    </main>
  )
}
