// "use client";

// import React, { useEffect, useState } from "react";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import {
//    ShoppingCart, Search, Package, Truck, CheckCircle, XCircle,
//    Clock, MessageSquare, Download, ShoppingBag, ArrowLeft,
//    MoreVertical, Loader2, ChevronRight, AlertCircle, Star,
//    Filter, SlidersHorizontal,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import {
//    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
//    DropdownMenuSeparator, DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { useCurrency } from "@/context/CurrencyContext";
// import { createClient } from "@/lib/supabase/client";
// import { cn } from "@/lib/utils";
// import { updateOrderStatus } from "@/lib/actions/marketplace";
// import { toast } from "sonner";

// const STATUS_CFG: Record<string, {
//    label: string;
//    icon: React.ElementType;
//    pill: string;
//    dot: string;
//    row: string;
// }> = {
//    pending: { label: "Pending", icon: Clock, pill: "bg-amber-500/10  text-amber-600  dark:text-amber-400", dot: "bg-amber-400", row: "" },
//    confirmed: { label: "Confirmed", icon: CheckCircle, pill: "bg-sky-500/10    text-sky-600    dark:text-sky-400", dot: "bg-sky-400", row: "" },
//    processing: { label: "Processing", icon: Package, pill: "bg-violet-500/10 text-violet-600 dark:text-violet-400", dot: "bg-violet-400", row: "" },
//    shipped: { label: "Shipped", icon: Truck, pill: "bg-blue-500/10   text-blue-600   dark:text-blue-400", dot: "bg-blue-400", row: "" },
//    delivered: { label: "Delivered", icon: CheckCircle, pill: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-400", row: "" },
//    cancelled: { label: "Cancelled", icon: XCircle, pill: "bg-rose-500/10   text-rose-600   dark:text-rose-400", dot: "bg-rose-400", row: "" },
// };

// const FILTERS = ["All", "Active", "Completed", "Cancelled"] as const;

// /* ── Confirm dialog (replaces native confirm) ──────────────────────────────── */
// function CancelDialog({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
//    return (
//       <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
//          <div className="w-full max-w-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl animate-in zoom-in-95 duration-150">
//             <div className="h-10 w-10 rounded-full bg-rose-500/10 flex items-center justify-center mb-4">
//                <AlertCircle className="h-5 w-5 text-rose-500" />
//             </div>
//             <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-1">Cancel this order?</h3>
//             <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mb-5">
//                This action cannot be undone. The vendor will be notified and any payment may take 3–5 business days to refund.
//             </p>
//             <div className="flex gap-2">
//                <button
//                   onClick={onClose}
//                   className="flex-1 h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-xs font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] transition-all"
//                >
//                   Keep Order
//                </button>
//                <button
//                   onClick={onConfirm}
//                   className="flex-1 h-9 rounded-lg bg-rose-500 text-xs font-semibold text-white hover:bg-rose-600 active:scale-[0.98] transition-all"
//                >
//                   Yes, Cancel
//                </button>
//             </div>
//          </div>
//       </div>
//    );
// }

// /* ── Stat card ─────────────────────────────────────────────────────────────── */
// function StatCard({ icon: Icon, label, value, color }: {
//    icon: React.ElementType; label: string; value: string; color: string;
// }) {
//    return (
//       <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5 flex items-center gap-4">
//          <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", color)}>
//             <Icon className="h-4 w-4" />
//          </div>
//          <div>
//             <p className="text-lg font-bold text-[var(--color-text-primary)] tabular-nums leading-none">{value}</p>
//             <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mt-1">{label}</p>
//          </div>
//       </div>
//    );
// }

// /* ── Page ──────────────────────────────────────────────────────────────────── */
// export default function BuyerOrdersPage() {
//    const { formatMoney } = useCurrency();
//    const router = useRouter();

//    const [orders, setOrders] = useState<any[]>([]);
//    const [loading, setLoading] = useState(true);
//    const [search, setSearch] = useState("");
//    const [filter, setFilter] = useState<typeof FILTERS[number]>("All");
//    const [cancelTarget, setCancelTarget] = useState<string | null>(null);
//    const [cancelling, setCancelling] = useState(false);
//    const [expanded, setExpanded] = useState<Set<string>>(new Set());

//    useEffect(() => {
//       async function load() {
//          const supabase = createClient();
//          const { data: { user } } = await supabase.auth.getUser();
//          if (!user) { router.push("/login"); return; }

//          const { data } = await supabase
//             .from("orders")
//             .select(`
//           id, order_number, status, total_amount, currency, created_at,
//           order_items (
//             id, product_name, quantity, unit_price, total_price,
//             vendor_id, product_source, product_type,
//             vendors ( id, business_name, business_slug )
//           )
//         `)
//             .eq("buyer_id", user.id)
//             .order("created_at", { ascending: false });

//          setOrders((data ?? []).map(o => ({ ...o, order_items: o.order_items ?? [] })));
//          setLoading(false);
//       }
//       load();
//    }, [router]);

//    /* ── Aggregates ── */
//    const totalSpent = orders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
//    const activeOrders = orders.filter(o => ["pending", "processing", "shipped"].includes(o.status)).length;
//    const completedOrders = orders.filter(o => o.status === "delivered").length;

//    /* ── Filter + search ── */
//    const filtered = orders.filter(o => {
//       const q = search.toLowerCase();
//       const matchSearch = !q
//          || (o.order_number as string)?.toLowerCase().includes(q)
//          || (o.order_items as any[]).some(i => (i.product_name ?? "").toLowerCase().includes(q))
//          || (o.order_items as any[]).some(i => (i.vendors?.business_name ?? "").toLowerCase().includes(q));

//       const s = o.status?.toLowerCase();
//       const matchFilter =
//          filter === "All" ? true :
//             filter === "Active" ? ["pending", "processing", "shipped"].includes(s) :
//                filter === "Completed" ? s === "delivered" :
//                   filter === "Cancelled" ? s === "cancelled" : true;

//       return matchSearch && matchFilter;
//    });

//    /* ── Cancel order ── */
//    async function confirmCancel() {
//       if (!cancelTarget) return;
//       setCancelling(true);
//       const res = await updateOrderStatus(cancelTarget, "cancelled");
//       if (res.success) {
//          setOrders(prev => prev.map(o => o.id === cancelTarget ? { ...o, status: "cancelled" } : o));
//          toast.success("Order cancelled successfully.");
//       } else {
//          toast.error(res.error || "Failed to cancel order.");
//       }
//       setCancelTarget(null);
//       setCancelling(false);
//    }

//    /* ── Toggle expanded items ── */
//    function toggleExpanded(id: string) {
//       setExpanded(prev => {
//          const next = new Set(prev);
//          next.has(id) ? next.delete(id) : next.add(id);
//          return next;
//       });
//    }

//    /* ── Loading ── */
//    if (loading) return (
//       <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
//          <div className="flex flex-col items-center gap-4">
//             <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
//             <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">Loading orders…</p>
//          </div>
//       </div>
//    );

//    /* ── Page ── */
//    return (
//       <>
//          {cancelTarget && (
//             <CancelDialog
//                onConfirm={confirmCancel}
//                onClose={() => setCancelTarget(null)}
//             />
//          )}

//          <div className="min-h-screen pb-24" style={{ background: "var(--color-bg)" }}>
//             <div className="max-w-full mx-auto px-4 sm:px-6 pt-8 sm:pt-12 space-y-8">

//                {/* ── Header ── */}
//                <div className="flex items-center justify-between">
//                   <div className="flex items-center gap-4">
//                      <Link
//                         href="/dashboard"
//                         className={cn(
//                            "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-all",
//                            "border border-[var(--color-border)] bg-[var(--color-surface)]",
//                            "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)]"
//                         )}
//                      >
//                         <ArrowLeft className="h-4 w-4" />
//                      </Link>
//                      <div>
//                         <h1 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight leading-none">
//                            Orders
//                         </h1>
//                         <p className="text-xs text-[var(--color-text-muted)] mt-1">
//                            {orders.length} order{orders.length !== 1 ? "s" : ""} placed
//                         </p>
//                      </div>
//                   </div>

//                   <Link
//                      href="/marketplace"
//                      className={cn(
//                         "hidden sm:flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-semibold transition-all",
//                         "border border-[var(--color-border)] bg-[var(--color-surface)]",
//                         "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)]"
//                      )}
//                   >
//                      <ShoppingBag className="h-3.5 w-3.5" />
//                      Browse Store
//                   </Link>
//                </div>

//                {/* ── Stats ── */}
//                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
//                   <div className="col-span-2 sm:col-span-1">
//                      <StatCard icon={ShoppingCart} label="Total Spent" value={formatMoney(totalSpent, "USD")} color="bg-indigo-500/10 text-indigo-500" />
//                   </div>
//                   <StatCard icon={Package} label="Active" value={String(activeOrders)} color="bg-sky-500/10 text-sky-500" />
//                   <StatCard icon={CheckCircle} label="Completed" value={String(completedOrders)} color="bg-emerald-500/10 text-emerald-500" />
//                </div>

//                {/* ── Search + Filter ── */}
//                <div className="flex flex-col sm:flex-row gap-3">
//                   {/* Search */}
//                   <div className="relative flex-1">
//                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-muted)] pointer-events-none" />
//                      <input
//                         value={search}
//                         onChange={e => setSearch(e.target.value)}
//                         placeholder="Search orders or products…"
//                         className={cn(
//                            "w-full h-10 pl-9 pr-4 rounded-xl border text-sm font-medium",
//                            "bg-[var(--color-surface)] border-[var(--color-border)]",
//                            "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
//                            "outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-150"
//                         )}
//                      />
//                      {search && (
//                         <button
//                            onClick={() => setSearch("")}
//                            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
//                         >
//                            <XCircle className="h-3 w-3" />
//                         </button>
//                      )}
//                   </div>

//                   {/* Filter pills */}
//                   <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
//                      {FILTERS.map(f => (
//                         <button
//                            key={f}
//                            onClick={() => setFilter(f)}
//                            className={cn(
//                               "h-10 px-4 rounded-xl text-xs font-semibold border whitespace-nowrap transition-all duration-150 shrink-0",
//                               filter === f
//                                  ? "bg-[var(--color-text-primary)] text-[var(--color-bg)] border-transparent"
//                                  : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
//                            )}
//                         >
//                            {f}
//                            {f !== "All" && (
//                               <span className={cn(
//                                  "ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full",
//                                  filter === f ? "bg-white/20" : "bg-[var(--color-surface-secondary)]"
//                               )}>
//                                  {f === "Active" ? activeOrders :
//                                     f === "Completed" ? completedOrders :
//                                        orders.filter(o => o.status === "cancelled").length}
//                               </span>
//                            )}
//                         </button>
//                      ))}
//                   </div>
//                </div>

//                {/* ── Orders list ── */}
//                {filtered.length === 0 ? (
//                   <div className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] py-16 text-center">
//                      <ShoppingBag className="h-8 w-8 text-[var(--color-border)] mx-auto mb-3" />
//                      <p className="text-sm font-medium text-[var(--color-text-muted)]">
//                         {search ? `No orders matching "${search}"` : "No orders yet"}
//                      </p>
//                      {!search && (
//                         <Link
//                            href="/marketplace"
//                            className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors"
//                         >
//                            Start shopping <ChevronRight className="h-3 w-3" />
//                         </Link>
//                      )}
//                   </div>
//                ) : (
//                   <div className="space-y-3">
//                      {filtered.map(o => {
//                         const cfg = STATUS_CFG[o.status] ?? STATUS_CFG.pending;
//                         const StatusIcon = cfg.icon;
//                         const date = new Date(o.created_at).toLocaleDateString("en-US", {
//                            month: "short", day: "numeric", year: "numeric",
//                         });
//                         const isExpanded = expanded.has(o.id);
//                         const visibleItems = isExpanded ? o.order_items : o.order_items.slice(0, 2);
//                         const hasMore = o.order_items.length > 2;
//                         const isPending = o.status === "pending";
//                         const isDelivered = o.status === "delivered";

//                         return (
//                            <div
//                               key={o.id}
//                               className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden transition-all hover:border-[var(--color-border-strong)] hover:shadow-sm"
//                            >
//                               {/* Order header */}
//                               <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between gap-4">
//                                  <div className="flex items-center gap-3 min-w-0">
//                                     {/* Status dot */}
//                                     <span className={cn("h-2 w-2 rounded-full shrink-0", cfg.dot)} />

//                                     <div className="min-w-0">
//                                        <p className="text-xs font-semibold text-[var(--color-text-muted)] leading-none">
//                                           #{o.order_number}
//                                        </p>
//                                        <p className="text-sm font-bold text-[var(--color-text-primary)] mt-0.5 leading-none">
//                                           {date}
//                                        </p>
//                                     </div>

//                                     <span className={cn(
//                                        "hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide",
//                                        cfg.pill
//                                     )}>
//                                        <StatusIcon className="h-3 w-3" />
//                                        {cfg.label}
//                                     </span>
//                                  </div>

//                                  <div className="flex items-center gap-3 shrink-0">
//                                     <p className="text-base font-bold text-[var(--color-text-primary)] tabular-nums">
//                                        {formatMoney(o.total_amount, o.currency)}
//                                     </p>

//                                     {/* Actions */}
//                                     <div className="flex items-center gap-1.5">
//                                        <Link
//                                           href={`/dashboard/orders/${o.id}`}
//                                           className={cn(
//                                              "hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-all",
//                                              "bg-[var(--color-text-primary)] text-[var(--color-bg)] hover:opacity-90 active:scale-[0.98]"
//                                           )}
//                                        >
//                                           Details <ChevronRight className="h-3 w-3" />
//                                        </Link>

//                                        <DropdownMenu>
//                                           <DropdownMenuTrigger asChild>
//                                              <button className={cn(
//                                                 "h-8 w-8 rounded-sm border flex items-center justify-center transition-all",
//                                                 "border-[var(--color-border)] bg-[var(--color-surface-secondary)]",
//                                                 "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)]"
//                                              )}>
//                                                 <MoreVertical className="h-3.5 w-3.5" />
//                                              </button>
//                                           </DropdownMenuTrigger>
//                                           <DropdownMenuContent align="end" className="w-48 rounded-md p-1.5 border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
//                                              <DropdownMenuItem asChild className="rounded-lg cursor-pointer px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] focus:bg-[var(--color-surface-secondary)]">
//                                                 <Link href={`/dashboard/orders/${o.id}`} className="flex items-center gap-2.5">
//                                                    <Package className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
//                                                    View Details
//                                                 </Link>
//                                              </DropdownMenuItem>
//                                              <DropdownMenuItem asChild className="rounded-lg cursor-pointer px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] focus:bg-[var(--color-surface-secondary)]">
//                                                 <Link href={`/dashboard/messages?vendor=${o.order_items?.[0]?.vendor_id}`} className="flex items-center gap-2.5">
//                                                    <MessageSquare className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
//                                                    Message Vendor
//                                                 </Link>
//                                              </DropdownMenuItem>
//                                              <DropdownMenuItem className="rounded-lg cursor-pointer px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] focus:bg-[var(--color-surface-secondary)] flex items-center gap-2.5">
//                                                 <Download className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
//                                                 Download Invoice
//                                              </DropdownMenuItem>

//                                              {isDelivered && (
//                                                 <DropdownMenuItem className="rounded-lg cursor-pointer px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] focus:bg-[var(--color-surface-secondary)] flex items-center gap-2.5">
//                                                    <Star className="h-3.5 w-3.5 text-amber-400" />
//                                                    Leave a Review
//                                                 </DropdownMenuItem>
//                                              )}

//                                              {isPending && (
//                                                 <>
//                                                    <DropdownMenuSeparator className="bg-[var(--color-border)] my-1" />
//                                                    <DropdownMenuItem
//                                                       onClick={() => setCancelTarget(o.id)}
//                                                       className="rounded-lg cursor-pointer px-3 py-2 text-xs font-semibold text-rose-500 focus:bg-rose-500/10 focus:text-rose-600 flex items-center gap-2.5"
//                                                    >
//                                                       <XCircle className="h-3.5 w-3.5" />
//                                                       Cancel Order
//                                                    </DropdownMenuItem>
//                                                 </>
//                                              )}
//                                           </DropdownMenuContent>
//                                        </DropdownMenu>
//                                     </div>
//                                  </div>
//                               </div>

//                               {/* Order items */}
//                               <div className="divide-y divide-[var(--color-border)]">
//                                  {visibleItems.map((item: any, idx: number) => (
//                                     <div key={idx} className="px-5 py-3.5 flex items-center gap-3">
//                                        {/* Product initial avatar */}
//                                        <div className="h-9 w-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] flex items-center justify-center shrink-0 text-xs font-bold text-[var(--color-text-muted)] uppercase">
//                                           {(item.product_name ?? "?")[0]}
//                                        </div>

//                                        <div className="flex-1 min-w-0">
//                                           <div className="flex items-center gap-2">
//                                              <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
//                                                 {item.product_name}
//                                              </p>
//                                              {item.product_type === "digital" && (
//                                                 <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded-md">
//                                                    Digital
//                                                 </span>
//                                              )}
//                                           </div>
//                                           <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
//                                              Qty {item.quantity} · {item.vendors?.business_name ?? "Vendor"}
//                                           </p>
//                                        </div>

//                                        <p className="text-sm font-semibold text-[var(--color-text-primary)] tabular-nums shrink-0">
//                                           {formatMoney(Number(item.total_price ?? 0), o.currency)}
//                                        </p>
//                                     </div>
//                                  ))}

//                                  {/* Show more / less */}
//                                  {hasMore && (
//                                     <button
//                                        onClick={() => toggleExpanded(o.id)}
//                                        className="w-full px-5 py-2.5 text-xs font-semibold text-[var(--color-text-muted)] hover:text-orange-500 hover:bg-[var(--color-surface-secondary)] transition-colors text-left flex items-center gap-1.5"
//                                     >
//                                        {isExpanded ? (
//                                           <>Show less</>
//                                        ) : (
//                                           <>{o.order_items.length - 2} more item{o.order_items.length - 2 !== 1 ? "s" : ""}…</>
//                                        )}
//                                     </button>
//                                  )}
//                               </div>
//                            </div>
//                         );
//                      })}
//                   </div>
//                )}

//                {/* Results count */}
//                {filtered.length > 0 && (
//                   <p className="text-center text-xs text-[var(--color-text-muted)] pb-4">
//                      Showing {filtered.length} of {orders.length} order{orders.length !== 1 ? "s" : ""}
//                   </p>
//                )}
//             </div>
//          </div>
//       </>
//    );
// }
"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
   ShoppingCart, Search, Package, Truck, CheckCircle, XCircle,
   Clock, MessageSquare, Download, ShoppingBag, ArrowLeft,
   MoreVertical, Loader2, ChevronRight, AlertCircle, Star,
   RefreshCcw, RotateCcw, MapPin, ExternalLink, Filter,
   ChevronUp, ChevronDown,
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

const FILTERS = ["All", "Active", "Completed", "Cancelled", "Refunded"] as const;
type Filter = typeof FILTERS[number];

type SortKey = "date" | "amount" | "status";
type SortDir = "asc" | "desc";

/* ── Confirm dialog ─────────────────────────────────────────────────────── */
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

/* ── Stat card ──────────────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sublabel, color }: {
   icon: React.ElementType; label: string; value: string; sublabel?: string; color: string;
}) {
   return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5 flex items-center gap-4">
         <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", color)}>
            <Icon className="h-4 w-4" />
         </div>
         <div className="min-w-0">
            <p className="text-lg font-bold text-[var(--color-text-primary)] tabular-nums leading-none truncate">{value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mt-1">
               {label}
               {sublabel && <span className="ml-1 normal-case font-normal opacity-70">· {sublabel}</span>}
            </p>
         </div>
      </div>
   );
}

/* ── Vendor list (handles multi-vendor) ─────────────────────────────────── */
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
            {vendors.length > 1 && (
               <span className="text-[var(--color-text-muted)]"> +{vendors.length - 1}</span>
            )}
         </span>
      );
   }
   return (
      <div className="flex flex-wrap gap-1">
         {vendors.map(v => <span key={v.id}>{v.name}</span>)}
      </div>
   );
}

/* ── Sort header (table only) ───────────────────────────────────────────── */
function SortHeader({ label, sortKey, currentKey, currentDir, onSort, align = "left" }: {
   label: string; sortKey: SortKey; currentKey: SortKey; currentDir: SortDir;
   onSort: (k: SortKey) => void; align?: "left" | "right";
}) {
   const active = currentKey === sortKey;
   return (
      <th className={cn(
         "px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]",
         align === "right" && "text-right"
      )}>
         <button
            onClick={() => onSort(sortKey)}
            className={cn(
               "inline-flex items-center gap-1 hover:text-[var(--color-text-primary)] transition-colors",
               active && "text-[var(--color-text-primary)]"
            )}
         >
            {label}
            {active && (currentDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
         </button>
      </th>
   );
}

/* ── Row actions (shared between table + card) ──────────────────────────── */
function OrderActions({ order, onCancel, onReorder }: {
   order: any; onCancel: (id: string) => void; onReorder: (id: string) => void;
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
               <Link href={`/dashboard/orders/${order.id}`} className="flex items-center gap-2.5">
                  <Package className="h-3.5 w-3.5 text-[var(--color-text-muted)]" /> View Details
               </Link>
            </DropdownMenuItem>

            {vendors.length === 1 ? (
               <DropdownMenuItem asChild className="rounded-lg cursor-pointer px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] focus:bg-[var(--color-surface-secondary)]">
                  <Link href={`/dashboard/messages?vendor=${vendors[0].id}`} className="flex items-center gap-2.5">
                     <MessageSquare className="h-3.5 w-3.5 text-[var(--color-text-muted)]" /> Message Vendor
                  </Link>
               </DropdownMenuItem>
            ) : vendors.length > 1 && (
               <>
                  <div className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Message vendor</div>
                  {vendors.map(v => (
                     <DropdownMenuItem key={v.id} asChild className="rounded-lg cursor-pointer px-3 py-2 text-xs font-medium text-[var(--color-text-primary)] focus:bg-[var(--color-surface-secondary)]">
                        <Link href={`/dashboard/messages?vendor=${v.id}`} className="flex items-center gap-2.5">
                           <MessageSquare className="h-3.5 w-3.5 text-[var(--color-text-muted)]" /> {v.name}
                        </Link>
                     </DropdownMenuItem>
                  ))}
               </>
            )}

            <DropdownMenuItem asChild className="rounded-lg cursor-pointer px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] focus:bg-[var(--color-surface-secondary)]">
               <a href={`/api/orders/${order.id}/invoice`} target="_blank" rel="noopener" className="flex items-center gap-2.5">
                  <Download className="h-3.5 w-3.5 text-[var(--color-text-muted)]" /> Download Invoice
               </a>
            </DropdownMenuItem>

            <DropdownMenuItem
               onClick={() => onReorder(order.id)}
               className="rounded-lg cursor-pointer px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] focus:bg-[var(--color-surface-secondary)] flex items-center gap-2.5"
            >
               <RotateCcw className="h-3.5 w-3.5 text-[var(--color-text-muted)]" /> Reorder
            </DropdownMenuItem>

            {isDelivered && (
               <DropdownMenuItem asChild className="rounded-lg cursor-pointer px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] focus:bg-[var(--color-surface-secondary)]">
                  <Link href={`/dashboard/orders/${order.id}#review`} className="flex items-center gap-2.5">
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

/* ── Page ───────────────────────────────────────────────────────────────── */
export default function BuyerOrdersPage() {
   const { formatMoney } = useCurrency();
   const router = useRouter();

   const [orders, setOrders] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [search, setSearch] = useState("");
   const [filter, setFilter] = useState<Filter>("All");
   const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
   const [cancelling, setCancelling] = useState(false);
   const [sortKey, setSortKey] = useState<SortKey>("date");
   const [sortDir, setSortDir] = useState<SortDir>("desc");

   /* ── Load + realtime ── */
   useEffect(() => {
      const supabase = createClient();
      let channel: any;
      let cancelled = false;

      async function fetchOrders(userId: string) {
         const { data } = await supabase
            .from("orders")
            .select(`
            id, order_number, status, payment_status, total_amount, currency,
            created_at, paid_at, shipped_at, delivered_at, cancelled_at,
            shipping_address, tracking_number, tracking_status,
            order_items (
               id, product_name, quantity, unit_price, total_price,
               vendor_id, product_source, product_type, digital_download_url,
               vendors ( id, business_name, business_slug )
            )
         `)
            .eq("buyer_id", userId)
            .order("created_at", { ascending: false })
            .limit(100);

         if (cancelled) return;
         setOrders((data ?? []).map(o => ({ ...o, order_items: o.order_items ?? [] })));
         setLoading(false);
      }

      async function init() {
         const { data: { user } } = await supabase.auth.getUser();
         if (!user) { router.push("/login"); return; }

         // Initial load
         await fetchOrders(user.id);

         channel = supabase
            .channel(`buyer-orders-${user.id}`)
            .on(
               "postgres_changes",
               { event: "*", schema: "public", table: "orders", filter: `buyer_id=eq.${user.id}` },
               () => fetchOrders(user.id)
            )
            .subscribe();
      }

      init();

      return () => {
         cancelled = true;
         if (channel) supabase.removeChannel(channel);
      };
   }, [router]);

   /* ── Aggregates (per-currency, no more USD lie) ── */
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
                        filter === "Refunded" ? bucket === "refunded" : true;

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

   /* ── Handlers ── */
   function handleSort(key: SortKey) {
      if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
      else { setSortKey(key); setSortDir("desc"); }
   }

   async function confirmCancel() {
      if (!cancelTargetId) return;
      setCancelling(true);
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
   }

   function handleReorder(id: string) {
      // Backend endpoint to be added: POST /api/orders/[id]/reorder
      toast.info("Reorder coming soon", { description: "We'll add items to a fresh cart at current prices." });
   }

   const cancelTargetOrder = orders.find(o => o.id === cancelTargetId);

   /* ── Loading ── */
   if (loading) return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
         <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">Loading orders…</p>
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

         <div className="min-h-screen pb-24" style={{ background: "var(--color-bg)" }}>
            <div className="max-w-full mx-auto px-4 sm:px-6 pt-8 sm:pt-12 space-y-8">

               {/* ── Header ── */}
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <Link
                        href="/dashboard"
                        className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-all border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)]"
                     >
                        <ArrowLeft className="h-4 w-4" />
                     </Link>
                     <div>
                        <h1 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight leading-none">Orders</h1>
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">
                           {orders.length} order{orders.length !== 1 ? "s" : ""} placed
                        </p>
                     </div>
                  </div>

                  <Link
                     href="/marketplace"
                     className="hidden sm:flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-semibold transition-all border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)]"
                  >
                     <ShoppingBag className="h-3.5 w-3.5" /> Browse Store
                  </Link>
               </div>

               {/* ── Stats — per-currency aware ── */}
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                     <StatCard
                        icon={ShoppingCart}
                        label="Total Spent"
                        value={dominantCurrency ? formatMoney(dominantCurrency[1], dominantCurrency[0]) : formatMoney(0, "USD")}
                        sublabel={spendByCurrency.length > 1 ? `${spendByCurrency.length} currencies` : undefined}
                        color="bg-indigo-500/10 text-indigo-500"
                     />
                  </div>
                  <StatCard icon={Package} label="Active" value={String(activeOrders)} color="bg-sky-500/10 text-sky-500" />
                  <StatCard icon={CheckCircle} label="Completed" value={String(completedOrders)} color="bg-emerald-500/10 text-emerald-500" />
                  <StatCard icon={RefreshCcw} label="Refunded" value={String(refundedOrders)} color="bg-slate-500/10 text-slate-500" />
               </div>

               {/* ── Search + Filter ── */}
               <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                     <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-muted)] pointer-events-none" />
                     <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by order #, product, or vendor…"
                        className="w-full h-10 pl-9 pr-4 rounded-xl border text-sm font-medium bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                     />
                     {search && (
                        <button
                           onClick={() => setSearch("")}
                           className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                        >
                           <XCircle className="h-3 w-3" />
                        </button>
                     )}
                  </div>

                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                     {FILTERS.map(f => {
                        const count =
                           f === "All" ? orders.length :
                              f === "Active" ? activeOrders :
                                 f === "Completed" ? completedOrders :
                                    f === "Cancelled" ? cancelledOrders :
                                       f === "Refunded" ? refundedOrders : 0;
                        return (
                           <button
                              key={f}
                              onClick={() => setFilter(f)}
                              className={cn(
                                 "h-10 px-4 rounded-xl text-xs font-semibold border whitespace-nowrap transition-all shrink-0",
                                 filter === f
                                    ? "bg-[var(--color-text-primary)] text-[var(--color-bg)] border-transparent"
                                    : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
                              )}
                           >
                              {f}
                              <span className={cn(
                                 "ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                                 filter === f ? "bg-white/20" : "bg-[var(--color-surface-secondary)]"
                              )}>{count}</span>
                           </button>
                        );
                     })}
                  </div>
               </div>

               {/* ── Empty state ── */}
               {filtered.length === 0 ? (
                  <div className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] py-16 text-center">
                     <ShoppingBag className="h-8 w-8 text-[var(--color-border)] mx-auto mb-3" />
                     <p className="text-sm font-medium text-[var(--color-text-muted)]">
                        {search ? `No orders matching "${search}"` :
                           filter !== "All" ? `No ${filter.toLowerCase()} orders` :
                              "No orders yet"}
                     </p>
                     {!search && filter === "All" && (
                        <Link href="/marketplace" className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold text-orange-500 hover:text-orange-600">
                           Start shopping <ChevronRight className="h-3 w-3" />
                        </Link>
                     )}
                  </div>
               ) : (
                  <>
                     {/* ── DESKTOP: Table ── */}
                     <div className="hidden lg:block rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
                        <div className="overflow-x-auto">
                           <table className="w-full">
                              <thead className="bg-[var(--color-surface-secondary)] border-b border-[var(--color-border)]">
                                 <tr>
                                    <SortHeader label="Order" sortKey="date" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Items</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Vendor</th>
                                    <SortHeader label="Status" sortKey="status" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
                                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Payment</th>
                                    <SortHeader label="Total" sortKey="amount" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
                                    <th className="px-4 py-3"></th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-[var(--color-border)]">
                                 {filtered.map(o => {
                                    const cfg = STATUS_CFG[o.status] ?? STATUS_CFG.pending;
                                    const payCfg = PAYMENT_CFG[o.payment_status] ?? null;
                                    const StatusIcon = cfg.icon;
                                    const date = new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                                    const firstItem = o.order_items[0];
                                    const itemCount = o.order_items.length;
                                    const hasDigital = o.order_items.some((i: any) => i.product_type === "digital");

                                    return (
                                       <tr key={o.id} className="hover:bg-[var(--color-surface-secondary)] transition-colors group">
                                          <td className="px-4 py-3 whitespace-nowrap">
                                             <Link href={`/dashboard/orders/${o.id}`} className="block">
                                                <p className="text-xs font-mono font-semibold text-[var(--color-text-primary)] group-hover:text-orange-500 transition-colors">
                                                   #{o.order_number}
                                                </p>
                                                <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{date}</p>
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

                                          <td className="px-4 py-3 max-w-[160px] text-xs text-[var(--color-text-secondary)]">
                                             <VendorList items={o.order_items} compact />
                                          </td>

                                          <td className="px-4 py-3 whitespace-nowrap">
                                             <span className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold", cfg.pill)}>
                                                <StatusIcon className="h-3 w-3" />
                                                {cfg.label}
                                             </span>
                                             {o.tracking_number && o.status === "shipped" && (
                                                <p className="text-[9px] font-mono text-[var(--color-text-muted)] mt-1 truncate">{o.tracking_number}</p>
                                             )}
                                          </td>

                                          <td className="px-4 py-3 whitespace-nowrap">
                                             {payCfg ? (
                                                <span className={cn("inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold", payCfg.pill)}>
                                                   {payCfg.label}
                                                </span>
                                             ) : <span className="text-[10px] text-[var(--color-text-muted)]">—</span>}
                                          </td>

                                          <td className="px-4 py-3 text-right whitespace-nowrap">
                                             <p className="text-sm font-bold text-[var(--color-text-primary)] tabular-nums">
                                                {formatMoney(o.total_amount, o.currency)}
                                             </p>
                                          </td>

                                          <td className="px-4 py-3 whitespace-nowrap">
                                             <div className="flex items-center justify-end gap-1.5">
                                                <Link
                                                   href={`/dashboard/orders/${o.id}`}
                                                   className="h-8 px-3 rounded-md bg-[var(--color-text-primary)] text-[var(--color-bg)] text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-1"
                                                >
                                                   View <ChevronRight className="h-3 w-3" />
                                                </Link>
                                                <OrderActions order={o} onCancel={setCancelTargetId} onReorder={handleReorder} />
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
                        {filtered.map(o => {
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
                                       <OrderActions order={o} onCancel={setCancelTargetId} onReorder={handleReorder} />
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
                                    </div>

                                    <Link
                                       href={`/dashboard/orders/${o.id}`}
                                       className="flex items-center justify-center gap-1 w-full h-9 rounded-md bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] transition-all"
                                    >
                                       View Details <ChevronRight className="h-3 w-3" />
                                    </Link>
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  </>
               )}

               {filtered.length > 0 && (
                  <p className="text-center text-xs text-[var(--color-text-muted)] pb-4">
                     Showing {filtered.length} of {orders.length} order{orders.length !== 1 ? "s" : ""}
                     {orders.length >= 100 && <span className="ml-1">· latest 100</span>}
                  </p>
               )}
            </div>
         </div>
      </>
   );
}