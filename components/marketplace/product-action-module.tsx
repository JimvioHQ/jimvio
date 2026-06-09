// "use client";

// import React, { useState, useEffect } from "react";
// import {
//   ShoppingCart, Loader2, CheckCircle2, Heart, MessageSquare,
//   Zap, Gift, FolderOpen, AlertCircle,
//   ShoppingBag,
// } from "lucide-react";
// import { toast } from "sonner";
// import { Button } from "@/components/ui/button";
// import {
//   addToCart, buyDirectCheckout, toggleWishlist,
//   getWishlistProductIds, checkUserOwnsProduct,
// } from "@/lib/actions/marketplace";
// import { useCartStore } from "@/lib/store/use-cart-store";
// import { QuantitySelector } from "./quantity-selector";
// import { ProductChatTrigger } from "./product-chat-trigger";
// import { cn } from "@/lib/utils";
// import Link from "next/link";
// import { useRouter } from "next/navigation";

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface ProductActionModuleProps {
//   product: {
//     id: string;
//     name: string;
//     slug: string;
//     price: number;
//     images: string[] | null;
//     vendor_id: string;
//     currency?: string | null;
//     pricing_type?: string | null;
//     button_text?: string | null;
//     is_digital?: boolean;
//   };
//   vendor: {
//     id: string;
//     business_name: string | null;
//     business_logo: string | null;
//     business_slug: string | null;
//   } | null;
//   currentPath: string;
//   className?: string;
//   /** The selected variant id — null means no variants exist or none selected yet */
//   selectedVariantId?: string | null;
//   /** True when variants exist but the selected one has no stock */
//   selectedVariantOutOfStock?: boolean;
// }

// // ─── Component ────────────────────────────────────────────────────────────────

// export function ProductActionModule({
//   product,
//   vendor,
//   currentPath,
//   className,
//   selectedVariantId = null,
//   selectedVariantOutOfStock = false,
// }: ProductActionModuleProps) {
//   const isDigital = product.is_digital ?? false;
//   const isFree = product.price === 0;
//   const isFreeDigital = isFree && isDigital;

//   const btnText = product.button_text ?? (
//     isFree ? "Get for free" : isDigital ? "Get access" : "Add to cart"
//   );

//   const [quantity, setQuantity] = useState(1);
//   const [loading, setLoading] = useState(false);
//   const [wishlistLoading, setWishlistLoading] = useState(false);
//   const [added, setAdded] = useState(false);
//   const [inWishlist, setInWishlist] = useState(false);
//   const [alreadyOwned, setAlreadyOwned] = useState(false);
//   const [ownershipChecked, setOwnershipChecked] = useState(false);
//   const router = useRouter();
//   const { incrementCartCount } = useCartStore();

//   // Reset "added" state when variant changes so the button resets
//   useEffect(() => {
//     setAdded(false);
//   }, [selectedVariantId]);

//   function redirectToLogin() {
//     router.push(`/login?next=${encodeURIComponent(currentPath)}`);
//   }

//   useEffect(() => {
//     let cancelled = false;

//     Promise.all([
//       getWishlistProductIds(),
//       isFreeDigital ? checkUserOwnsProduct(product.id) : Promise.resolve(false),
//     ])
//       .then(([ids, owns]) => {
//         if (cancelled) return;
//         setInWishlist(ids.includes(product.id));
//         setAlreadyOwned(owns);
//         setOwnershipChecked(true);
//       })
//       .catch(() => {
//         if (cancelled) return;
//         setOwnershipChecked(true);
//       });

//     return () => { cancelled = true; };
//   }, [product.id, isFreeDigital]);

//   // ─── Handlers ────────────────────────────────────────────────────────────────

//   async function handleAddToCart() {
//     if (!product.vendor_id) return;

//     // Guard: if variants exist but none selected, prompt user
//     if (!isDigital && selectedVariantId === null && selectedVariantOutOfStock === false) {
//       // selectedVariantId being null with no outOfStock flag means "no variants" — proceed
//     }

//     setLoading(true);

//     try {
//       if (isDigital) {
//         const result = await buyDirectCheckout(product.id, product.vendor_id, 1);
//         if (result.success && result.orderId) {
//           const link = isFree
//             ? `/orders/${result.orderId}`
//             : `/checkout?order_id=${result.orderId}`;
//           router.push(link);
//         } else if (result.error === "Authentication required") {
//           redirectToLogin();
//         } else {
//           toast.error(result.error ?? "Failed to process checkout");
//           setLoading(false);
//         }
//       } else {
//         // Pass variantId through to addToCart so order_items.variant_id is set
//         const result = await addToCart(
//           product.id,
//           product.vendor_id,
//           quantity,
//           selectedVariantId ?? undefined,
//         );

//         if (result.success) {
//           incrementCartCount(quantity);
//           setAdded(true);
//           if (isFree) toast.success("Free item added to cart!");
//           else toast.success("Added to cart!");
//           setTimeout(() => setAdded(false), 2500);
//         } else if (result.error === "Authentication required") {
//           redirectToLogin();
//         } else {
//           toast.error(result.error ?? "Failed to add to cart");
//         }
//         setLoading(false);
//       }
//     } catch (err) {
//       console.error("Cart action failed:", err);
//       toast.error("Something went wrong. Please try again.");
//       setLoading(false);
//     }
//   }

//   async function handleToggleWishlist() {
//     setWishlistLoading(true);
//     try {
//       const res = await toggleWishlist(product.id);
//       if (res.success && typeof res.inWishlist === "boolean") {
//         setInWishlist(res.inWishlist);
//         toast.success(res.inWishlist ? "Saved to wishlist" : "Removed from wishlist");
//       } else if (res.error === "Authentication required") {
//         redirectToLogin();
//       } else {
//         toast.error(res.error ?? "Could not update wishlist");
//       }
//     } catch (err) {
//       console.error("Wishlist toggle failed:", err);
//       toast.error("Something went wrong. Please try again.");
//     } finally {
//       setWishlistLoading(false);
//     }
//   }
//   const isOutOfStock = selectedVariantOutOfStock;
//   const noVariantSelected = selectedVariantId === null && selectedVariantOutOfStock === false
//     ? false
//     : selectedVariantId === null;

//   const primaryIcon = isFreeDigital && !ownershipChecked ? (
//     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//   ) : loading ? (
//     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//   ) : added ? (
//     <CheckCircle2 className="mr-2 h-4 w-4" />
//   ) : isOutOfStock ? (
//     <AlertCircle className="mr-2 h-4 w-4" />
//   ) : isFree ? (
//     <Gift className="mr-2 h-4 w-4" />
//   ) : isDigital ? (
//     <Zap className="mr-2 h-4 w-4" />
//   ) : (
//     <ShoppingCart className="mr-2 h-4 w-4" />
//   );

//   const primaryButtonText = isFreeDigital && !ownershipChecked
//     ? "Checking…"
//     : loading
//       ? isDigital ? "Processing…" : "Adding…"
//       : added
//         ? "Added!"
//         : isOutOfStock
//           ? "Out of stock"
//           : noVariantSelected
//             ? "Select options"
//             : btnText;

//   const primaryButtonClass = cn(
//     "flex-1 font-semibold text-[13px] transition-all duration-300 rounded-xl border-none",
//     isDigital ? "h-11" : "h-10",
//     isOutOfStock
//       ? "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] cursor-not-allowed"
//       : added
//         ? "bg-[var(--color-success)] hover:bg-[var(--color-success)] text-white"
//         : isFree
//           ? "bg-emerald-500 hover:bg-emerald-600 text-white"
//           : isDigital
//             ? "bg-sky-500 hover:bg-sky-600 text-white"
//             : "bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white",
//     className,
//   );

//   // ─── Render ───────────────────────────────────────────────────────────────────

//   return (
//     <div className="space-y-3">
//       {/* Primary action row */}
//       <div className="flex items-center gap-2">
//         {!isDigital && (
//           <div className="shrink-0">
//             <p className="text-[9px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-1">
//               Qty
//             </p>
//             <QuantitySelector
//               quantity={quantity}
//               onChange={setQuantity}
//               max={isOutOfStock ? 0 : undefined}
//             />
//           </div>
//         )}

//         {/* Already owned — show access link */}
//         {isFreeDigital && ownershipChecked && alreadyOwned ? (
//           <Link
//             href={`/dashboard/digital-assets?highlight=${product.id}`}
//             className={cn(
//               "flex-1 inline-flex items-center justify-center gap-2",
//               "font-semibold text-[13px] rounded-xl h-11 transition-colors",
//               "bg-emerald-500 hover:bg-emerald-600 text-white",
//             )}
//           >
//             <FolderOpen className="h-4 w-4" />
//             Access your copy
//           </Link>
//         ) : (
//           <div className="flex gapx-x-3">
//             <Button
//               onClick={handleAddToCart}
//               disabled={
//                 loading ||
//                 added ||
//                 isOutOfStock ||
//                 noVariantSelected ||
//                 (isFreeDigital && !ownershipChecked)
//               }
//               className={primaryButtonClass}
//             >
//               {primaryIcon}
//               {primaryButtonText}
//             </Button>

//             <Button
//               disabled={
//                 loading ||
//                 added ||
//                 isOutOfStock ||
//                 noVariantSelected ||
//                 (isFreeDigital && !ownershipChecked)
//               }
//               className={cn("bg-surface", primaryButtonClass)}
//             >
//               <ShoppingBag size={15} />
//               {"Buy Now"}
//             </Button>
//           </div>
//         )}
//       </div>

//       {/* Contextual hints */}
//       {isFree && !isDigital && !isOutOfStock && (
//         <p className="text-[11px] text-center text-emerald-600 dark:text-emerald-400 font-medium">
//           No payment required — yours for free
//         </p>
//       )}

//       {isFreeDigital && ownershipChecked && !alreadyOwned && (
//         <p className="text-[11px] text-center text-emerald-600 dark:text-emerald-400 font-medium">
//           Free instant access — claim your copy
//         </p>
//       )}

//       {isFreeDigital && alreadyOwned && ownershipChecked && (
//         <p className="text-[11px] text-center text-[var(--color-text-muted)]">
//           You already have this — find it in your digital assets.
//         </p>
//       )}

//       {/* Secondary actions */}
//       <div className="grid grid-cols-2 gap-2">
//         <ProductChatTrigger
//           variant="outline"
//           className={cn(
//             "h-9 text-[12px] font-semibold rounded-xl",
//             "border border-[var(--color-border)] text-[var(--color-text-secondary)]",
//             "hover:border-[var(--color-accent)] hover:text-white transition-colors",
//           )}
//           vendor={vendor ?? undefined}
//           product={{ ...product, images: product.images }}
//           currentPath={currentPath}
//         >
//           <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
//           Chat
//         </ProductChatTrigger>

//         <Button
//           variant="outline"
//           size="sm"
//           disabled={wishlistLoading}
//           onClick={handleToggleWishlist}
//           className={cn(
//             "h-9 text-[12px] font-semibold rounded-xl border transition-colors",
//             inWishlist
//               ? "border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-500/20"
//               : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]",
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
  ShoppingCart, Loader2, CheckCircle2, Heart, MessageSquare,
  Zap, Gift, FolderOpen, AlertCircle, ShoppingBag, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  addToCart, buyDirectCheckout, toggleWishlist,
  getWishlistProductIds, checkUserOwnsProduct,
} from "@/lib/actions/marketplace";
import { useCartStore } from "@/lib/store/use-cart-store";
import { QuantitySelector } from "./quantity-selector";
import { ProductChatTrigger } from "./product-chat-trigger";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductActionModuleProps {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    images: string[] | null;
    vendor_id: string;
    currency?: string | null;
    pricing_type?: string | null;
    button_text?: string | null;
    is_digital?: boolean;
  };
  vendor: {
    id: string;
    business_name: string | null;
    business_logo: string | null;
    business_slug: string | null;
  } | null;
  currentPath: string;
  className?: string;
  /** The selected variant id — null means no variants exist or none selected yet */
  selectedVariantId?: string | null;
  /** True when variants exist but the selected one has no stock */
  selectedVariantOutOfStock?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductActionModule({
  product,
  vendor,
  currentPath,
  className,
  selectedVariantId = null,
  selectedVariantOutOfStock = false,
}: ProductActionModuleProps) {
  const isDigital = product.is_digital ?? false;
  const isFree = product.price === 0;
  const isFreeDigital = isFree && isDigital;

  const btnText = product.button_text ?? (
    isFree ? "Get for free" : isDigital ? "Get access" : "Add to cart"
  );

  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [buyNowLoading, setBuyNowLoading] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const [alreadyOwned, setAlreadyOwned] = useState(false);
  const [ownershipChecked, setOwnershipChecked] = useState(false);
  const router = useRouter();
  const { incrementCartCount } = useCartStore();

  useEffect(() => {
    setAdded(false);
  }, [selectedVariantId]);

  function redirectToLogin() {
    router.push(`/login?next=${encodeURIComponent(currentPath)}`);
  }

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getWishlistProductIds(),
      isFreeDigital ? checkUserOwnsProduct(product.id) : Promise.resolve(false),
    ])
      .then(([ids, owns]) => {
        if (cancelled) return;
        setInWishlist(ids.includes(product.id));
        setAlreadyOwned(owns);
        setOwnershipChecked(true);
      })
      .catch(() => {
        if (cancelled) return;
        setOwnershipChecked(true);
      });

    return () => { cancelled = true; };
  }, [product.id, isFreeDigital]);

  // ─── Handlers ────────────────────────────────────────────────────────────────

  async function handleAddToCart() {
    if (!product.vendor_id) return;
    setLoading(true);

    try {
      if (isDigital) {
        const result = await buyDirectCheckout(product.id, product.vendor_id, 1);
        if (result.success && result.orderId) {
          const link = isFree
            ? `/orders/${result.orderId}`
            : `/checkout?order_id=${result.orderId}`;
          router.push(link);
        } else if (result.error === "Authentication required") {
          redirectToLogin();
        } else {
          toast.error(result.error ?? "Failed to process checkout");
          setLoading(false);
        }
      } else {
        const result = await addToCart(
          product.id,
          product.vendor_id,
          quantity,
          selectedVariantId ?? undefined,
        );

        if (result.success) {
          incrementCartCount(quantity);
          setAdded(true);
          toast.success(isFree ? "Free item added to cart!" : "Added to cart!");
          setTimeout(() => setAdded(false), 2500);
        } else if (result.error === "Authentication required") {
          redirectToLogin();
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

  async function handleBuyNow() {
    if (!product.vendor_id) return;
    setBuyNowLoading(true);

    try {
      const result = await buyDirectCheckout(
        product.id,
        product.vendor_id,
        isDigital ? 1 : quantity,
        selectedVariantId ?? undefined,
      );

      if (result.success && result.orderId) {
        router.push(`/checkout?order_id=${result.orderId}`);
      } else if (result.error === "Authentication required") {
        redirectToLogin();
      } else {
        toast.error(result.error ?? "Failed to process checkout");
        setBuyNowLoading(false);
      }
    } catch (err) {
      console.error("Buy now failed:", err);
      toast.error("Something went wrong. Please try again.");
      setBuyNowLoading(false);
    }
  }

  async function handleToggleWishlist() {
    setWishlistLoading(true);
    try {
      const res = await toggleWishlist(product.id);
      if (res.success && typeof res.inWishlist === "boolean") {
        setInWishlist(res.inWishlist);
        toast.success(res.inWishlist ? "Saved to wishlist" : "Removed from wishlist");
      } else if (res.error === "Authentication required") {
        redirectToLogin();
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

  const isOutOfStock = selectedVariantOutOfStock;
  const noVariantSelected = selectedVariantId === null && selectedVariantOutOfStock;
  const isDisabled = loading || added || isOutOfStock || noVariantSelected || (isFreeDigital && !ownershipChecked);
  const isBuyNowDisabled = buyNowLoading || isOutOfStock || noVariantSelected || (isFreeDigital && !ownershipChecked);

  // ─── Derived button state ──────────────────────────────────────────────────

  const primaryIcon = (isFreeDigital && !ownershipChecked) || loading ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : added ? (
    <CheckCircle2 className="h-4 w-4" />
  ) : isOutOfStock ? (
    <AlertCircle className="h-4 w-4" />
  ) : isFree ? (
    <Gift className="h-4 w-4" />
  ) : isDigital ? (
    <Zap className="h-4 w-4" />
  ) : (
    <ShoppingCart className="h-4 w-4" />
  );

  const primaryButtonText =
    isFreeDigital && !ownershipChecked ? "Checking…"
      : loading ? (isDigital ? "Processing…" : "Adding…")
        : added ? "Added!"
          : isOutOfStock ? "Out of stock"
            : noVariantSelected ? "Select options"
              : btnText;

  // ─── Color variants ────────────────────────────────────────────────────────

  const cartBtnColors = cn(
    "transition-all duration-200",
    isOutOfStock
      ? "bg-muted text-muted-foreground cursor-not-allowed"
      : added
        ? "bg-emerald-600 hover:bg-emerald-600 text-white"
        : isFree
          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
          : isDigital
            ? "bg-sky-600 hover:bg-sky-700 text-white"
            : "bg-foreground hover:bg-foreground/90",
  );

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className={cn("space-y-3", className)}>

      {/* ── Already owned ── */}
      {isFreeDigital && ownershipChecked && alreadyOwned ? (
        <>
          <Link
            href={`/dashboard/digital-assets?highlight=${product.id}`}
            className={cn(
              "w-full inline-flex items-center justify-center gap-2",
              "font-medium text-[13px] rounded-xl h-11 transition-colors",
              "bg-emerald-600 hover:bg-emerald-700 text-white",
            )}
          >
            <FolderOpen className="h-4 w-4" />
            Access your copy
          </Link>
          <p className="text-[11px] text-center text-muted-foreground">
            You already have this — find it in your digital assets.
          </p>
        </>
      ) : (
        <>
          {/* ── Quantity + Add to cart row ── */}
          <div className="flex items-end gap-2">
            {!isDigital && (
              <div className="shrink-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                  Qty
                </p>
                <QuantitySelector
                  quantity={quantity}
                  onChange={setQuantity}
                  max={isOutOfStock ? 0 : undefined}
                />
              </div>
            )}

            <Button
              onClick={handleAddToCart}
              disabled={isDisabled}
              className={cn(
                "flex-1 h-[42px] font-medium text-[13px] rounded-xl border-none gap-2",
                cartBtnColors,
              )}
            >
              {primaryIcon}
              {primaryButtonText}
            </Button>
          </div>

          {/* ── Buy now (physical + paid digital) ── */}
          {!isFreeDigital && (
            <Button
              onClick={handleBuyNow}
              disabled={isBuyNowDisabled}
              variant="outline"
              className={cn(
                "w-full h-10 font-medium text-[13px] rounded-xl gap-2",
                "border-border hover:bg-accent transition-colors",
              )}
            >
              {buyNowLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShoppingBag className="h-4 w-4" />
              )}
              {buyNowLoading ? "Processing…" : "Buy now"}
            </Button>
          )}

          {/* ── Contextual hints ── */}
          {isFree && !isDigital && !isOutOfStock && (
            <p className="text-[11px] text-center text-emerald-600 dark:text-emerald-400 font-medium">
              No payment required — yours for free
            </p>
          )}
          {isFreeDigital && ownershipChecked && !alreadyOwned && (
            <p className="text-[11px] text-center text-emerald-600 dark:text-emerald-400 font-medium">
              Free instant access — claim your copy
            </p>
          )}
          {isDigital && !isFree && (
            <p className="text-[11px] text-center text-muted-foreground">
              Instant delivery · Lifetime access
            </p>
          )}
        </>
      )}

      {/* ── Secondary actions ── */}
      <div className="grid grid-cols-2 gap-2">
        <ProductChatTrigger
          variant="outline"
          className={cn(
            "h-10 text-[12px] font-medium rounded-xl gap-1.5",
            "border-border text-muted-foreground",
            "hover:border-foreground/30 hover:text-white transition-colors",
          )}
          vendor={vendor ?? undefined}
          product={{ ...product, images: product.images }}
          currentPath={currentPath}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Chat with seller
        </ProductChatTrigger>

        <Button
          variant="outline"
          size="sm"
          disabled={wishlistLoading}
          onClick={handleToggleWishlist}
          className={cn(
            "h-10 text-[12px] font-medium rounded-xl gap-1.5 border transition-colors",
            inWishlist
              ? "border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20"
              : "border-border text-muted-foreground hover:border-foreground/30 hover:text-white",
          )}
        >
          {wishlistLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Heart className={cn("h-3.5 w-3.5", inWishlist && "fill-current")} />
          )}
          {inWishlist ? "Saved" : "Save"}
        </Button>
      </div>
    </div>
  );
}