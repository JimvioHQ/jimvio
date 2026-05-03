// "use client";

// import React, { useState, useEffect } from "react";
// import {
//   ShoppingCart,
//   Loader2,
//   CheckCircle2,
//   Heart,
//   MessageSquare,
//   Zap,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { addToCart, buyDirectCheckout, toggleWishlist, getWishlistProductIds } from "@/lib/actions/marketplace";
// import { useCartStore } from "@/lib/store/use-cart-store";
// import { QuantitySelector } from "./quantity-selector";
// import { ProductChatTrigger } from "./product-chat-trigger";
// import { cn } from "@/lib/utils";

// interface ProductActionModuleProps {
//   product: {
//     id: string;
//     name: string;
//     slug: string;
//     price: number;
//     images: string[] | null;
//     vendor_id: string;
//     currency?: string;
//     pricing_type?: string;
//     button_text?: string;
//     is_digital?: boolean;
//   };
//   isDigital?: boolean;
//   buttonText?: string;
//   className?: string;
//   vendor: {
//     id: string;
//     business_name: string | null;
//     business_logo: string | null;
//     business_slug: string | null;
//   } | null;
//   currentPath: string;
// }

// export function ProductActionModule({ 
//   product, 
//   vendor, 
//   currentPath, 
//   isDigital: isDigitalProp,
//   buttonText,
//   className
// }: ProductActionModuleProps & { isDigital?: boolean, buttonText?: string, className?: string }) {
//   const isDigital = isDigitalProp || product.is_digital;
//   const btnText = buttonText || product.button_text || (isDigital ? "Get Access" : "Add to Cart");

//   const [quantity, setQuantity] = useState(1);
//   const [loading, setLoading] = useState(false);
//   const [wishlistLoading, setWishlistLoading] = useState(false);
//   const [added, setAdded] = useState(false);
//   const [inWishlist, setInWishlist] = useState(false);
//   const { setCartCount, incrementCartCount } = useCartStore();

//   useEffect(() => {
//     async function checkWishlist() {
//       const ids = await getWishlistProductIds();
//       setInWishlist(ids.includes(product.id));
//     }
//     checkWishlist();
//   }, [product.id]);

//   async function handleAddToCart() {
//     if (!product.vendor_id) return;
    
//     setLoading(true);

//     try {
//       if (isDigital) {
//         const result = await buyDirectCheckout(product.id, product.vendor_id, 1);
//         if (result.success && result.orderId) {
//           window.location.href = `/checkout?order_id=${result.orderId}`;
//         } else if (result.error === "Authentication required") {
//           window.location.href = `/login?next=${window.location.pathname}`;
//         } else {
//           alert(result.error || "Failed to process direct checkout");
//           setLoading(false);
//         }
//       } else {
//         const result = await addToCart(product.id, product.vendor_id, quantity);
//         if (result.success) {
//           incrementCartCount(quantity);
//           setAdded(true);
//           setTimeout(() => setAdded(false), 2500);
//         } else if (result.error === "Authentication required") {
//           window.location.href = `/login?next=${window.location.pathname}`;
//         } else {
//           alert(result.error || "Failed to add to cart");
//         }
//         setLoading(false);
//       }
//     } catch (error) {
//       console.error("Cart addition failed:", error);
//       setLoading(false);
//     }
//   }

//   async function handleToggleWishlist() {
//     setWishlistLoading(true);
//     try {
//       const res = await toggleWishlist(product.id);
//       if (res.success) {
//         setInWishlist(res.inWishlist!);
//       } else if (res.error === "Authentication required") {
//         window.location.href = `/login?next=${window.location.pathname}`;
//       }
//     } catch (error) {
//       console.error("Wishlist toggle failed:", error);
//     } finally {
//       setWishlistLoading(false);
//     }
//   }

//   return (
//     <div className="space-y-3">
//       {/* Quantity + Add to Cart row */}
//       <div className={cn("flex items-center gap-2", className)}>
//         {!isDigital && (
//           <div className="shrink-0">
//             <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">Qty</p>
//             <QuantitySelector quantity={quantity} onChange={setQuantity} />
//           </div>
//         )}
//         <Button
//           size="sm"
//           onClick={handleAddToCart}
//           disabled={loading || added}
//           className={cn(
//             "flex-1 h-10 font-black text-xs rounded-sm transition-all duration-300 shadow-none",
//             isDigital ? "h-12 rounded-sm text-sm" : "h-10",
//             added
//               ? "bg-green-600 hover:bg-green-700"
//               : isDigital 
//                 ? "bg-sky-500 hover:bg-sky-400 shadow-sky-500/20"
//                 : "bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] shadow-[var(--color-accent)]/20"
//           )}
//         >
//           {loading ? (
//             <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
//           ) : added ? (
//             <CheckCircle2 className="mr-1.5 h-4 w-4" />
//           ) : (
//              isDigital ? <Zap className="mr-1.5 h-4 w-4" /> : <ShoppingCart className="mr-1.5 h-4 w-4" />
//           )}
//           {added ? "Added!" : btnText}
//         </Button>
//       </div>

//       {/* Secondary actions */}
//       <div className="grid grid-cols-2 gap-2">
//         <ProductChatTrigger
//           variant="outline"
//           className="h-9 text-xs font-bold rounded-sm border border-zinc-200 dark:border-border hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all"
//           vendor={vendor ?? undefined}
//           product={{ ...product, images: product.images }}
//           currentPath={currentPath}
//         >
//           <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Chat
//         </ProductChatTrigger>

//         <Button
//           variant="outline"
//           size="sm"
//           disabled={wishlistLoading}
//           onClick={handleToggleWishlist}
//           className={cn(
//             "h-9 text-xs font-bold rounded-sm border transition-all",
//             inWishlist
//               ? "border-red-200 bg-red-50 text-red-500 hover:bg-red-100"
//               : "border-zinc-200 dark:border-border hover:border-zinc-300"
//           )}
//         >
//           {wishlistLoading ? (
//             <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
//           ) : (
//             <Heart className={cn("mr-1.5 h-3.5 w-3.5", inWishlist && "fill-current")} />
//           )}
//           {inWishlist ? "Saved" : "Save"}
//         </Button>
//       </div>
//     </div>
//   );
// }

"use client";

import React, { useState, useEffect } from "react";
import {
  ShoppingCart, Loader2, CheckCircle2, Heart, MessageSquare, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  addToCart,
  buyDirectCheckout,
  toggleWishlist,
  getWishlistProductIds,
} from "@/lib/actions/marketplace";
import { useCartStore } from "@/lib/store/use-cart-store";
import { QuantitySelector } from "./quantity-selector";
import { ProductChatTrigger } from "./product-chat-trigger";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

// FIX: single interface — no intersection type duplication
interface ProductActionModuleProps {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    images: string[] | null;
    vendor_id: string;
    currency?: string;
    pricing_type?: string;
    /** Overrides the default button label */
    button_text?: string;
    is_digital?: boolean;
  };
  vendor: {
    id: string;
    business_name: string | null;
    business_logo: string | null;
    business_slug: string | null;
  } | null;
  currentPath: string;
  /** Forwarded to the primary Button element */
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductActionModule({
  product,
  vendor,
  currentPath,
  className,
}: ProductActionModuleProps) {
  // FIX: derive isDigital and label from product — no duplicate prop needed
  const isDigital = product.is_digital ?? false;
  const btnText = product.button_text ?? (isDigital ? "Get access" : "Add to cart");

  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);

  // FIX: removed unused `setCartCount` import
  const { incrementCartCount } = useCartStore();

  useEffect(() => {
    let cancelled = false;
    getWishlistProductIds().then((ids) => {
      if (!cancelled) setInWishlist(ids.includes(product.id));
    });
    return () => { cancelled = true; };
  }, [product.id]);

  async function handleAddToCart() {
    if (!product.vendor_id) return;
    setLoading(true);

    try {
      if (isDigital) {
        const result = await buyDirectCheckout(product.id, product.vendor_id, 1);
        if (result.success && result.orderId) {
          window.location.href = `/checkout?order_id=${result.orderId}`;
          // keep loading=true — page is navigating away
        } else if (result.error === "Authentication required") {
          window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
        } else {
          // FIX: toast instead of alert()
          toast.error(result.error ?? "Failed to process checkout");
          setLoading(false);
        }
      } else {
        const result = await addToCart(product.id, product.vendor_id, quantity);
        if (result.success) {
          incrementCartCount(quantity);
          setAdded(true);
          setTimeout(() => setAdded(false), 2500);
        } else if (result.error === "Authentication required") {
          window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
        } else {
          toast.error(result.error ?? "Failed to add to cart");
        }
        setLoading(false);
      }
    } catch (err) {
      console.error("Cart action failed:", err);
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function handleToggleWishlist() {
    setWishlistLoading(true);
    try {
      const res = await toggleWishlist(product.id);
      if (res.success) {
        setInWishlist(res.inWishlist!);
        toast.success(res.inWishlist ? "Saved to wishlist" : "Removed from wishlist");
      } else if (res.error === "Authentication required") {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      } else {
        toast.error(res.error ?? "Could not update wishlist");
      }
    } catch (err) {
      console.error("Wishlist toggle failed:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setWishlistLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Primary action row */}
      <div className="flex items-center gap-2">
        {!isDigital && (
          <div className="shrink-0">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-1">
              Qty
            </p>
            <QuantitySelector quantity={quantity} onChange={setQuantity} />
          </div>
        )}

        {/* FIX: className forwarded to Button, not the wrapper div */}
        <Button
          onClick={handleAddToCart}
          disabled={loading || added}
          className={cn(
            "flex-1 font-semibold text-[13px] transition-all duration-300 rounded-xl border-none",
            isDigital ? "h-11" : "h-10",
            added
              ? "bg-[var(--color-success)] hover:bg-[var(--color-success)] text-white"
              : isDigital
                ? "bg-sky-500 hover:bg-sky-600 text-white"
                : "bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white",
            className
          )}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : added ? (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          ) : isDigital ? (
            <Zap className="mr-2 h-4 w-4" />
          ) : (
            <ShoppingCart className="mr-2 h-4 w-4" />
          )}
          {loading ? (isDigital ? "Processing…" : "Adding…") : added ? "Added!" : btnText}
        </Button>
      </div>

      {/* Secondary actions */}
      <div className="grid grid-cols-2 gap-2">
        <ProductChatTrigger
          variant="outline"
          className={cn(
            "h-9 text-[12px] font-semibold rounded-xl",
            "border border-[var(--color-border)] text-[var(--color-text-secondary)]",
            "hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
          )}
          vendor={vendor ?? undefined}
          product={{ ...product, images: product.images }}
          currentPath={currentPath}
        >
          <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
          Chat
        </ProductChatTrigger>

        <Button
          variant="outline"
          size="sm"
          disabled={wishlistLoading}
          onClick={handleToggleWishlist}
          className={cn(
            "h-9 text-[12px] font-semibold rounded-xl border transition-colors",
            inWishlist
              ? "border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-500/20"
              : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]"
          )}
        >
          {wishlistLoading ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Heart className={cn("mr-1.5 h-3.5 w-3.5", inWishlist && "fill-current")} />
          )}
          {inWishlist ? "Saved" : "Save"}
        </Button>
      </div>
    </div>
  );
}