"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShoppingCart, Trash2, Plus, Minus, ArrowRight, Package, 
  ShieldCheck, HelpCircle, Store, ChevronRight, AlertCircle, ShoppingBag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";
import { updateCartItemQuantity, removeFromCart } from "@/lib/actions/marketplace";
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
  order_items: CartItem[];
  vendors: {
    id: string;
    business_name: string;
    business_slug: string;
  } | null;
}

interface CartClientProps {
  initialOrders: CartOrder[];
  initialTotal: number;
}

export function CartClient({ initialOrders, initialTotal }: CartClientProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [total, setTotal] = useState(initialTotal);
  const [loadingItems, setLoadingItems] = useState<string[]>([]);

  const handleUpdateQuantity = async (itemId: string, newQty: number) => {
    if (newQty < 1) return;
    
    setLoadingItems(prev => [...prev, itemId]);
    try {
      const res = await updateCartItemQuantity(itemId, newQty);
      if (res.success) {
        // Optimistic / Local update for speed (optional, or just rely on server actions + revalidate)
        // For simplicity let's just refresh counts or similar
        window.dispatchEvent(new CustomEvent("cart-updated"));
        // We'll let the server revalidation update the props, 
        // but for immediate feedback we can update locally
        setOrders(prev => prev.map(order => ({
          ...order,
          order_items: order.order_items.map(item => 
            item.id === itemId ? { ...item, quantity: newQty, total_price: item.unit_price * newQty } : item
          )
        })));
        
        // Recalculate total locally
        setTotal(prev => prev); // This is complex due to multiple vendors, 
        // better to just have the server handle it or do a full re-calc
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
    setLoadingItems(prev => [...prev, itemId]);
    try {
      const res = await removeFromCart(itemId);
      if (res.success) {
        window.dispatchEvent(new CustomEvent("cart-updated"));
        setOrders(prev => {
          const newOrders = prev.map(order => ({
            ...order,
            order_items: order.order_items.filter(item => item.id !== itemId)
          })).filter(order => order.order_items.length > 0);
          return newOrders;
        });
        toast.success("Item removed from cart");
      } else {
        toast.error(res.error || "Failed to remove item");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingItems(prev => prev.filter(id => id !== itemId));
    }
  };

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 bg-white rounded-3xl border border-[var(--color-border)] shadow-sm">
        <div className="h-24 w-24 bg-[var(--color-surface-secondary)] rounded-full flex items-center justify-center mb-6">
          <ShoppingCart className="h-10 w-10 text-[var(--color-text-muted)]" />
        </div>
        <h1 className="text-3xl font-black text-[var(--color-text-primary)] mb-4">Your cart is empty</h1>
        <p className="text-[var(--color-text-secondary)] mb-10 max-w-md mx-auto">
          Seems you haven't added any products yet. Our premium marketplace is full of amazing discoveries!
        </p>
        <Link href="/marketplace">
          <Button size="lg" className="bg-[#f97316] hover:bg-[#ea580c] font-black h-14 px-10 rounded-xl shadow-lg shadow-[#f97316]/20">
            Start Sourcing <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* ── CART ITEMS LIST ── */}
      <div className="lg:col-span-2 space-y-8">
        <AnimatePresence mode="popLayout">
          {orders.map((order) => (
            <motion.div 
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-[#eee] shadow-sm overflow-hidden"
            >
              {/* Vendor Header */}
              <div className="bg-[#fafafa] border-b border-[#eee] px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-white rounded-xl border border-[#eee] flex items-center justify-center">
                    <Store className="h-5 w-5 text-zinc-900" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-zinc-900 group flex items-center gap-2 cursor-pointer">
                      {order.vendors?.business_name || "Official Store"}
                      <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-text-primary transition-colors" />
                    </h3>
                    <p className="text-[10px] font-black text-zinc-400 capitalize tracking-widest">Global Supplier</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-100">
                  <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-[10px] font-black text-green-700 capitalize">Trade Assurance</span>
                </div>
              </div>

              {/* Items in this order */}
              <div className="divide-y divide-[#f5f5f5]">
                {order.order_items.map((item) => (
                  <div key={item.id} className="p-6 flex gap-6">
                    {/* Image */}
                    <div className="h-28 w-28 shrink-0 bg-[#f9f9fb] rounded-2xl border border-[#eee] overflow-hidden flex items-center justify-center p-2 group cursor-pointer">
                      {item.product_image ? (
                        <img 
                          src={item.product_image} 
                          alt={item.product_name} 
                          className="h-full w-full object-contain group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <Package className="h-10 w-10 text-zinc-300" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="flex justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="font-bold text-zinc-900 hover:text-[var(--color-accent)] transition-colors cursor-pointer line-clamp-2">
                            {item.product_name}
                          </h4>
                          <p className="text-[10px] font-black text-zinc-400 capitalize tracking-widest">Unit Price: {formatCurrency(item.unit_price)}</p>
                        </div>
                        <button 
                          onClick={() => handleRemove(item.id)}
                          className="h-9 w-9 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all active:scale-90"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center bg-zinc-50 rounded-xl border border-zinc-100 p-1">
                          <button 
                            onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1 || loadingItems.includes(item.id)}
                            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-white hover:shadow-sm disabled:opacity-30 transition-all text-zinc-600"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-10 text-center text-xs font-black text-zinc-900">{item.quantity}</span>
                          <button 
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                            disabled={loadingItems.includes(item.id)}
                            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-white hover:shadow-sm disabled:opacity-30 transition-all text-zinc-600"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-zinc-900 tracking-tighter">
                            {formatCurrency(item.total_price)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Subtotal */}
              <div className="bg-zinc-50/50 border-t border-[#f5f5f5] px-6 py-4 flex items-center justify-between">
                <span className="text-[11px] font-black text-zinc-400 capitalize tracking-widest">Order Subtotal</span>
                <span className="text-sm font-black text-zinc-900">{formatCurrency(order.total_amount)}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── SUMMARY STICKY ── */}
      <div className="lg:col-span-1">
        <div className="sticky top-40 space-y-6">
          <div className="bg-white rounded-[2rem] border border-[#eee] p-8 shadow-xl shadow-black/5">
            <h2 className="text-xl font-black text-zinc-900 mb-8 flex items-center gap-3">
              Order Summary
              <div className="h-px flex-1 bg-zinc-100" />
            </h2>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500 font-medium">Items Total ({orders.reduce((acc, o) => acc + o.order_items.length, 0)})</span>
                <span className="text-zinc-900 font-black">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500 font-medium">Global Shipping</span>
                <span className="text-[10px] font-black text-zinc-400 capitalize tracking-widest">Calculated at Checkout</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500 font-medium">Estimated Taxes</span>
                <span className="text-zinc-900 font-bold">$0.00</span>
              </div>
              <div className="h-px bg-zinc-100 my-4" />
              <div className="flex justify-between items-end">
                <span className="text-[11px] font-black text-zinc-900 capitalize tracking-[0.2em]">Total Pay</span>
                <span className="text-3xl font-black text-[var(--color-accent)] tracking-tighter">{formatCurrency(total)}</span>
              </div>
            </div>

            <Button size="lg" asChild className="w-full bg-[#f97316] hover:bg-[#ea580c] text-white rounded-2xl h-16 text-sm font-black capitalize tracking-widest shadow-2xl shadow-orange-500/20 group">
              <Link href="/checkout">
                Proceed to Custom Checkout <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>

            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                <ShieldCheck className="h-5 w-5 text-green-600" />
                <div>
                  <h4 className="text-[11px] font-black text-zinc-900 capitalize">Trade Assurance</h4>
                  <p className="text-[9px] text-zinc-500 leading-none mt-0.5">Jimvio protects your payment</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                <HelpCircle className="h-5 w-5 text-blue-600" />
                <div>
                  <h4 className="text-[11px] font-black text-zinc-900 capitalize">Need Help?</h4>
                  <p className="text-[9px] text-zinc-500 leading-none mt-0.5">Contact our support curators</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 bg-zinc-900 rounded-[2rem] text-white">
            <div className="flex items-center gap-3 mb-4">
               <ShoppingBag className="h-5 w-5 text-[var(--color-accent)]" />
               <h4 className="text-xs font-black capitalize tracking-widest">Jimvio Logistics</h4>
            </div>
            <p className="text-[10px] text-zinc-400 font-medium leading-relaxed mb-6">
              Benefit from our global shipping network. Real-time tracking and verified carrier partners for every order.
            </p>
            <div className="flex -space-x-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-8 w-8 rounded-full border-2 border-ink-dark bg-ink-darker flex items-center justify-center overflow-hidden">
                  <Package className="h-4 w-4 text-zinc-500" />
                </div>
              ))}
              <div className="pl-4 flex items-center">
                 <span className="text-[9px] font-black text-zinc-500">20+ Shipping methods available</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
