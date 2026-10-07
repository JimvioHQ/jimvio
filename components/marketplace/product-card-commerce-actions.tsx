"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, ShoppingBag, ShoppingCart } from "lucide-react";
import { SellToStoreButton } from "@/components/commerce-os/sell-to-store-button";
import { cn } from "@/lib/utils";
import {
  getOpenProductCardActionsId,
  setOpenProductCardActionsId,
  subscribeOpenProductCardActions,
} from "@/lib/marketplace/product-card-actions-controller";

/** Compact card CTAs — keep product image dominant */
const actionClass =
  "flex h-9 min-h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-xl border-0 bg-[#FF5A1F] px-2.5 text-[12px] font-semibold leading-none text-white shadow-none hover:bg-[#E54E18] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:cursor-not-allowed disabled:opacity-60";

const secondaryActionClass =
  "flex h-9 min-h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-xl border border-white/80 bg-white/95 px-2.5 text-[12px] font-semibold leading-none text-[#FF5A1F] shadow-none hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:cursor-not-allowed disabled:opacity-60";

function useCoarsePointer() {
  /** null until mounted — avoid wrong first paint on either desktop or mobile */
  const [coarse, setCoarse] = useState<boolean | null>(null);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(hover: none), (pointer: coarse)");
    const apply = () => setCoarse(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);
  return coarse;
}

/**
 * Image overlay for marketplace cards.
 * Desktop (hover): Add to Cart + Sell to Store
 * Mobile (pointerdown): Add to Cart + Buy now — single open card, outside tap closes
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
  const coarse = useCoarsePointer();
  const rootRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [openId, setOpenId] = useState<string | null>(() => getOpenProductCardActionsId());
  const open = openId === productId;
  const busy = loading || Boolean(buyNowLoading);

  useEffect(() => subscribeOpenProductCardActions(setOpenId), []);

  const touchMode = coarse === true;

  const clearIdle = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const scheduleIdleClose = useCallback(() => {
    clearIdle();
    idleTimerRef.current = setTimeout(() => {
      if (getOpenProductCardActionsId() === productId) {
        setOpenProductCardActionsId(null);
      }
    }, 4000);
  }, [clearIdle, productId]);

  useEffect(() => {
    if (!open || !touchMode) {
      clearIdle();
      return;
    }
    scheduleIdleClose();
    return clearIdle;
  }, [open, touchMode, scheduleIdleClose, clearIdle]);

  useEffect(() => {
    if (!open || !touchMode) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (rootRef.current?.contains(target)) return;
      setOpenProductCardActionsId(null);
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open, touchMode]);

  useEffect(() => {
    return () => {
      clearIdle();
      if (getOpenProductCardActionsId() === productId) {
        setOpenProductCardActionsId(null);
      }
    };
  }, [productId, clearIdle]);

  const reveal = useCallback(
    (event: React.PointerEvent) => {
      // Touch / pen only — desktop mouse uses hover
      if (event.pointerType === "mouse") return;
      event.preventDefault();
      event.stopPropagation();
      setOpenProductCardActionsId(productId);
    },
    [productId],
  );

  const stop = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
    clearIdle();
  };

  return (
    <div
      ref={rootRef}
      className="pointer-events-none absolute inset-0 z-20 @container"
      onClick={(event) => event.stopPropagation()}
    >
      {/* Touch / pen: tap image zone to reveal (mouse uses hover) */}
      <button
        type="button"
        aria-label="Show product actions"
        aria-expanded={open}
        aria-controls={`card-actions-panel-${productId}`}
        onPointerDown={reveal}
        className={cn(
          "pointer-events-auto absolute inset-0 cursor-pointer [@media(hover:hover)]:hidden",
          open && "pointer-events-none",
        )}
      />

      {/* Subtle bottom fade */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/35 to-transparent opacity-0 transition-opacity duration-150",
          open && "opacity-100",
          "[@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100",
        )}
        aria-hidden
      />

      <div
        id={`card-actions-panel-${productId}`}
        className={cn(
          "absolute inset-x-2 bottom-2 gap-1.5 transition-[opacity,transform] duration-150 ease-out",
          "flex-col @[280px]:flex-row",
          // Touch open state (no-hover devices)
          open
            ? "pointer-events-auto flex translate-y-0 opacity-100"
            : "pointer-events-none hidden translate-y-1 opacity-0",
          // Fine pointer / hover-capable: CSS hover path overrides closed hidden
          "[@media(hover:hover)]:flex [@media(hover:hover)]:translate-y-1 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:pointer-events-none",
          "[@media(hover:hover)]:group-hover:pointer-events-auto [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100",
          "[@media(hover:hover)]:group-focus-within:pointer-events-auto [@media(hover:hover)]:group-focus-within:translate-y-0 [@media(hover:hover)]:group-focus-within:opacity-100",
          open && "[@media(hover:hover)]:opacity-100 [@media(hover:hover)]:translate-y-0 [@media(hover:hover)]:pointer-events-auto",
        )}
      >
        <button
          type="button"
          onClick={onAddToCart}
          onPointerDown={stop}
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
          onClick={stop}
          onPointerDown={stop}
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
            onPointerDown={stop}
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
