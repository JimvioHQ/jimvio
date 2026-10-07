"use client";

import { Loader2, ShoppingBag, ShoppingCart } from "lucide-react";
import { SellToStoreButton } from "@/components/commerce-os/sell-to-store-button";
import { cn } from "@/lib/utils";

/** Compact card CTAs — keep product image dominant */
const actionClass =
  "flex h-9 min-h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-xl border-0 bg-[#FF5A1F] px-2.5 text-[12px] font-semibold leading-none text-white shadow-none hover:bg-[#E54E18] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:cursor-not-allowed disabled:opacity-60";

const secondaryActionClass =
  "flex h-9 min-h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-xl border border-white/80 bg-white/95 px-2.5 text-[12px] font-semibold leading-none text-[#FF5A1F] shadow-none hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Image overlay for marketplace cards.
 * Desktop (hover): Add to Cart + Sell to Store
 * Mobile (tap): Add to Cart + Buy now
 */
export function ProductCardCommerceActions({
  productId,
  productName,
  onAddToCart,
  onBuyNow,
  loading,
  buyNowLoading,
  disabled,
  inCart,
}: {
  productId: string;
  productName: string;
  onAddToCart: (event: React.MouseEvent) => void;
  onBuyNow?: (event: React.MouseEvent) => void;
  loading: boolean;
  buyNowLoading?: boolean;
  disabled: boolean;
  inCart: boolean;
}) {
  const inputId = `card-actions-${productId}`;
  const busy = loading || Boolean(buyNowLoading);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 @container"
      onClick={(event) => event.stopPropagation()}
    >
      <input
        id={inputId}
        type="checkbox"
        className="peer sr-only"
        aria-label="Show product actions"
      />
      <label
        htmlFor={inputId}
        className="pointer-events-auto absolute inset-0 cursor-pointer peer-checked:hidden [@media(hover:hover)]:hidden"
      >
        <span className="sr-only">Show product actions</span>
      </label>

      {/* Subtle bottom fade only — does not darken the whole image */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/35 to-transparent opacity-0 transition-opacity duration-200",
          "peer-checked:opacity-100",
          "[@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100",
        )}
        aria-hidden
      />

      <div
        className={cn(
          "absolute inset-x-2 bottom-2 hidden gap-1.5",
          "flex-col @[280px]:flex-row",
          "peer-checked:pointer-events-auto peer-checked:flex peer-focus-visible:pointer-events-auto peer-focus-visible:flex",
          "[@media(hover:hover)]:flex [@media(hover:hover)]:translate-y-1 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:pointer-events-none",
          "[@media(hover:hover)]:transition-[opacity,transform] [@media(hover:hover)]:duration-150 [@media(hover:hover)]:ease-out",
          "[@media(hover:hover)]:group-hover:pointer-events-auto [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100",
          "[@media(hover:hover)]:group-focus-within:pointer-events-auto [@media(hover:hover)]:group-focus-within:translate-y-0 [@media(hover:hover)]:group-focus-within:opacity-100",
        )}
      >
        <button
          type="button"
          onClick={onAddToCart}
          disabled={busy || disabled}
          className={actionClass}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
          ) : (
            <ShoppingCart className="h-3.5 w-3.5 shrink-0" aria-hidden />
          )}
          <span className="truncate">
            {disabled ? "Out of stock" : inCart ? "In cart" : "Add to Cart"}
          </span>
        </button>

        {/* Desktop: Sell to Store */}
        <div
          className="hidden min-w-0 flex-1 [@media(hover:hover)]:flex"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <SellToStoreButton
            productId={productId}
            productName={productName}
            label="Sell to Store"
            className={cn(actionClass, "w-full")}
          />
        </div>

        {/* Mobile: Buy now */}
        {onBuyNow ? (
          <button
            type="button"
            onClick={onBuyNow}
            disabled={busy || disabled}
            className={cn(secondaryActionClass, "[@media(hover:hover)]:hidden")}
          >
            {buyNowLoading ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
            ) : (
              <ShoppingBag className="h-3.5 w-3.5 shrink-0" aria-hidden />
            )}
            <span className="truncate">{disabled ? "Out of stock" : "Buy now"}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
