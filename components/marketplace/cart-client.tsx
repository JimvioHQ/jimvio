
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, Trash2, Plus, Minus, ArrowRight,
  Package, ShieldCheck, Store, ChevronRight,
  HelpCircle, Loader2, ShoppingBag, Tag, X,
  Truck, RotateCcw, Lock, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateCartItemQuantity, removeFromCart } from "@/lib/actions/marketplace";
import { useCurrency } from "@/context/CurrencyContext";
import { toast } from "sonner";

interface CartItem {
  id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  order_id: string;
}

interface CartOrder {
  id: string;
  vendor_id: string | null;
  status: string | null;
  total_amount: number;
  subtotal: number;
  currency?: string | null;
  order_items: CartItem[];
  vendors: {
    id: string;
    business_name: string;
    business_slug: string;
  } | null;
}

function sumOrderItems(items: CartItem[]): number {
  return items.reduce((s, i) => s + Number(i.total_price), 0);
}

interface CartClientProps {
  initialOrders: CartOrder[];
}

export function CartClient({ initialOrders }: CartClientProps) {
  const router = useRouter();
  const { formatMoney, formatCartTotalsLabel } = useCurrency();
  const [orders, setOrders] = useState(initialOrders);
  const [loadingItems, setLoadingItems] = useState<string[]>([]);
  const [removingItems, setRemovingItems] = useState<string[]>([]);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const hasMountedRef = useRef(false);

  // Sync only after mount to avoid clobbering optimistic state
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    setOrders(initialOrders);
  }, [initialOrders]);

  const totalsLabel = useMemo(() => formatCartTotalsLabel(orders), [orders, formatCartTotalsLabel]);
  const totalItems = orders.reduce((acc, o) => acc + o.order_items.length, 0);
  const hasMixedCurrencies = useMemo(
    () => new Set(orders.map((o) => (o.currency || "USD").toUpperCase())).size > 1,
    [orders]
  );

  const handleUpdateQuantity = async (itemId: string, newQty: number) => {
    if (newQty < 1) return;
    setLoadingItems(prev => [...prev, itemId]);
    try {
      const res = await updateCartItemQuantity(itemId, newQty);
      if (res.success) {
        window.dispatchEvent(new CustomEvent("cart-updated"));
        setOrders(prev =>
          prev.map(order => {
            const order_items = order.order_items.map(item =>
              item.id === itemId
                ? { ...item, quantity: newQty, total_price: item.unit_price * newQty }
                : item
            );
            const lineSum = sumOrderItems(order_items);
            return { ...order, order_items, total_amount: lineSum, subtotal: lineSum };
          })
        );
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update quantity");
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoadingItems(prev => prev.filter(id => id !== itemId));
    }
  };

  const handleRemove = async (itemId: string) => {
    setRemovingItems(prev => [...prev, itemId]);
    try {
      const res = await removeFromCart(itemId);
      if (res.success) {
        window.dispatchEvent(new CustomEvent("cart-updated"));
        setOrders(prev => {
          return prev
            .map(order => {
              const order_items = order.order_items.filter(item => item.id !== itemId);
              const lineSum = sumOrderItems(order_items);
              return { ...order, order_items, total_amount: lineSum, subtotal: lineSum };
            })
            .filter(order => order.order_items.length > 0);
        });
        setRemovingItems(prev => prev.filter(id => id !== itemId));
        toast.success("Item removed");
        router.refresh();
      } else {
        setRemovingItems(prev => prev.filter(id => id !== itemId));
        toast.error(res.error || "Failed to remove item");
      }
    } catch (err) {
      setRemovingItems(prev => prev.filter(id => id !== itemId));
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    }
  };

  // ── EMPTY STATE ──────────────────────────────────────────────────────────────
  if (orders.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex flex-col items-center justify-center text-center py-28"
      >
        <div className="relative mb-7">
          {/* Stacked shadow rings for depth */}
          <div className="absolute inset-0 rounded-2xl bg-stone-100 dark:bg-zinc-800 translate-y-2 translate-x-2 scale-95 opacity-50" />
          <div className="absolute inset-0 rounded-2xl bg-stone-100 dark:bg-zinc-800 translate-y-1 translate-x-1 scale-97 opacity-75" />
          <div className="relative h-24 w-24 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 rounded-2xl flex items-center justify-center">
            <ShoppingCart className="h-10 w-10 text-stone-300 dark:text-zinc-600" strokeWidth={1.5} />
          </div>
        </div>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 tracking-tight">
          Nothing here yet
        </h2>
        <p className="text-sm text-stone-400 dark:text-zinc-500 mb-8 max-w-[260px] leading-relaxed">
          Your cart is empty. Browse the marketplace to find products.
        </p>
        <Button
          asChild
          className="h-10 px-7 rounded-full font-semibold text-sm bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 border-0 shadow-none transition-opacity"
        >
          <Link href="/marketplace">
            <ShoppingBag className="mr-2 h-4 w-4" />
            Browse Marketplace
          </Link>
        </Button>
      </motion.div>
    );
  }

  // ── CART HEADER ──────────────────────────────────────────────────────────────
  const CartHeader = () => (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-baseline gap-2.5">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Your Cart</h1>
        <span className="text-sm text-stone-400 dark:text-zinc-500 font-normal">
          {totalItems} {totalItems === 1 ? "item" : "items"}
        </span>
      </div>
      <Link
        href="/marketplace"
        className="text-xs text-stone-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 font-medium flex items-center gap-1 transition-colors"
      >
        <ChevronRight className="h-3.5 w-3.5 rotate-180" />
        Continue shopping
      </Link>
    </div>
  );

  // ── FULL CART ────────────────────────────────────────────────────────────────
  return (
    <div>
      <CartHeader />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_308px] xl:grid-cols-[1fr_340px] gap-6 items-start">

        {/* ── LEFT: ORDER GROUPS ── */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {orders.map((order, orderIdx) => (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -6 }}
                transition={{ duration: 0.22, delay: orderIdx * 0.04 }}
                className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-2xl overflow-hidden"
              >
                {/* Vendor strip */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-stone-100 dark:border-zinc-800">
                  <Link
                    href={`/vendors/${order.vendors?.business_slug}`}
                    className="flex items-center gap-2.5 group"
                  >
                    <div className="h-7 w-7 bg-stone-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-stone-200 dark:group-hover:bg-zinc-700 transition-colors">
                      <Store className="h-3.5 w-3.5 text-stone-500 dark:text-zinc-400" />
                    </div>
                    <span className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                      {order.vendors?.business_name || "Official Store"}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-stone-300 dark:text-zinc-600 group-hover:text-zinc-500 transition-colors" />
                  </Link>

                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Trade Assured
                  </span>
                </div>

                {/* Items */}
                <div className="divide-y divide-stone-100 dark:divide-zinc-800/70">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {order.order_items.map(item => (
                      <motion.div
                        key={item.id}
                        layout
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.22 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 flex gap-4">
                          {/* Thumbnail */}
                          <div className="relative h-[72px] w-[72px] shrink-0 bg-stone-50 dark:bg-zinc-800 rounded-xl border border-stone-100 dark:border-zinc-700 overflow-hidden">
                            {/* FIX: guard against empty string, null, and non-http URLs */}
                            {item.product_image?.startsWith("http") && !imageErrors[item.id] ? (
                              <Image
                                src={item.product_image}
                                alt={item.product_name}
                                fill
                                sizes="72px"
                                className="object-contain p-1.5"
                                onError={() => setImageErrors(prev => ({ ...prev, [item.id]: true }))}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xl font-bold text-stone-300 dark:text-zinc-600 uppercase select-none">
                                {item.product_name.charAt(0)}
                              </div>
                            )}
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <p className="text-[13px] font-medium text-zinc-800 dark:text-zinc-100 line-clamp-2 leading-snug flex-1">
                                {item.product_name}
                              </p>
                              <button
                                onClick={() => handleRemove(item.id)}
                                disabled={removingItems.includes(item.id)}
                                className="h-6 w-6 shrink-0 rounded-md flex items-center justify-center text-stone-300 dark:text-zinc-600 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all disabled:opacity-40 -mt-0.5 -mr-0.5"
                                title="Remove item"
                              >
                                {removingItems.includes(item.id)
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <X className="h-3.5 w-3.5" />
                                }
                              </button>
                            </div>

                            <p className="text-[11px] text-stone-400 dark:text-zinc-500 mb-3">
                              {formatMoney(item.unit_price, order.currency ?? "USD")} each
                            </p>

                            {/* Qty stepper + line total */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 bg-stone-100 dark:bg-zinc-800 rounded-lg p-0.5">
                                <button
                                  onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                  disabled={item.quantity <= 1 || loadingItems.includes(item.id)}
                                  className="h-6 w-6 rounded-md flex items-center justify-center text-stone-500 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-30 transition-all"
                                >
                                  <Minus className="h-2.5 w-2.5" />
                                </button>
                                <span className="w-7 text-center text-[13px] font-semibold text-zinc-800 dark:text-zinc-100 select-none">
                                  {loadingItems.includes(item.id)
                                    ? <Loader2 className="h-3 w-3 animate-spin mx-auto text-stone-400" />
                                    : item.quantity
                                  }
                                </span>
                                <button
                                  onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                  disabled={loadingItems.includes(item.id)}
                                  className="h-6 w-6 rounded-md flex items-center justify-center text-stone-500 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-30 transition-all"
                                >
                                  <Plus className="h-2.5 w-2.5" />
                                </button>
                              </div>

                              <span className="text-[15px] font-bold text-zinc-900 dark:text-white tabular-nums">
                                {formatMoney(item.total_price, order.currency ?? "USD")}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Order subtotal footer */}
                <div className="px-5 py-3 flex items-center justify-between bg-stone-50 dark:bg-zinc-800/40 border-t border-stone-100 dark:border-zinc-800">
                  <span className="text-[11px] text-stone-400 dark:text-zinc-500 font-medium uppercase tracking-wider">
                    Subtotal
                  </span>
                  <span className="text-[13px] font-bold text-zinc-700 dark:text-zinc-200 tabular-nums">
                    {formatMoney(sumOrderItems(order.order_items), order.currency ?? "USD")}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Perks row */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { icon: Truck, label: "Free shipping", sub: "On orders over $200" },
              { icon: RotateCcw, label: "Easy returns", sub: "30-day policy" },
              { icon: Lock, label: "Secure payment", sub: "Escrow protected" },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label}
                className="flex flex-col items-center text-center gap-1.5 
              py-4 px-3 bg-stone-50 dark:bg-zinc-900 rounded-sm
               border border-stone-100 dark:border-zinc-800">
                <Icon className="h-4 w-4 text-stone-400 dark:text-zinc-500" strokeWidth={1.5} />
                <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 leading-tight">{label}</span>
                <span className="text-[10px] text-stone-400 dark:text-zinc-500 leading-tight">{sub}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: ORDER SUMMARY ── */}
        <aside>
          <div className="sticky top-[calc(var(--navbar-height,64px)+24px)]">
            <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-2xl overflow-hidden">

              {/* Summary header */}
              <div className="px-5 pt-5 pb-4 border-b border-stone-100 dark:border-zinc-800">
                <h2 className="text-[15px] font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Tag className="h-4 w-4 text-[var(--color-accent)]" />
                  Order Summary
                </h2>
              </div>

              {/* Line items */}
              <div className="px-5 py-4 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-[13px] text-stone-500 dark:text-zinc-400">
                    Items ({totalItems})
                  </span>
                  <span className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-100 text-right max-w-[10rem] truncate tabular-nums">
                    {totalsLabel}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px] text-stone-500 dark:text-zinc-400">Shipping</span>
                  <span className="text-[13px] font-medium text-stone-400 dark:text-zinc-500">Calculated at checkout</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px] text-stone-500 dark:text-zinc-400">Estimated tax</span>
                  <span className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-100 tabular-nums">
                    {hasMixedCurrencies ? "—" : formatMoney(0, orders[0]?.currency ?? "USD")}
                  </span>
                </div>
              </div>

              {/* Total */}
              <div className="mx-5 mb-4 pt-4 border-t border-stone-100 dark:border-zinc-800 flex items-baseline justify-between">
                <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Total</span>
                <span className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight tabular-nums">
                  {totalsLabel}
                </span>
              </div>

              {/* CTA */}
              <div className="px-5 pb-5">
                <Button
                  asChild
                  className="w-full h-11 bg-zinc-900 dark:bg-white hover:opacity-90 text-white dark:text-zinc-900 font-semibold text-sm rounded-xl shadow-none border-0 group transition-opacity"
                >
                  <Link href="/checkout">
                    Proceed to Checkout
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </Button>

                {/* Trust note */}
                <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-stone-400 dark:text-zinc-500">
                  <Lock className="h-3 w-3" />
                  Secured by Jimvio Escrow
                </p>
              </div>

              {/* Help strip */}
              <div className="border-t border-stone-100 dark:border-zinc-800 px-5 py-3.5 flex items-center justify-between bg-stone-50 dark:bg-zinc-800/40">
                <div className="flex items-center gap-2 text-[12px] text-stone-500 dark:text-zinc-400">
                  <HelpCircle className="h-3.5 w-3.5 shrink-0" />
                  Need help?
                </div>
                <Link
                  href="/support"
                  className="text-[12px] font-medium text-[var(--color-accent)] hover:opacity-80 transition-opacity flex items-center gap-1"
                >
                  Contact support <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Logistics card */}
            <div className="mt-3 bg-zinc-950 dark:bg-zinc-800 rounded-2xl p-4 text-white overflow-hidden relative">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="h-4 w-4 text-[var(--color-accent)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-white mb-0.5">Jimvio Logistics</p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-400 leading-relaxed">
                    Real-time tracking via 20+ verified global carriers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}