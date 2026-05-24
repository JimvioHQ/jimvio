// "use client";

// import React, { useEffect, useMemo, useRef, useState } from "react";
// import Link from "next/link";
// import Image from "next/image";
// import { useRouter, useSearchParams } from "next/navigation";
// import { motion, AnimatePresence } from "framer-motion";
// import {
//   Minus, Plus, Loader2, Store, ShieldCheck,
//   ChevronRight, ShoppingBag,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { updateCartItemQuantity, removeFromCart } from "@/lib/actions/marketplace";
// import { useCurrency } from "@/context/CurrencyContext";
// import { formatAggregatedCartTotalInDisplayCurrency, CartOrderLikeForTotal } from "@/lib/currency/format";
// import { toast } from "sonner";
// import { cn } from "@/lib/utils";

// // ─── Types matching the new cart_items shape from getCart() ─────────────────

// interface CartItemProduct {
//   id: string;
//   name: string;
//   slug: string | null;
//   images: string[] | null;
//   source: string | null;
//   pricing_type: string | null;
//   billing_period: string | null;
//   product_type: string | null;
// }

// interface CartItemVariant {
//   id: string;
//   name: string | null;
//   options: Record<string, string> | null;
//   image_url: string | null;
// }

// interface CartItemVendor {
//   id: string;
//   business_name: string;
//   business_slug: string;
//   verification_status?: string | null;
// }

// export interface CartItem {
//   id: string;
//   cart_id: string;
//   product_id: string;
//   variant_id: string | null;
//   vendor_id: string;
//   quantity: number;
//   unit_price_at_add: number;
//   currency_at_add: string;
//   product_source: string;
//   source_metadata: Record<string, unknown>;
//   affiliate_link_id: string | null;
//   added_at: string;
//   updated_at: string;
//   // joined relations
//   products: CartItemProduct | null;
//   product_variants: CartItemVariant | null;
//   vendors: CartItemVendor | null;
// }

// interface CartClientProps {
//   initialItems: CartItem[];
// }

// // ─── Checkout error messages (matches codes from /checkout page) ────────────

// const CHECKOUT_ERROR_MESSAGES: Record<string, string> = {
//   order_not_found: "That order couldn't be found or has already been paid.",
//   mixed_products: "Your cart has both digital and physical items. Please check them out separately.",
//   checkout_failed: "We couldn't start your checkout. Please try again or contact support.",
//   no_items: "Your cart is empty.",
//   stale_order: "There was a problem creating your order. Please try again.",
// };

// // ─── Helpers ─────────────────────────────────────────────────────────────────

// /** Group flat cart items by vendor for display */
// function groupByVendor(items: CartItem[]): Map<string, CartItem[]> {
//   const map = new Map<string, CartItem[]>();
//   for (const item of items) {
//     const key = item.vendor_id;
//     if (!map.has(key)) map.set(key, []);
//     map.get(key)!.push(item);
//   }
//   return map;
// }

// function vendorSubtotal(items: CartItem[]): number {
//   return items.reduce((s, i) => s + Number(i.unit_price_at_add) * Number(i.quantity), 0);
// }

// /** Convert flat items to the shape formatAggregatedCartTotalInDisplayCurrency expects */
// function itemsToCartOrders(items: CartItem[]): CartOrderLikeForTotal[] {
//   const map = new Map<string, number>();
//   for (const item of items) {
//     const c = (item.currency_at_add || "RWF").toUpperCase();
//     map.set(c, (map.get(c) ?? 0) + Number(item.unit_price_at_add) * Number(item.quantity));
//   }
//   return [...map.entries()].map(([currency, total]) => ({
//     currency,
//     order_items: [{ total_price: total }],
//   }));
// }

// // ─── Quantity input ──────────────────────────────────────────────────────────

// function QtyInput({
//   value, max, loading, onChange,
// }: {
//   value: number;
//   max?: number;
//   loading: boolean;
//   onChange: (n: number) => void;
// }) {
//   const [local, setLocal] = useState(value.toString());

//   useEffect(() => {
//     if (!loading) setLocal(value.toString());
//   }, [value, loading]);

//   const commit = () => {
//     const n = parseInt(local, 10);
//     if (isNaN(n) || n < 1) { setLocal(value.toString()); return; }
//     const clamped = max ? Math.min(n, max) : n;
//     if (clamped !== value) onChange(clamped);
//     else setLocal(value.toString());
//   };

//   return (
//     <div className="inline-flex items-center border border-stone-300 dark:border-zinc-700 rounded-md overflow-hidden bg-white dark:bg-zinc-900">
//       <button
//         onClick={() => value > 1 && onChange(value - 1)}
//         disabled={value <= 1 || loading}
//         aria-label="Decrease"
//         className="h-8 w-8 flex items-center justify-center text-stone-600 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800 disabled:text-stone-300 disabled:hover:bg-transparent dark:disabled:text-zinc-700"
//       >
//         <Minus className="h-3 w-3" />
//       </button>
//       <input
//         type="text"
//         inputMode="numeric"
//         value={loading ? value : local}
//         onChange={(e) => setLocal(e.target.value.replace(/\D/g, ""))}
//         onBlur={commit}
//         onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
//         disabled={loading}
//         aria-label="Quantity"
//         className="w-9 h-8 text-center text-[13px] font-medium text-zinc-900 dark:text-zinc-100 bg-transparent outline-none border-x border-stone-300 dark:border-zinc-700 tabular-nums"
//       />
//       <button
//         onClick={() => (!max || value < max) && onChange(value + 1)}
//         disabled={(max ? value >= max : false) || loading}
//         aria-label="Increase"
//         className="h-8 w-8 flex items-center justify-center text-stone-600 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800 disabled:text-stone-300 disabled:hover:bg-transparent dark:disabled:text-zinc-700"
//       >
//         <Plus className="h-3 w-3" />
//       </button>
//     </div>
//   );
// }

// // ─── Main component ──────────────────────────────────────────────────────────

// export function CartClient({ initialItems }: CartClientProps) {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const { formatMoney, displayCurrency, rates } = useCurrency();
//   const [items, setItems] = useState<CartItem[]>(initialItems ?? []);
//   const [loadingItems, setLoadingItems] = useState<string[]>([]);
//   const [removingItems, setRemovingItems] = useState<string[]>([]);
//   const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
//   const hasMountedRef = useRef(false);

//   useEffect(() => {
//     if (!hasMountedRef.current) { hasMountedRef.current = true; return; }
//     setItems(initialItems ?? []);
//   }, [initialItems]);

//   // ✅ Read ?error=... and ?detail=... from checkout redirect, show toast, clean URL
//   useEffect(() => {
//     const code = searchParams.get("error");
//     if (!code) return;

//     const message = CHECKOUT_ERROR_MESSAGES[code] ?? "Something went wrong.";
//     const detail = searchParams.get("detail");

//     toast.error(message, {
//       description: detail || undefined,
//       duration: 6000,
//     });

//     // Clean the URL so the toast doesn't re-fire on refresh or navigation back.
//     const url = new URL(window.location.href);
//     url.searchParams.delete("error");
//     url.searchParams.delete("detail");
//     window.history.replaceState({}, "", url.toString());
//   }, [searchParams]);

//   const vendorGroups = useMemo(() => groupByVendor(items), [items]);

//   const totalUnits = items.reduce((s, i) => s + Number(i.quantity), 0);

//   const totalsLabel = useMemo(() => {
//     const cartOrders = itemsToCartOrders(items);
//     return formatAggregatedCartTotalInDisplayCurrency(cartOrders, displayCurrency, rates);
//   }, [items, displayCurrency, rates]);

//   const hasMixedCurrencies = useMemo(
//     () => new Set(items.map((i) => (i.currency_at_add || "RWF").toUpperCase())).size > 1,
//     [items]
//   );

//   const handleUpdateQuantity = async (itemId: string, newQty: number) => {
//     if (newQty < 1) return;
//     setLoadingItems((p) => [...p, itemId]);

//     // Optimistic update
//     setItems((prev) =>
//       prev.map((i) => i.id === itemId ? { ...i, quantity: newQty } : i)
//     );

//     try {
//       const res = await updateCartItemQuantity(itemId, newQty);
//       if (res.success) {
//         window.dispatchEvent(new CustomEvent("cart-updated"));
//         router.refresh();
//       } else {
//         toast.error(res.error || "Couldn't update quantity");
//         router.refresh();
//       }
//     } catch (err) {
//       console.error(err);
//       toast.error("Something went wrong");
//       router.refresh();
//     } finally {
//       setLoadingItems((p) => p.filter((id) => id !== itemId));
//     }
//   };

//   const handleRemove = async (itemId: string) => {
//     setRemovingItems((p) => [...p, itemId]);
//     try {
//       const res = await removeFromCart(itemId);
//       if (res.success) {
//         window.dispatchEvent(new CustomEvent("cart-updated"));
//         setItems((prev) => prev.filter((i) => i.id !== itemId));
//         router.refresh();
//       } else {
//         toast.error(res.error || "Couldn't remove item");
//       }
//     } catch (err) {
//       console.error(err);
//       toast.error("Something went wrong");
//     } finally {
//       setRemovingItems((p) => p.filter((id) => id !== itemId));
//     }
//   };

//   // ─── Empty state ────────────────────────────────────────────────────────────

//   if (items.length === 0) {
//     return (
//       <div className="max-w-md mx-auto py-20 text-center">
//         <div className="h-16 w-16 mx-auto mb-5 rounded-full bg-stone-100 dark:bg-zinc-800 flex items-center justify-center">
//           <ShoppingBag className="h-7 w-7 text-stone-400 dark:text-zinc-500" strokeWidth={1.5} />
//         </div>
//         <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
//           Your cart is empty
//         </h2>
//         <p className="text-sm text-stone-500 dark:text-zinc-400 mb-6">
//           Add items to your cart to checkout.
//         </p>
//         <Button
//           asChild
//           className="h-10 px-6 rounded-md text-sm bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 font-medium"
//         >
//           <Link href="/marketplace">Browse marketplace</Link>
//         </Button>
//       </div>
//     );
//   }

//   // ─── Cart ───────────────────────────────────────────────────────────────────

//   return (
//     <div>
//       {/* Header */}
//       <div className="flex items-center justify-between mb-5 pb-4 border-b border-stone-200 dark:border-zinc-800">
//         <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">
//           Shopping cart
//           <span className="ml-2 text-sm font-normal text-stone-500 dark:text-zinc-400">
//             ({totalUnits} {totalUnits === 1 ? "item" : "items"})
//           </span>
//         </h1>
//         <Link
//           href="/marketplace"
//           className="hidden sm:inline text-sm text-stone-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:underline"
//         >
//           Continue shopping
//         </Link>
//       </div>

//       <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
//         {/* Left column — grouped by vendor */}
//         <div className="space-y-4">
//           <AnimatePresence mode="popLayout" initial={false}>
//             {[...vendorGroups.entries()].map(([vendorId, vendorItems]) => {
//               const vendor = vendorItems[0]?.vendors;
//               const isVerified = vendor?.verification_status === "verified";
//               const subtotal = vendorSubtotal(vendorItems);
//               const currency = vendorItems[0]?.currency_at_add ?? "RWF";

//               return (
//                 <motion.div
//                   key={vendorId}
//                   layout
//                   initial={{ opacity: 0 }}
//                   animate={{ opacity: 1 }}
//                   exit={{ opacity: 0 }}
//                   transition={{ duration: 0.18 }}
//                   className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-md"
//                 >
//                   {/* Vendor header */}
//                   <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-200 dark:border-zinc-800 bg-stone-50/50 dark:bg-zinc-900/50">
//                     <Link
//                       href={`/vendors/${vendor?.business_slug ?? "#"}`}
//                       className="flex items-center gap-2 min-w-0"
//                     >
//                       <Store className="h-3.5 w-3.5 text-stone-500 dark:text-zinc-400 shrink-0" />
//                       <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate hover:underline">
//                         {vendor?.business_name || "Marketplace"}
//                       </span>
//                       {isVerified && (
//                         <ShieldCheck
//                           className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500 shrink-0"
//                           aria-label="Verified seller"
//                         />
//                       )}
//                     </Link>
//                   </div>

//                   {/* Items */}
//                   <div className="divide-y divide-stone-100 dark:divide-zinc-800">
//                     <AnimatePresence mode="popLayout" initial={false}>
//                       {vendorItems.map((item) => {
//                         const isLoading = loadingItems.includes(item.id);
//                         const isRemoving = removingItems.includes(item.id);
//                         const product = item.products;
//                         const variant = item.product_variants;
//                         const image =
//                           variant?.image_url ||
//                           product?.images?.[0] ||
//                           null;
//                         const slug = product?.slug ?? null;
//                         const name = product?.name ?? "Product";
//                         const variantLabel = variant?.name
//                           ?? (variant?.options
//                             ? Object.values(variant.options).join(" / ")
//                             : null);
//                         const lineTotal = Number(item.unit_price_at_add) * Number(item.quantity);

//                         return (
//                           <motion.div
//                             key={item.id}
//                             layout
//                             exit={{ opacity: 0, height: 0 }}
//                             transition={{ duration: 0.18 }}
//                             className={cn("overflow-hidden", isRemoving && "opacity-50")}
//                           >
//                             <div className="px-4 py-4 flex gap-3.5">
//                               {/* Thumbnail */}
//                               <Link
//                                 href={slug ? `/product/${slug}` : "#"}
//                                 className="relative h-20 w-20 sm:h-[88px] sm:w-[88px] shrink-0 bg-stone-50 dark:bg-zinc-800 rounded border border-stone-200 dark:border-zinc-700 overflow-hidden"
//                               >
//                                 {image && !imageErrors[item.id] ? (
//                                   <Image
//                                     src={image}
//                                     alt={name}
//                                     fill
//                                     sizes="88px"
//                                     className="object-cover"
//                                     onError={() =>
//                                       setImageErrors((p) => ({ ...p, [item.id]: true }))
//                                     }
//                                   />
//                                 ) : (
//                                   <div className="w-full h-full flex items-center justify-center">
//                                     <ShoppingBag
//                                       className="h-5 w-5 text-stone-300 dark:text-zinc-600"
//                                       strokeWidth={1.5}
//                                     />
//                                   </div>
//                                 )}
//                               </Link>

//                               {/* Details */}
//                               <div className="flex-1 min-w-0">
//                                 <div className="flex justify-between items-start gap-3 mb-1">
//                                   <Link
//                                     href={slug ? `/product/${slug}` : "#"}
//                                     className="text-sm text-zinc-900 dark:text-zinc-100 hover:underline line-clamp-2 leading-snug"
//                                   >
//                                     {name}
//                                   </Link>
//                                   <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 tabular-nums shrink-0">
//                                     {formatMoney(lineTotal, currency)}
//                                   </p>
//                                 </div>

//                                 {variantLabel && (
//                                   <p className="text-xs text-stone-500 dark:text-zinc-400 mb-1">
//                                     {variantLabel}
//                                   </p>
//                                 )}

//                                 <p className="text-xs text-stone-500 dark:text-zinc-400 tabular-nums mb-2.5">
//                                   {formatMoney(item.unit_price_at_add, currency)} each
//                                 </p>

//                                 <div className="flex items-center justify-between gap-3">
//                                   <QtyInput
//                                     value={item.quantity}
//                                     loading={isLoading}
//                                     onChange={(q) => handleUpdateQuantity(item.id, q)}
//                                   />

//                                   <button
//                                     onClick={() => handleRemove(item.id)}
//                                     disabled={isRemoving}
//                                     className="text-xs text-stone-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-500 hover:underline disabled:opacity-50"
//                                   >
//                                     {isRemoving ? (
//                                       <span className="inline-flex items-center gap-1">
//                                         <Loader2 className="h-3 w-3 animate-spin" />
//                                         Removing
//                                       </span>
//                                     ) : (
//                                       "Remove"
//                                     )}
//                                   </button>
//                                 </div>
//                               </div>
//                             </div>
//                           </motion.div>
//                         );
//                       })}
//                     </AnimatePresence>
//                   </div>

//                   {/* Vendor subtotal */}
//                   <div className="px-4 py-2.5 border-t border-stone-200 dark:border-zinc-800 flex justify-between text-sm">
//                     <span className="text-stone-600 dark:text-zinc-400">Items subtotal</span>
//                     <span className="font-medium text-zinc-900 dark:text-zinc-100 tabular-nums">
//                       {formatMoney(subtotal, currency)}
//                     </span>
//                   </div>
//                 </motion.div>
//               );
//             })}
//           </AnimatePresence>

//           <Link
//             href="/marketplace"
//             className="sm:hidden inline-flex items-center gap-1 text-sm text-stone-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:underline pt-2"
//           >
//             <ChevronRight className="h-3.5 w-3.5 rotate-180" />
//             Continue shopping
//           </Link>
//         </div>

//         {/* Right column — summary */}
//         <aside className="lg:sticky lg:top-[calc(var(--navbar-height,64px)+16px)]">
//           <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-md">
//             <div className="px-4 py-3 border-b border-stone-200 dark:border-zinc-800">
//               <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
//                 Order summary
//               </h2>
//             </div>

//             <div className="px-4 py-3.5 space-y-2 text-sm">
//               <div className="flex justify-between">
//                 <span className="text-stone-600 dark:text-zinc-400">
//                   Subtotal ({totalUnits} {totalUnits === 1 ? "item" : "items"})
//                 </span>
//                 <span className="text-zinc-900 dark:text-zinc-100 tabular-nums font-medium">
//                   {totalsLabel}
//                 </span>
//               </div>

//               <div className="flex justify-between">
//                 <span className="text-stone-600 dark:text-zinc-400">Shipping</span>
//                 <span className="text-stone-500 dark:text-zinc-500">Calculated at checkout</span>
//               </div>

//               <div className="flex justify-between">
//                 <span className="text-stone-600 dark:text-zinc-400">Tax</span>
//                 <span className="text-stone-500 dark:text-zinc-500">Calculated at checkout</span>
//               </div>

//               {hasMixedCurrencies && (
//                 <p className="pt-2 text-xs text-stone-500 dark:text-zinc-500 leading-relaxed">
//                   This cart contains items in multiple currencies. Each vendor's order will be processed separately.
//                 </p>
//               )}
//             </div>

//             <div className="px-4 py-3 border-t border-stone-200 dark:border-zinc-800 flex justify-between items-baseline">
//               <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Total</span>
//               <span className="text-lg font-semibold text-zinc-900 dark:text-white tabular-nums">
//                 {totalsLabel}
//               </span>
//             </div>

//             <div className="p-4 pt-3 border-t border-stone-200 dark:border-zinc-800">
//               <Button
//                 asChild
//                 className="w-full h-10 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 font-medium text-sm rounded-md"
//               >
//                 <Link href="/checkout">Proceed to checkout</Link>
//               </Button>
//               <p className="mt-3 text-xs text-stone-500 dark:text-zinc-500 leading-relaxed">
//                 Payment is held in escrow until you receive your order.
//               </p>
//             </div>
//           </div>

//           <div className="mt-4 text-xs text-stone-500 dark:text-zinc-500 space-y-1.5">
//             <p><Link href="/help/returns" className="hover:underline">Return policy</Link></p>
//             <p><Link href="/help/shipping" className="hover:underline">Shipping information</Link></p>
//             <p><Link href="/support" className="hover:underline">Contact support</Link></p>
//           </div>
//         </aside>
//       </div>

//       {/* Mobile sticky checkout */}
//       <div className="lg:hidden sticky bottom-0 inset-x-0 bg-white dark:bg-zinc-900 border-t border-stone-200 dark:border-zinc-800 -mx-4 px-4 py-3 mt-6 flex items-center justify-between gap-3">
//         <div>
//           <p className="text-[11px] text-stone-500 dark:text-zinc-500">Total</p>
//           <p className="text-base font-semibold text-zinc-900 dark:text-white tabular-nums">
//             {totalsLabel}
//           </p>
//         </div>
//         <Button
//           asChild
//           className="h-10 px-5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium text-sm rounded-md"
//         >
//           <Link href="/checkout">Checkout</Link>
//         </Button>
//       </div>
//     </div>
//   );
// }



"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Minus, Plus, Loader2, Store, ShieldCheck,
  ChevronRight, ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateCartItemQuantity, removeFromCart } from "@/lib/actions/marketplace";
import { useCurrency } from "@/context/CurrencyContext";
import { formatAggregatedCartTotalInDisplayCurrency, CartOrderLikeForTotal } from "@/lib/currency/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { proceedToCheckout } from "@/lib/actions/checkout";

interface CartItemProduct {
  id: string;
  name: string;
  slug: string | null;
  images: string[] | null;
  source: string | null;
  pricing_type: string | null;
  billing_period: string | null;
  product_type: string | null;
}

interface CartItemVariant {
  id: string;
  name: string | null;
  options: Record<string, string> | null;
  image_url: string | null;
}

interface CartItemVendor {
  id: string;
  business_name: string;
  business_slug: string;
  verification_status?: string | null;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  variant_id: string | null;
  vendor_id: string;
  quantity: number;
  unit_price_at_add: number;
  currency_at_add: string;
  product_source: string;
  source_metadata: Record<string, unknown>;
  affiliate_link_id: string | null;
  added_at: string;
  updated_at: string;
  products: CartItemProduct | null;
  product_variants: CartItemVariant | null;
  vendors: CartItemVendor | null;
}

interface CartClientProps {
  initialItems: CartItem[];
}

const CHECKOUT_ERROR_MESSAGES: Record<string, string> = {
  order_not_found: "That order couldn't be found or has already been paid.",
  mixed_products: "Your cart has both digital and physical items. Please check them out separately.",
  checkout_failed: "We couldn't start your checkout. Please try again or contact support.",
  no_items: "Your cart is empty.",
  stale_order: "There was a problem creating your order. Please try again.",
  sync_failed: "We couldn't sync your cart. Please try again.",
};

function groupByVendor(items: CartItem[]): Map<string, CartItem[]> {
  const map = new Map<string, CartItem[]>();
  for (const item of items) {
    const key = item.vendor_id;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

function vendorSubtotal(items: CartItem[]): number {
  return items.reduce((s, i) => s + Number(i.unit_price_at_add) * Number(i.quantity), 0);
}

function itemsToCartOrders(items: CartItem[]): CartOrderLikeForTotal[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const c = (item.currency_at_add || "RWF").toUpperCase();
    map.set(c, (map.get(c) ?? 0) + Number(item.unit_price_at_add) * Number(item.quantity));
  }
  return [...map.entries()].map(([currency, total]) => ({
    currency,
    order_items: [{ total_price: total }],
  }));
}

function QtyInput({
  value, max, loading, onChange,
}: {
  value: number;
  max?: number;
  loading: boolean;
  onChange: (n: number) => void;
}) {
  const [local, setLocal] = useState(value.toString());

  useEffect(() => {
    if (!loading) setLocal(value.toString());
  }, [value, loading]);

  const commit = () => {
    const n = parseInt(local, 10);
    if (isNaN(n) || n < 1) { setLocal(value.toString()); return; }
    const clamped = max ? Math.min(n, max) : n;
    if (clamped !== value) onChange(clamped);
    else setLocal(value.toString());
  };

  return (
    <div className="inline-flex items-center border border-stone-300 dark:border-zinc-700 rounded-md overflow-hidden bg-white dark:bg-zinc-900">
      <button
        onClick={() => value > 1 && onChange(value - 1)}
        disabled={value <= 1 || loading}
        aria-label="Decrease"
        className="h-8 w-8 flex items-center justify-center text-stone-600 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800 disabled:text-stone-300 disabled:hover:bg-transparent dark:disabled:text-zinc-700"
      >
        <Minus className="h-3 w-3" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={loading ? value : local}
        onChange={(e) => setLocal(e.target.value.replace(/\D/g, ""))}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        disabled={loading}
        aria-label="Quantity"
        className="w-9 h-8 text-center text-[13px] font-medium text-zinc-900 dark:text-zinc-100 bg-transparent outline-none border-x border-stone-300 dark:border-zinc-700 tabular-nums"
      />
      <button
        onClick={() => (!max || value < max) && onChange(value + 1)}
        disabled={(max ? value >= max : false) || loading}
        aria-label="Increase"
        className="h-8 w-8 flex items-center justify-center text-stone-600 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800 disabled:text-stone-300 disabled:hover:bg-transparent dark:disabled:text-zinc-700"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

export function CartClient({ initialItems }: CartClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { formatMoney, displayCurrency, rates } = useCurrency();
  const [items, setItems] = useState<CartItem[]>(initialItems ?? []);
  const [loadingItems, setLoadingItems] = useState<string[]>([]);
  const [removingItems, setRemovingItems] = useState<string[]>([]);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [proceedingCheckout, setProceedingCheckout] = useState(false); // ✅
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (!hasMountedRef.current) { hasMountedRef.current = true; return; }
    setItems(initialItems ?? []);
  }, [initialItems]);

  useEffect(() => {
    const code = searchParams.get("error");
    if (!code) return;
    const message = CHECKOUT_ERROR_MESSAGES[code] ?? "Something went wrong.";
    const detail = searchParams.get("detail");
    toast.error(message, { description: detail || undefined, duration: 6000 });

    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    url.searchParams.delete("detail");
    window.history.replaceState({}, "", url.toString());
  }, [searchParams]);

  const vendorGroups = useMemo(() => groupByVendor(items), [items]);
  const totalUnits = items.reduce((s, i) => s + Number(i.quantity), 0);

  const totalsLabel = useMemo(() => {
    const cartOrders = itemsToCartOrders(items);
    return formatAggregatedCartTotalInDisplayCurrency(cartOrders, displayCurrency, rates);
  }, [items, displayCurrency, rates]);

  const hasMixedCurrencies = useMemo(
    () => new Set(items.map((i) => (i.currency_at_add || "RWF").toUpperCase())).size > 1,
    [items]
  );

  // ✅ Action-based proceed to checkout
  const handleProceedToCheckout = async () => {
    if (proceedingCheckout || items.length === 0) return;
    setProceedingCheckout(true);
    try {
      const result = await proceedToCheckout();
      if (!result.ok) {
        toast.error(result.error);
        setProceedingCheckout(false);
        return;
      }
      router.push(`/checkout?order_id=${result.orderId}`);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
      setProceedingCheckout(false);
    }
  };

  const handleUpdateQuantity = async (itemId: string, newQty: number) => {
    if (newQty < 1) return;
    setLoadingItems((p) => [...p, itemId]);
    setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, quantity: newQty } : i));

    try {
      const res = await updateCartItemQuantity(itemId, newQty);
      if (res.success) {
        window.dispatchEvent(new CustomEvent("cart-updated"));
        router.refresh();
      } else {
        toast.error(res.error || "Couldn't update quantity");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
      router.refresh();
    } finally {
      setLoadingItems((p) => p.filter((id) => id !== itemId));
    }
  };

  const handleRemove = async (itemId: string) => {
    setRemovingItems((p) => [...p, itemId]);
    try {
      const res = await removeFromCart(itemId);
      if (res.success) {
        window.dispatchEvent(new CustomEvent("cart-updated"));
        setItems((prev) => prev.filter((i) => i.id !== itemId));
        router.refresh();
      } else {
        toast.error(res.error || "Couldn't remove item");
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    } finally {
      setRemovingItems((p) => p.filter((id) => id !== itemId));
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <div className="h-16 w-16 mx-auto mb-5 rounded-full bg-stone-100 dark:bg-zinc-800 flex items-center justify-center">
          <ShoppingBag className="h-7 w-7 text-stone-400 dark:text-zinc-500" strokeWidth={1.5} />
        </div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Your cart is empty</h2>
        <p className="text-sm text-stone-500 dark:text-zinc-400 mb-6">Add items to your cart to checkout.</p>
        <Button asChild className="h-10 px-6 rounded-md text-sm bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 font-medium">
          <Link href="/marketplace">Browse marketplace</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-stone-200 dark:border-zinc-800">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">
          Shopping cart
          <span className="ml-2 text-sm font-normal text-stone-500 dark:text-zinc-400">
            ({totalUnits} {totalUnits === 1 ? "item" : "items"})
          </span>
        </h1>
        <Link href="/marketplace" className="hidden sm:inline text-sm text-stone-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:underline">
          Continue shopping
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="space-y-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {[...vendorGroups.entries()].map(([vendorId, vendorItems]) => {
              const vendor = vendorItems[0]?.vendors;
              const isVerified = vendor?.verification_status === "verified";
              const subtotal = vendorSubtotal(vendorItems);
              const currency = vendorItems[0]?.currency_at_add ?? "RWF";

              return (
                <motion.div
                  key={vendorId}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-md"
                >
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-200 dark:border-zinc-800 bg-stone-50/50 dark:bg-zinc-900/50">
                    <Link href={`/vendors/${vendor?.business_slug ?? "#"}`} className="flex items-center gap-2 min-w-0">
                      <Store className="h-3.5 w-3.5 text-stone-500 dark:text-zinc-400 shrink-0" />
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate hover:underline">
                        {vendor?.business_name || "Marketplace"}
                      </span>
                      {isVerified && (
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500 shrink-0" aria-label="Verified seller" />
                      )}
                    </Link>
                  </div>

                  <div className="divide-y divide-stone-100 dark:divide-zinc-800">
                    <AnimatePresence mode="popLayout" initial={false}>
                      {vendorItems.map((item) => {
                        const isLoading = loadingItems.includes(item.id);
                        const isRemoving = removingItems.includes(item.id);
                        const product = item.products;
                        const variant = item.product_variants;
                        const image = variant?.image_url || product?.images?.[0] || null;
                        const slug = product?.slug ?? null;
                        const name = product?.name ?? "Product";
                        const variantLabel = variant?.name ?? (variant?.options ? Object.values(variant.options).join(" / ") : null);
                        const lineTotal = Number(item.unit_price_at_add) * Number(item.quantity);

                        return (
                          <motion.div
                            key={item.id}
                            layout
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.18 }}
                            className={cn("overflow-hidden", isRemoving && "opacity-50")}
                          >
                            <div className="px-4 py-4 flex gap-3.5">
                              <Link
                                href={slug ? `/product/${slug}` : "#"}
                                className="relative h-20 w-20 sm:h-[88px] sm:w-[88px] shrink-0 bg-stone-50 dark:bg-zinc-800 rounded border border-stone-200 dark:border-zinc-700 overflow-hidden"
                              >
                                {image && !imageErrors[item.id] ? (
                                  <Image
                                    src={image}
                                    alt={name}
                                    fill
                                    sizes="88px"
                                    className="object-cover"
                                    onError={() => setImageErrors((p) => ({ ...p, [item.id]: true }))}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ShoppingBag className="h-5 w-5 text-stone-300 dark:text-zinc-600" strokeWidth={1.5} />
                                  </div>
                                )}
                              </Link>

                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-3 mb-1">
                                  <Link href={slug ? `/product/${slug}` : "#"} className="text-sm text-zinc-900 dark:text-zinc-100 hover:underline line-clamp-2 leading-snug">
                                    {name}
                                  </Link>
                                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 tabular-nums shrink-0">
                                    {formatMoney(lineTotal, currency)}
                                  </p>
                                </div>

                                {variantLabel && (
                                  <p className="text-xs text-stone-500 dark:text-zinc-400 mb-1">{variantLabel}</p>
                                )}

                                <p className="text-xs text-stone-500 dark:text-zinc-400 tabular-nums mb-2.5">
                                  {formatMoney(item.unit_price_at_add, currency)} each
                                </p>

                                <div className="flex items-center justify-between gap-3">
                                  <QtyInput value={item.quantity} loading={isLoading} onChange={(q) => handleUpdateQuantity(item.id, q)} />
                                  <button
                                    onClick={() => handleRemove(item.id)}
                                    disabled={isRemoving}
                                    className="text-xs text-stone-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-500 hover:underline disabled:opacity-50"
                                  >
                                    {isRemoving ? (
                                      <span className="inline-flex items-center gap-1">
                                        <Loader2 className="h-3 w-3 animate-spin" />Removing
                                      </span>
                                    ) : "Remove"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>

                  <div className="px-4 py-2.5 border-t border-stone-200 dark:border-zinc-800 flex justify-between text-sm">
                    <span className="text-stone-600 dark:text-zinc-400">Items subtotal</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100 tabular-nums">{formatMoney(subtotal, currency)}</span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          <Link href="/marketplace" className="sm:hidden inline-flex items-center gap-1 text-sm text-stone-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:underline pt-2">
            <ChevronRight className="h-3.5 w-3.5 rotate-180" />
            Continue shopping
          </Link>
        </div>

        <aside className="lg:sticky lg:top-[calc(var(--navbar-height,64px)+16px)]">
          <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-md">
            <div className="px-4 py-3 border-b border-stone-200 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Order summary</h2>
            </div>

            <div className="px-4 py-3.5 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-600 dark:text-zinc-400">
                  Subtotal ({totalUnits} {totalUnits === 1 ? "item" : "items"})
                </span>
                <span className="text-zinc-900 dark:text-zinc-100 tabular-nums font-medium">{totalsLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600 dark:text-zinc-400">Shipping</span>
                <span className="text-stone-500 dark:text-zinc-500">Calculated at checkout</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600 dark:text-zinc-400">Tax</span>
                <span className="text-stone-500 dark:text-zinc-500">Calculated at checkout</span>
              </div>
              {hasMixedCurrencies && (
                <p className="pt-2 text-xs text-stone-500 dark:text-zinc-500 leading-relaxed">
                  This cart contains items in multiple currencies. Each vendor's order will be processed separately.
                </p>
              )}
            </div>

            <div className="px-4 py-3 border-t border-stone-200 dark:border-zinc-800 flex justify-between items-baseline">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Total</span>
              <span className="text-lg font-semibold text-zinc-900 dark:text-white tabular-nums">{totalsLabel}</span>
            </div>

            <div className="p-4 pt-3 border-t border-stone-200 dark:border-zinc-800">
              {/* ✅ Now triggers server action */}
              <Button
                onClick={handleProceedToCheckout}
                disabled={proceedingCheckout || items.length === 0}
                className="w-full h-10 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 font-medium text-sm rounded-md disabled:opacity-60"
              >
                {proceedingCheckout ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />Preparing checkout…
                  </span>
                ) : "Proceed to checkout"}
              </Button>
              <p className="mt-3 text-xs text-stone-500 dark:text-zinc-500 leading-relaxed">
                Payment is held in escrow until you receive your order.
              </p>
            </div>
          </div>

          <div className="mt-4 text-xs text-stone-500 dark:text-zinc-500 space-y-1.5">
            <p><Link href="/help/returns" className="hover:underline">Return policy</Link></p>
            <p><Link href="/help/shipping" className="hover:underline">Shipping information</Link></p>
            <p><Link href="/support" className="hover:underline">Contact support</Link></p>
          </div>
        </aside>
      </div>

      <div className="lg:hidden sticky bottom-0 inset-x-0 bg-white dark:bg-zinc-900 border-t border-stone-200 dark:border-zinc-800 -mx-4 px-4 py-3 mt-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] text-stone-500 dark:text-zinc-500">Total</p>
          <p className="text-base font-semibold text-zinc-900 dark:text-white tabular-nums">{totalsLabel}</p>
        </div>
        {/* ✅ Mobile button also action */}
        <Button
          onClick={handleProceedToCheckout}
          disabled={proceedingCheckout || items.length === 0}
          className="h-10 px-5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium text-sm rounded-md disabled:opacity-60"
        >
          {proceedingCheckout ? <Loader2 className="h-4 w-4 animate-spin" /> : "Checkout"}
        </Button>
      </div>
    </div>
  );
}