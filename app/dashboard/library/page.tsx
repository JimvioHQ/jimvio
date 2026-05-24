// "use client";

// import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
// import Link from "next/link";
// import { useSearchParams, useRouter } from "next/navigation";
// import {
//   Download, Search, ExternalLink, FileText, Zap, Loader2,
//   BookOpen, Package, LayoutTemplate, Music, ImageIcon, Archive,
//   Copy, BarChart2, CheckCircle2, Clock, AlertTriangle, Sparkles,
//   Library, Grid3X3, RefreshCw, ChevronsUpDown, ChevronUp, ChevronDown,
//   Table2, XCircle, CheckSquare, Square, Camera, Star, ShoppingBag,
//   HardDrive, Store, Tag, RotateCcw, TrendingUp, Bell, Columns,
//   LayoutGrid, AlignJustify,
// } from "lucide-react";

// import { createClient } from "@/lib/supabase/client";
// import { cn, downloadFile } from "@/lib/utils";
// import { toast } from "sonner";

// interface DigitalAccessRow {
//   id: string;
//   access_url: string | null;
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

// type Density = "compact" | "comfortable";
// type FilterId = typeof FILTER_TABS[number]["id"];
// type SortKey = "name" | "subtype" | "granted_at" | "expires_at" | "status" | "last_accessed_at";
// type SortDir = "asc" | "desc";

// const PAGE_SIZE = 24;

// // ─── Subtype config ───────────────────────────────────────────────────────────

// function getSubtypeConfig(subtype: string | null, url: string | null) {
//   switch (subtype) {
//     case "course":
//       return { label: "Course", icon: BookOpen, gradient: "from-sky-500 to-blue-600", accent: "#0ea5e9", action: "continue" as const, actionLabel: "Continue learning", ActionIcon: BookOpen };
//     case "software":
//       return { label: "Software", icon: Zap, gradient: "from-violet-500 to-purple-600", accent: "#8b5cf6", action: "open" as const, actionLabel: "Launch app", ActionIcon: ExternalLink };
//     case "ai-tools":
//       return { label: "AI Tool", icon: Sparkles, gradient: "from-fuchsia-500 to-pink-600", accent: "#d946ef", action: "open" as const, actionLabel: "Open tool", ActionIcon: ExternalLink };
//     case "templates":
//       return { label: "Template", icon: LayoutTemplate, gradient: "from-amber-400 to-orange-500", accent: "#f59e0b", action: "download" as const, actionLabel: "Download", ActionIcon: Download };
//     case "ebooks":
//       return { label: "Ebook", icon: FileText, gradient: "from-emerald-500 to-teal-600", accent: "#10b981", action: "download" as const, actionLabel: "Read now", ActionIcon: Download };
//     case "music-audio":
//       return { label: "Audio", icon: Music, gradient: "from-pink-500 to-rose-600", accent: "#ec4899", action: "download" as const, actionLabel: "Download", ActionIcon: Download };
//     case "graphics-design":
//       return { label: "Graphics", icon: ImageIcon, gradient: "from-orange-400 to-red-500", accent: "#f97316", action: "download" as const, actionLabel: "Download", ActionIcon: Download };
//     case "photography":
//       return { label: "Photography", icon: Camera, gradient: "from-rose-400 to-pink-600", accent: "#fb7185", action: "download" as const, actionLabel: "Download", ActionIcon: Download };
//     default: {
//       const ext = url?.split(".").pop()?.toLowerCase();
//       if (ext === "pdf") return { label: "PDF", icon: FileText, gradient: "from-red-500 to-rose-600", accent: "#ef4444", action: "download" as const, actionLabel: "Download", ActionIcon: Download };
//       if (["zip", "rar"].includes(ext ?? "")) return { label: "Archive", icon: Archive, gradient: "from-slate-400 to-gray-600", accent: "#6b7280", action: "download" as const, actionLabel: "Download", ActionIcon: Download };
//       return { label: "Digital asset", icon: Package, gradient: "from-slate-400 to-gray-500", accent: "#6b7280", action: "open" as const, actionLabel: "Access", ActionIcon: ExternalLink };
//     }
//   }
// }

// const FILTER_TABS = [
//   { id: "all", label: "All assets", icon: Grid3X3 },
//   { id: "software", label: "Software", icon: Zap },
//   { id: "ai-tools", label: "AI Tools", icon: Sparkles },
//   { id: "course", label: "Courses", icon: BookOpen },
//   { id: "ebooks", label: "Ebooks", icon: FileText },
//   { id: "templates", label: "Templates", icon: LayoutTemplate },
//   { id: "music-audio", label: "Audio", icon: Music },
//   { id: "graphics-design", label: "Graphics", icon: ImageIcon },
//   { id: "photography", label: "Photography", icon: Camera },
//   { id: "other", label: "Other", icon: Package },
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
//   if (bytes < 1024) return `${bytes} B`;
//   if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
//   if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
//   return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
// }

// function formatCurrency(cents: number | null | undefined): string | null {
//   if (cents == null) return null;
//   return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
// }

// // ─── Revoke reason label ──────────────────────────────────────────────────────

// function getRevokeReasonLabel(reason: string | null | undefined): string | null {
//   if (!reason) return null;
//   switch (reason) {
//     case "refunded": return "Refunded";
//     case "subscription_expired": return "Subscription expired";
//     case "manual": return "Manually revoked";
//     default: return reason;
//   }
// }

// // ─── Skeleton ─────────────────────────────────────────────────────────────────

// function CardSkeleton({ density }: { density: Density }) {
//   const compact = density === "compact";
//   return (
//     <div className="rounded-2xl overflow-hidden border" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", boxShadow: "var(--shadow-sm)" }}>
//       <div className={cn("animate-pulse", compact ? "aspect-[4/3]" : "aspect-video")} style={{ backgroundColor: "var(--color-surface-secondary)" }} />
//       <div className="p-4 space-y-3">
//         <div className="h-4 w-3/4 rounded-lg animate-pulse" style={{ backgroundColor: "var(--color-surface-secondary)" }} />
//         <div className="h-3 w-1/2 rounded-lg animate-pulse" style={{ backgroundColor: "var(--color-surface-secondary)" }} />
//         <div className="h-9 w-full rounded-xl animate-pulse mt-4" style={{ backgroundColor: "var(--color-surface-secondary)" }} />
//       </div>
//     </div>
//   );
// }

// function TableRowSkeleton() {
//   return (
//     <tr className="animate-pulse" style={{ borderBottom: "1px solid var(--color-border)" }}>
//       <td className="pl-4 py-3 w-12"><div className="h-10 w-10 rounded-xl" style={{ backgroundColor: "var(--color-surface-secondary)" }} /></td>
//       <td className="py-3 pr-4"><div className="h-4 w-40 rounded-lg" style={{ backgroundColor: "var(--color-surface-secondary)" }} /></td>
//       <td className="py-3 pr-4 hidden sm:table-cell"><div className="h-6 w-20 rounded-full" style={{ backgroundColor: "var(--color-surface-secondary)" }} /></td>
//       <td className="py-3 pr-4 hidden md:table-cell"><div className="h-3.5 w-24 rounded-lg" style={{ backgroundColor: "var(--color-surface-secondary)" }} /></td>
//       <td className="py-3 pr-4 hidden lg:table-cell"><div className="h-3.5 w-20 rounded-lg" style={{ backgroundColor: "var(--color-surface-secondary)" }} /></td>
//       <td className="py-3 pr-4"><div className="h-6 w-16 rounded-full" style={{ backgroundColor: "var(--color-surface-secondary)" }} /></td>
//       <td className="py-3 pr-4"><div className="flex gap-1.5 justify-end"><div className="h-8 w-20 rounded-xl" style={{ backgroundColor: "var(--color-surface-secondary)" }} /><div className="h-8 w-8 rounded-xl" style={{ backgroundColor: "var(--color-surface-secondary)" }} /></div></td>
//     </tr>
//   );
// }

// // ─── Error banner ─────────────────────────────────────────────────────────────

// function ErrorBanner({ onRetry }: { onRetry: () => void }) {
//   return (
//     <div className="rounded-2xl border p-5 flex items-center gap-4" style={{ borderColor: "var(--color-danger)", backgroundColor: "rgba(229,72,77,0.06)" }}>
//       <AlertTriangle className="h-5 w-5 shrink-0" style={{ color: "var(--color-danger)" }} />
//       <div className="flex-1">
//         <p className="text-sm font-semibold" style={{ color: "var(--color-danger)" }}>Failed to load your library</p>
//         <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Check your connection and try again.</p>
//       </div>
//       <button onClick={onRetry} className="h-8 px-4 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-85" style={{ backgroundColor: "var(--color-danger)" }}>
//         Retry
//       </button>
//     </div>
//   );
// }

// // ─── Expiry notification banner ───────────────────────────────────────────────

// function ExpiryBanner({ items }: { items: DigitalAccessRow[] }) {
//   const [dismissed, setDismissed] = useState(false);
//   const expiring = items.filter(r => {
//     const d = daysUntilExpiryFn(r);
//     return d !== null && d > 0 && d <= 7;
//   });
//   if (expiring.length === 0 || dismissed) return null;

//   return (
//     <div
//       className="rounded-2xl border p-4 flex items-start gap-3"
//       style={{ borderColor: "rgba(240,180,41,0.4)", backgroundColor: "rgba(240,180,41,0.08)" }}
//     >
//       <Bell className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "var(--color-warning)" }} />
//       <div className="flex-1 min-w-0">
//         <p className="text-[13px] font-semibold" style={{ color: "var(--color-warning)" }}>
//           {expiring.length} item{expiring.length !== 1 ? "s" : ""} expiring within 7 days
//         </p>
//         <div className="mt-2 flex flex-wrap gap-2">
//           {expiring.map(r => {
//             const d = daysUntilExpiryFn(r);
//             const isSubscription = r.products?.pricing_type === "subscription" || !!r.products?.billing_period;
//             return (
//               <div
//                 key={r.id}
//                 className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[12px]"
//                 style={{ borderColor: "rgba(240,180,41,0.3)", backgroundColor: "rgba(240,180,41,0.1)" }}
//               >
//                 <span className="font-semibold truncate max-w-[160px]" style={{ color: "var(--color-text-primary)" }}>
//                   {r.products?.name ?? "Unknown"}
//                 </span>
//                 <span style={{ color: "var(--color-warning)" }}>{d}d left</span>
//                 {isSubscription && (
//                   <button
//                     className="flex items-center gap-1 font-bold px-2 py-0.5 rounded-lg text-white transition-opacity hover:opacity-85"
//                     style={{ backgroundColor: "var(--color-warning)", fontSize: "10px" }}
//                   >
//                     <RotateCcw className="h-2.5 w-2.5" /> Renew
//                   </button>
//                 )}
//               </div>
//             );
//           })}
//         </div>
//       </div>
//       <button onClick={() => setDismissed(true)} className="shrink-0 h-6 w-6 rounded-lg flex items-center justify-center transition-colors hover:opacity-60" style={{ color: "var(--color-text-muted)" }}>
//         <XCircle className="h-4 w-4" />
//       </button>
//     </div>
//   );
// }

// // ─── Recently used shelf ──────────────────────────────────────────────────────

// function RecentlyUsedShelf({ items, onAccessRecorded }: { items: DigitalAccessRow[]; onAccessRecorded: (id: string) => void }) {
//   const recent = useMemo(() =>
//     [...items]
//       .filter(r => r.last_accessed_at && !isExpiredFn(r))
//       .sort((a, b) => new Date(b.last_accessed_at!).getTime() - new Date(a.last_accessed_at!).getTime())
//       .slice(0, 5),
//     [items]
//   );

//   if (recent.length < 2) return null;

//   return (
//     <div className="space-y-2">
//       <div className="flex items-center gap-2">
//         <TrendingUp className="h-3.5 w-3.5" style={{ color: "var(--color-text-muted)" }} />
//         <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Continue where you left off</p>
//       </div>
//       <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
//         {recent.map(row => {
//           const config = getSubtypeConfig(row.subtype, row.access_url);
//           const SubtypeIcon = config.icon;
//           const ActionIcon = config.ActionIcon;
//           const image = row.products?.images?.[0] ?? null;
//           const name = row.products?.name ?? "Unknown";
//           const vendorLogo = row.vendors?.business_logo ?? null;

//           function handleAction() {
//             if (!row.access_url) return;
//             onAccessRecorded(row.id);
//             if (config.action === "download") {
//               const a = document.createElement("a"); a.href = row.access_url; a.download = ""; a.target = "_blank"; a.click();
//             } else {
//               window.open(row.access_url, "_blank");
//             }
//           }

//           const thumbnail = image ?? vendorLogo;

//           return (
//             <div
//               key={row.id}
//               className="flex-shrink-0 flex items-center gap-3 px-3 py-2.5 rounded-2xl border cursor-pointer group transition-all hover:-translate-y-0.5"
//               style={{
//                 backgroundColor: "var(--color-surface)",
//                 borderColor: "var(--color-border)",
//                 boxShadow: "var(--shadow-sm)",
//                 minWidth: 220,
//                 maxWidth: 260,
//               }}
//             >
//               <div className="h-10 w-10 rounded-xl overflow-hidden shrink-0" style={{ backgroundColor: "var(--color-surface-secondary)" }}>
//                 {thumbnail ? (
//                   <img src={thumbnail} alt={name} className="h-full w-full object-cover" />
//                 ) : (
//                   <div className={cn("h-full w-full flex items-center justify-center bg-gradient-to-br", config.gradient)} style={{ opacity: 0.2 }}>
//                     <SubtypeIcon className="h-5 w-5" style={{ color: config.accent, opacity: 1 }} />
//                   </div>
//                 )}
//               </div>
//               <div className="flex-1 min-w-0">
//                 <p className="text-[12px] font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>{name}</p>
//                 {/* Course progress bar */}
//                 {row.lesson_progress && row.lesson_progress.total_lessons > 0 ? (
//                   <div className="mt-1 space-y-0.5">
//                     <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-surface-secondary)" }}>
//                       <div className="h-full rounded-full transition-all" style={{ width: `${row.lesson_progress.percent}%`, backgroundColor: config.accent }} />
//                     </div>
//                     <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{row.lesson_progress.percent}% complete</p>
//                   </div>
//                 ) : (
//                   <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
//                     {row.last_accessed_at ? `Used ${new Date(row.last_accessed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
//                   </p>
//                 )}
//               </div>
//               {config.action === "continue" ? (
//                 <Link
//                   href={`/dashboard/my-courses/${row.products?.id}`}
//                   onClick={() => onAccessRecorded(row.id)}
//                   className="h-8 w-8 rounded-xl flex items-center justify-center text-white shrink-0 transition-opacity hover:opacity-85"
//                   style={{ background: `linear-gradient(135deg, ${config.accent}, ${config.accent}bb)` }}
//                 >
//                   <ActionIcon className="h-3.5 w-3.5" />
//                 </Link>
//               ) : (
//                 <button
//                   onClick={handleAction}
//                   className="h-8 w-8 rounded-xl flex items-center justify-center text-white shrink-0 transition-opacity hover:opacity-85"
//                   style={{ background: `linear-gradient(135deg, ${config.accent}, ${config.accent}bb)` }}
//                 >
//                   <ActionIcon className="h-3.5 w-3.5" />
//                 </button>
//               )}
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }

// // ─── Grid sort bar ────────────────────────────────────────────────────────────

// function GridSortBar({ sortKey, sortDir, onSort }: { sortKey: SortKey; sortDir: SortDir; onSort: (k: SortKey) => void }) {
//   const options: { key: SortKey; label: string }[] = [
//     { key: "granted_at", label: "Date claimed" },
//     { key: "name", label: "Name" },
//     { key: "subtype", label: "Type" },
//     { key: "expires_at", label: "Expiry" },
//     { key: "last_accessed_at", label: "Last used" },
//   ];
//   return (
//     <div className="flex items-center gap-2 flex-wrap">
//       <span className="text-[11px] font-semibold uppercase tracking-wider shrink-0" style={{ color: "var(--color-text-muted)" }}>Sort</span>
//       <div className="flex gap-1.5 overflow-x-auto no-scrollbar flex-wrap">
//         {options.map(o => {
//           const active = sortKey === o.key;
//           return (
//             <button
//               key={o.key}
//               onClick={() => onSort(o.key)}
//               className="h-7 px-3 rounded-full text-[11px] font-semibold border whitespace-nowrap flex items-center gap-1 transition-all"
//               style={{
//                 backgroundColor: active ? "var(--color-text-primary)" : "var(--color-surface)",
//                 color: active ? "var(--color-bg)" : "var(--color-text-muted)",
//                 borderColor: active ? "var(--color-text-primary)" : "var(--color-border)",
//               }}
//             >
//               {o.label}
//               {active && (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
//             </button>
//           );
//         })}
//       </div>
//     </div>
//   );
// }

// // ─── Bulk action bar ──────────────────────────────────────────────────────────

// function BulkBar({ selected, total, onSelectAll, onClear, onBulkCopy, onBulkDownload }: {
//   selected: Set<string>; total: number; onSelectAll: () => void; onClear: () => void; onBulkCopy: () => void; onBulkDownload: () => void;
// }) {
//   const count = selected.size;
//   if (count === 0) return null;
//   return (
//     <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl border shadow-xl" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", boxShadow: "var(--shadow-xl)" }}>
//       <span className="text-sm font-bold tabular-nums" style={{ color: "var(--color-text-primary)" }}>{count} selected</span>
//       <div className="h-4 w-px" style={{ backgroundColor: "var(--color-border)" }} />
//       <button onClick={onSelectAll} className="text-xs font-semibold transition-opacity hover:opacity-70" style={{ color: "var(--color-accent)" }}>Select all {total}</button>
//       <button onClick={onBulkCopy} className="h-8 px-3 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all hover:opacity-80" style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)", backgroundColor: "var(--color-surface-secondary)" }}>
//         <Copy className="h-3.5 w-3.5" /> Copy links
//       </button>
//       <button onClick={onBulkDownload} className="h-8 px-3 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-opacity hover:opacity-85 gradient-brand">
//         <Download className="h-3.5 w-3.5" /> Download all
//       </button>
//       <button onClick={onClear} className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors hover:opacity-60" style={{ color: "var(--color-text-muted)" }}>
//         <XCircle className="h-4 w-4" />
//       </button>
//     </div>
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

//   if (submitted || existingReview) {
//     const rating = existingReview?.rating ?? (submitted ? hovered : 0);
//     return (
//       <div className="flex items-center gap-1">
//         {[1, 2, 3, 4, 5].map(s => (
//           <Star key={s} className="h-3 w-3" fill={s <= rating ? "var(--color-warning)" : "none"} style={{ color: s <= rating ? "var(--color-warning)" : "var(--color-border)" }} />
//         ))}
//         <span className="text-[10px] ml-1" style={{ color: "var(--color-text-muted)" }}>Your rating</span>
//       </div>
//     );
//   }

//   return (
//     <div className="flex items-center gap-0.5">
//       {[1, 2, 3, 4, 5].map(s => (
//         <button
//           key={s}
//           onMouseEnter={() => setHovered(s)}
//           onMouseLeave={() => setHovered(0)}
//           onClick={() => { setSubmitted(true); onReviewLeft(productId, s); }}
//           className="transition-transform hover:scale-110"
//         >
//           <Star className="h-3 w-3" fill={s <= hovered ? "var(--color-warning)" : "none"} style={{ color: s <= hovered ? "var(--color-warning)" : "var(--color-border)" }} />
//         </button>
//       ))}
//       <span className="text-[10px] ml-1" style={{ color: "var(--color-text-muted)" }}>Rate</span>
//     </div>
//   );
// }

// // ─── Grid Card ────────────────────────────────────────────────────────────────

// function GridCard({
//   row, highlight, index, selected, onToggleSelect, onAccessRecorded, onReviewLeft, density,
// }: {
//   row: DigitalAccessRow; highlight: boolean; index: number;
//   selected: boolean; onToggleSelect: (id: string) => void;
//   onAccessRecorded: (id: string) => void;
//   onReviewLeft: (productId: string, rating: number) => void;
//   density: Density;
// }) {
//   const product = row.products;
//   const config = getSubtypeConfig(row.subtype, row.access_url);
//   const SubtypeIcon = config.icon;
//   const ActionIcon = config.ActionIcon;
//   const isExpired = isExpiredFn(row);
//   const daysLeft = daysUntilExpiryFn(row);
//   const image = product?.images?.[0] ?? null;
//   // Vendor logo as secondary fallback
//   const vendorLogo = row.vendors?.business_logo ?? null;
//   const thumbnail = image ?? vendorLogo;
//   const name = product?.name ?? "Unknown product";
//   const dateLabel = new Date(row.granted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
//   const expiryLabel = row.expires_at ? new Date(row.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;
//   const isSubscription = product?.pricing_type === "subscription" || !!product?.billing_period;
//   const expiryVerb = isSubscription ? "Renews" : "Expires";
//   const pricePaid = formatCurrency(row.order_items?.unit_price);
//   const fileSize = product?.digital_file_size ? formatFileSize(product.digital_file_size) : null;
//   const downloadCount = row.order_items?.download_count ?? null;
//   const variantName = row.order_items?.variant_name ?? null;
//   const vendorName = row.vendors?.business_name ?? null;
//   const revokeReason = getRevokeReasonLabel(row.revoke_reason);
//   const compact = density === "compact";

//   function handleCopy() {
//     if (!row.access_url) return;
//     navigator.clipboard.writeText(row.access_url);
//     toast.success("Link copied to clipboard");
//   }

//   async function handleAction() {
//     if (!row.access_url) return;
//     onAccessRecorded(row.id);
//     if (config.action === "download") {
//       const a = document.createElement("a"); a.href = row.access_url; a.download = ""; a.target = "_blank"; a.click();
//     } else {
//       window.open(row.access_url, "_blank");
//     }
//   }

//   return (
//     <div
//       className={cn(
//         "product-card group relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5",
//         highlight && "ring-2",
//         isExpired && "opacity-60 grayscale",
//         selected && "ring-2",
//       )}
//       style={{
//         animationDelay: `${index * 40}ms`,
//         ...(highlight && { boxShadow: `var(--shadow-glow), 0 0 0 2px rgba(48,164,108,0.3)` }),
//         ...(selected && { outline: `2px solid var(--color-accent)`, outlineOffset: "2px" }),
//       }}
//     >
//       {/* Checkbox */}
//       <button
//         onClick={() => onToggleSelect(row.id)}
//         className="absolute top-3 right-3 z-20 h-6 w-6 rounded-lg flex items-center justify-center transition-all"
//         style={{
//           backgroundColor: selected ? "var(--color-accent)" : "rgba(0,0,0,0.35)",
//           border: selected ? "none" : "1.5px solid rgba(255,255,255,0.4)",
//           backdropFilter: "blur(4px)",
//         }}
//       >
//         {selected
//           ? <CheckSquare className="h-3.5 w-3.5 text-white" />
//           : <Square className="h-3.5 w-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
//         }
//       </button>

//       {/* Order link badge (top-left, only if order_id available) */}
//       {row.order_id && (
//         <Link
//           href={`/dashboard/orders/${row.order_id}`}
//           className="absolute top-3 left-3 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
//           style={{ background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.2)" }}
//           title={`Order #${row.order_id}`}
//           onClick={e => e.stopPropagation()}
//         >
//           <ShoppingBag className="h-2.5 w-2.5" />
//           #{String(row.order_id).slice(-6)}
//         </Link>
//       )}

//       {/* Thumbnail */}
//       <div className={cn("relative overflow-hidden", compact ? "aspect-[4/3]" : "aspect-video")} style={{ backgroundColor: "var(--color-surface-secondary)" }}>
//         {thumbnail ? (
//           <>
//             <img src={thumbnail} alt={name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
//             {!image && vendorLogo && (
//               <div className="absolute inset-0 flex items-center justify-center bg-black/20">
//                 <img src={vendorLogo} alt={vendorName ?? "Vendor"} className="h-12 w-12 rounded-xl object-contain bg-white p-1" />
//               </div>
//             )}
//             <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
//           </>
//         ) : (
//           <div className={cn("w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br", config.gradient)} style={{ opacity: 0.12 }}>
//             <SubtypeIcon className="h-10 w-10" style={{ color: config.accent, opacity: 1 }} />
//             {/* Vendor fallback text if no logo */}
//             {vendorName && <span className="text-[10px] font-bold" style={{ color: config.accent, opacity: 0.7 }}>{vendorName}</span>}
//           </div>
//         )}

//         {/* Status badges */}
//         <div className="absolute top-3 left-3 flex items-start gap-1.5 flex-wrap max-w-[calc(100%-3.5rem)]">
//           <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-md" style={{ background: `${config.accent}22`, color: config.accent, border: `1px solid ${config.accent}40` }}>
//             <SubtypeIcon className="h-3 w-3" /> {config.label}
//           </div>
//           {isExpired ? (
//             <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold backdrop-blur-md" style={{ background: "rgba(229,72,77,0.15)", color: "var(--color-danger)", border: "1px solid rgba(229,72,77,0.3)" }}>
//               <AlertTriangle className="h-3 w-3" /> Expired
//             </div>
//           ) : daysLeft !== null && daysLeft <= 7 ? (
//             <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold backdrop-blur-md" style={{ background: "rgba(240,180,41,0.15)", color: "var(--color-warning)", border: "1px solid rgba(240,180,41,0.3)" }}>
//               <Clock className="h-3 w-3" /> {daysLeft}d left
//             </div>
//           ) : !isExpired && row.access_url ? (
//             <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold backdrop-blur-md" style={{ background: "rgba(48,164,108,0.15)", color: "var(--color-success)", border: "1px solid rgba(48,164,108,0.3)" }}>
//               <CheckCircle2 className="h-3 w-3" /> Active
//             </div>
//           ) : null}
//         </div>

//         {/* Course progress overlay */}
//         {row.lesson_progress && row.lesson_progress.total_lessons > 0 && (
//           <div className="absolute bottom-0 left-0 right-0 px-3 py-2" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)" }}>
//             <div className="flex items-center justify-between mb-1">
//               <span className="text-[10px] font-bold text-white/80">{row.lesson_progress.completed_lessons}/{row.lesson_progress.total_lessons} lessons</span>
//               <span className="text-[10px] font-bold text-white">{row.lesson_progress.percent}%</span>
//             </div>
//             <div className="h-1 rounded-full overflow-hidden bg-white/20">
//               <div className="h-full rounded-full bg-white transition-all" style={{ width: `${row.lesson_progress.percent}%` }} />
//             </div>
//           </div>
//         )}

//         {/* Hover overlay */}
//         {!isExpired && row.access_url && (
//           <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
//             {config.action === "continue" ? (
//               <Link href={`/dashboard/my-courses/${product?.id}`} onClick={() => onAccessRecorded(row.id)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold text-white bg-white/20 hover:bg-white/30 border border-white/30 transition-colors backdrop-blur-sm">
//                 <ActionIcon className="h-3.5 w-3.5" /> {config.actionLabel}
//               </Link>
//             ) : (
//               <button onClick={handleAction} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold text-white bg-white/20 hover:bg-white/30 border border-white/30 transition-colors backdrop-blur-sm">
//                 <ActionIcon className="h-3.5 w-3.5" /> {config.actionLabel}
//               </button>
//             )}
//           </div>
//         )}
//       </div>

//       {/* Body */}
//       <div className="p-4">
//         <div className={cn("h-0.5 w-8 rounded-full mb-3 bg-gradient-to-r", config.gradient)} />

//         {/* Name + variant */}
//         <p className="text-[14px] font-semibold truncate leading-snug" style={{ color: "var(--color-text-primary)" }} title={name}>{name}</p>
//         {variantName && (
//           <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--color-text-muted)" }}>{variantName}</p>
//         )}

//         {/* Vendor attribution */}
//         {vendorName && (
//           <div className="flex items-center gap-1.5 mt-1.5">
//             {vendorLogo ? (
//               <img src={vendorLogo} alt={vendorName} className="h-4 w-4 rounded object-cover" />
//             ) : (
//               <Store className="h-3 w-3" style={{ color: "var(--color-text-muted)" }} />
//             )}
//             <span className="text-[11px] truncate" style={{ color: "var(--color-text-muted)" }}>{vendorName}</span>
//           </div>
//         )}

//         {/* Meta row: claimed date + price paid */}
//         <div className="flex items-center justify-between mt-2">
//           <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
//             {config.action === "continue" ? "Enrolled" : "Claimed"} · {dateLabel}
//           </p>
//           {pricePaid && (
//             <span className="text-[11px] font-semibold" style={{ color: "var(--color-text-muted)" }}>{pricePaid}</span>
//           )}
//         </div>

//         {/* Tags */}
//         {product?.tags && product.tags.length > 0 && (
//           <div className="flex flex-wrap gap-1 mt-2">
//             {product.tags.slice(0, 3).map(tag => (
//               <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium" style={{ backgroundColor: "var(--color-surface-secondary)", color: "var(--color-text-muted)" }}>
//                 <Tag className="h-2.5 w-2.5" /> {tag}
//               </span>
//             ))}
//           </div>
//         )}

//         {/* Expiry / lifetime */}
//         {expiryLabel && !isExpired && (
//           <p className="text-[11px] mt-1.5 flex items-center gap-1" style={{ color: isSubscription ? "var(--color-success)" : "var(--color-warning)" }}>
//             <Clock className="h-3 w-3" /> {expiryVerb} {expiryLabel}
//             {isSubscription && (
//               <button className="ml-1 text-[10px] font-bold underline underline-offset-2 hover:no-underline" style={{ color: "var(--color-accent)" }}>
//                 Manage
//               </button>
//             )}
//           </p>
//         )}
//         {!row.expires_at && (
//           <p className="text-[11px] mt-1.5" style={{ color: "var(--color-text-muted)" }}>Lifetime access</p>
//         )}

//         {/* Revoke reason */}
//         {revokeReason && (
//           <p className="text-[11px] mt-1.5 flex items-center gap-1" style={{ color: "var(--color-danger)" }}>
//             <XCircle className="h-3 w-3" /> {revokeReason}
//           </p>
//         )}

//         {/* File size + download count row */}
//         {(fileSize || downloadCount !== null) && (
//           <div className="flex items-center gap-3 mt-2">
//             {fileSize && (
//               <span className="text-[10px] flex items-center gap-1" style={{ color: "var(--color-text-muted)" }}>
//                 <HardDrive className="h-3 w-3" /> {fileSize}
//               </span>
//             )}
//             {downloadCount !== null && (
//               <span className="text-[10px] flex items-center gap-1" style={{ color: "var(--color-text-muted)" }}>
//                 <Download className="h-3 w-3" /> {downloadCount} download{downloadCount !== 1 ? "s" : ""}
//               </span>
//             )}
//           </div>
//         )}

//         {/* Review CTA */}
//         {!isExpired && row.access_url && product?.id && (
//           <div className="mt-2.5">
//             <StarRating
//               productId={product.id}
//               existingReview={row.user_review}
//               onReviewLeft={onReviewLeft}
//             />
//           </div>
//         )}

//         {/* Actions */}
//         <div className="mt-3 flex gap-2">
//           {isExpired ? (
//             <button disabled className="flex-1 h-9 rounded-xl text-[12px] font-semibold opacity-40 cursor-not-allowed flex items-center justify-center gap-1.5" style={{ backgroundColor: "var(--color-surface-secondary)", color: "var(--color-text-muted)" }}>
//               <AlertTriangle className="h-3.5 w-3.5" /> {revokeReason ?? "Expired"}
//             </button>
//           ) : !row.access_url ? (
//             <button disabled className="flex-1 h-9 rounded-xl text-[12px] font-semibold opacity-50 cursor-not-allowed flex items-center justify-center gap-1.5" style={{ backgroundColor: "var(--color-surface-secondary)", color: "var(--color-text-muted)" }}>
//               <Loader2 className="h-3.5 w-3.5 animate-spin" /> Preparing…
//             </button>
//           ) : config.action === "continue" ? (
//             <Link href={`/dashboard/my-courses/${product?.id}`} onClick={() => onAccessRecorded(row.id)} className={cn("flex-1 h-9 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 text-white transition-opacity hover:opacity-90 bg-gradient-to-r", config.gradient)}>
//               <ActionIcon className="h-3.5 w-3.5" /> {config.actionLabel}
//             </Link>
//           ) : (
//             <button onClick={handleAction} className={cn("flex-1 h-9 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 text-white transition-opacity hover:opacity-90 bg-gradient-to-r", config.gradient)}>
//               <ActionIcon className="h-3.5 w-3.5" /> {config.actionLabel}
//             </button>
//           )}
//           {row.access_url && !isExpired && (
//             config.action === "continue" ? (
//               <Link href={`/dashboard/my-courses/${product?.id}?tab=progress`} title="View progress" className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors hover:opacity-70" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
//                 <BarChart2 className="h-4 w-4" />
//               </Link>
//             ) : (
//               <button onClick={handleCopy} title="Copy link" className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors hover:opacity-70" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
//                 <Copy className="h-4 w-4" />
//               </button>
//             )
//           )}
//         </div>

//         {/* Order linkback */}
//         {row.order_id && (
//           <Link
//             href={`/dashboard/orders/${row.order_id}`}
//             className="mt-2.5 flex items-center gap-1 text-[10px] font-medium hover:underline transition-opacity hover:opacity-70"
//             style={{ color: "var(--color-text-muted)" }}
//           >
//             <ShoppingBag className="h-3 w-3" />
//             View order #{String(row.order_id).slice(-8)}
//           </Link>
//         )}
//       </div>
//     </div>
//   );
// }

// // ─── Table View ───────────────────────────────────────────────────────────────

// function TableView({
//   rows, highlightId, selected, onToggleSelect, onAccessRecorded, onReviewLeft,
// }: {
//   rows: DigitalAccessRow[];
//   highlightId: string | null;
//   selected: Set<string>;
//   onToggleSelect: (id: string) => void;
//   onAccessRecorded: (id: string) => void;
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
//       case "name": av = a.products?.name?.toLowerCase() ?? ""; bv = b.products?.name?.toLowerCase() ?? ""; break;
//       case "subtype": av = a.subtype ?? ""; bv = b.subtype ?? ""; break;
//       case "granted_at": av = new Date(a.granted_at).getTime(); bv = new Date(b.granted_at).getTime(); break;
//       case "expires_at": av = a.expires_at ? new Date(a.expires_at).getTime() : Infinity; bv = b.expires_at ? new Date(b.expires_at).getTime() : Infinity; break;
//       case "last_accessed_at": av = a.last_accessed_at ? new Date(a.last_accessed_at).getTime() : 0; bv = b.last_accessed_at ? new Date(b.last_accessed_at).getTime() : 0; break;
//       case "status": av = isExpiredFn(a) ? 1 : 0; bv = isExpiredFn(b) ? 1 : 0; break;
//     }
//     if (av < bv) return sortDir === "asc" ? -1 : 1;
//     if (av > bv) return sortDir === "asc" ? 1 : -1;
//     return 0;
//   }), [rows, sortKey, sortDir]);

//   const COLS: { key: SortKey; label: string; className?: string }[] = [
//     { key: "name", label: "Product", className: "w-full" },
//     { key: "subtype", label: "Type", className: "w-32 hidden sm:table-cell" },
//     { key: "granted_at", label: "Claimed", className: "w-36 hidden md:table-cell" },
//     { key: "last_accessed_at", label: "Last used", className: "w-36 hidden lg:table-cell" },
//     { key: "expires_at", label: "Expires", className: "w-36 hidden xl:table-cell" },
//     { key: "status", label: "Status", className: "w-28" },
//   ];

//   function SortIcon({ col }: { col: SortKey }) {
//     if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 opacity-30" />;
//     return sortDir === "asc" ? <ChevronUp className="h-3 w-3" style={{ color: "var(--color-accent)" }} /> : <ChevronDown className="h-3 w-3" style={{ color: "var(--color-accent)" }} />;
//   }

//   const allSelected = sorted.length > 0 && sorted.every(r => selected.has(r.id));

//   return (
//     <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--color-border)", boxShadow: "var(--shadow-sm)" }}>
//       <div className="overflow-x-auto">
//         <table className="w-full border-collapse text-[13px]">
//           <thead>
//             <tr style={{ borderBottom: "1px solid var(--color-border)", backgroundColor: "var(--color-surface-secondary)" }}>
//               <th className="w-10 pl-4 py-3">
//                 <button
//                   onClick={() => sorted.forEach(r => onToggleSelect(r.id))}
//                   className="h-5 w-5 rounded-md border flex items-center justify-center transition-all"
//                   style={{ borderColor: allSelected ? "var(--color-accent)" : "var(--color-border)", backgroundColor: allSelected ? "var(--color-accent)" : "transparent" }}
//                 >
//                   {allSelected && <CheckSquare className="h-3 w-3 text-white" />}
//                 </button>
//               </th>
//               <th className="w-12 pl-2 py-3" />
//               {COLS.map(col => (
//                 <th key={col.key} className={cn("py-3 pr-4 text-left font-semibold select-none", col.className)} style={{ color: "var(--color-text-muted)" }}>
//                   <button onClick={() => toggleSort(col.key)} className="inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity">
//                     {col.label} <SortIcon col={col.key} />
//                   </button>
//                 </th>
//               ))}
//               {/* Extra cols */}
//               <th className="w-24 py-3 pr-4 text-left font-semibold hidden xl:table-cell" style={{ color: "var(--color-text-muted)" }}>Price</th>
//               <th className="w-24 py-3 pr-4 text-left font-semibold hidden xl:table-cell" style={{ color: "var(--color-text-muted)" }}>Downloads</th>
//               <th className="w-36 py-3 pr-4 text-right font-semibold" style={{ color: "var(--color-text-muted)" }}>Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {sorted.map((row, i) => (
//               <TableRow
//                 key={row.id}
//                 row={row}
//                 highlight={highlightId === row.id || highlightId === row.products?.id}
//                 isLast={i === sorted.length - 1}
//                 selected={selected.has(row.id)}
//                 onToggleSelect={onToggleSelect}
//                 onAccessRecorded={onAccessRecorded}
//                 onReviewLeft={onReviewLeft}
//               />
//             ))}
//           </tbody>
//         </table>
//       </div>
//       <div className="px-4 py-2.5 flex items-center justify-between border-t" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface-secondary)" }}>
//         <p className="text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>{sorted.length} item{sorted.length !== 1 ? "s" : ""}</p>
//         <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>Click a column header to sort · Arrow keys to navigate</p>
//       </div>
//     </div>
//   );
// }

// function TableRow({ row, highlight, isLast, selected, onToggleSelect, onAccessRecorded, onReviewLeft }: {
//   row: DigitalAccessRow; highlight: boolean; isLast: boolean;
//   selected: boolean; onToggleSelect: (id: string) => void;
//   onAccessRecorded: (id: string) => void;
//   onReviewLeft: (productId: string, rating: number) => void;
// }) {
//   const product = row.products;
//   const config = getSubtypeConfig(row.subtype, row.access_url);
//   const SubtypeIcon = config.icon;
//   const ActionIcon = config.ActionIcon;
//   const isExpired = isExpiredFn(row);
//   const daysLeft = daysUntilExpiryFn(row);
//   const image = product?.images?.[0] ?? null;
//   const vendorLogo = row.vendors?.business_logo ?? null;
//   const thumbnail = image ?? vendorLogo;
//   const name = product?.name ?? "Unknown product";
//   const grantedLabel = new Date(row.granted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
//   const expiryLabel = row.expires_at ? new Date(row.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
//   const lastUsedLabel = row.last_accessed_at ? new Date(row.last_accessed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Never";
//   const pricePaid = formatCurrency(row.order_items?.unit_price);
//   const fileSize = product?.digital_file_size ? formatFileSize(product.digital_file_size) : null;
//   const downloadCount = row.order_items?.download_count ?? null;
//   const variantName = row.order_items?.variant_name ?? null;
//   const vendorName = row.vendors?.business_name ?? null;
//   const revokeReason = getRevokeReasonLabel(row.revoke_reason);

//   function handleCopy() {
//     if (!row.access_url) return;
//     navigator.clipboard.writeText(row.access_url);
//     toast.success("Link copied");
//   }

//   async function handleAction() {
//     if (!row.access_url) return;
//     onAccessRecorded(row.id);
//     if (config.action === "download") {
//       const a = document.createElement("a"); a.href = row.access_url; a.download = ""; a.target = "_blank"; a.click();
//     } else {
//       window.open(row.access_url, "_blank");
//     }
//   }

//   return (
//     <tr
//       className={cn("group transition-colors", isExpired && "opacity-55")}
//       style={{
//         borderBottom: isLast ? "none" : "1px solid var(--color-border)",
//         backgroundColor: selected ? "rgba(253,80,0,0.04)" : highlight ? "rgba(48,164,108,0.05)" : "var(--color-surface)",
//       }}
//       onMouseEnter={e => { if (!selected && !highlight) (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-surface-secondary)"; }}
//       onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = selected ? "rgba(253,80,0,0.04)" : highlight ? "rgba(48,164,108,0.05)" : "var(--color-surface)"; }}
//     >
//       {/* Checkbox */}
//       <td className="pl-4 py-3 w-10">
//         <button onClick={() => onToggleSelect(row.id)} className="h-5 w-5 rounded-md border flex items-center justify-center transition-all" style={{ borderColor: selected ? "var(--color-accent)" : "var(--color-border)", backgroundColor: selected ? "var(--color-accent)" : "transparent" }}>
//           {selected && <CheckSquare className="h-3 w-3 text-white" />}
//         </button>
//       </td>
//       {/* Thumbnail */}
//       <td className="pl-2 py-3 w-12">
//         <div className="h-10 w-10 rounded-xl overflow-hidden shrink-0" style={{ backgroundColor: "var(--color-surface-secondary)" }}>
//           {thumbnail ? (
//             <img src={thumbnail} alt={name} className="h-full w-full object-cover" />
//           ) : (
//             <div className={cn("h-full w-full flex items-center justify-center bg-gradient-to-br", config.gradient)} style={{ opacity: 0.18 }}>
//               <SubtypeIcon className="h-5 w-5" style={{ color: config.accent, opacity: 1 }} />
//             </div>
//           )}
//         </div>
//       </td>
//       {/* Name + meta */}
//       <td className="py-3 pr-4 w-full">
//         <div className="flex flex-col gap-0.5 min-w-0">
//           <div className="flex items-center gap-2 min-w-0">
//             {highlight && <span className="shrink-0 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--color-success)" }} />}
//             <span className="font-semibold truncate max-w-[220px]" style={{ color: "var(--color-text-primary)" }} title={name}>{name}</span>
//             {variantName && <span className="text-[10px] px-1.5 py-0.5 rounded-md shrink-0" style={{ backgroundColor: "var(--color-surface-secondary)", color: "var(--color-text-muted)" }}>{variantName}</span>}
//           </div>
//           {vendorName && (
//             <div className="flex items-center gap-1">
//               {vendorLogo && <img src={vendorLogo} alt={vendorName} className="h-3 w-3 rounded object-cover" />}
//               <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{vendorName}</span>
//             </div>
//           )}
//           {/* Inline course progress */}
//           {row.lesson_progress && row.lesson_progress.total_lessons > 0 && (
//             <div className="flex items-center gap-2 mt-0.5">
//               <div className="h-1 w-20 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-surface-secondary)" }}>
//                 <div className="h-full rounded-full" style={{ width: `${row.lesson_progress.percent}%`, backgroundColor: config.accent }} />
//               </div>
//               <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{row.lesson_progress.percent}%</span>
//             </div>
//           )}
//           {/* Review stars inline */}
//           {!isExpired && row.access_url && product?.id && (
//             <div className="mt-0.5">
//               <StarRating productId={product.id} existingReview={row.user_review} onReviewLeft={onReviewLeft} />
//             </div>
//           )}
//           {/* Order link */}
//           {row.order_id && (
//             <Link href={`/dashboard/orders/${row.order_id}`} className="flex items-center gap-1 text-[10px] hover:underline opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--color-text-muted)" }}>
//               <ShoppingBag className="h-2.5 w-2.5" /> #{String(row.order_id).slice(-8)}
//             </Link>
//           )}
//         </div>
//       </td>
//       {/* Type */}
//       <td className="py-3 pr-4 w-32 hidden sm:table-cell">
//         <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: `${config.accent}14`, color: config.accent }}>
//           <SubtypeIcon className="h-3 w-3 shrink-0" /> {config.label}
//         </span>
//       </td>
//       {/* Claimed */}
//       <td className="py-3 pr-4 w-36 hidden md:table-cell">
//         <span className="text-[12px]" style={{ color: "var(--color-text-secondary)" }}>{grantedLabel}</span>
//       </td>
//       {/* Last used */}
//       <td className="py-3 pr-4 w-36 hidden lg:table-cell">
//         <span className="text-[12px]" style={{ color: lastUsedLabel === "Never" ? "var(--color-text-muted)" : "var(--color-text-secondary)" }}>{lastUsedLabel}</span>
//       </td>
//       {/* Expires */}
//       <td className="py-3 pr-4 w-36 hidden xl:table-cell">
//         {revokeReason ? (
//           <span className="text-[11px] inline-flex items-center gap-1" style={{ color: "var(--color-danger)" }}>
//             <XCircle className="h-3 w-3 shrink-0" /> {revokeReason}
//           </span>
//         ) : row.expires_at ? (
//           <span className="text-[12px] inline-flex items-center gap-1" style={{ color: isExpired ? "var(--color-danger)" : daysLeft !== null && daysLeft <= 7 ? "var(--color-warning)" : "var(--color-text-secondary)" }}>
//             {(isExpired || (daysLeft !== null && daysLeft <= 7)) && <Clock className="h-3 w-3 shrink-0" />}
//             {expiryLabel}
//           </span>
//         ) : (
//           <span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>Lifetime</span>
//         )}
//       </td>
//       {/* Status */}
//       <td className="py-3 pr-4 w-28">
//         {isExpired ? (
//           <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(229,72,77,0.1)", color: "var(--color-danger)", border: "1px solid rgba(229,72,77,0.2)" }}>
//             <AlertTriangle className="h-3 w-3" /> Expired
//           </span>
//         ) : !row.access_url ? (
//           <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(240,180,41,0.1)", color: "var(--color-warning)", border: "1px solid rgba(240,180,41,0.2)" }}>
//             <Loader2 className="h-3 w-3 animate-spin" /> Preparing
//           </span>
//         ) : (
//           <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(48,164,108,0.1)", color: "var(--color-success)", border: "1px solid rgba(48,164,108,0.2)" }}>
//             <CheckCircle2 className="h-3 w-3" /> Active
//           </span>
//         )}
//       </td>
//       {/* Price paid */}
//       <td className="py-3 pr-4 w-24 hidden xl:table-cell">
//         <span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>{pricePaid ?? (fileSize ? fileSize : "—")}</span>
//       </td>
//       {/* Download count */}
//       <td className="py-3 pr-4 w-24 hidden xl:table-cell">
//         <span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>
//           {downloadCount !== null ? `${downloadCount}×` : "—"}
//         </span>
//       </td>
//       {/* Actions */}
//       <td className="py-3 pr-4 w-36">
//         <div className="flex items-center justify-end gap-1.5">
//           {!isExpired && row.access_url ? (
//             <>
//               {config.action === "continue" ? (
//                 <>
//                   <Link href={`/dashboard/my-courses/${product?.id}`} onClick={() => onAccessRecorded(row.id)} className={cn("inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-[12px] font-bold text-white bg-gradient-to-r transition-opacity hover:opacity-85", config.gradient)}>
//                     <ActionIcon className="h-3.5 w-3.5 shrink-0" /><span className="hidden lg:inline">{config.actionLabel}</span>
//                   </Link>
//                   <Link href={`/dashboard/my-courses/${product?.id}?tab=progress`} title="View progress" className="h-8 w-8 rounded-xl flex items-center justify-center border transition-colors hover:opacity-70" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
//                     <BarChart2 className="h-3.5 w-3.5" />
//                   </Link>
//                 </>
//               ) : (
//                 <>
//                   <button onClick={handleAction} className={cn("inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-[12px] font-bold text-white bg-gradient-to-r transition-opacity hover:opacity-85", config.gradient)}>
//                     <ActionIcon className="h-3.5 w-3.5 shrink-0" /><span className="hidden lg:inline">{config.actionLabel}</span>
//                   </button>
//                   <button onClick={handleCopy} title="Copy link" className="h-8 w-8 rounded-xl flex items-center justify-center border transition-colors hover:opacity-70" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
//                     <Copy className="h-3.5 w-3.5" />
//                   </button>
//                 </>
//               )}
//             </>
//           ) : (
//             <span className="text-[11px] opacity-40" style={{ color: "var(--color-text-muted)" }}>—</span>
//           )}
//         </div>
//       </td>
//     </tr>
//   );
// }

// // ─── Stats bar ────────────────────────────────────────────────────────────────

// function StatsBar({ items }: { items: DigitalAccessRow[] }) {
//   const total = items.length;
//   const active = items.filter(r => r.access_url && !isExpiredFn(r)).length;
//   const expired = items.filter(r => isExpiredFn(r)).length;
//   const expiringSoon = items.filter(r => { const d = daysUntilExpiryFn(r); return d !== null && d > 0 && d <= 7; }).length;

//   const stats = [
//     { label: "Total assets", value: total, color: "var(--color-text-primary)" },
//     { label: "Active", value: active, color: "var(--color-success)" },
//     ...(expiringSoon > 0 ? [{ label: "Expiring soon", value: expiringSoon, color: "var(--color-warning)" }] : []),
//     ...(expired > 0 ? [{ label: "Expired", value: expired, color: "var(--color-danger)" }] : []),
//   ];

//   return (
//     <div className="flex items-center gap-5 flex-wrap">
//       {stats.map((s, i) => (
//         <React.Fragment key={s.label}>
//           {i > 0 && <div className="h-4 w-px" style={{ backgroundColor: "var(--color-border)" }} />}
//           <div>
//             <p className="text-xl font-black tabular-nums" style={{ color: s.color }}>{s.value}</p>
//             <p className="text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>{s.label}</p>
//           </div>
//         </React.Fragment>
//       ))}
//     </div>
//   );
// }

// // ─── Page ─────────────────────────────────────────────────────────────────────

// export default function DigitalLibraryPage() {
//   const searchParams = useSearchParams();
//   const router = useRouter();
//   const highlightId = searchParams.get("highlight") ?? searchParams.get("new") ?? null;

//   const [items, setItems] = useState<DigitalAccessRow[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [loadError, setLoadError] = useState(false);
//   const [refreshing, setRefreshing] = useState(false);
//   const [search, setSearch] = useState("");
//   const [activeFilter, setActiveFilter] = useState<FilterId>("all");
//   const [viewMode, setViewMode] = useState<"grid" | "table">(() => {
//     if (typeof window !== "undefined") return (localStorage.getItem("dlv") as "grid" | "table") ?? "grid";
//     return "grid";
//   });
//   const [density, setDensity] = useState<Density>(() => {
//     if (typeof window !== "undefined") return (localStorage.getItem("dld") as Density) ?? "comfortable";
//     return "comfortable";
//   });
//   const [showExpired, setShowExpired] = useState(false);
//   const [sortKey, setSortKey] = useState<SortKey>("granted_at");
//   const [sortDir, setSortDir] = useState<SortDir>("desc");
//   const [page, setPage] = useState(1);
//   const [selected, setSelected] = useState<Set<string>>(new Set());
//   const [focusedIndex, setFocusedIndex] = useState<number>(-1);

//   const searchRef = useRef<HTMLInputElement>(null);
//   const highlightRef = useRef<HTMLDivElement>(null);
//   const channelRef = useRef<any>(null);
//   const userIdRef = useRef<string | null>(null);

//   function setViewModePersisted(mode: "grid" | "table") {
//     setViewMode(mode);
//     if (typeof window !== "undefined") localStorage.setItem("dlv", mode);
//   }

//   function setDensityPersisted(d: Density) {
//     setDensity(d);
//     if (typeof window !== "undefined") localStorage.setItem("dld", d);
//   }

//   // ── Updated load — fetches all required fields ──
//   const load = useCallback(async (isRefresh = false) => {
//     if (isRefresh) setRefreshing(true);
//     else setLoading(true);
//     const supabase = createClient();
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) { setLoading(false); setRefreshing(false); return; }
//     userIdRef.current = user.id;

//     const { data, error } = await supabase
//       .from("digital_access")
//       .select(`
//         id, access_url, subtype, granted_at, expires_at, last_accessed_at,
//         order_id, order_item_id, revoke_reason,
//         products (
//           id, name, images, button_text, pricing_type, billing_period,
//           digital_file_size, tags, description,
//           vendors ( business_name, business_logo )
//         ),
//         order_items (
//           unit_price, total_price, download_count, variant_name, variant_id
//         )
//       `)
//       .eq("user_id", user.id)
//       .is("revoked_at", null)
//       .order("granted_at", { ascending: false });

//     if (error) {
//       console.error("[DigitalLibrary]", error);
//       setLoadError(true);
//     } else {
//       setLoadError(false);
//       // Fetch lesson_progress and user_reviews separately
//       const accessIds = (data ?? [] as any[]).map((r: any) => r.id);
//       const productIds = (data ?? [] as any[]).map((r: any) =>
//         Array.isArray(r.products) ? r.products[0]?.id : r.products?.id
//       ).filter(Boolean);
//       // lesson_progress aggregates
//       let progressMap: Record<string, { completed_lessons: number; total_lessons: number; percent: number }> = {};
//       if (productIds.length > 0) {
//         const { data: progressData } = await supabase
//           .from("lesson_progress")
//           .select("course_id, completed, community_courses!inner(total_lessons)")
//           .eq("user_id", user.id)
//           .in("course_id", productIds);
//         if (progressData) {
//           const grouped: Record<string, { completed: number; total: number }> = {};
//           (progressData as any[]).forEach(p => {
//             if (!grouped[p.course_id]) grouped[p.course_id] = { completed: 0, total: p.community_courses?.total_lessons ?? 0 };
//             if (p.completed) grouped[p.course_id].completed += 1;
//           });
//           Object.entries(grouped).forEach(([courseId, g]) => {
//             progressMap[courseId] = {
//               completed_lessons: g.completed,
//               total_lessons: g.total,
//               percent: g.total > 0 ? Math.round((g.completed / g.total) * 100) : 0,
//             };
//           });
//         }
//       }

//       // user reviews
//       let reviewMap: Record<string, { rating: number; id: string }> = {};
//       if (productIds.length > 0) {
//         const { data: reviewData } = await supabase
//           .from("reviews")
//           .select("id, product_id, rating")
//           .eq("buyer_id", user.id)
//           .in("product_id", productIds);
//         if (reviewData) {
//           (reviewData as any[]).forEach(r => { reviewMap[r.product_id] = { rating: r.rating, id: r.id }; });
//         }
//       }

//       const resolved = (data ?? []).map((row: any) => {
//         const product = Array.isArray(row.products) ? (row.products[0] ?? null) : row.products;
//         const vendor = product?.vendors ? (Array.isArray(product.vendors) ? product.vendors[0] : product.vendors) : null;
//         const orderItem = Array.isArray(row.order_items) ? (row.order_items[0] ?? null) : row.order_items;
//         const productId = product?.id;
//         return {
//           ...row,
//           products: product ? { ...product, vendors: undefined } : null,
//           vendors: vendor,
//           order_items: orderItem,
//           lesson_progress: productId ? progressMap[productId] ?? null : null,
//           user_review: productId ? reviewMap[productId] ?? null : null,
//         } as DigitalAccessRow;
//       });
//       setItems(resolved);
//     }

//     setLoading(false);
//     setRefreshing(false);
//   }, []);

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
//       // CMD+K: focus search
//       if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); searchRef.current?.focus(); return; }
//       // Escape: clear search / deselect
//       if (e.key === "Escape") {
//         if (search) setSearch("");
//         else if (selected.size > 0) setSelected(new Set());
//         else if (focusedIndex >= 0) setFocusedIndex(-1);
//         return;
//       }
//       // Arrow keys navigate grid (only when not in input)
//       const target = e.target as HTMLElement;
//       if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
//       if (viewMode === "grid" && (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "ArrowDown" || e.key === "ArrowUp")) {
//         e.preventDefault();
//         setFocusedIndex(prev => {
//           const cols = window.innerWidth >= 1280 ? 4 : window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1;
//           if (e.key === "ArrowRight") return Math.min(prev + 1, paginated.length - 1);
//           if (e.key === "ArrowLeft") return Math.max(prev - 1, 0);
//           if (e.key === "ArrowDown") return Math.min(prev + cols, paginated.length - 1);
//           if (e.key === "ArrowUp") return Math.max(prev - cols, 0);
//           return prev;
//         });
//         return;
//       }
//       // Enter triggers primary action on focused card
//       if (e.key === "Enter" && focusedIndex >= 0 && paginated[focusedIndex]) {
//         const row = paginated[focusedIndex];

//         if (!row.access_url || isExpiredFn(row)) return;

//         const config = getSubtypeConfig(row.subtype, row.access_url);

//         const fileUrl = `/api/files/${encodeURIComponent(row.access_url)}`;

//         if (config.action === "continue") {
//           router.push(`/dashboard/my-courses/${row.products?.id}`);
//           return;
//         }

//         if (config.action === "download") {
//           downloadFile(row.access_url);
//         }

//         // default: open in new tab
//         window.open(fileUrl, "_blank", "noopener,noreferrer");
//       }
//       // Space toggles selection on focused card
//       if (e.key === " " && focusedIndex >= 0 && paginated[focusedIndex]) {
//         e.preventDefault();
//         toggleSelect(paginated[focusedIndex].id);
//       }
//     }
//     window.addEventListener("keydown", onKey);
//     return () => window.removeEventListener("keydown", onKey);
//   });

//   // ── Scroll highlighted into view ──
//   useEffect(() => {
//     if (highlightId && highlightRef.current) {
//       setTimeout(() => highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 400);
//     }
//   }, [highlightId, items]);

//   // ── Record access ──
//   const handleAccessRecorded = useCallback(async (id: string) => {
//     const supabase = createClient();
//     const now = new Date().toISOString();
//     setItems(prev => prev.map(r => r.id === id ? { ...r, last_accessed_at: now } : r));
//     await supabase.from("digital_access").update({ last_accessed_at: now }).eq("id", id);
//   }, []);

//   // ── Submit review ──
//   const handleReviewLeft = useCallback(async (productId: string, rating: number) => {
//     const supabase = createClient();
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) return;
//     const { data, error } = await supabase
//       .from("reviews")
//       .upsert({ product_id: productId, buyer_id: user.id, rating }, { onConflict: "product_id,buyer_id" })
//       .select("id, rating")
//       .single();
//     if (!error && data) {
//       setItems(prev => prev.map(r => r.products?.id === productId ? { ...r, user_review: { rating: data.rating, id: data.id } } : r));
//       toast.success(`Rated ${rating} star${rating !== 1 ? "s" : ""}!`);
//     }
//   }, []);

//   // ── Filter + sort ──
//   const knownSubtypes = useMemo(() => new Set<string>(FILTER_TABS.map(t => t.id).filter(id => id !== "all" && id !== "other")), []);

//   const filtered = useMemo(() => {
//     const q = search.toLowerCase().trim();
//     return items.filter(row => {
//       if (!showExpired && isExpiredFn(row)) return false;
//       const name = row.products?.name ?? "";
//       const desc = row.products?.description ?? "";
//       const tags = (row.products?.tags ?? []).join(" ");
//       const matchSearch = !q || name.toLowerCase().includes(q) || desc.toLowerCase().includes(q) || tags.toLowerCase().includes(q);
//       const bucket = !row.subtype || !knownSubtypes.has(row.subtype) ? "other" : row.subtype;
//       const matchFilter = activeFilter === "all" || bucket === activeFilter;
//       return matchSearch && matchFilter;
//     });
//   }, [items, search, activeFilter, showExpired, knownSubtypes]);


//   const sorted = useMemo(() => [...filtered].sort((a, b) => {
//     let av: string | number = "";
//     let bv: string | number = "";
//     switch (sortKey) {
//       case "name": av = a.products?.name?.toLowerCase() ?? ""; bv = b.products?.name?.toLowerCase() ?? ""; break;
//       case "subtype": av = a.subtype ?? ""; bv = b.subtype ?? ""; break;
//       case "granted_at": av = new Date(a.granted_at).getTime(); bv = new Date(b.granted_at).getTime(); break;
//       case "expires_at": av = a.expires_at ? new Date(a.expires_at).getTime() : Infinity; bv = b.expires_at ? new Date(b.expires_at).getTime() : Infinity; break;
//       case "last_accessed_at": av = a.last_accessed_at ? new Date(a.last_accessed_at).getTime() : 0; bv = b.last_accessed_at ? new Date(b.last_accessed_at).getTime() : 0; break;
//       case "status": av = isExpiredFn(a) ? 1 : 0; bv = isExpiredFn(b) ? 1 : 0; break;
//     }
//     if (av < bv) return sortDir === "asc" ? -1 : 1;
//     if (av > bv) return sortDir === "asc" ? 1 : -1;
//     return 0;
//   }), [filtered, sortKey, sortDir]);

//   useEffect(() => { setPage(1); setFocusedIndex(-1); }, [search, activeFilter, showExpired, sortKey, sortDir]);

//   const paginated = sorted.slice(0, page * PAGE_SIZE);
//   const hasMore = page * PAGE_SIZE < sorted.length;

//   const countBySubtype = useMemo(() => {
//     return items.filter(r => showExpired || !isExpiredFn(r)).reduce<Record<string, number>>((acc, row) => {
//       const key = !row.subtype || !knownSubtypes.has(row.subtype) ? "other" : row.subtype;
//       acc[key] = (acc[key] ?? 0) + 1;
//       return acc;
//     }, {});

//   }, [items, showExpired, knownSubtypes]);

//   const expiredCount = items.filter(r => isExpiredFn(r)).length;

//   function handleSort(key: SortKey) {
//     if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
//     else { setSortKey(key); setSortDir("desc"); }
//   }

//   function toggleSelect(id: string) {
//     setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
//   }

//   function bulkCopy() {
//     const urls = items.filter(r => selected.has(r.id) && r.access_url).map(r => r.access_url!).join("\n");
//     if (!urls) { toast.error("No valid links in selection"); return; }
//     navigator.clipboard.writeText(urls);
//     toast.success(`Copied ${selected.size} link${selected.size !== 1 ? "s" : ""}`);
//   }

//   function bulkDownload() {
//     items.filter(r => selected.has(r.id) && r.access_url && getSubtypeConfig(r.subtype, r.access_url).action === "download").forEach(r => {
//       const a = document.createElement("a"); a.href = r.access_url!; a.download = ""; a.target = "_blank"; a.click();
//     });
//     toast.success("Downloads started");
//   }

//   // ── Grid column classes based on density ──
//   const gridCols = density === "compact"
//     ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
//     : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5";

//   // ── Loading skeleton ──
//   if (loading) {
//     return (
//       <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-7">
//         <div className="flex items-center justify-between animate-pulse">
//           <div className="flex items-start gap-4">
//             <div className="h-12 w-12 rounded-2xl" style={{ backgroundColor: "var(--color-surface-secondary)" }} />
//             <div className="space-y-2 mt-1">
//               <div className="h-7 w-44 rounded-xl" style={{ backgroundColor: "var(--color-surface-secondary)" }} />
//               <div className="h-4 w-56 rounded-lg" style={{ backgroundColor: "var(--color-surface-secondary)" }} />
//             </div>
//           </div>
//           <div className="h-10 w-64 rounded-xl" style={{ backgroundColor: "var(--color-surface-secondary)" }} />
//         </div>
//         <div className="flex gap-2 animate-pulse">
//           {[80, 72, 68, 76, 64, 80].map((w, i) => (
//             <div key={i} className="h-8 rounded-full" style={{ width: w, backgroundColor: "var(--color-surface-secondary)" }} />
//           ))}
//         </div>
//         <div className={cn("grid", gridCols)}>
//           {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} density={density} />)}
//         </div>
//       </div>
//     );
//   }

//   // ─── Render ───────────────────────────────────────────────────────────────

//   return (
//     <>
//       <BulkBar
//         selected={selected}
//         total={sorted.length}
//         onSelectAll={() => setSelected(new Set(sorted.map(r => r.id)))}
//         onClear={() => setSelected(new Set())}
//         onBulkCopy={bulkCopy}
//         onBulkDownload={bulkDownload}
//       />

//       <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fade-in">

//         {/* ── Header ── */}
//         <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
//           <div className="flex items-start gap-4">
//             <div className="h-12 w-12 rounded-2xl gradient-brand flex items-center justify-center shrink-0" style={{ boxShadow: "var(--shadow-md)" }}>
//               <Library className="h-6 w-6 text-white" />
//             </div>
//             <div>
//               <h1 className="text-2xl font-black tracking-tight leading-none" style={{ color: "var(--color-text-primary)" }}>Digital Library</h1>
//               <p className="text-[13px] mt-1.5" style={{ color: "var(--color-text-muted)" }}>All your purchased digital products in one place</p>
//               {items.length > 0 && <div className="mt-3"><StatsBar items={items} /></div>}
//             </div>
//           </div>

//           {/* Controls */}
//           <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
//             {/* Show expired toggle */}
//             {expiredCount > 0 && (
//               <button
//                 onClick={() => setShowExpired(v => !v)}
//                 className="h-10 px-3 rounded-xl text-[12px] font-semibold border flex items-center gap-1.5 transition-all"
//                 style={{
//                   borderColor: showExpired ? "var(--color-danger)" : "var(--color-border)",
//                   backgroundColor: showExpired ? "rgba(229,72,77,0.08)" : "var(--color-surface)",
//                   color: showExpired ? "var(--color-danger)" : "var(--color-text-muted)",
//                 }}
//               >
//                 <AlertTriangle className="h-3.5 w-3.5" />
//                 {showExpired ? "Hide" : "Show"} expired ({expiredCount})
//               </button>
//             )}

//             {/* Density toggle (grid mode only) */}
//             {viewMode === "grid" && (
//               <div className="flex items-center gap-1 p-1 rounded-xl border" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface-secondary)" }}>
//                 {([
//                   { d: "comfortable" as Density, Icon: LayoutGrid, title: "Comfortable density" },
//                   { d: "compact" as Density, Icon: AlignJustify, title: "Compact density" },
//                 ] as const).map(({ d, Icon, title }) => (
//                   <button
//                     key={d}
//                     onClick={() => setDensityPersisted(d)}
//                     title={title}
//                     className="h-8 w-8 rounded-lg flex items-center justify-center transition-all"
//                     style={{
//                       backgroundColor: density === d ? "var(--color-surface)" : "transparent",
//                       color: density === d ? "var(--color-text-primary)" : "var(--color-text-muted)",
//                       boxShadow: density === d ? "var(--shadow-sm)" : undefined,
//                     }}
//                   >
//                     <Icon className="h-4 w-4" />
//                   </button>
//                 ))}
//               </div>
//             )}

//             {/* Refresh */}
//             <button onClick={() => load(true)} disabled={refreshing} title="Refresh library" className="h-10 w-10 rounded-xl flex items-center justify-center border transition-colors hover:opacity-80" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
//               <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
//             </button>

//             {/* View toggle */}
//             <div className="flex items-center gap-1 p-1 rounded-xl border" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface-secondary)" }}>
//               {([
//                 { mode: "grid" as const, Icon: Grid3X3, title: "Grid view" },
//                 { mode: "table" as const, Icon: Table2, title: "Table view" },
//               ]).map(({ mode, Icon, title }) => (
//                 <button
//                   key={mode}
//                   onClick={() => setViewModePersisted(mode)}
//                   title={title}
//                   className="h-8 w-8 rounded-lg flex items-center justify-center transition-all"
//                   style={{
//                     backgroundColor: viewMode === mode ? "var(--color-surface)" : "transparent",
//                     color: viewMode === mode ? "var(--color-text-primary)" : "var(--color-text-muted)",
//                     boxShadow: viewMode === mode ? "var(--shadow-sm)" : undefined,
//                   }}
//                 >
//                   <Icon className="h-4 w-4" />
//                 </button>
//               ))}
//             </div>

//             {/* Search */}
//             <div className="relative">
//               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "var(--color-text-muted)" }} />
//               <input
//                 ref={searchRef}
//                 placeholder="Search by name, tag, description…"
//                 value={search}
//                 onChange={e => setSearch(e.target.value)}
//                 className="glass-input h-10 pl-9 pr-10 text-[13px] w-52 focus:w-72 transition-all"
//               />
//               {search ? (
//                 <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity">
//                   <XCircle className="h-4 w-4" style={{ color: "var(--color-text-muted)" }} />
//                 </button>
//               ) : (
//                 <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium px-1.5 py-0.5 rounded-md pointer-events-none border hidden sm:block" style={{ color: "var(--color-text-muted)", backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
//                   ⌘K
//                 </kbd>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* ── Error banner ── */}
//         {loadError && <ErrorBanner onRetry={() => load()} />}

//         {/* ── Expiry notification banner ── */}
//         <ExpiryBanner items={items} />

//         {/* ── Recently used shelf ── */}
//         <RecentlyUsedShelf items={items} onAccessRecorded={handleAccessRecorded} />

//         {/* ── Filter tabs ── */}
//         {items.length > 0 && (
//           <div className="flex gap-2 flex-wrap">
//             {FILTER_TABS.map(tab => {
//               const count = tab.id === "all"
//                 ? (showExpired ? items.length : items.filter(r => !isExpiredFn(r)).length)
//                 : (countBySubtype[tab.id] ?? 0);
//               if (tab.id !== "all" && count === 0) return null;
//               const TabIcon = tab.icon;
//               const isActive = activeFilter === tab.id;
//               return (
//                 <button
//                   key={tab.id}
//                   onClick={() => setActiveFilter(tab.id)}
//                   className="h-8 pl-3 pr-3 rounded-full text-[12px] font-semibold transition-all flex items-center gap-1.5 border"
//                   style={{
//                     backgroundColor: isActive ? "var(--color-text-primary)" : "transparent",
//                     color: isActive ? "var(--color-bg)" : "var(--color-text-secondary)",
//                     borderColor: isActive ? "var(--color-text-primary)" : "var(--color-border)",
//                     boxShadow: isActive ? "var(--shadow-sm)" : undefined,
//                   }}
//                 >
//                   <TabIcon className="h-3 w-3" />
//                   {tab.label}
//                   <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: isActive ? "rgba(255,255,255,0.2)" : "var(--color-surface-secondary)", color: isActive ? "inherit" : "var(--color-text-muted)" }}>
//                     {count}
//                   </span>
//                 </button>
//               );
//             })}
//           </div>
//         )}

//         {/* ── Grid sort bar ── */}
//         {sorted.length > 0 && viewMode === "grid" && (
//           <GridSortBar sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
//         )}

//         {/* ── Results label ── */}
//         {(search || activeFilter !== "all") && sorted.length > 0 && (
//           <p className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>
//             Showing <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{sorted.length}</span> result{sorted.length !== 1 ? "s" : ""}
//             {search && <> for <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>"{search}"</span></>}
//           </p>
//         )}

//         {/* ── Empty: no items ── */}
//         {items.length === 0 && !loadError && (
//           <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-dashed" style={{ borderColor: "var(--color-border)" }}>
//             <div className="h-16 w-16 rounded-2xl flex items-center justify-center mb-5 border" style={{ background: "var(--color-accent-light)", borderColor: "var(--color-accent-subtle)" }}>
//               <Library className="h-7 w-7" style={{ color: "var(--color-accent)" }} />
//             </div>
//             <p className="text-[16px] font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>Your library is empty</p>
//             <p className="text-[13px] max-w-xs text-center leading-relaxed mb-7" style={{ color: "var(--color-text-muted)" }}>
//               Software, courses, ebooks and other digital products you purchase appear here with instant access.
//             </p>
//             <Link href="/marketplace" className="btn-premium gradient-brand text-white inline-flex items-center gap-2" style={{ boxShadow: "var(--shadow-md)" }}>
//               <Sparkles className="h-4 w-4" /> Browse marketplace
//             </Link>
//           </div>
//         )}

//         {/* ── Empty: no search results — differentiated ── */}
//         {items.length > 0 && sorted.length === 0 && (
//           <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed" style={{ borderColor: "var(--color-border)" }}>
//             <Search className="h-8 w-8 mb-4" style={{ color: "var(--color-text-muted)" }} />
//             <p className="text-[15px] font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
//               {search && activeFilter !== "all"
//                 ? `No ${activeFilter} results for "${search}"`
//                 : search
//                   ? `No results for "${search}"`
//                   : `No ${activeFilter} assets`}
//             </p>
//             <p className="text-[13px] mb-4" style={{ color: "var(--color-text-muted)" }}>
//               {search
//                 ? "Try different keywords — search covers names, tags, and descriptions"
//                 : "Try a different filter"}
//             </p>
//             <div className="flex gap-2">
//               {search && (
//                 <button onClick={() => setSearch("")} className="h-8 px-4 rounded-xl text-[12px] font-semibold border transition-all hover:opacity-80" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)", backgroundColor: "var(--color-surface)" }}>
//                   Clear search
//                 </button>
//               )}
//               {activeFilter !== "all" && (
//                 <button onClick={() => setActiveFilter("all")} className="h-8 px-4 rounded-xl text-[12px] font-semibold border transition-all hover:opacity-80" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)", backgroundColor: "var(--color-surface)" }}>
//                   Show all
//                 </button>
//               )}
//               {!search && activeFilter === "all" && (
//                 <Link href="/marketplace" className="h-8 px-4 rounded-xl text-[12px] font-bold text-white gradient-brand flex items-center gap-1.5 transition-opacity hover:opacity-85">
//                   <Sparkles className="h-3.5 w-3.5" /> Browse marketplace
//                 </Link>
//               )}
//             </div>
//           </div>
//         )}

//         {/* ── Grid view ── */}
//         {sorted.length > 0 && viewMode === "grid" && (
//           <>
//             <div className={cn("grid stagger-children", gridCols)}>
//               {paginated.map((row, i) => {
//                 const isHighlighted = highlightId === row.id || highlightId === row.products?.id;
//                 return (
//                   <div
//                     key={row.id}
//                     ref={isHighlighted ? highlightRef : undefined}
//                     className={cn(focusedIndex === i && "ring-2 ring-offset-2 rounded-2xl")}
//                     style={focusedIndex === i ? { outline: "2px solid var(--color-accent)", outlineOffset: "4px", borderRadius: "var(--radius-lg)" } : undefined}
//                     tabIndex={-1}
//                   >
//                     <GridCard
//                       row={row}
//                       highlight={isHighlighted}
//                       index={i}
//                       selected={selected.has(row.id)}
//                       onToggleSelect={toggleSelect}
//                       onAccessRecorded={handleAccessRecorded}
//                       onReviewLeft={handleReviewLeft}
//                       density={density}
//                     />
//                   </div>
//                 );
//               })}
//             </div>
//             {hasMore && (
//               <div className="flex flex-col items-center gap-2 pt-2">
//                 <p className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>Showing {paginated.length} of {sorted.length}</p>
//                 <button
//                   onClick={() => setPage(p => p + 1)}
//                   className="h-9 px-6 rounded-xl border text-xs font-semibold transition-all hover:opacity-80"
//                   style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)", backgroundColor: "var(--color-surface)" }}
//                 >
//                   Load more ({sorted.length - paginated.length} remaining)
//                 </button>
//               </div>
//             )}
//             {/* Keyboard hint */}
//             {sorted.length > 1 && (
//               <p className="text-center text-[11px]" style={{ color: "var(--color-text-muted)" }}>
//                 ↑↓←→ navigate · Enter to open · Space to select · Esc to clear
//               </p>
//             )}
//           </>
//         )}

//         {/* ── Table view ── */}
//         {sorted.length > 0 && viewMode === "table" && (
//           <TableView
//             rows={sorted}
//             highlightId={highlightId}
//             selected={selected}
//             onToggleSelect={toggleSelect}
//             onAccessRecorded={handleAccessRecorded}
//             onReviewLeft={handleReviewLeft}
//           />
//         )}
//       </div>
//     </>
//   );
// }

"use client";

import React, {
  useEffect, useRef, useState, useMemo, useCallback,
} from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Download, Search, ExternalLink, FileText, Zap, Loader2,
  BookOpen, Package, LayoutTemplate, Music, ImageIcon, Archive,
  Copy, BarChart2, CheckCircle2, Clock, AlertTriangle, Sparkles,
  Library, Grid3X3, RefreshCw, ChevronUp, ChevronDown,
  Table2, XCircle, Camera, Star, ShoppingBag,
  HardDrive, Store, Tag, RotateCcw, TrendingUp, Bell,
  LayoutGrid, AlignJustify, ChevronsUpDown, CheckSquare, Square,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DigitalAccessRow {
  id: string;
  // access_url intentionally removed from client — use /api/files/access/:id
  file_ready?: boolean | null;
  subtype: string | null;
  granted_at: string;
  expires_at: string | null;
  last_accessed_at?: string | null;
  order_id?: string | null;
  order_item_id?: string | null;
  revoke_reason?: string | null;
  products: {
    id: string;
    name: string;
    images: string[] | null;
    button_text: string | null;
    pricing_type: string | null;
    billing_period: string | null;
    digital_file_size?: number | null;
    tags?: string[] | null;
    description?: string | null;
    vendor_id?: string | null;
  } | null;
  order_items?: {
    unit_price?: number | null;
    total_price?: number | null;
    download_count?: number | null;
    variant_name?: string | null;
    variant_id?: string | null;
  } | null;
  vendors?: {
    business_name?: string | null;
    business_logo?: string | null;
  } | null;
  lesson_progress?: {
    completed_lessons: number;
    total_lessons: number;
    percent: number;
  } | null;
  user_review?: {
    rating: number;
    id: string;
  } | null;
}

type Density  = "compact" | "comfortable";
type FilterId = typeof FILTER_TABS[number]["id"];
type SortKey  = "name" | "subtype" | "granted_at" | "expires_at" | "status" | "last_accessed_at";
type SortDir  = "asc" | "desc";

const PAGE_SIZE = 24;

// ─── Subtype config ───────────────────────────────────────────────────────────

function getSubtypeConfig(subtype: string | null) {
  switch (subtype) {
    case "course":
      return { label: "Course",      icon: BookOpen,      color: "#2563eb", action: "continue"  as const, actionLabel: "Continue",  ActionIcon: BookOpen    };
    case "software":
      return { label: "Software",    icon: Zap,           color: "#7c3aed", action: "open"      as const, actionLabel: "Launch",    ActionIcon: ExternalLink };
    case "ai-tools":
      return { label: "AI Tool",     icon: Sparkles,      color: "#db2777", action: "open"      as const, actionLabel: "Open",      ActionIcon: ExternalLink };
    case "templates":
      return { label: "Template",    icon: LayoutTemplate, color: "#d97706", action: "download" as const, actionLabel: "Download",  ActionIcon: Download    };
    case "ebooks":
      return { label: "Ebook",       icon: FileText,      color: "#059669", action: "download"  as const, actionLabel: "Download",  ActionIcon: Download    };
    case "music-audio":
      return { label: "Audio",       icon: Music,         color: "#dc2626", action: "download"  as const, actionLabel: "Download",  ActionIcon: Download    };
    case "graphics-design":
      return { label: "Graphics",    icon: ImageIcon,     color: "#ea580c", action: "download"  as const, actionLabel: "Download",  ActionIcon: Download    };
    case "photography":
      return { label: "Photo",       icon: Camera,        color: "#0891b2", action: "download"  as const, actionLabel: "Download",  ActionIcon: Download    };
    default:
      return { label: "Asset",       icon: Package,       color: "#64748b", action: "open"      as const, actionLabel: "Access",    ActionIcon: ExternalLink };
  }
}

const FILTER_TABS = [
  { id: "all",             label: "All",        icon: Grid3X3      },
  { id: "software",        label: "Software",   icon: Zap          },
  { id: "ai-tools",        label: "AI Tools",   icon: Sparkles     },
  { id: "course",          label: "Courses",    icon: BookOpen     },
  { id: "ebooks",          label: "Ebooks",     icon: FileText     },
  { id: "templates",       label: "Templates",  icon: LayoutTemplate },
  { id: "music-audio",     label: "Audio",      icon: Music        },
  { id: "graphics-design", label: "Graphics",   icon: ImageIcon    },
  { id: "photography",     label: "Photo",      icon: Camera       },
  { id: "other",           label: "Other",      icon: Package      },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isExpiredFn(row: DigitalAccessRow) {
  return row.expires_at ? new Date(row.expires_at) < new Date() : false;
}

function daysUntilExpiryFn(row: DigitalAccessRow) {
  if (!row.expires_at) return null;
  return Math.ceil((new Date(row.expires_at).getTime() - Date.now()) / 86400000);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024)            return `${bytes} B`;
  if (bytes < 1024 * 1024)    return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3)      return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function formatCurrency(cents: number | null | undefined): string | null {
  if (cents == null) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function getRevokeReasonLabel(reason: string | null | undefined): string | null {
  if (!reason) return null;
  switch (reason) {
    case "refunded":             return "Refunded";
    case "subscription_expired": return "Subscription expired";
    case "manual":               return "Revoked";
    default:                     return reason;
  }
}

function proxyUrl(id: string) {
  return `/api/files/access/${id}`;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="dl-card animate-pulse">
      <div className="dl-card-thumb" style={{ backgroundColor: "var(--color-surface-secondary)" }} />
      <div className="dl-card-body">
        <div style={{ height: 13, width: "60%", borderRadius: 2, backgroundColor: "var(--color-surface-secondary)", marginBottom: 6 }} />
        <div style={{ height: 11, width: "40%", borderRadius: 2, backgroundColor: "var(--color-surface-secondary)", marginBottom: 16 }} />
        <div style={{ height: 32, width: "100%", borderRadius: 2, backgroundColor: "var(--color-surface-secondary)" }} />
      </div>
    </div>
  );
}

function RowSkeleton() {
  return (
    <tr className="animate-pulse" style={{ borderBottom: "1px solid var(--color-border)" }}>
      {[40, 180, 90, 100, 90, 70, 120].map((w, i) => (
        <td key={i} className="py-3 px-3">
          <div style={{ height: 12, width: w, borderRadius: 2, backgroundColor: "var(--color-surface-secondary)" }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Error banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="dl-notice dl-notice--danger">
      <AlertTriangle size={14} />
      <span>Failed to load library.</span>
      <button onClick={onRetry} className="dl-notice-action">Retry</button>
    </div>
  );
}

// ─── Expiry banner ────────────────────────────────────────────────────────────

function ExpiryBanner({ items }: { items: DigitalAccessRow[] }) {
  const [dismissed, setDismissed] = useState(false);
  const expiring = items.filter(r => {
    const d = daysUntilExpiryFn(r);
    return d !== null && d > 0 && d <= 7;
  });
  if (expiring.length === 0 || dismissed) return null;
  return (
    <div className="dl-notice dl-notice--warn">
      <Bell size={14} />
      <span>
        <strong>{expiring.length} item{expiring.length !== 1 ? "s" : ""}</strong> expiring within 7 days:&nbsp;
        {expiring.map(r => r.products?.name).join(", ")}
      </span>
      <button onClick={() => setDismissed(true)} className="dl-notice-close"><XCircle size={13} /></button>
    </div>
  );
}

// ─── Recent shelf ─────────────────────────────────────────────────────────────

function RecentShelf({ items, onAccess }: { items: DigitalAccessRow[]; onAccess: (id: string) => void }) {
  const recent = useMemo(() =>
    [...items]
      .filter(r => r.last_accessed_at && !isExpiredFn(r))
      .sort((a, b) => new Date(b.last_accessed_at!).getTime() - new Date(a.last_accessed_at!).getTime())
      .slice(0, 6),
    [items]
  );
  if (recent.length < 2) return null;

  return (
    <section className="dl-section">
      <p className="dl-section-label"><TrendingUp size={11} /> Continue where you left off</p>
      <div className="dl-shelf">
        {recent.map(row => {
          const config = getSubtypeConfig(row.subtype);
          const img    = row.products?.images?.[0] ?? row.vendors?.business_logo ?? null;
          const name   = row.products?.name ?? "Unknown";
          const prog   = row.lesson_progress;

          function handleAction() {
            onAccess(row.id);
            if (config.action === "continue") return; // handled by Link
            window.open(proxyUrl(row.id), "_blank");
          }

          return (
            <div key={row.id} className="dl-shelf-item">
              <div className="dl-shelf-thumb">
                {img
                  ? <img src={img} alt={name} />
                  : <config.icon size={14} style={{ color: config.color }} />
                }
              </div>
              <div className="dl-shelf-meta">
                <span className="dl-shelf-name">{name}</span>
                {prog && prog.total_lessons > 0 ? (
                  <div className="dl-progress-row">
                    <div className="dl-progress-bar">
                      <div className="dl-progress-fill" style={{ width: `${prog.percent}%`, backgroundColor: config.color }} />
                    </div>
                    <span>{prog.percent}%</span>
                  </div>
                ) : (
                  <span className="dl-shelf-sub">
                    {row.last_accessed_at
                      ? new Date(row.last_accessed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : ""}
                  </span>
                )}
              </div>
              {config.action === "continue" ? (
                <Link href={`/dashboard/my-courses/${row.products?.id}`} onClick={() => onAccess(row.id)} className="dl-shelf-btn" style={{ color: config.color }}>
                  <config.ActionIcon size={12} />
                </Link>
              ) : (
                <button onClick={handleAction} className="dl-shelf-btn" style={{ color: config.color }}>
                  <config.ActionIcon size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Star rating ──────────────────────────────────────────────────────────────

function StarRating({ productId, existingReview, onReviewLeft }: {
  productId: string;
  existingReview: { rating: number; id: string } | null | undefined;
  onReviewLeft: (productId: string, rating: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const rating = existingReview?.rating ?? (submitted ? hovered : 0);
  const locked = !!(submitted || existingReview);

  return (
    <div className="dl-stars">
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          disabled={locked}
          onMouseEnter={() => !locked && setHovered(s)}
          onMouseLeave={() => !locked && setHovered(0)}
          onClick={() => { if (!locked) { setSubmitted(true); onReviewLeft(productId, s); } }}
          className="dl-star"
          style={{ color: s <= (locked ? rating : hovered) ? "#f59e0b" : "var(--color-border)" }}
        >
          <Star size={11} fill={s <= (locked ? rating : hovered) ? "#f59e0b" : "none"} />
        </button>
      ))}
    </div>
  );
}

// ─── Bulk bar ─────────────────────────────────────────────────────────────────

function BulkBar({ selected, total, onSelectAll, onClear, onBulkCopy, onBulkDownload }: {
  selected: Set<string>; total: number; onSelectAll: () => void; onClear: () => void;
  onBulkCopy: () => void; onBulkDownload: () => void;
}) {
  const count = selected.size;
  if (count === 0) return null;
  return (
    <div className="dl-bulk-bar">
      <span className="dl-bulk-count">{count} selected</span>
      <div className="dl-bulk-divider" />
      <button onClick={onSelectAll} className="dl-bulk-link">Select all {total}</button>
      <button onClick={onBulkCopy}     className="dl-btn dl-btn--ghost dl-btn--sm"><Copy size={12} /> Copy links</button>
      <button onClick={onBulkDownload} className="dl-btn dl-btn--primary dl-btn--sm"><Download size={12} /> Download all</button>
      <button onClick={onClear}        className="dl-bulk-close"><XCircle size={14} /></button>
    </div>
  );
}

// ─── Grid card ────────────────────────────────────────────────────────────────

function GridCard({
  row, highlight, index, selected, onToggleSelect, onAccess, onReviewLeft, density,
}: {
  row: DigitalAccessRow; highlight: boolean; index: number;
  selected: boolean; onToggleSelect: (id: string) => void;
  onAccess: (id: string) => void;
  onReviewLeft: (productId: string, rating: number) => void;
  density: Density;
}) {
  const product     = row.products;
  const config      = getSubtypeConfig(row.subtype);
  const isExpired   = isExpiredFn(row);
  const daysLeft    = daysUntilExpiryFn(row);
  const img         = product?.images?.[0] ?? row.vendors?.business_logo ?? null;
  const name        = product?.name ?? "Unknown";
  const vendor      = row.vendors?.business_name ?? null;
  const vendorLogo  = row.vendors?.business_logo ?? null;
  const dateLabel   = new Date(row.granted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const pricePaid   = formatCurrency(row.order_items?.unit_price);
  const fileSize    = product?.digital_file_size ? formatFileSize(product.digital_file_size) : null;
  const dlCount     = row.order_items?.download_count ?? null;
  const variantName = row.order_items?.variant_name ?? null;
  const revokeLabel = getRevokeReasonLabel(row.revoke_reason);
  const isSub       = product?.pricing_type === "subscription" || !!product?.billing_period;
  const compact     = density === "compact";
  const isReady     = row.file_ready !== false; // default true if not set

  function handleCopy() {
    navigator.clipboard.writeText(`${window.location.origin}${proxyUrl(row.id)}`);
    toast.success("Link copied — works only when signed in");
  }

  function handleAction() {
    onAccess(row.id);
    window.open(proxyUrl(row.id), "_blank");
  }

  return (
    <article
      className={cn("dl-card", highlight && "dl-card--highlight", isExpired && "dl-card--expired", selected && "dl-card--selected")}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {/* Checkbox */}
      <button className="dl-card-check" onClick={() => onToggleSelect(row.id)}
        style={{ backgroundColor: selected ? "var(--color-accent)" : undefined }}>
        {selected ? <CheckSquare size={12} className="text-white" /> : <Square size={12} style={{ color: "rgba(255,255,255,0.7)" }} />}
      </button>

      {/* Order badge */}
      {row.order_id && (
        <Link href={`/dashboard/orders/${row.order_id}`} className="dl-card-order-badge"
          onClick={e => e.stopPropagation()} title={`Order #${row.order_id}`}>
          <ShoppingBag size={9} /> #{String(row.order_id).slice(-6)}
        </Link>
      )}

      {/* Thumbnail */}
      <div className={cn("dl-card-thumb", compact && "dl-card-thumb--compact")}>
        {img ? (
          <img src={img} alt={name} className="dl-card-img" />
        ) : (
          <div className="dl-card-thumb-placeholder">
            <config.icon size={compact ? 18 : 24} style={{ color: config.color, opacity: 0.6 }} />
          </div>
        )}

        {/* Status strip */}
        <div className="dl-card-badges">
          <span className="dl-badge" style={{ color: config.color, borderColor: config.color }}>
            <config.icon size={9} /> {config.label}
          </span>
          {isExpired ? (
            <span className="dl-badge dl-badge--danger"><AlertTriangle size={9} /> Expired</span>
          ) : daysLeft !== null && daysLeft <= 7 ? (
            <span className="dl-badge dl-badge--warn"><Clock size={9} /> {daysLeft}d left</span>
          ) : isReady ? (
            <span className="dl-badge dl-badge--ok"><CheckCircle2 size={9} /> Active</span>
          ) : null}
        </div>

        {/* Course progress bar overlay */}
        {row.lesson_progress && row.lesson_progress.total_lessons > 0 && (
          <div className="dl-card-progress">
            <div className="dl-card-progress-bar">
              <div style={{ width: `${row.lesson_progress.percent}%`, backgroundColor: config.color }} />
            </div>
            <span>{row.lesson_progress.percent}%</span>
          </div>
        )}

        {/* Hover overlay */}
        {!isExpired && isReady && (
          <div className="dl-card-hover">
            {config.action === "continue" ? (
              <Link href={`/dashboard/my-courses/${product?.id}`} onClick={() => onAccess(row.id)} className="dl-card-hover-btn">
                <config.ActionIcon size={13} /> {config.actionLabel}
              </Link>
            ) : (
              <button onClick={handleAction} className="dl-card-hover-btn">
                <config.ActionIcon size={13} /> {config.actionLabel}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="dl-card-body">
        {/* Type stripe */}
        <div className="dl-card-stripe" style={{ backgroundColor: config.color }} />

        <p className="dl-card-name" title={name}>{name}</p>
        {variantName && <p className="dl-card-variant">{variantName}</p>}

        {vendor && (
          <div className="dl-card-vendor">
            {vendorLogo
              ? <img src={vendorLogo} alt={vendor} className="dl-card-vendor-logo" />
              : <Store size={10} style={{ color: "var(--color-text-muted)" }} />
            }
            <span>{vendor}</span>
          </div>
        )}

        <div className="dl-card-meta-row">
          <span>{dateLabel}</span>
          {pricePaid && <span>{pricePaid}</span>}
        </div>

        {product?.tags && product.tags.length > 0 && (
          <div className="dl-card-tags">
            {product.tags.slice(0, 3).map(tag => (
              <span key={tag} className="dl-tag"><Tag size={9} /> {tag}</span>
            ))}
          </div>
        )}

        {/* Expiry line */}
        {row.expires_at && !isExpired && (
          <p className="dl-card-expiry" style={{ color: isSub ? "var(--color-success)" : "var(--color-warning)" }}>
            <Clock size={10} /> {isSub ? "Renews" : "Expires"} {new Date(row.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        )}
        {!row.expires_at && <p className="dl-card-lifetime">Lifetime access</p>}
        {revokeLabel && (
          <p className="dl-card-revoke"><XCircle size={10} /> {revokeLabel}</p>
        )}

        {(fileSize || dlCount !== null) && (
          <div className="dl-card-file-meta">
            {fileSize   && <span><HardDrive size={10} /> {fileSize}</span>}
            {dlCount !== null && <span><Download size={10} /> {dlCount}×</span>}
          </div>
        )}

        {!isExpired && isReady && product?.id && (
          <div className="dl-card-stars-row">
            <StarRating productId={product.id} existingReview={row.user_review} onReviewLeft={onReviewLeft} />
          </div>
        )}

        {/* Action row */}
        <div className="dl-card-actions">
          {isExpired ? (
            <button disabled className="dl-btn dl-btn--ghost dl-btn--sm dl-btn--disabled" style={{ flex: 1 }}>
              <AlertTriangle size={12} /> {revokeLabel ?? "Expired"}
            </button>
          ) : !isReady ? (
            <button disabled className="dl-btn dl-btn--ghost dl-btn--sm dl-btn--disabled" style={{ flex: 1 }}>
              <Loader2 size={12} className="animate-spin" /> Preparing…
            </button>
          ) : config.action === "continue" ? (
            <Link href={`/dashboard/my-courses/${product?.id}`} onClick={() => onAccess(row.id)}
              className="dl-btn dl-btn--primary dl-btn--sm" style={{ flex: 1, backgroundColor: config.color }}>
              <config.ActionIcon size={12} /> {config.actionLabel}
            </Link>
          ) : (
            <button onClick={handleAction} className="dl-btn dl-btn--primary dl-btn--sm" style={{ flex: 1, backgroundColor: config.color }}>
              <config.ActionIcon size={12} /> {config.actionLabel}
            </button>
          )}

          {!isExpired && isReady && (
            config.action === "continue" ? (
              <Link href={`/dashboard/my-courses/${product?.id}?tab=progress`} className="dl-btn dl-btn--icon dl-btn--sm">
                <BarChart2 size={13} />
              </Link>
            ) : (
              <button onClick={handleCopy} className="dl-btn dl-btn--icon dl-btn--sm">
                <Copy size={13} />
              </button>
            )
          )}
        </div>

        {row.order_id && (
          <Link href={`/dashboard/orders/${row.order_id}`} className="dl-card-order-link">
            <ShoppingBag size={10} /> Order #{String(row.order_id).slice(-8)}
          </Link>
        )}
      </div>
    </article>
  );
}

// ─── Table view ───────────────────────────────────────────────────────────────

function TableView({ rows, highlightId, selected, onToggleSelect, onAccess, onReviewLeft }: {
  rows: DigitalAccessRow[];
  highlightId: string | null;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onAccess: (id: string) => void;
  onReviewLeft: (productId: string, rating: number) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("granted_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  const sorted = useMemo(() => [...rows].sort((a, b) => {
    let av: string | number = "";
    let bv: string | number = "";
    switch (sortKey) {
      case "name":           av = a.products?.name?.toLowerCase() ?? "";   bv = b.products?.name?.toLowerCase() ?? "";   break;
      case "subtype":        av = a.subtype ?? "";                          bv = b.subtype ?? "";                          break;
      case "granted_at":     av = new Date(a.granted_at).getTime();         bv = new Date(b.granted_at).getTime();         break;
      case "expires_at":     av = a.expires_at ? new Date(a.expires_at).getTime() : Infinity; bv = b.expires_at ? new Date(b.expires_at).getTime() : Infinity; break;
      case "last_accessed_at": av = a.last_accessed_at ? new Date(a.last_accessed_at).getTime() : 0; bv = b.last_accessed_at ? new Date(b.last_accessed_at).getTime() : 0; break;
      case "status":         av = isExpiredFn(a) ? 1 : 0;                  bv = isExpiredFn(b) ? 1 : 0;                  break;
    }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  }), [rows, sortKey, sortDir]);

  const COLS: { key: SortKey; label: string; hide?: string }[] = [
    { key: "name",            label: "Product"  },
    { key: "subtype",         label: "Type",    hide: "sm"  },
    { key: "granted_at",      label: "Claimed", hide: "md"  },
    { key: "last_accessed_at",label: "Last used",hide: "lg" },
    { key: "expires_at",      label: "Expires", hide: "xl"  },
    { key: "status",          label: "Status"   },
  ];

  const allSelected = sorted.length > 0 && sorted.every(r => selected.has(r.id));

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown size={11} style={{ opacity: 0.3 }} />;
    return sortDir === "asc" ? <ChevronUp size={11} style={{ color: "var(--color-accent)" }} /> : <ChevronDown size={11} style={{ color: "var(--color-accent)" }} />;
  }

  return (
    <div className="dl-table-wrap">
      <table className="dl-table">
        <thead>
          <tr className="dl-table-head">
            <th className="dl-th dl-th--check">
              <button className="dl-check" onClick={() => sorted.forEach(r => onToggleSelect(r.id))}
                style={{ backgroundColor: allSelected ? "var(--color-accent)" : undefined }}>
                {allSelected && <CheckSquare size={10} className="text-white" />}
              </button>
            </th>
            <th className="dl-th dl-th--thumb" />
            {COLS.map(col => (
              <th key={col.key} className={cn("dl-th", col.hide && `dl-th--hide-${col.hide}`)}>
                <button className="dl-th-btn" onClick={() => toggleSort(col.key)}>
                  {col.label} <SortIcon col={col.key} />
                </button>
              </th>
            ))}
            <th className="dl-th dl-th--hide-xl">Price</th>
            <th className="dl-th dl-th--hide-xl">DL</th>
            <th className="dl-th dl-th--right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <TableRow
              key={row.id}
              row={row}
              highlight={highlightId === row.id || highlightId === row.products?.id}
              isLast={i === sorted.length - 1}
              selected={selected.has(row.id)}
              onToggleSelect={onToggleSelect}
              onAccess={onAccess}
              onReviewLeft={onReviewLeft}
            />
          ))}
        </tbody>
      </table>
      <div className="dl-table-footer">
        <span>{sorted.length} item{sorted.length !== 1 ? "s" : ""}</span>
        <span>Click column to sort</span>
      </div>
    </div>
  );
}

function TableRow({ row, highlight, isLast, selected, onToggleSelect, onAccess, onReviewLeft }: {
  row: DigitalAccessRow; highlight: boolean; isLast: boolean;
  selected: boolean; onToggleSelect: (id: string) => void;
  onAccess: (id: string) => void;
  onReviewLeft: (productId: string, rating: number) => void;
}) {
  const product     = row.products;
  const config      = getSubtypeConfig(row.subtype);
  const isExpired   = isExpiredFn(row);
  const daysLeft    = daysUntilExpiryFn(row);
  const img         = product?.images?.[0] ?? row.vendors?.business_logo ?? null;
  const name        = product?.name ?? "Unknown";
  const grantedLabel    = new Date(row.granted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const expiryLabel     = row.expires_at ? new Date(row.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
  const lastUsedLabel   = row.last_accessed_at ? new Date(row.last_accessed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Never";
  const pricePaid       = formatCurrency(row.order_items?.unit_price);
  const dlCount         = row.order_items?.download_count ?? null;
  const variantName     = row.order_items?.variant_name ?? null;
  const vendorName      = row.vendors?.business_name ?? null;
  const vendorLogo      = row.vendors?.business_logo ?? null;
  const revokeLabel     = getRevokeReasonLabel(row.revoke_reason);
  const isReady         = row.file_ready !== false;

  function handleCopy() {
    navigator.clipboard.writeText(`${window.location.origin}${proxyUrl(row.id)}`);
    toast.success("Link copied");
  }

  function handleAction() {
    onAccess(row.id);
    window.open(proxyUrl(row.id), "_blank");
  }

  return (
    <tr
      className={cn("dl-tr", isExpired && "dl-tr--expired", highlight && "dl-tr--highlight", !isLast && "dl-tr--border")}
      style={{ backgroundColor: selected ? "var(--color-accent-subtle)" : undefined }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-surface-secondary)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = selected ? "var(--color-accent-subtle)" : ""; }}
    >
      <td className="dl-td dl-td--check">
        <button className="dl-check" onClick={() => onToggleSelect(row.id)}
          style={{ backgroundColor: selected ? "var(--color-accent)" : undefined }}>
          {selected && <CheckSquare size={10} className="text-white" />}
        </button>
      </td>
      <td className="dl-td dl-td--thumb">
        <div className="dl-row-thumb">
          {img
            ? <img src={img} alt={name} />
            : <config.icon size={13} style={{ color: config.color }} />
          }
        </div>
      </td>
      <td className="dl-td dl-td--name">
        <div className="dl-row-name-group">
          <div className="dl-row-name-line">
            {highlight && <span className="dl-row-dot" style={{ backgroundColor: "var(--color-success)" }} />}
            <span className="dl-row-name" title={name}>{name}</span>
            {variantName && <span className="dl-row-variant">{variantName}</span>}
          </div>
          {vendorName && (
            <div className="dl-row-vendor">
              {vendorLogo && <img src={vendorLogo} alt={vendorName} />}
              <span>{vendorName}</span>
            </div>
          )}
          {row.lesson_progress && row.lesson_progress.total_lessons > 0 && (
            <div className="dl-row-progress">
              <div className="dl-progress-bar" style={{ width: 60 }}>
                <div className="dl-progress-fill" style={{ width: `${row.lesson_progress.percent}%`, backgroundColor: config.color }} />
              </div>
              <span>{row.lesson_progress.percent}%</span>
            </div>
          )}
          {!isExpired && isReady && product?.id && (
            <StarRating productId={product.id} existingReview={row.user_review} onReviewLeft={onReviewLeft} />
          )}
        </div>
      </td>
      <td className="dl-td dl-td--hide-sm">
        <span className="dl-type-pill" style={{ color: config.color, borderColor: `${config.color}33` }}>
          <config.icon size={9} /> {config.label}
        </span>
      </td>
      <td className="dl-td dl-td--hide-md dl-td--muted">{grantedLabel}</td>
      <td className="dl-td dl-td--hide-lg" style={{ color: lastUsedLabel === "Never" ? "var(--color-text-muted)" : "var(--color-text-secondary)" }}>{lastUsedLabel}</td>
      <td className="dl-td dl-td--hide-xl">
        {revokeLabel ? (
          <span className="dl-status dl-status--danger"><XCircle size={10} /> {revokeLabel}</span>
        ) : row.expires_at ? (
          <span style={{ color: isExpired ? "var(--color-danger)" : daysLeft !== null && daysLeft <= 7 ? "var(--color-warning)" : "var(--color-text-secondary)", fontSize: 12 }}>
            {(isExpired || (daysLeft !== null && daysLeft <= 7)) && <Clock size={10} />} {expiryLabel}
          </span>
        ) : (
          <span className="dl-td--muted" style={{ fontSize: 12 }}>Lifetime</span>
        )}
      </td>
      <td className="dl-td">
        {isExpired ? (
          <span className="dl-status dl-status--danger"><AlertTriangle size={10} /> Expired</span>
        ) : !isReady ? (
          <span className="dl-status dl-status--warn"><Loader2 size={10} className="animate-spin" /> Preparing</span>
        ) : (
          <span className="dl-status dl-status--ok"><CheckCircle2 size={10} /> Active</span>
        )}
      </td>
      <td className="dl-td dl-td--hide-xl dl-td--muted" style={{ fontSize: 12 }}>{pricePaid ?? "—"}</td>
      <td className="dl-td dl-td--hide-xl dl-td--muted" style={{ fontSize: 12 }}>{dlCount !== null ? `${dlCount}×` : "—"}</td>
      <td className="dl-td dl-td--right">
        <div className="dl-row-actions">
          {!isExpired && isReady ? (
            config.action === "continue" ? (
              <>
                <Link href={`/dashboard/my-courses/${product?.id}`} onClick={() => onAccess(row.id)}
                  className="dl-btn dl-btn--primary dl-btn--sm" style={{ backgroundColor: config.color }}>
                  <config.ActionIcon size={11} /> <span className="dl-btn-label">{config.actionLabel}</span>
                </Link>
                <Link href={`/dashboard/my-courses/${product?.id}?tab=progress`} className="dl-btn dl-btn--icon dl-btn--sm">
                  <BarChart2 size={12} />
                </Link>
              </>
            ) : (
              <>
                <button onClick={handleAction} className="dl-btn dl-btn--primary dl-btn--sm" style={{ backgroundColor: config.color }}>
                  <config.ActionIcon size={11} /> <span className="dl-btn-label">{config.actionLabel}</span>
                </button>
                <button onClick={handleCopy} className="dl-btn dl-btn--icon dl-btn--sm">
                  <Copy size={12} />
                </button>
              </>
            )
          ) : (
            <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>—</span>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar({ items }: { items: DigitalAccessRow[] }) {
  const total        = items.length;
  const active       = items.filter(r => r.file_ready !== false && !isExpiredFn(r)).length;
  const expired      = items.filter(r => isExpiredFn(r)).length;
  const expiringSoon = items.filter(r => { const d = daysUntilExpiryFn(r); return d !== null && d > 0 && d <= 7; }).length;

  return (
    <div className="dl-stats">
      <div className="dl-stat"><span className="dl-stat-val">{total}</span><span className="dl-stat-lbl">Total</span></div>
      <div className="dl-stat-div" />
      <div className="dl-stat"><span className="dl-stat-val" style={{ color: "var(--color-success)" }}>{active}</span><span className="dl-stat-lbl">Active</span></div>
      {expiringSoon > 0 && (<><div className="dl-stat-div" /><div className="dl-stat"><span className="dl-stat-val" style={{ color: "var(--color-warning)" }}>{expiringSoon}</span><span className="dl-stat-lbl">Expiring</span></div></>)}
      {expired > 0      && (<><div className="dl-stat-div" /><div className="dl-stat"><span className="dl-stat-val" style={{ color: "var(--color-danger)"  }}>{expired}</span><span className="dl-stat-lbl">Expired</span></div></>)}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DigitalLibraryPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const highlightId  = searchParams.get("highlight") ?? searchParams.get("new") ?? null;

  const [items,      setItems]      = useState<DigitalAccessRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">(() =>
    typeof window !== "undefined" ? ((localStorage.getItem("dlv") as "grid" | "table") ?? "grid") : "grid"
  );
  const [density, setDensity] = useState<Density>(() =>
    typeof window !== "undefined" ? ((localStorage.getItem("dld") as Density) ?? "comfortable") : "comfortable"
  );
  const [showExpired,   setShowExpired]   = useState(false);
  const [sortKey,       setSortKey]       = useState<SortKey>("granted_at");
  const [sortDir,       setSortDir]       = useState<SortDir>("desc");
  const [page,          setPage]          = useState(1);
  const [selected,      setSelected]      = useState<Set<string>>(new Set());
  const [focusedIndex,  setFocusedIndex]  = useState(-1);

  const searchRef   = useRef<HTMLInputElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const channelRef  = useRef<any>(null);
  const userIdRef   = useRef<string | null>(null);

  function setViewModePersisted(m: "grid" | "table") { setViewMode(m); localStorage.setItem("dlv", m); }
  function setDensityPersisted(d: Density)            { setDensity(d);  localStorage.setItem("dld", d); }

  // ── Load ──
 const load = useCallback(async (isRefresh = false) => {
  if (isRefresh) setRefreshing(true); else setLoading(true);
  setLoadError(false);

  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("[DL] Auth error:", authError);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    userIdRef.current = user.id;

    const { data, error } = await supabase
      .from("digital_access")
      .select(`
        id, subtype, granted_at, expires_at, last_accessed_at,
        order_id, order_item_id, revoke_reason,
        products (
          id, name, images, button_text, pricing_type, billing_period,
          digital_file_size, tags, description,
          vendors ( business_name, business_logo )
        ),
        order_items ( unit_price, total_price, download_count, variant_name, variant_id )
      `)
      .eq("user_id", user.id)
      .is("revoked_at", null)
      .order("granted_at", { ascending: false });

    // Log the actual error so you can see what's wrong
    if (error) {
      console.error("[DL] Query error:", error.message, error.details, error.hint);
      setLoadError(true);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const rows = data ?? [];
    const productIds = rows
      .map((r: any) => {
        const p = Array.isArray(r.products) ? r.products[0] : r.products;
        return p?.id;
      })
      .filter(Boolean);

    // lesson_progress — wrapped in try/catch separately so it
    // doesn't kill the whole page if the table name is wrong
    let progressMap: Record<string, { completed_lessons: number; total_lessons: number; percent: number }> = {};
    if (productIds.length > 0) {
      try {
        const { data: pData, error: pErr } = await supabase
          .from("lesson_progress")
          .select("course_id, completed, community_courses!inner(total_lessons)")
          .eq("user_id", user.id)
          .in("course_id", productIds);

        if (pErr) {
          console.warn("[DL] lesson_progress error (non-fatal):", pErr.message);
        } else if (pData) {
          const grouped: Record<string, { completed: number; total: number }> = {};
          (pData as any[]).forEach(p => {
            if (!grouped[p.course_id]) {
              grouped[p.course_id] = {
                completed: 0,
                total: p.community_courses?.total_lessons ?? 0,
              };
            }
            if (p.completed) grouped[p.course_id].completed += 1;
          });
          Object.entries(grouped).forEach(([id, g]) => {
            progressMap[id] = {
              completed_lessons: g.completed,
              total_lessons: g.total,
              percent: g.total > 0 ? Math.round((g.completed / g.total) * 100) : 0,
            };
          });
        }
      } catch (e) {
        console.warn("[DL] lesson_progress threw (non-fatal):", e);
      }
    }

    // reviews — same pattern, non-fatal
    let reviewMap: Record<string, { rating: number; id: string }> = {};
    if (productIds.length > 0) {
      try {
        const { data: rData, error: rErr } = await supabase
          .from("reviews")
          .select("id, product_id, rating")
          .eq("buyer_id", user.id)
          .in("product_id", productIds);

        if (rErr) {
          console.warn("[DL] reviews error (non-fatal):", rErr.message);
        } else if (rData) {
          (rData as any[]).forEach(r => {
            reviewMap[r.product_id] = { rating: r.rating, id: r.id };
          });
        }
      } catch (e) {
        console.warn("[DL] reviews threw (non-fatal):", e);
      }
    }

    const resolved = rows.map((row: any) => {
      const product   = Array.isArray(row.products)    ? (row.products[0]    ?? null) : row.products;
      const vendor    = product?.vendors
        ? (Array.isArray(product.vendors) ? product.vendors[0] : product.vendors)
        : null;
      const orderItem = Array.isArray(row.order_items) ? (row.order_items[0] ?? null) : row.order_items;

      return {
        ...row,
        file_ready:      true, // assume ready; set false only if you add the column
        products:        product ? { ...product, vendors: undefined } : null,
        vendors:         vendor,
        order_items:     orderItem,
        lesson_progress: product?.id ? (progressMap[product.id] ?? null) : null,
        user_review:     product?.id ? (reviewMap[product.id]   ?? null) : null,
      } as DigitalAccessRow;
    });

    setItems(resolved);
  } catch (e) {
    console.error("[DL] Unexpected error:", e);
    setLoadError(true);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, []);

  // ── Realtime ──
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    async function init() {
      await load();
      if (cancelled || !userIdRef.current) return;
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
      channelRef.current = supabase
        .channel(`digital-access-${userIdRef.current}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "digital_access", filter: `user_id=eq.${userIdRef.current}` }, () => load())
        .subscribe();
    }
    init();
    return () => {
      cancelled = true;
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    };
  }, [load]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); searchRef.current?.focus(); return; }
      if (e.key === "Escape") {
        if (search) setSearch("");
        else if (selected.size > 0) setSelected(new Set());
        else setFocusedIndex(-1);
        return;
      }
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (viewMode === "grid" && ["ArrowRight","ArrowLeft","ArrowDown","ArrowUp"].includes(e.key)) {
        e.preventDefault();
        setFocusedIndex(prev => {
          const cols = window.innerWidth >= 1280 ? 4 : window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1;
          if (e.key === "ArrowRight") return Math.min(prev + 1,    paginated.length - 1);
          if (e.key === "ArrowLeft")  return Math.max(prev - 1,    0);
          if (e.key === "ArrowDown")  return Math.min(prev + cols, paginated.length - 1);
          if (e.key === "ArrowUp")    return Math.max(prev - cols, 0);
          return prev;
        });
      }
      if (e.key === "Enter" && focusedIndex >= 0 && paginated[focusedIndex]) {
        const row = paginated[focusedIndex];
        const config = getSubtypeConfig(row.subtype);
        if (config.action === "continue") { router.push(`/dashboard/my-courses/${row.products?.id}`); return; }
        window.open(proxyUrl(row.id), "_blank", "noopener,noreferrer");
      }
      if (e.key === " " && focusedIndex >= 0 && paginated[focusedIndex]) {
        e.preventDefault();
        toggleSelect(paginated[focusedIndex].id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      setTimeout(() => highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 400);
    }
  }, [highlightId, items]);

  const handleAccess = useCallback(async (id: string) => {
    const supabase = createClient();
    const now = new Date().toISOString();
    setItems(prev => prev.map(r => r.id === id ? { ...r, last_accessed_at: now } : r));
    await supabase.from("digital_access").update({ last_accessed_at: now }).eq("id", id);
  }, []);

  const handleReviewLeft = useCallback(async (productId: string, rating: number) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("reviews")
      .upsert({ product_id: productId, buyer_id: user.id, rating }, { onConflict: "product_id,buyer_id" })
      .select("id, rating").single();
    if (!error && data) {
      setItems(prev => prev.map(r => r.products?.id === productId ? { ...r, user_review: { rating: data.rating, id: data.id } } : r));
      toast.success(`Rated ${rating}★`);
    }
  }, []);

  // ── Filter + sort ──
  const knownSubtypes = useMemo(() => new Set(FILTER_TABS.map(t => t.id).filter(id => id !== "all" && id !== "other")), []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter(row => {
      if (!showExpired && isExpiredFn(row)) return false;
      const matchSearch = !q
        || (row.products?.name ?? "").toLowerCase().includes(q)
        || (row.products?.description ?? "").toLowerCase().includes(q)
        || (row.products?.tags ?? []).join(" ").toLowerCase().includes(q);
      const bucket = !row.subtype || !knownSubtypes.has(row.subtype as any) ? "other" : row.subtype;
      return matchSearch && (activeFilter === "all" || bucket === activeFilter);
    });
  }, [items, search, activeFilter, showExpired, knownSubtypes]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    let av: string | number = "";
    let bv: string | number = "";
    switch (sortKey) {
      case "name":           av = a.products?.name?.toLowerCase() ?? ""; bv = b.products?.name?.toLowerCase() ?? ""; break;
      case "subtype":        av = a.subtype ?? "";                        bv = b.subtype ?? "";                        break;
      case "granted_at":     av = new Date(a.granted_at).getTime();       bv = new Date(b.granted_at).getTime();       break;
      case "expires_at":     av = a.expires_at ? new Date(a.expires_at).getTime() : Infinity; bv = b.expires_at ? new Date(b.expires_at).getTime() : Infinity; break;
      case "last_accessed_at": av = a.last_accessed_at ? new Date(a.last_accessed_at).getTime() : 0; bv = b.last_accessed_at ? new Date(b.last_accessed_at).getTime() : 0; break;
      case "status":         av = isExpiredFn(a) ? 1 : 0;                bv = isExpiredFn(b) ? 1 : 0;                break;
    }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  }), [filtered, sortKey, sortDir]);

  useEffect(() => { setPage(1); setFocusedIndex(-1); }, [search, activeFilter, showExpired, sortKey, sortDir]);

  const paginated = sorted.slice(0, page * PAGE_SIZE);
  const hasMore   = page * PAGE_SIZE < sorted.length;

  const countBySubtype = useMemo(() =>
    items.filter(r => showExpired || !isExpiredFn(r)).reduce<Record<string, number>>((acc, row) => {
      const key = !row.subtype || !knownSubtypes.has(row.subtype as any) ? "other" : row.subtype;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
    [items, showExpired, knownSubtypes]
  );

  const expiredCount = items.filter(r => isExpiredFn(r)).length;

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  function toggleSelect(id: string) {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  function bulkCopy() {
    const links = items.filter(r => selected.has(r.id)).map(r => `${window.location.origin}${proxyUrl(r.id)}`).join("\n");
    if (!links) { toast.error("Nothing to copy"); return; }
    navigator.clipboard.writeText(links);
    toast.success(`Copied ${selected.size} link${selected.size !== 1 ? "s" : ""}`);
  }

  function bulkDownload() {
    items.filter(r => selected.has(r.id)).forEach(r => window.open(proxyUrl(r.id), "_blank"));
    toast.success("Downloads started");
  }

  const gridCols = density === "compact"
    ? "dl-grid dl-grid--compact"
    : "dl-grid dl-grid--comfortable";

  // ── Loading ──
  if (loading) {
    return (
      <>
        <style>{DL_STYLES}</style>
        <div className="dl-page">
          <div className="dl-header dl-header--loading">
            <div className="dl-header-left">
              <div className="dl-skeleton" style={{ width: 36, height: 36 }} />
              <div>
                <div className="dl-skeleton" style={{ width: 160, height: 22, marginBottom: 6 }} />
                <div className="dl-skeleton" style={{ width: 200, height: 13 }} />
              </div>
            </div>
            <div className="dl-skeleton" style={{ width: 220, height: 34 }} />
          </div>
          <div className="dl-grid dl-grid--comfortable">
            {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{DL_STYLES}</style>

      <BulkBar
        selected={selected}
        total={sorted.length}
        onSelectAll={() => setSelected(new Set(sorted.map(r => r.id)))}
        onClear={() => setSelected(new Set())}
        onBulkCopy={bulkCopy}
        onBulkDownload={bulkDownload}
      />

      <div className="dl-page">

        {/* ── Header ── */}
        <div className="dl-header">
          <div className="dl-header-left">
            <div className="dl-header-icon"><Library size={18} /></div>
            <div>
              <h1 className="dl-title">Digital Library</h1>
              <p className="dl-subtitle">Your purchased products</p>
            </div>
          </div>
          <div className="dl-header-controls">
            {items.length > 0 && <StatsBar items={items} />}
            <div className="dl-controls-group">
              {expiredCount > 0 && (
                <button onClick={() => setShowExpired(v => !v)} className={cn("dl-btn dl-btn--ghost dl-btn--sm", showExpired && "dl-btn--active-danger")}>
                  <AlertTriangle size={12} /> {showExpired ? "Hide" : "Show"} expired ({expiredCount})
                </button>
              )}
              {viewMode === "grid" && (
                <div className="dl-toggle-group">
                  {([{ d: "comfortable" as Density, Icon: LayoutGrid }, { d: "compact" as Density, Icon: AlignJustify }] as const).map(({ d, Icon }) => (
                    <button key={d} onClick={() => setDensityPersisted(d)} className={cn("dl-toggle-btn", density === d && "dl-toggle-btn--active")}>
                      <Icon size={13} />
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => load(true)} disabled={refreshing} className="dl-btn dl-btn--icon dl-btn--sm">
                <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              </button>
              <div className="dl-toggle-group">
                {([{ mode: "grid" as const, Icon: Grid3X3 }, { mode: "table" as const, Icon: Table2 }] as const).map(({ mode, Icon }) => (
                  <button key={mode} onClick={() => setViewModePersisted(mode)} className={cn("dl-toggle-btn", viewMode === mode && "dl-toggle-btn--active")}>
                    <Icon size={13} />
                  </button>
                ))}
              </div>
              <div className="dl-search-wrap">
                <Search size={13} className="dl-search-icon" />
                <input
                  ref={searchRef}
                  placeholder="Search…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="dl-search"
                />
                {search
                  ? <button onClick={() => setSearch("")} className="dl-search-clear"><XCircle size={13} /></button>
                  : <kbd className="dl-search-kbd">⌘K</kbd>
                }
              </div>
            </div>
          </div>
        </div>

        {loadError && <ErrorBanner onRetry={() => load()} />}
        <ExpiryBanner items={items} />
        <RecentShelf items={items} onAccess={handleAccess} />

        {/* ── Filter tabs ── */}
        {items.length > 0 && (
          <div className="dl-filters">
            {FILTER_TABS.map(tab => {
              const count = tab.id === "all"
                ? (showExpired ? items.length : items.filter(r => !isExpiredFn(r)).length)
                : (countBySubtype[tab.id] ?? 0);
              if (tab.id !== "all" && count === 0) return null;
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={cn("dl-filter-btn", isActive && "dl-filter-btn--active")}
                >
                  <tab.icon size={11} /> {tab.label} <span className="dl-filter-count">{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Sort bar (grid only) ── */}
        {sorted.length > 0 && viewMode === "grid" && (
          <div className="dl-sort-bar">
            <span className="dl-sort-label">Sort:</span>
            {([
              { key: "granted_at" as SortKey, label: "Date" },
              { key: "name"       as SortKey, label: "Name" },
              { key: "subtype"    as SortKey, label: "Type" },
              { key: "expires_at" as SortKey, label: "Expiry" },
              { key: "last_accessed_at" as SortKey, label: "Last used" },
            ]).map(o => (
              <button key={o.key} onClick={() => handleSort(o.key)} className={cn("dl-sort-btn", sortKey === o.key && "dl-sort-btn--active")}>
                {o.label}
                {sortKey === o.key && (sortDir === "asc" ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
              </button>
            ))}
          </div>
        )}

        {/* ── Results label ── */}
        {(search || activeFilter !== "all") && sorted.length > 0 && (
          <p className="dl-results-label">
            {sorted.length} result{sorted.length !== 1 ? "s" : ""}
            {search && <> for <strong>"{search}"</strong></>}
          </p>
        )}

        {/* ── Empty: no items ── */}
        {items.length === 0 && !loadError && (
          <div className="dl-empty">
            <Library size={28} style={{ color: "var(--color-text-muted)", marginBottom: 12 }} />
            <p className="dl-empty-title">Your library is empty</p>
            <p className="dl-empty-sub">Products you purchase appear here with instant access.</p>
            <Link href="/marketplace" className="dl-btn dl-btn--primary" style={{ marginTop: 20 }}>
              <Sparkles size={13} /> Browse marketplace
            </Link>
          </div>
        )}

        {/* ── Empty: no results ── */}
        {items.length > 0 && sorted.length === 0 && (
          <div className="dl-empty">
            <Search size={22} style={{ color: "var(--color-text-muted)", marginBottom: 12 }} />
            <p className="dl-empty-title">No results</p>
            <p className="dl-empty-sub">{search ? `Nothing matched "${search}"` : `No ${activeFilter} assets`}</p>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              {search        && <button onClick={() => setSearch("")}          className="dl-btn dl-btn--ghost dl-btn--sm">Clear search</button>}
              {activeFilter !== "all" && <button onClick={() => setActiveFilter("all")} className="dl-btn dl-btn--ghost dl-btn--sm">Show all</button>}
            </div>
          </div>
        )}

        {/* ── Grid ── */}
        {sorted.length > 0 && viewMode === "grid" && (
          <>
            <div className={gridCols}>
              {paginated.map((row, i) => {
                const isHighlighted = highlightId === row.id || highlightId === row.products?.id;
                return (
                  <div key={row.id} ref={isHighlighted ? highlightRef : undefined}
                    style={focusedIndex === i ? { outline: "2px solid var(--color-accent)", outlineOffset: 3 } : undefined}>
                    <GridCard
                      row={row} highlight={isHighlighted} index={i}
                      selected={selected.has(row.id)}
                      onToggleSelect={toggleSelect}
                      onAccess={handleAccess}
                      onReviewLeft={handleReviewLeft}
                      density={density}
                    />
                  </div>
                );
              })}
            </div>
            {hasMore && (
              <div className="dl-load-more">
                <span className="dl-results-label">Showing {paginated.length} of {sorted.length}</span>
                <button onClick={() => setPage(p => p + 1)} className="dl-btn dl-btn--ghost dl-btn--sm">
                  Load {Math.min(PAGE_SIZE, sorted.length - paginated.length)} more
                </button>
              </div>
            )}
            {sorted.length > 1 && (
              <p className="dl-kb-hint">↑↓←→ navigate · Enter open · Space select · Esc clear</p>
            )}
          </>
        )}

        {/* ── Table ── */}
        {sorted.length > 0 && viewMode === "table" && (
          <TableView
            rows={sorted}
            highlightId={highlightId}
            selected={selected}
            onToggleSelect={toggleSelect}
            onAccess={handleAccess}
            onReviewLeft={handleReviewLeft}
          />
        )}

      </div>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
// Sharp, utilitarian, editorial — no excessive rounding, no gradient pills

const DL_STYLES = `
/* ── Layout ── */
.dl-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px 80px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  font-family: 'DM Sans', 'Geist', ui-sans-serif, system-ui, sans-serif;
}

/* ── Header ── */
.dl-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.dl-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}
.dl-header-icon {
  width: 36px; height: 36px;
  background: var(--color-text-primary);
  color: var(--color-bg);
  display: flex; align-items: center; justify-content: center;
  border-radius: 4px;
  flex-shrink: 0;
}
.dl-title {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.4px;
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.2;
}
.dl-subtitle {
  font-size: 12px;
  color: var(--color-text-muted);
  margin: 2px 0 0;
}
.dl-header-controls {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}
.dl-controls-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

/* ── Stats ── */
.dl-stats {
  display: flex;
  align-items: center;
  gap: 12px;
}
.dl-stat { display: flex; flex-direction: column; align-items: flex-end; }
.dl-stat-val { font-size: 18px; font-weight: 800; line-height: 1; letter-spacing: -0.5px; color: var(--color-text-primary); }
.dl-stat-lbl { font-size: 10px; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.dl-stat-div { width: 1px; height: 28px; background: var(--color-border); }

/* ── Notices ── */
.dl-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-left: 3px solid;
  font-size: 12px;
  border-radius: 0;
}
.dl-notice--danger { border-color: var(--color-danger); background: rgba(229,72,77,0.05); color: var(--color-danger); }
.dl-notice--warn   { border-color: var(--color-warning); background: rgba(240,180,41,0.05); color: var(--color-text-secondary); }
.dl-notice-action  { margin-left: auto; font-size: 11px; font-weight: 700; text-decoration: underline; background: none; border: none; cursor: pointer; color: inherit; }
.dl-notice-close   { margin-left: auto; background: none; border: none; cursor: pointer; color: var(--color-text-muted); display: flex; align-items: center; }

/* ── Sections ── */
.dl-section { display: flex; flex-direction: column; gap: 8px; }
.dl-section-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  gap: 5px;
}

/* ── Recent shelf ── */
.dl-shelf {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}
.dl-shelf::-webkit-scrollbar { display: none; }
.dl-shelf-item {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  min-width: 200px;
  max-width: 240px;
  transition: border-color 0.15s;
}
.dl-shelf-item:hover { border-color: var(--color-text-muted); }
.dl-shelf-thumb {
  width: 34px; height: 34px;
  border: 1px solid var(--color-border);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--color-surface-secondary);
}
.dl-shelf-thumb img { width: 100%; height: 100%; object-fit: cover; }
.dl-shelf-meta { flex: 1; min-width: 0; }
.dl-shelf-name { font-size: 12px; font-weight: 600; color: var(--color-text-primary); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dl-shelf-sub  { font-size: 10px; color: var(--color-text-muted); }
.dl-shelf-btn  { width: 28px; height: 28px; border: 1px solid var(--color-border); background: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: opacity 0.15s; }
.dl-shelf-btn:hover { opacity: 0.7; }

/* ── Progress ── */
.dl-progress-row { display: flex; align-items: center; gap: 6px; margin-top: 3px; }
.dl-progress-bar { flex: 1; height: 3px; background: var(--color-border); overflow: hidden; }
.dl-progress-fill { height: 100%; transition: width 0.3s; }
.dl-progress-row span { font-size: 10px; color: var(--color-text-muted); }

/* ── Filters ── */
.dl-filters {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.dl-filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.12s;
  border-radius: 2px;
}
.dl-filter-btn:hover { border-color: var(--color-text-muted); color: var(--color-text-primary); }
.dl-filter-btn--active {
  background: var(--color-text-primary);
  border-color: var(--color-text-primary);
  color: var(--color-bg);
}
.dl-filter-count {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  background: rgba(128,128,128,0.15);
  border-radius: 2px;
}
.dl-filter-btn--active .dl-filter-count { background: rgba(255,255,255,0.2); }

/* ── Sort bar ── */
.dl-sort-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.dl-sort-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); }
.dl-sort-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  font-size: 11px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.12s;
}
.dl-sort-btn:hover { color: var(--color-text-primary); border-color: var(--color-border); }
.dl-sort-btn--active { color: var(--color-text-primary); border-color: var(--color-border); font-weight: 600; }

/* ── Grid ── */
.dl-grid {
  display: grid;
  gap: 1px;
  background: var(--color-border);
}
.dl-grid--comfortable { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
.dl-grid--compact     { grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); }

/* ── Card ── */
.dl-card {
  position: relative;
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  transition: transform 0.15s;
  animation: dl-fadein 0.25s ease both;
}
@keyframes dl-fadein { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.dl-card:hover { z-index: 1; }
.dl-card--expired  { opacity: 0.55; filter: grayscale(0.4); }
.dl-card--highlight { outline: 2px solid var(--color-success); outline-offset: -2px; }
.dl-card--selected  { outline: 2px solid var(--color-accent);  outline-offset: -2px; }

.dl-card-check {
  position: absolute;
  top: 8px; right: 8px;
  z-index: 10;
  width: 22px; height: 22px;
  border: 1px solid rgba(255,255,255,0.5);
  background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  border-radius: 3px;
  opacity: 0;
  transition: opacity 0.15s;
}
.dl-card:hover .dl-card-check,
.dl-card--selected .dl-card-check { opacity: 1; }

.dl-card-order-badge {
  position: absolute;
  top: 8px; left: 8px;
  z-index: 10;
  display: flex; align-items: center; gap: 3px;
  padding: 2px 6px;
  font-size: 9px;
  font-weight: 700;
  background: rgba(0,0,0,0.55);
  color: rgba(255,255,255,0.9);
  border: 1px solid rgba(255,255,255,0.2);
  text-decoration: none;
  opacity: 0;
  transition: opacity 0.15s;
}
.dl-card:hover .dl-card-order-badge { opacity: 1; }

.dl-card-thumb {
  position: relative;
  aspect-ratio: 16/10;
  background: var(--color-surface-secondary);
  overflow: hidden;
}
.dl-card-thumb--compact { aspect-ratio: 4/3; }
.dl-card-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
.dl-card:hover .dl-card-img { transform: scale(1.03); }
.dl-card-thumb-placeholder {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  background: var(--color-surface-secondary);
}

.dl-card-badges {
  position: absolute;
  top: 8px; left: 8px;
  display: flex; gap: 4px; flex-wrap: wrap;
  max-width: calc(100% - 44px);
}
.dl-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border: 1px solid;
  background: rgba(0,0,0,0.45);
  backdrop-filter: blur(4px);
  border-radius: 2px;
}
.dl-badge--ok     { color: var(--color-success); border-color: var(--color-success); }
.dl-badge--warn   { color: var(--color-warning); border-color: var(--color-warning); }
.dl-badge--danger { color: var(--color-danger);  border-color: var(--color-danger);  }

.dl-card-progress {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  padding: 6px 8px;
  background: linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%);
  display: flex; align-items: center; gap: 6px;
}
.dl-card-progress > .dl-progress-bar { flex: 1; background: rgba(255,255,255,0.2); }
.dl-card-progress span { font-size: 10px; color: rgba(255,255,255,0.9); font-weight: 700; }

.dl-card-hover {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.55);
  display: flex; align-items: center; justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}
.dl-card:hover .dl-card-hover { opacity: 1; }
.dl-card-hover-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  font-size: 11px;
  font-weight: 700;
  color: white;
  border: 1px solid rgba(255,255,255,0.4);
  background: rgba(255,255,255,0.12);
  cursor: pointer;
  text-decoration: none;
  transition: background 0.15s;
}
.dl-card-hover-btn:hover { background: rgba(255,255,255,0.22); }

/* Card body */
.dl-card-body { padding: 12px; display: flex; flex-direction: column; gap: 4px; flex: 1; }
.dl-card-stripe { width: 24px; height: 2px; margin-bottom: 6px; }
.dl-card-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}
.dl-card-variant { font-size: 10px; color: var(--color-text-muted); }
.dl-card-vendor  { display: flex; align-items: center; gap: 5px; font-size: 10px; color: var(--color-text-muted); }
.dl-card-vendor img { width: 13px; height: 13px; object-fit: cover; }
.dl-card-meta-row { display: flex; justify-content: space-between; font-size: 10px; color: var(--color-text-muted); margin-top: 2px; }
.dl-card-tags { display: flex; gap: 3px; flex-wrap: wrap; margin-top: 2px; }
.dl-tag {
  display: inline-flex; align-items: center; gap: 2px;
  padding: 1px 5px;
  font-size: 9px;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  border-radius: 2px;
}
.dl-card-expiry  { font-size: 10px; display: flex; align-items: center; gap: 3px; }
.dl-card-lifetime { font-size: 10px; color: var(--color-text-muted); }
.dl-card-revoke  { font-size: 10px; color: var(--color-danger); display: flex; align-items: center; gap: 3px; }
.dl-card-file-meta { display: flex; gap: 10px; font-size: 10px; color: var(--color-text-muted); }
.dl-card-file-meta span { display: flex; align-items: center; gap: 3px; }
.dl-card-stars-row { margin-top: 2px; }
.dl-card-actions { display: flex; gap: 4px; margin-top: 8px; }
.dl-card-order-link { font-size: 10px; color: var(--color-text-muted); display: flex; align-items: center; gap: 3px; text-decoration: none; margin-top: 4px; }
.dl-card-order-link:hover { text-decoration: underline; }

/* ── Stars ── */
.dl-stars { display: flex; align-items: center; gap: 2px; }
.dl-star  { background: none; border: none; padding: 0; cursor: pointer; display: flex; align-items: center; transition: transform 0.1s; }
.dl-star:not(:disabled):hover { transform: scale(1.2); }
.dl-star:disabled { cursor: default; }

/* ── Buttons ── */
.dl-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
  cursor: pointer;
  text-decoration: none;
  transition: opacity 0.15s, border-color 0.15s;
  border-radius: 2px;
  padding: 0 14px;
  height: 32px;
  white-space: nowrap;
}
.dl-btn:hover { opacity: 0.8; }
.dl-btn--primary { background: var(--color-text-primary); color: var(--color-bg); border-color: var(--color-text-primary); }
.dl-btn--ghost   { background: transparent; }
.dl-btn--icon    { padding: 0; width: 32px; }
.dl-btn--sm      { height: 28px; font-size: 11px; padding: 0 10px; }
.dl-btn--sm.dl-btn--icon { width: 28px; padding: 0; }
.dl-btn--disabled { opacity: 0.4; cursor: not-allowed; }
.dl-btn--active-danger { border-color: var(--color-danger); color: var(--color-danger); background: rgba(229,72,77,0.06); }
.dl-btn-label { display: none; }
@media (min-width: 768px) { .dl-btn-label { display: inline; } }

/* ── Toggle groups ── */
.dl-toggle-group { display: flex; border: 1px solid var(--color-border); }
.dl-toggle-btn {
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.12s;
}
.dl-toggle-btn--active {
  background: var(--color-text-primary);
  color: var(--color-bg);
}

/* ── Search ── */
.dl-search-wrap { position: relative; }
.dl-search-icon { position: absolute; left: 9px; top: 50%; transform: translateY(-50%); color: var(--color-text-muted); pointer-events: none; }
.dl-search {
  height: 30px;
  padding: 0 28px 0 30px;
  font-size: 12px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
  border-radius: 2px;
  width: 180px;
  transition: width 0.2s, border-color 0.15s;
  outline: none;
}
.dl-search:focus { width: 240px; border-color: var(--color-text-muted); }
.dl-search-clear { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--color-text-muted); display: flex; align-items: center; }
.dl-search-kbd {
  position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
  font-size: 9px; padding: 1px 4px;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  background: var(--color-surface-secondary);
  pointer-events: none;
  border-radius: 2px;
}

/* ── Table ── */
.dl-table-wrap {
  border: 1px solid var(--color-border);
  overflow: hidden;
}
.dl-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.dl-table-head { background: var(--color-surface-secondary); }
.dl-th { padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); border-bottom: 1px solid var(--color-border); white-space: nowrap; }
.dl-th--check  { width: 36px; padding-left: 12px; }
.dl-th--thumb  { width: 44px; }
.dl-th--right  { text-align: right; padding-right: 12px; }
.dl-th-btn     { display: inline-flex; align-items: center; gap: 4px; background: none; border: none; cursor: pointer; color: inherit; font: inherit; text-transform: inherit; letter-spacing: inherit; }
.dl-th-btn:hover { color: var(--color-text-primary); }

@media (max-width: 640px)  { .dl-th--hide-sm, .dl-td--hide-sm  { display: none; } }
@media (max-width: 768px)  { .dl-th--hide-md, .dl-td--hide-md  { display: none; } }
@media (max-width: 1024px) { .dl-th--hide-lg, .dl-td--hide-lg  { display: none; } }
@media (max-width: 1280px) { .dl-th--hide-xl, .dl-td--hide-xl  { display: none; } }

.dl-tr { background: var(--color-surface); transition: background 0.1s; }
.dl-tr--border { border-bottom: 1px solid var(--color-border); }
.dl-tr--expired   { opacity: 0.55; }
.dl-tr--highlight { background: rgba(48,164,108,0.04); }

.dl-td          { padding: 10px 10px; vertical-align: middle; }
.dl-td--check   { width: 36px; padding-left: 12px; }
.dl-td--thumb   { width: 44px; }
.dl-td--name    { max-width: 200px; }
.dl-td--muted   { color: var(--color-text-muted); }
.dl-td--right   { text-align: right; padding-right: 12px; }

.dl-check {
  width: 18px; height: 18px;
  border: 1px solid var(--color-border);
  background: transparent;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.12s;
}
.dl-check:hover { border-color: var(--color-text-muted); }

.dl-row-thumb {
  width: 34px; height: 34px;
  border: 1px solid var(--color-border);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
  background: var(--color-surface-secondary);
}
.dl-row-thumb img { width: 100%; height: 100%; object-fit: cover; }

.dl-row-name-group { display: flex; flex-direction: column; gap: 2px; }
.dl-row-name-line  { display: flex; align-items: center; gap: 6px; }
.dl-row-dot        { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.dl-row-name       { font-weight: 600; color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }
.dl-row-variant    { font-size: 10px; padding: 1px 5px; background: var(--color-surface-secondary); color: var(--color-text-muted); border-radius: 2px; flex-shrink: 0; }
.dl-row-vendor     { display: flex; align-items: center; gap: 4px; font-size: 10px; color: var(--color-text-muted); }
.dl-row-vendor img { width: 12px; height: 12px; object-fit: cover; }
.dl-row-progress   { display: flex; align-items: center; gap: 6px; }
.dl-row-progress span { font-size: 10px; color: var(--color-text-muted); }

.dl-type-pill {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 7px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border: 1px solid;
  border-radius: 2px;
  white-space: nowrap;
}

.dl-status {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.dl-status--ok     { color: var(--color-success); }
.dl-status--warn   { color: var(--color-warning); }
.dl-status--danger { color: var(--color-danger);  }

.dl-row-actions { display: flex; align-items: center; justify-content: flex-end; gap: 4px; }

.dl-table-footer {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 12px;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-secondary);
  font-size: 10px;
  color: var(--color-text-muted);
}

/* ── Bulk bar ── */
.dl-bulk-bar {
  position: fixed;
  bottom: 24px; left: 50%; transform: translateX(-50%);
  z-index: 50;
  display: flex; align-items: center; gap: 10px;
  padding: 10px 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
  white-space: nowrap;
}
.dl-bulk-count   { font-size: 13px; font-weight: 700; color: var(--color-text-primary); }
.dl-bulk-divider { width: 1px; height: 16px; background: var(--color-border); }
.dl-bulk-link    { font-size: 11px; font-weight: 600; color: var(--color-accent); background: none; border: none; cursor: pointer; text-decoration: underline; }
.dl-bulk-close   { background: none; border: none; cursor: pointer; color: var(--color-text-muted); display: flex; align-items: center; margin-left: 4px; }

/* ── Empty ── */
.dl-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 60px 20px;
  border: 1px dashed var(--color-border);
  text-align: center;
}
.dl-empty-title { font-size: 15px; font-weight: 700; color: var(--color-text-primary); margin: 0 0 6px; }
.dl-empty-sub   { font-size: 12px; color: var(--color-text-muted); max-width: 280px; }

/* ── Misc ── */
.dl-results-label { font-size: 11px; color: var(--color-text-muted); }
.dl-results-label strong { color: var(--color-text-primary); }
.dl-load-more { display: flex; align-items: center; gap: 12px; justify-content: center; padding-top: 8px; }
.dl-kb-hint   { font-size: 10px; color: var(--color-text-muted); text-align: center; }
.dl-skeleton  { border-radius: 2px; background: var(--color-surface-secondary); animation: dl-pulse 1.4s ease-in-out infinite; }
@keyframes dl-pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
.dl-header--loading { animation: dl-pulse 1.4s ease-in-out infinite; }
`;