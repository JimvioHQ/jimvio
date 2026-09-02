"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
   Search, Package, Truck, CheckCircle, XCircle,
   Clock, MessageSquare, Download, ShoppingBag, ArrowLeft,
   MoreVertical, Loader2, ChevronRight, AlertCircle, Star,
   RefreshCcw, RotateCcw, MapPin, ExternalLink, Filter,
   ChevronUp, ChevronDown, ArrowUpDown, SlidersHorizontal,
   AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
   DropdownMenu, DropdownMenuContent, DropdownMenuItem,
   DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrency } from "@/context/CurrencyContext";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { updateOrderStatus } from "@/lib/actions/marketplace";
import { toast } from "sonner";
import { Th, StatusPill, EmptyState, RowArrow } from "@/components/ui/admin";
import { DashboardFilterChip } from "@/components/dashboard/dashboard-filter-chip";
import { Input } from "@/components/ui/input";

/* ── Full status config covering every enum value ───────────────────────── */
const STATUS_CFG: Record<string, {
   label: string;
   icon: React.ElementType;
   pill: string;
   dot: string;
   bucket: "active" | "completed" | "cancelled" | "refunded" | "other";
}> = {
   pending: { label: "Pending", icon: Clock, pill: "bg-amber-500/10 text-amber-600 dark:text-amber-400", dot: "bg-amber-400", bucket: "active" },
   confirmed: { label: "Confirmed", icon: CheckCircle, pill: "bg-sky-500/10 text-sky-600 dark:text-sky-400", dot: "bg-sky-400", bucket: "active" },
   processing: { label: "Processing", icon: Package, pill: "bg-violet-500/10 text-violet-600 dark:text-violet-400", dot: "bg-violet-400", bucket: "active" },
   shipped: { label: "Shipped", icon: Truck, pill: "bg-blue-500/10 text-blue-600 dark:text-blue-400", dot: "bg-blue-400", bucket: "active" },
   delivered: { label: "Delivered", icon: CheckCircle, pill: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-400", bucket: "completed" },
   completed: { label: "Completed", icon: CheckCircle, pill: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-400", bucket: "completed" },
   cancelled: { label: "Cancelled", icon: XCircle, pill: "bg-rose-500/10 text-rose-600 dark:text-rose-400", dot: "bg-rose-400", bucket: "cancelled" },
   refunded: { label: "Refunded", icon: RefreshCcw, pill: "bg-slate-500/10 text-slate-600 dark:text-slate-400", dot: "bg-slate-400", bucket: "refunded" },
   checkout_direct: { label: "Direct", icon: ExternalLink, pill: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400", dot: "bg-indigo-400", bucket: "other" },
};

const PAYMENT_CFG: Record<string, { label: string; pill: string }> = {
   pending: { label: "Awaiting payment", pill: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
   processing: { label: "Processing", pill: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
   paid: { label: "Paid", pill: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
   completed: { label: "Paid", pill: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
   failed: { label: "Payment failed", pill: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
   refunded: { label: "Refunded", pill: "bg-slate-500/10 text-slate-600 dark:text-slate-400" },
   cancelled: { label: "Cancelled", pill: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
};

const FILTERS = ["All", "Active", "Completed", "Cancelled", "Refunded", "Other"] as const;
type Filter = typeof FILTERS[number];

type SortKey = "date" | "amount" | "status";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 20;

/* ── Skeleton loader ────────────────────────────────────────────────────── */
function SkeletonRow() {
   return (
      <tr className="animate-pulse">
         <td className="px-4 py-3">
            <div className="h-3 w-20 rounded bg-[var(--color-border)] mb-1.5" />
            <div className="h-2.5 w-14 rounded bg-[var(--color-border)]" />
         </td>
         <td className="px-4 py-3">
            <div className="flex items-center gap-2">
               <div className="h-8 w-8 rounded-md bg-[var(--color-border)] shrink-0" />
               <div>
                  <div className="h-3 w-28 rounded bg-[var(--color-border)] mb-1.5" />
                  <div className="h-2.5 w-16 rounded bg-[var(--color-border)]" />
               </div>
            </div>
         </td>
         <td className="px-4 py-3"><div className="h-3 w-20 rounded bg-[var(--color-border)]" /></td>
         <td className="px-4 py-3"><div className="h-6 w-20 rounded-md bg-[var(--color-border)]" /></td>
         <td className="px-4 py-3"><div className="h-6 w-16 rounded-md bg-[var(--color-border)]" /></td>
         <td className="px-4 py-3 text-right"><div className="h-4 w-16 rounded bg-[var(--color-border)] ml-auto" /></td>
         <td className="px-4 py-3"><div className="h-8 w-20 rounded-md bg-[var(--color-border)] ml-auto" /></td>
      </tr>
   );
}

function SkeletonCard() {
   return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden animate-pulse">
         <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
            <div>
               <div className="h-2.5 w-20 rounded bg-[var(--color-border)] mb-1.5" />
               <div className="h-3.5 w-24 rounded bg-[var(--color-border)]" />
            </div>
            <div className="h-5 w-16 rounded bg-[var(--color-border)]" />
         </div>
         <div className="px-4 py-3 space-y-3">
            <div className="flex items-center gap-2">
               <div className="h-9 w-9 rounded-md bg-[var(--color-border)] shrink-0" />
               <div className="flex-1">
                  <div className="h-3.5 w-36 rounded bg-[var(--color-border)] mb-1.5" />
                  <div className="h-2.5 w-24 rounded bg-[var(--color-border)]" />
               </div>
            </div>
            <div className="flex gap-1.5">
               <div className="h-6 w-20 rounded-md bg-[var(--color-border)]" />
               <div className="h-6 w-16 rounded-md bg-[var(--color-border)]" />
            </div>
            <div className="h-9 w-full rounded-md bg-[var(--color-border)]" />
         </div>
      </div>
   );
}

/* ── Confirm cancel dialog ──────────────────────────────────────────────── */
function CancelDialog({ order, onConfirm, onClose, cancelling }: {
   order: any; onConfirm: () => void; onClose: () => void; cancelling: boolean;
}) {
   const isPaid = order?.payment_status === "paid" || order?.payment_status === "completed";
   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
         <div className="w-full max-w-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="h-10 w-10 rounded-full bg-rose-500/10 flex items-center justify-center mb-4">
               <AlertCircle className="h-5 w-5 text-rose-500" />
            </div>
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-1">Cancel this order?</h3>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mb-5">
               This cannot be undone. {isPaid
                  ? "Your refund will be processed within 3–5 business days."
                  : "No payment has been captured yet, so nothing will be refunded."}
            </p>
            <div className="flex gap-2">
               <button
                  onClick={onClose}
                  disabled={cancelling}
                  className="flex-1 h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-xs font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] transition-all disabled:opacity-50"
               >
                  Keep Order
               </button>
               <button
                  onClick={onConfirm}
                  disabled={cancelling}
                  className="flex-1 h-9 rounded-lg bg-rose-500 text-xs font-semibold text-white hover:bg-rose-600 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
               >
                  {cancelling && <Loader2 className="h-3 w-3 animate-spin" />}
                  {cancelling ? "Cancelling…" : "Yes, Cancel"}
               </button>
            </div>
         </div>
      </div>
   );
}

/* ── Multi-currency breakdown tooltip ──────────────────────────────────── */
function SpendBreakdown({ spendByCurrency, formatMoney }: {
   spendByCurrency: [string, number][]; formatMoney: (v: number, c: string) => string;
}) {
   const [open, setOpen] = useState(false);
   if (spendByCurrency.length <= 1) return null;
   return (
      <div className="relative inline-block">
         <button
            onClick={() => setOpen(o => !o)}
            className="text-[10px] font-semibold text-orange-500 hover:text-orange-600 underline underline-offset-2 ml-1"
         >
            +{spendByCurrency.length - 1} more
         </button>
         {open && (
            <>
               <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
               <div className="absolute left-0 top-5 z-20 w-48 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg p-2 space-y-1">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] px-2 pb-1">Spend by currency</p>
                  {spendByCurrency.map(([cur, amt]) => (
                     <div key={cur} className="flex items-center justify-between px-2 py-1 rounded-md hover:bg-[var(--color-surface-secondary)]">
                        <span className="text-[10px] font-semibold text-[var(--color-text-muted)]">{cur}</span>
                        <span className="text-xs font-bold text-[var(--color-text-primary)] tabular-nums">{formatMoney(amt, cur)}</span>
                     </div>
                  ))}
               </div>
            </>
         )}
      </div>
   );
}

/* ── Vendor list ────────────────────────────────────────────────────────── */
function VendorList({ items, compact = false }: { items: any[]; compact?: boolean }) {
   const vendors = useMemo(() => {
      const map = new Map<string, { name: string; id: string }>();
      for (const item of items) {
         const v = item.vendors;
         if (v?.id && !map.has(v.id)) map.set(v.id, { id: v.id, name: v.business_name ?? "Unknown" });
      }
      return Array.from(map.values());
   }, [items]);

   if (vendors.length === 0) return <span className="text-[var(--color-text-muted)]">—</span>;
   if (compact) {
      return (
         <span className="truncate" title={vendors.map(v => v.name).join(", ")}>
            {vendors[0].name}
            {vendors.length > 1 && <span className="text-[var(--color-text-muted)]"> +{vendors.length - 1}</span>}
         </span>
      );
   }
   return (
      <div className="flex flex-wrap gap-1">
         {vendors.map(v => <span key={v.id}>{v.name}</span>)}
      </div>
   );
}

/* ── Sort header (table) ────────────────────────────────────────────────── */
function SortHeader({ label, sortKey, currentKey, currentDir, onSort, align = "left" }: {
   label: string; sortKey: SortKey; currentKey: SortKey; currentDir: SortDir;
   onSort: (k: SortKey) => void; align?: "left" | "right";
}) {
   const active = currentKey === sortKey;
   return (
      <Th align={align}>
         <button
            type="button"
            onClick={() => onSort(sortKey)}
            className={cn(
               "inline-flex items-center gap-1 transition-colors hover:text-[var(--color-text-primary)]",
               active && "text-[var(--color-text-primary)]",
            )}
         >
            {label}
            {active
               ? (currentDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)
               : <ArrowUpDown className="h-3 w-3 opacity-30" />
            }
         </button>
      </Th>
   );
}

/* ── Mobile sort bar ────────────────────────────────────────────────────── */
function MobileSortBar({ sortKey, sortDir, onSort }: {
   sortKey: SortKey; sortDir: SortDir; onSort: (k: SortKey) => void;
}) {
   const options: { key: SortKey; label: string }[] = [
      { key: "date", label: "Date" },
      { key: "amount", label: "Amount" },
      { key: "status", label: "Status" },
   ];
   return (
      <div className="flex items-center gap-2 lg:hidden">
         <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--color-text-muted)] shrink-0" />
         <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {options.map(o => {
               const active = sortKey === o.key;
               return (
                  <button
                     key={o.key}
                     onClick={() => onSort(o.key)}
                     className={cn(
                        "h-7 px-3 rounded-lg text-[10px] font-semibold border whitespace-nowrap shrink-0 flex items-center gap-1 transition-all",
                        active
                           ? "bg-[var(--color-text-primary)] text-[var(--color-bg)] border-transparent"
                           : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)]"
                     )}
                  >
                     {o.label}
                     {active && (sortDir === "asc"
                        ? <ChevronUp className="h-3 w-3" />
                        : <ChevronDown className="h-3 w-3" />
                     )}
                  </button>
               );
            })}
         </div>
      </div>
   );
}

/* ── Row actions ────────────────────────────────────────────────────────── */
function OrderActions({ order, onCancel, onReorder }: {
   order: any; onCancel: (id: string) => void; onReorder: (order: any) => void;
}) {
   const isPending = order.status === "pending";
   const isDelivered = order.status === "delivered" || order.status === "completed";
   const vendors = useMemo(() => {
      const map = new Map<string, string>();
      for (const item of order.order_items ?? []) {
         if (item.vendors?.id) map.set(item.vendors.id, item.vendors.business_name ?? "Vendor");
      }
      return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
   }, [order.order_items]);

   return (
      <DropdownMenu>
         <DropdownMenuTrigger asChild>
            <button className="h-8 w-8 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] flex items-center justify-center transition-all">
               <MoreVertical className="h-3.5 w-3.5" />
            </button>
         </DropdownMenuTrigger>
         <DropdownMenuContent align="end" className="w-52 rounded-md p-1.5 border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
            <DropdownMenuItem asChild className="rounded-lg cursor-pointer px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] focus:bg-[var(--color-surface-secondary)]">
               <Link href={`/orders/${order.id}`} className="flex items-center gap-2.5">
                  <Package className="h-3.5 w-3.5 text-[var(--color-text-muted)]" /> View Details
               </Link>
            </DropdownMenuItem>

            {/* ── Shipping address (if present) ── */}
            {order.shipping_address?.city && (
               <DropdownMenuItem asChild className="rounded-lg cursor-pointer px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] focus:bg-[var(--color-surface-secondary)]">
                  <Link href={`/orders/${order.id}#shipping`} className="flex items-center gap-2.5">
                     <MapPin className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                     {order.shipping_address.city}, {order.shipping_address.country ?? ""}
                  </Link>
               </DropdownMenuItem>
            )}

            {vendors.length === 1 ? (
               <DropdownMenuItem asChild className="rounded-lg cursor-pointer px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] focus:bg-[var(--color-surface-secondary)]">
                  <Link href={`/messages?vendor=${vendors[0].id}`} className="flex items-center gap-2.5">
                     <MessageSquare className="h-3.5 w-3.5 text-[var(--color-text-muted)]" /> Message Vendor
                  </Link>
               </DropdownMenuItem>
            ) : vendors.length > 1 && (
               <>
                  <div className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Message vendor</div>
                  {vendors.map(v => (
                     <DropdownMenuItem key={v.id} asChild className="rounded-lg cursor-pointer px-3 py-2 text-xs font-medium text-[var(--color-text-primary)] focus:bg-[var(--color-surface-secondary)]">
                        <Link href={`/messages?vendor=${v.id}`} className="flex items-center gap-2.5">
                           <MessageSquare className="h-3.5 w-3.5 text-[var(--color-text-muted)]" /> {v.name}
                        </Link>
                     </DropdownMenuItem>
                  ))}
               </>
            )}

            <DropdownMenuItem asChild className="rounded-lg cursor-pointer px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] focus:bg-[var(--color-surface-secondary)]">
               <a href={`/api/orders/${order.id}/invoice`} target="_blank" rel="noopener" className="flex items-center gap-2.5">
                  <Download className="h-3.5 w-3.5 text-[var(--color-text-muted)]" /> Download PDF
               </a>
            </DropdownMenuItem>

            <DropdownMenuItem
               onClick={() => onReorder(order)}
               className="rounded-lg cursor-pointer px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] focus:bg-[var(--color-surface-secondary)] flex items-center gap-2.5"
            >
               <RotateCcw className="h-3.5 w-3.5 text-[var(--color-text-muted)]" /> Reorder
            </DropdownMenuItem>

            {isDelivered && (
               <DropdownMenuItem asChild className="rounded-lg cursor-pointer px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] focus:bg-[var(--color-surface-secondary)]">
                  <Link href={`/orders/${order.id}#review`} className="flex items-center gap-2.5">
                     <Star className="h-3.5 w-3.5 text-amber-400" /> Leave a Review
                  </Link>
               </DropdownMenuItem>
            )}

            {isPending && (
               <>
                  <DropdownMenuSeparator className="bg-[var(--color-border)] my-1" />
                  <DropdownMenuItem
                     onClick={() => onCancel(order.id)}
                     className="rounded-lg cursor-pointer px-3 py-2 text-xs font-semibold text-rose-500 focus:bg-rose-500/10 focus:text-rose-600 flex items-center gap-2.5"
                  >
                     <XCircle className="h-3.5 w-3.5" /> Cancel Order
                  </DropdownMenuItem>
               </>
            )}
         </DropdownMenuContent>
      </DropdownMenu>
   );
}

/* ── Error banner ───────────────────────────────────────────────────────── */
function ErrorBanner({ onRetry }: { onRetry: () => void }) {
   return (
      <div className="rounded-md border border-rose-500/20 bg-rose-500/5 p-4 flex items-center gap-3">
         <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
         <p className="text-sm text-rose-600 dark:text-rose-400 flex-1">Failed to load orders. Please try again.</p>
         <button
            onClick={onRetry}
            className="h-7 px-3 rounded-md text-xs font-semibold bg-rose-500 text-white hover:bg-rose-600 transition-colors"
         >
            Retry
         </button>
      </div>
   );
}

/* ── Reorder confirmation modal ─────────────────────────────────────────── */
function ReorderDialog({ order, onConfirm, onClose, loading }: {
   order: any; onConfirm: () => void; onClose: () => void; loading: boolean;
}) {
   const itemCount = order.order_items?.length ?? 0;
   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
         <div className="w-full max-w-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
               <RotateCcw className="h-5 w-5 text-orange-500" />
            </div>
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-1">Reorder this?</h3>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mb-2">
               {itemCount} item{itemCount !== 1 ? "s" : ""} will be added to a new cart at current prices.
               Prices and availability may have changed since you placed this order.
            </p>
            {/* Show items list */}
            <ul className="mb-5 space-y-1 max-h-32 overflow-y-auto">
               {order.order_items?.map((item: any) => (
                  <li key={item.id} className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                     <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-border)] shrink-0" />
                     <span className="truncate">{item.product_name}</span>
                     <span className="ml-auto text-[var(--color-text-muted)] tabular-nums shrink-0">×{item.quantity}</span>
                  </li>
               ))}
            </ul>
            <div className="flex gap-2">
               <button
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-xs font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] transition-all disabled:opacity-50"
               >
                  Cancel
               </button>
               <button
                  onClick={onConfirm}
                  disabled={loading}
                  className="flex-1 h-9 rounded-lg bg-orange-500 text-xs font-semibold text-white hover:bg-orange-600 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
               >
                  {loading && <Loader2 className="h-3 w-3 animate-spin" />}
                  {loading ? "Adding…" : "Add to Cart"}
               </button>
            </div>
         </div>
      </div>
   );
}

/* ── Shipping address pill (inline) ─────────────────────────────────────── */
function ShippingBadge({ address }: { address: any }) {
   if (!address?.city) return null;
   const parts = [address.city, address.country].filter(Boolean).join(", ");
   return (
      <span className="inline-flex items-center gap-1 text-[9px] font-medium text-[var(--color-text-muted)] mt-0.5">
         <MapPin className="h-2.5 w-2.5" />{parts}
      </span>
   );
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export default function BuyerOrdersPage() {
   const { formatMoney } = useCurrency();
   const router = useRouter();

   const [orders, setOrders] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [fetchError, setFetchError] = useState(false);
   const [search, setSearch] = useState("");
   const [filter, setFilter] = useState<Filter>("All");
   const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
   const [cancelling, setCancelling] = useState(false);
   const [reorderTarget, setReorderTarget] = useState<any | null>(null);
   const [reordering, setReordering] = useState(false);
   const [sortKey, setSortKey] = useState<SortKey>("date");
   const [sortDir, setSortDir] = useState<SortDir>("desc");
   const [page, setPage] = useState(1);

   const channelRef = useRef<any>(null);
   const userIdRef = useRef<string | null>(null);
   // Guard against realtime firing during optimistic update
   const optimisticUpdateRef = useRef(false);

   /* ── Fetch ── */
   const fetchOrders = useCallback(async (userId: string) => {
      if (optimisticUpdateRef.current) return;
      const supabase = createClient();
      const { data, error } = await supabase
         .from("orders")
         .select(`
            id, order_number, status, payment_status, total_amount, currency,
            created_at, paid_at, shipped_at, delivered_at, cancelled_at,
            shipping_address, tracking_number, tracking_status,
            order_items (
               id, product_id, variant_id, product_name, quantity, unit_price, total_price,
               vendor_id, product_type, digital_download_url,
               vendors ( id, business_name, business_slug )
            )
         `)
         .eq("buyer_id", userId)
         .order("created_at", { ascending: false })
         .limit(200);

      if (error) {
         setFetchError(true);
         setLoading(false);
         return;
      }
      setFetchError(false);
      setOrders((data ?? []).map((o: any) => ({ ...o, order_items: o.order_items ?? [] })));
      setLoading(false);
   }, []);

   /* ── Init + realtime ── */
   useEffect(() => {
      const supabase = createClient();
      let cancelled = false;

      async function init() {
         const { data: { user } } = await supabase.auth.getUser();
         if (!user) { router.push("/login?next=/orders"); return; }
         userIdRef.current = user.id;

         await fetchOrders(user.id);

         if (channelRef.current) {
            await supabase.removeChannel(channelRef.current);
            channelRef.current = null;
         }
         if (cancelled) return;

         channelRef.current = supabase
            .channel(`buyer-orders-${user.id}`)
            .on(
               "postgres_changes",
               { event: "*", schema: "public", table: "orders", filter: `buyer_id=eq.${user.id}` },
               () => {
                  if (!optimisticUpdateRef.current) fetchOrders(user.id);
               }
            )
            .subscribe();
      }

      init();
      return () => {
         cancelled = true;
         if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
         }
      };
   }, [router, fetchOrders]);

   /* ── Aggregates ── */
   const spendByCurrency = useMemo(() => {
      const m = new Map<string, number>();
      for (const o of orders) {
         const cur = o.currency ?? "USD";
         m.set(cur, (m.get(cur) ?? 0) + Number(o.total_amount || 0));
      }
      return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
   }, [orders]);

   const dominantCurrency = spendByCurrency[0];
   const activeOrders = orders.filter(o => STATUS_CFG[o.status]?.bucket === "active").length;
   const completedOrders = orders.filter(o => STATUS_CFG[o.status]?.bucket === "completed").length;
   const cancelledOrders = orders.filter(o => STATUS_CFG[o.status]?.bucket === "cancelled").length;
   const refundedOrders = orders.filter(o => STATUS_CFG[o.status]?.bucket === "refunded").length;
   const otherOrders = orders.filter(o => STATUS_CFG[o.status]?.bucket === "other").length;

   /* ── Filter + search + sort ── */
   const filtered = useMemo(() => {
      const q = search.toLowerCase().trim();
      const list = orders.filter(o => {
         const matchSearch = !q
            || (o.order_number as string)?.toLowerCase().includes(q)
            || (o.order_items as any[]).some((i: any) => (i.product_name ?? "").toLowerCase().includes(q))
            || (o.order_items as any[]).some((i: any) => (i.vendors?.business_name ?? "").toLowerCase().includes(q));

         const bucket = STATUS_CFG[o.status]?.bucket;
         const matchFilter =
            filter === "All" ? true :
               filter === "Active" ? bucket === "active" :
                  filter === "Completed" ? bucket === "completed" :
                     filter === "Cancelled" ? bucket === "cancelled" :
                        filter === "Refunded" ? bucket === "refunded" :
                           filter === "Other" ? bucket === "other" : true;

         return matchSearch && matchFilter;
      });

      list.sort((a, b) => {
         const dir = sortDir === "asc" ? 1 : -1;
         if (sortKey === "amount") return (Number(a.total_amount) - Number(b.total_amount)) * dir;
         if (sortKey === "status") return (a.status ?? "").localeCompare(b.status ?? "") * dir;
         return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
      });

      return list;
   }, [orders, search, filter, sortKey, sortDir]);

   // Reset page when filters change
   useEffect(() => { setPage(1); }, [search, filter, sortKey, sortDir]);

   const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
   const paginated = filtered.slice(0, page * PAGE_SIZE);
   const hasMore = page * PAGE_SIZE < filtered.length;

   /* ── Handlers ── */
   function handleSort(key: SortKey) {
      if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
      else { setSortKey(key); setSortDir("desc"); }
   }

   async function confirmCancel() {
      if (!cancelTargetId) return;
      setCancelling(true);
      optimisticUpdateRef.current = true;
      const res = await updateOrderStatus(cancelTargetId, "cancelled");
      if (res.success) {
         setOrders(prev => prev.map(o =>
            o.id === cancelTargetId
               ? { ...o, status: "cancelled", cancelled_at: new Date().toISOString() }
               : o
         ));
         toast.success("Order cancelled. If you were charged, a refund will be processed.");
      } else {
         toast.error(res.error || "Failed to cancel order.");
      }
      setCancelTargetId(null);
      setCancelling(false);
      // Re-enable realtime after a brief delay so the DB write settles
      setTimeout(() => { optimisticUpdateRef.current = false; }, 2000);
   }

   async function confirmReorder() {
      if (!reorderTarget) return;
      setReordering(true);
      try {
         // Build cart items from order_items
         const cartItems = reorderTarget.order_items
            .filter((item: any) => item.product_id && item.vendor_id)
            .map((item: any) => ({
               product_id: item.product_id,
               vendor_id: item.vendor_id,
               quantity: item.quantity,
               variant_id: item.variant_id ?? null,
            }));

         if (cartItems.length === 0) {
            throw new Error("No items from this order can be reordered.");
         }

         const res = await fetch("/api/cart/reorder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: cartItems }),
         });

         const text = await res.text();
         let data: { error?: string; added?: number; skipped?: unknown[] };
         try {
            data = JSON.parse(text);
         } catch {
            throw new Error("Could not reorder — please try again.");
         }

         if (!res.ok) throw new Error(data.error || "Failed to reorder");
         const skipped = data.skipped?.length ?? 0;
         toast.success(`Added ${data.added ?? 0} item(s) to cart!`, {
            description: skipped > 0
               ? `${skipped} item(s) were unavailable. Prices reflect current listings.`
               : "Prices reflect current listings.",
            action: { label: "View Cart", onClick: () => router.push("/cart") },
         });
         router.push("/cart");
      } catch {
         toast.error("Couldn't add items to cart. Some products may no longer be available.");
      } finally {
         setReordering(false);
         setReorderTarget(null);
      }
   }

   const cancelTargetOrder = orders.find(o => o.id === cancelTargetId);

   /* ── Empty message ── */
   function emptyMessage() {
      if (search && filter !== "All") return `No ${filter.toLowerCase()} orders matching "${search}"`;
      if (search) return `No orders matching "${search}"`;
      if (filter !== "All") return `No ${filter.toLowerCase()} orders`;
      return "No orders yet";
   }

   /* ── Loading skeleton ── */
   if (loading) return (
      <div className="min-h-screen pb-24" style={{ background: "var(--color-bg)" }}>
         <div className="max-w-full mx-auto px-4 sm:px-6 pt-8 sm:pt-12 space-y-8">
            {/* Header skeleton */}
            <div className="flex items-center gap-4 animate-pulse">
               <div className="h-9 w-9 rounded-xl bg-[var(--color-border)]" />
               <div>
                  <div className="h-5 w-20 rounded bg-[var(--color-border)] mb-1.5" />
                  <div className="h-3 w-24 rounded bg-[var(--color-border)]" />
               </div>
            </div>
            {/* Stats skeleton */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-pulse">
               {[...Array(4)].map((_, i) => (
                  <div key={i} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex items-center gap-4">
                     <div className="h-9 w-9 rounded-xl bg-[var(--color-border)] shrink-0" />
                     <div>
                        <div className="h-5 w-16 rounded bg-[var(--color-border)] mb-1.5" />
                        <div className="h-2.5 w-12 rounded bg-[var(--color-border)]" />
                     </div>
                  </div>
               ))}
            </div>
            {/* Table skeleton — desktop */}
            <div className="hidden lg:block rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
               <table className="w-full">
                  <tbody className="divide-y divide-[var(--color-border)]">
                     {[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}
                  </tbody>
               </table>
            </div>
            {/* Card skeleton — mobile */}
            <div className="lg:hidden space-y-3">
               {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
         </div>
      </div>
   );

   /* ── Page ── */
   return (
      <>
         {cancelTargetOrder && (
            <CancelDialog
               order={cancelTargetOrder}
               onConfirm={confirmCancel}
               onClose={() => setCancelTargetId(null)}
               cancelling={cancelling}
            />
         )}

         {reorderTarget && (
            <ReorderDialog
               order={reorderTarget}
               onConfirm={confirmReorder}
               onClose={() => setReorderTarget(null)}
               loading={reordering}
            />
         )}

         <div className="space-y-8 pb-16">
            <div className="relative overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#111113_0%,#1c1917_55%,#2a1810_100%)] px-5 py-6 text-white shadow-[0_20px_50px_-28px_rgba(0,0,0,0.55)] sm:px-8 sm:py-8">
               <div
                  aria-hidden
                  className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(253,80,0,0.45),transparent_70%)] blur-2xl"
               />
               <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0">
                     <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Jimvio Commerce</p>
                     <h1 className="mt-2 text-[28px] font-semibold tracking-tight sm:text-[34px]">Orders</h1>
                     <p className="mt-1.5 text-[13.5px] text-white/60">
                        {orders.length} order{orders.length !== 1 ? "s" : ""} · track purchases, payments, and delivery
                     </p>
                  </div>
                  <Link
                     href="/marketplace"
                     className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#fd5000] px-4 text-[13px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(253,80,0,0.8)] transition hover:bg-[#e84800]"
                  >
                     <ShoppingBag className="h-4 w-4" />
                     Browse store
                  </Link>
               </div>
            </div>

            {fetchError && (
               <ErrorBanner onRetry={() => {
                  setLoading(true);
                  setFetchError(false);
                  if (userIdRef.current) fetchOrders(userIdRef.current);
               }} />
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
               <div className="col-span-2 sm:col-span-1 relative rounded-2xl bg-[var(--color-surface)] p-4 ring-1 ring-[var(--color-border)] shadow-[0_1px_2px_rgba(16,15,14,0.04)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Total spent</p>
                  <p className="mt-2 text-[22px] font-semibold tracking-tight text-[var(--color-text-primary)]">
                     {dominantCurrency ? formatMoney(dominantCurrency[1], dominantCurrency[0]) : formatMoney(0, "USD")}
                  </p>
                  <p className="mt-1 text-[11.5px] text-[var(--color-text-muted)]">
                     {spendByCurrency.length > 1 ? `${spendByCurrency.length} currencies` : "Across your orders"}
                  </p>
                  {spendByCurrency.length > 1 && (
                     <div className="absolute bottom-3 right-3">
                        <SpendBreakdown spendByCurrency={spendByCurrency} formatMoney={formatMoney} />
                     </div>
                  )}
               </div>
               <div className="rounded-2xl bg-[var(--color-surface)] p-4 ring-1 ring-[var(--color-border)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Active</p>
                  <p className="mt-2 text-[22px] font-semibold text-[var(--color-text-primary)]">{activeOrders}</p>
                  <p className="mt-1 text-[11.5px] text-amber-600">In progress</p>
               </div>
               <div className="rounded-2xl bg-[var(--color-surface)] p-4 ring-1 ring-[var(--color-border)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Completed</p>
                  <p className="mt-2 text-[22px] font-semibold text-[var(--color-text-primary)]">{completedOrders}</p>
                  <p className="mt-1 text-[11.5px] text-emerald-600">Delivered</p>
               </div>
               <div className="rounded-2xl bg-[var(--color-surface)] p-4 ring-1 ring-[var(--color-border)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Cancelled</p>
                  <p className="mt-2 text-[22px] font-semibold text-[var(--color-text-primary)]">{cancelledOrders}</p>
                  <p className="mt-1 text-[11.5px] text-[var(--color-text-muted)]">Stopped</p>
               </div>
               <div className="rounded-2xl bg-[var(--color-surface)] p-4 ring-1 ring-[var(--color-border)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Refunded</p>
                  <p className="mt-2 text-[22px] font-semibold text-[var(--color-text-primary)]">{refundedOrders}</p>
                  <p className="mt-1 text-[11.5px] text-[var(--color-text-muted)]">Returned</p>
               </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
               <div className="relative flex-1">
                  <Input
                     value={search}
                     icon={<Search className="pointer-events-none h-3.5 w-3.5 text-[var(--color-text-muted)]" />}
                     onChange={e => setSearch(e.target.value)}
                     placeholder="Search by order #, product, or vendor…"
                     className="h-11 w-full rounded-xl bg-[var(--color-surface)] pl-9 pr-4 text-[13px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)]"
                  />
                  {search && (
                     <button
                        type="button"
                        onClick={() => setSearch("")}
                        className="absolute right-3 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                     >
                        <XCircle className="h-3 w-3" />
                     </button>
                  )}
               </div>
               <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
                  {FILTERS.map(f => {
                     const count =
                        f === "All" ? orders.length :
                           f === "Active" ? activeOrders :
                              f === "Completed" ? completedOrders :
                                 f === "Cancelled" ? cancelledOrders :
                                    f === "Refunded" ? refundedOrders :
                                       f === "Other" ? otherOrders : 0;
                     if (f === "Other" && otherOrders === 0) return null;
                     return (
                        <DashboardFilterChip
                           key={f}
                           label={f}
                           active={filter === f}
                           count={count}
                           onClick={() => setFilter(f)}
                        />
                     );
                  })}
               </div>
            </div>

            {/* ── Mobile sort bar ── */}
            {filtered.length > 0 && (
               <MobileSortBar sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            )}

            {/* ── Empty state ── */}
            {filtered.length === 0 ? (
               <EmptyState
                  icon={<ShoppingBag className="h-5 w-5 text-[var(--color-text-muted)]" />}
                  title={emptyMessage()}
                  message={
                     search
                        ? "Try a different search term or clear filters."
                        : filter !== "All"
                           ? "No orders in this status bucket."
                           : "Your purchases will appear here after checkout."
                  }
                  action={
                     !search && filter === "All" ? (
                        <Link href="/marketplace" className="inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[12.5px] font-medium text-[var(--color-accent)] hover:underline">
                           Start shopping <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                     ) : undefined
                  }
               />
            ) : (
               <>
                  {/* ── DESKTOP: Table ── */}
                  <div className="hidden lg:block overflow-hidden rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)]">
                     <div className="overflow-x-auto">
                        <table className="w-full text-[12.5px]">
                           <thead className="bg-[var(--color-surface-secondary)]/50">
                              <tr>
                                 <SortHeader label="Order" sortKey="date" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                                 <Th>Items</Th>
                                 <Th>Vendor</Th>
                                 <SortHeader label="Status" sortKey="status" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                                 <Th>Payment</Th>
                                 <SortHeader label="Total" sortKey="amount" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
                                 <Th>{""}</Th>
                              </tr>
                           </thead>
                           <tbody>
                              {paginated.map(o => {
                                 const date = new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                                 const firstItem = o.order_items[0];
                                 const itemCount = o.order_items.length;
                                 const hasDigital = o.order_items.some((i: any) => i.product_type === "digital");
                                 // Timeline hint: show most recent milestone
                                 const milestone = o.delivered_at
                                    ? `Delivered ${new Date(o.delivered_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                                    : o.shipped_at
                                       ? `Shipped ${new Date(o.shipped_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                                       : o.paid_at
                                          ? `Paid ${new Date(o.paid_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                                          : o.cancelled_at
                                             ? `Cancelled ${new Date(o.cancelled_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                                             : null;

                                 return (
                                    <tr key={o.id} className="border-t border-[var(--color-border)]/60 transition-colors hover:bg-[var(--color-surface-secondary)]/40">
                                       <td className="px-4 py-3 whitespace-nowrap">
                                          <Link href={`/orders/${o.id}`} className="block">
                                             <p className="text-xs font-mono font-semibold text-[var(--color-text-primary)] group-hover:text-orange-500 transition-colors">
                                                #{o.order_number}
                                             </p>
                                             <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{date}</p>
                                             {milestone && (
                                                <p className="text-[9px] text-[var(--color-text-muted)] opacity-70 mt-0.5">{milestone}</p>
                                             )}
                                          </Link>
                                       </td>

                                       <td className="px-4 py-3 max-w-[260px]">
                                          <div className="flex items-center gap-2">
                                             <div className="h-8 w-8 rounded-md bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-center shrink-0 text-[10px] font-bold text-[var(--color-text-muted)] uppercase">
                                                {(firstItem?.product_name ?? "?")[0]}
                                             </div>
                                             <div className="min-w-0">
                                                <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">
                                                   {firstItem?.product_name ?? "—"}
                                                </p>
                                                <p className="text-[10px] text-[var(--color-text-muted)]">
                                                   {itemCount === 1 ? `Qty ${firstItem?.quantity ?? 1}` : `+${itemCount - 1} more item${itemCount - 1 !== 1 ? "s" : ""}`}
                                                   {hasDigital && <span className="ml-1.5 text-orange-500 font-semibold">· digital</span>}
                                                </p>
                                             </div>
                                          </div>
                                       </td>

                                       <td className="px-4 py-3 max-w-[160px]">
                                          <div className="text-xs text-[var(--color-text-secondary)]">
                                             <VendorList items={o.order_items} compact />
                                          </div>
                                          <ShippingBadge address={o.shipping_address} />
                                       </td>

                                       <td className="px-3 py-3 whitespace-nowrap">
                                          <StatusPill status={o.status ?? "pending"} />
                                          {o.tracking_number && o.status === "shipped" && (
                                             <p className="mt-1 truncate font-mono text-[9px] text-[var(--color-text-muted)]">{o.tracking_number}</p>
                                          )}
                                       </td>

                                       <td className="px-3 py-3 whitespace-nowrap">
                                          {o.payment_status ? (
                                             <StatusPill status={o.payment_status} />
                                          ) : (
                                             <span className="text-[10px] text-[var(--color-text-muted)]">—</span>
                                          )}
                                       </td>

                                       <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums font-medium text-[var(--color-text-primary)]">
                                          {formatMoney(o.total_amount, o.currency)}
                                       </td>

                                       <td className="px-3 py-3 pr-5 whitespace-nowrap">
                                          <div className="flex items-center justify-end gap-1">
                                             <RowArrow href={`/orders/${o.id}`} />
                                             <OrderActions order={o} onCancel={setCancelTargetId} onReorder={setReorderTarget} />
                                          </div>
                                       </td>
                                    </tr>
                                 );
                              })}
                           </tbody>
                        </table>
                     </div>
                  </div>

                  {/* ── MOBILE / TABLET: Cards ── */}
                  <div className="lg:hidden space-y-3">
                     {paginated.map(o => {
                        const cfg = STATUS_CFG[o.status] ?? STATUS_CFG.pending;
                        const payCfg = PAYMENT_CFG[o.payment_status] ?? null;
                        const StatusIcon = cfg.icon;
                        const date = new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                        const itemCount = o.order_items.length;
                        const firstItem = o.order_items[0];

                        return (
                           <div key={o.id} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
                              <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between gap-3">
                                 <div className="flex items-center gap-2.5 min-w-0">
                                    <span className={cn("h-2 w-2 rounded-full shrink-0", cfg.dot)} />
                                    <div className="min-w-0">
                                       <p className="text-[10px] font-mono font-semibold text-[var(--color-text-muted)] leading-none">#{o.order_number}</p>
                                       <p className="text-xs font-bold text-[var(--color-text-primary)] mt-0.5">{date}</p>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-2 shrink-0">
                                    <p className="text-sm font-bold text-[var(--color-text-primary)] tabular-nums">
                                       {formatMoney(o.total_amount, o.currency)}
                                    </p>
                                    <OrderActions order={o} onCancel={setCancelTargetId} onReorder={setReorderTarget} />
                                 </div>
                              </div>

                              <div className="px-4 py-3 space-y-2.5">
                                 <div className="flex items-center gap-2">
                                    <div className="h-9 w-9 rounded-md bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-center shrink-0 text-xs font-bold text-[var(--color-text-muted)] uppercase">
                                       {(firstItem?.product_name ?? "?")[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                       <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{firstItem?.product_name ?? "—"}</p>
                                       <p className="text-[10px] text-[var(--color-text-muted)]">
                                          <VendorList items={o.order_items} compact />
                                          {itemCount > 1 && <span> · +{itemCount - 1} more</span>}
                                       </p>
                                       <ShippingBadge address={o.shipping_address} />
                                    </div>
                                 </div>

                                 <div className="flex items-center flex-wrap gap-1.5">
                                    <span className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold", cfg.pill)}>
                                       <StatusIcon className="h-3 w-3" /> {cfg.label}
                                    </span>
                                    {payCfg && (
                                       <span className={cn("inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold", payCfg.pill)}>
                                          {payCfg.label}
                                       </span>
                                    )}
                                    {o.tracking_number && o.status === "shipped" && (
                                       <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono text-[var(--color-text-secondary)] bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
                                          <Truck className="h-3 w-3" /> {o.tracking_number}
                                       </span>
                                    )}
                                    {/* Tracking status badge */}
                                    {o.tracking_status && o.status === "shipped" && (
                                       <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] text-[var(--color-text-muted)] bg-[var(--color-surface-secondary)] border border-[var(--color-border)] capitalize">
                                          {o.tracking_status}
                                       </span>
                                    )}
                                 </div>

                                 <Link
                                    href={`/orders/${o.id}`}
                                    className="flex items-center justify-center gap-1 w-full h-9 rounded-md bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] transition-all"
                                 >
                                    View Details <ChevronRight className="h-3 w-3" />
                                 </Link>
                              </div>
                           </div>
                        );
                     })}
                  </div>

                  {/* ── Pagination / Load more ── */}
                  <div className="flex flex-col items-center gap-3 pb-4">
                     <p className="text-xs text-[var(--color-text-muted)]">
                        Showing {paginated.length} of {filtered.length} order{filtered.length !== 1 ? "s" : ""}
                        {orders.length >= 200 && <span className="ml-1">· latest 200</span>}
                     </p>
                     {hasMore && (
                        <button
                           onClick={() => setPage(p => p + 1)}
                           className="h-9 px-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)] transition-all"
                        >
                           Load more ({filtered.length - paginated.length} remaining)
                        </button>
                     )}
                  </div>
               </>
            )}
         </div>
      </>
   );
}
