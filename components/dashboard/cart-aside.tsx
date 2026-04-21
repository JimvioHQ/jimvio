"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ShoppingCart, Trash2, Plus, Minus, ArrowRight,
  Package, ShieldCheck, Store, ChevronRight,
  HelpCircle, Loader2, ShoppingBag, Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateCartItemQuantity, removeFromCart } from "@/lib/actions/marketplace";
import { useCurrency } from "@/context/CurrencyContext";
import { useCartStore } from "@/lib/store/use-cart-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CartAsideProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartAside({ isOpen, onClose }: CartAsideProps) {
  const router = useRouter();
  const { formatMoney, formatCartTotalsLabel } = useCurrency();
  const { orders, refreshCart, isLoading, cartCount } = useCartStore();
  const [loadingItems, setLoadingItems] = useState<string[]>([]);
  const [removingItems, setRemovingItems] = useState<string[]>([]);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      refreshCart();
    }
  }, [isOpen, refreshCart]);

  const totalsLabel = useMemo(() => formatCartTotalsLabel(orders), [orders, formatCartTotalsLabel]);
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
        refreshCart();
        window.dispatchEvent(new CustomEvent("cart-updated"));
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
    setRemovingItems(prev => [...prev, itemId]);
    try {
      const res = await removeFromCart(itemId);
      if (res.success) {
        refreshCart();
        window.dispatchEvent(new CustomEvent("cart-updated"));
        toast.success("Removed from cart");
      } else {
        setRemovingItems(prev => prev.filter(id => id !== itemId));
        toast.error(res.error || "Failed to remove item");
      }
    } catch (err) {
      setRemovingItems(prev => prev.filter(id => id !== itemId));
      console.error(err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-[200]"
          />

          {/* Aside Panel */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-[400px] bg-white dark:bg-surface shadow-2xl z-[201] flex flex-col border-l border-zinc-100 dark:border-border"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 dark:border-border">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-zinc-900 dark:text-white" />
                <h2 className="text-lg font-black text-zinc-900 dark:text-white">Your Cart</h2>
                <span className="bg-zinc-100 text-zinc-500 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {cartCount}
                </span>
              </div>
              <button 
                onClick={onClose}
                className="h-8 w-8 rounded-full hover:bg-zinc-100 flex items-center justify-center transition-colors"
              >
                <X className="h-5 w-5 text-zinc-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isLoading && orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-300">
                  <Loader2 className="h-8 w-8 animate-spin mb-4" />
                  <p className="text-sm font-bold">Updating your cart...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="h-16 w-16 bg-zinc-50 dark:bg-surface/50 rounded-2xl flex items-center justify-center mb-4">
                    <ShoppingCart className="h-8 w-8 text-zinc-200" />
                  </div>
                  <h3 className="text-base font-black text-zinc-800 dark:text-text-secondary">Your cart is empty</h3>
                  <p className="text-sm text-zinc-400 font-medium px-10 mt-1">
                    Add products from the marketplace to see them here.
                  </p>
                  <Button 
                    variant="outline"
                    onClick={onClose}
                    className="mt-6 rounded-xl font-black text-[11px] uppercase tracking-wider"
                  >
                    Start Shopping
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {orders.map((order) => (
                    <div key={order.id} className="space-y-4">
                      {/* Vendor title */}
                      <div className="flex items-center gap-2 text-[11px] font-black text-zinc-400 uppercase tracking-widest">
                        <Store className="h-3.5 w-3.5" />
                        {order.vendors?.business_name}
                      </div>
                      
                      {/* Items */}
                      <div className="space-y-4">
                        {order.order_items.map((item: any) => (
                          <div key={item.id} className="flex gap-4 group">
                            <div className="relative h-16 w-16 shrink-0 bg-zinc-50 dark:bg-surface/50 rounded-xl border border-zinc-100 dark:border-border overflow-hidden">
                              {item.product_image && !imageErrors[item.id] ? (
                                <Image
                                  src={item.product_image}
                                  alt={item.product_name}
                                  fill
                                  className="object-cover"
                                  onError={() => setImageErrors(prev => ({ ...prev, [item.id]: true }))}
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-zinc-200 uppercase font-black">
                                  {item.product_name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-2">
                                <h4 className="text-[13px] font-bold text-zinc-800 dark:text-text-secondary leading-tight line-clamp-2">
                                  {item.product_name}
                                </h4>
                                <button
                                  onClick={() => handleRemove(item.id)}
                                  className="text-zinc-300 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center h-6 border border-zinc-100 dark:border-border rounded-lg overflow-hidden bg-zinc-50/50">
                                    <button 
                                      onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                      className="px-2 h-full hover:bg-zinc-100 transition-colors"
                                    >
                                      <Minus className="h-2.5 w-2.5" />
                                    </button>
                                    <span className="w-6 text-center text-[10px] font-black">
                                      {item.quantity}
                                    </span>
                                    <button 
                                      onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                      className="px-2 h-full hover:bg-zinc-100 transition-colors"
                                    >
                                      <Plus className="h-2.5 w-2.5" />
                                    </button>
                                  </div>
                                </div>
                                <span className="text-[13px] font-black text-zinc-900 dark:text-white">
                                  {formatMoney(item.total_price, order.currency ?? "USD")}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="h-px bg-zinc-100" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Summary */}
            {orders.length > 0 && (
              <div className="p-6 bg-zinc-50/50 border-t border-zinc-100 dark:border-border space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium text-zinc-500">
                    <span>Subtotal</span>
                    <span className="text-zinc-900 dark:text-white font-bold">{totalsLabel}</span>
                  </div>
                  <div className="flex justify-between text-xs font-medium text-zinc-500">
                    <span>Shipping estim.</span>
                    <span className="text-green-600 font-black">At Checkout</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-zinc-200/50 flex items-center justify-between">
                  <span className="text-sm font-black text-zinc-900 dark:text-white">Est. Total</span>
                  <span className="text-xl font-black text-[var(--color-accent)]">{totalsLabel}</span>
                </div>
                <div className="grid grid-cols-1 gap-3 pt-2">
                  <Button 
                    asChild
                    className="w-full h-12 bg-zinc-900 hover:bg-black text-white rounded-2xl font-black text-sm shadow-xl shadow-zinc-900/20"
                  >
                    <Link href="/checkout" onClick={onClose}>
                      Proceed to Checkout <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <button 
                    onClick={onClose}
                    className="text-[11px] font-black text-zinc-400 uppercase tracking-widest hover:text-zinc-600 transition-colors"
                  >
                    Continue Sourcing
                  </button>
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
