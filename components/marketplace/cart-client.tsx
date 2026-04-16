"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, Trash2, Plus, Minus, ArrowRight,
  Package, ShieldCheck, Store, ChevronRight,
  HelpCircle, Loader2, ShoppingBag, Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateCartItemQuantity, removeFromCart } from "@/lib/actions/marketplace";
import { useCurrency } from "@/context/CurrencyContext";
import { toast } from "sonner";

interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  order_id: string;
}

interface CartOrder {
  id: string;
  vendor_id: string;
  status: string;
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

  useEffect(() => { setOrders(initialOrders); }, [initialOrders]);

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
    } finally {
      setLoadingItems(prev => prev.filter(id => id !== itemId));
    }
  };

  const handleRemove = async (itemId: string) => {
    // Optimistically start exit animation
    setRemovingItems(prev => [...prev, itemId]);
    try {
      const res = await removeFromCart(itemId);
      if (res.success) {
        window.dispatchEvent(new CustomEvent("cart-updated"));
        setOrders(prev => {
          const next = prev
            .map(order => {
              const order_items = order.order_items.filter(item => item.id !== itemId);
              const lineSum = sumOrderItems(order_items);
              return { ...order, order_items, total_amount: lineSum, subtotal: lineSum };
            })
            .filter(order => order.order_items.length > 0);
          return next;
        });
        toast.success("Removed from cart");
        router.refresh();
      } else {
        // Revert animation if failed
        setRemovingItems(prev => prev.filter(id => id !== itemId));
        toast.error(res.error || "Failed to remove item");
      }
    } catch (err) {
      setRemovingItems(prev => prev.filter(id => id !== itemId));
      console.error(err);
    }
  };

  // ── EMPTY STATE ──
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-24 bg-surface dark:bg-zinc-900 rounded-2xl border border-border shadow-sm">
        <div className="h-20 w-20 bg-stone-50 dark:bg-zinc-800 border-2 border-dashed border-border rounded-2xl flex items-center justify-center mb-5">
          <ShoppingCart className="h-9 w-9 text-stone-300 dark:text-stone-600" />
        </div>
        <h2 className="text-xl font-black text-zinc-800 dark:text-zinc-200 mb-2">Your cart is empty</h2>
        <p className="text-sm text-stone-400 dark:text-stone-500 font-medium mb-8 max-w-xs">
          You haven't added any products yet. Explore the marketplace to get started.
        </p>
        <Button asChild className="h-10 px-6 rounded-xl font-black text-xs uppercase tracking-widest bg-[var(--color-accent)] text-white hover:brightness-110 border-0">
          <Link href="/marketplace">
            <ShoppingBag className="mr-2 h-4 w-4" /> Browse Products
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] gap-6">

      {/* ══ CART ITEMS ══ */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {orders.map(order => (
            <motion.div
              key={order.id}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -8 }}
              transition={{ duration: 0.2 }}
              className="bg-surface dark:bg-zinc-900 rounded-xl border border-border shadow-sm overflow-hidden"
            >
              {/* Vendor header */}
              <div className="bg-stone-50 dark:bg-zinc-800 border-b border-border px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 bg-surface dark:bg-zinc-900 rounded-lg border border-border flex items-center justify-center">
                    <Store className="h-4 w-4 text-stone-500 dark:text-stone-400" />
                  </div>
                  <div>
                    <Link
                      href={`/vendors/${order.vendors?.business_slug}`}
                      className="text-xs font-black text-zinc-800 dark:text-zinc-200 hover:text-[var(--color-accent)] transition-colors flex items-center gap-1"
                    >
                      {order.vendors?.business_name || "Official Store"}
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                    <p className="text-[9px] font-semibold text-zinc-400 uppercase tracking-widest">Global Supplier</p>
                  </div>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-black text-green-700 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full">
                  <ShieldCheck className="h-3 w-3" /> Trade Assured
                </span>
              </div>

              {/* Items */}
              <div className="divide-y divide-border">
                <AnimatePresence mode="popLayout" initial={false}>
                  {order.order_items.map(item => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 1, height: "auto" }}
                      animate={
                        removingItems.includes(item.id)
                          ? { opacity: 0, height: 0, overflow: "hidden" }
                          : { opacity: 1, height: "auto" }
                      }
                      exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="p-4 flex gap-4">
                        {/* Thumbnail */}
                        <div className="relative h-20 w-20 shrink-0 bg-stone-50 dark:bg-zinc-800 rounded-lg border border-border overflow-hidden">
                          {item.product_image && !imageErrors[item.id] ? (
                            <Image
                              src={item.product_image}
                              alt={item.product_name}
                              fill
                              sizes="80px"
                              className="object-contain p-1"
                              onError={() => setImageErrors(prev => ({ ...prev, [item.id]: true }))}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl font-black text-zinc-200 uppercase">
                              {item.product_name.charAt(0)}
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="text-xs font-black text-zinc-800 dark:text-zinc-200 line-clamp-2 leading-snug flex-1">
                              {item.product_name}
                            </p>
                            {/* Remove button */}
                            <button
                              onClick={() => handleRemove(item.id)}
                              disabled={removingItems.includes(item.id)}
                              className="h-7 w-7 shrink-0 rounded-lg flex items-center justify-center text-stone-300 dark:text-stone-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all disabled:opacity-50"
                              title="Remove"
                            >
                              {removingItems.includes(item.id) ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>

                          <p className="text-[10px] text-zinc-400 font-medium mb-3">
                            Unit: {formatMoney(item.unit_price, order.currency ?? "USD")}
                          </p>

                          {/* Qty + line total */}
                          <div className="flex items-center justify-between">
                            {/* Compact qty stepper */}
                            <div className="flex items-center gap-0.5 bg-stone-50 dark:bg-zinc-800 border border-border rounded-lg p-0.5">
                              <button
                                onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1 || loadingItems.includes(item.id)}
                                className="h-6 w-6 rounded-md flex items-center justify-center text-stone-400 dark:text-stone-500 hover:bg-surface dark:hover:bg-zinc-900 hover:text-stone-700 dark:hover:text-stone-300 disabled:opacity-30 transition-all"
                              >
                                <Minus className="h-2.5 w-2.5" />
                              </button>
                              <span className="w-7 text-center text-xs font-black text-stone-800 dark:text-stone-200">
                                {loadingItems.includes(item.id)
                                  ? <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                                  : item.quantity
                                }
                              </span>
                              <button
                                onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                disabled={loadingItems.includes(item.id)}
                                className="h-6 w-6 rounded-md flex items-center justify-center text-stone-400 dark:text-stone-500 hover:bg-surface dark:hover:bg-zinc-900 hover:text-stone-700 dark:hover:text-stone-300 disabled:opacity-30 transition-all"
                              >
                                <Plus className="h-2.5 w-2.5" />
                              </button>
                            </div>

                            <span className="text-sm font-black text-zinc-900 dark:text-white">
                              {formatMoney(item.total_price, order.currency ?? "USD")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Order subtotal */}
              <div className="bg-stone-50 dark:bg-[var(--color-bg)] border-t border-border px-5 py-2.5 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">Order Subtotal</span>
                <span className="text-xs font-black text-stone-800 dark:text-stone-200">
                  {formatMoney(sumOrderItems(order.order_items), order.currency ?? "USD")}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Continue shopping */}
        <Link href="/marketplace" className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-[var(--color-accent)] transition-colors pt-2">
          <ChevronRight className="h-3.5 w-3.5 rotate-180" /> Continue Shopping
        </Link>
      </div>

      {/* ══ ORDER SUMMARY SIDEBAR ══ */}
      <aside>
        <div className="sticky top-[calc(var(--navbar-height,64px)+56px)] space-y-4">

          {/* Summary card */}
          <div className="bg-surface dark:bg-zinc-900 rounded-xl border border-border shadow-sm p-5 space-y-5">
            <h2 className="text-sm font-black text-stone-900 dark:text-white flex items-center gap-2">
              <Tag className="h-4 w-4 text-[var(--color-accent)]" />
              Order Summary
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-stone-500 dark:text-stone-400">Items ({totalItems})</span>
                <span className="font-black text-stone-800 dark:text-stone-200 text-right max-w-[10rem] truncate">{totalsLabel}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-stone-500 dark:text-stone-400">Shipping</span>
                <span className="text-stone-400 dark:text-stone-500 font-semibold">At Checkout</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-stone-500 dark:text-stone-400">Estimated Tax</span>
                <span className="text-stone-800 dark:text-stone-200 font-bold">
                  {hasMixedCurrencies ? "—" : formatMoney(0, orders[0]?.currency ?? "USD")}
                </span>
              </div>
            </div>

            <div className="border-t border-border pt-4 flex items-end justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Total</span>
              <span className="text-2xl font-black text-[var(--color-accent)] tracking-tight">{totalsLabel}</span>
            </div>

            <Button
              asChild
              className="w-full h-11 bg-[var(--color-accent)] hover:brightness-110 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-[var(--color-accent)]/20 border-0 group transition-all"
            >
              <Link href="/checkout">
                Proceed to Checkout
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </Button>

            {/* Trust badges */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center gap-3 bg-green-50 p-3 rounded-lg border border-green-100">
                <ShieldCheck className="h-4 w-4 text-green-600 shrink-0" />
                <div>
                  <p className="text-[10px] font-black text-zinc-800 dark:text-zinc-200">Trade Assurance</p>
                  <p className="text-[9px] text-zinc-500">Jimvio escrow protects all payments</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-blue-50/60 p-3 rounded-lg border border-blue-100/60">
                <HelpCircle className="h-4 w-4 text-blue-500 shrink-0" />
                <div>
                  <p className="text-[10px] font-black text-zinc-800 dark:text-zinc-200">Need Help?</p>
                  <p className="text-[9px] text-zinc-500">Contact our support curators</p>
                </div>
              </div>
            </div>
          </div>

          {/* Logistics promo card */}
          <div className="bg-zinc-900 rounded-xl p-5 text-white relative overflow-hidden">
            <div className="absolute -top-4 -right-4 h-20 w-20 bg-[var(--color-accent)]/10 rounded-full blur-xl" />
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-4 w-4 text-[var(--color-accent)]" />
              <h4 className="text-[10px] font-black uppercase tracking-widest">Jimvio Logistics</h4>
            </div>
            <p className="text-[10px] text-zinc-400 leading-relaxed mb-4">
              Real-time tracking and verified carrier partners. Global shipping network for all orders.
            </p>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-6 w-6 rounded-full bg-zinc-700 border-2 border-zinc-900 flex items-center justify-center">
                    <Package className="h-3 w-3 text-zinc-400" />
                  </div>
                ))}
              </div>
              <span className="text-[9px] font-bold text-zinc-500">20+ shipping methods</span>
            </div>
          </div>

        </div>
      </aside>
    </div>
  );
}
