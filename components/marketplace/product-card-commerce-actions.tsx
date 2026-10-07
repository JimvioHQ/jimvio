"use client";

import { Loader2, ShoppingCart } from "lucide-react";
import { SellToStoreButton } from "@/components/commerce-os/sell-to-store-button";
import { cn } from "@/lib/utils";

const actionClass =
  "flex h-11 min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full border-0 bg-[#FF5A1F] px-3 text-[12px] font-semibold text-white shadow-none hover:bg-[#E54E18] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Image overlay for marketplace cards.
 * Hover-capable pointers reveal equal orange actions.
 * Touch reveals the same actions, stacked until the card is wide enough.
 */
export function ProductCardCommerceActions({
  productId,
  productName,
  onAddToCart,
  loading,
  disabled,
  inCart,
}: {
  productId: string;
  productName: string;
  onAddToCart: (event: React.MouseEvent) => void;
  loading: boolean;
  disabled: boolean;
  inCart: boolean;
}) {
  const inputId = `card-actions-${productId}`;

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
      <div
        className={cn(
          "absolute inset-x-2.5 bottom-2.5 hidden gap-2",
          "flex-col @[300px]:flex-row",
          "peer-checked:pointer-events-auto peer-checked:flex peer-focus-visible:pointer-events-auto peer-focus-visible:flex",
          "[@media(hover:hover)]:flex [@media(hover:hover)]:translate-y-2 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:pointer-events-none",
          "[@media(hover:hover)]:transition-[opacity,transform] [@media(hover:hover)]:duration-200 [@media(hover:hover)]:ease-out",
          "[@media(hover:hover)]:group-hover:pointer-events-auto [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100",
          "[@media(hover:hover)]:group-focus-within:pointer-events-auto [@media(hover:hover)]:group-focus-within:translate-y-0 [@media(hover:hover)]:group-focus-within:opacity-100",
        )}
      >
        <button
          type="button"
          onClick={onAddToCart}
          disabled={loading || disabled}
          className={actionClass}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          ) : (
            <ShoppingCart className="h-4 w-4 shrink-0" aria-hidden />
          )}
          <span className="truncate">
            {disabled ? "Out of stock" : inCart ? "In cart" : "Add to Cart"}
          </span>
        </button>
        <div
          className="flex min-w-0 flex-1"
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
      </div>
    </div>
  );
}
