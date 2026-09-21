"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ShoppingCart, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addToCart } from "@/lib/actions/marketplace";
import { proceedToCheckout } from "@/lib/actions/checkout";
import { useCartStore } from "@/lib/store/use-cart-store";
import { formatStorefrontMoney } from "@/lib/commerce-os/storefront/money";
import {
  findVariantForSelectedOptions,
  getPurchasableOptionAxes,
  isOptionValueAvailable,
  requiresPurchasableVariantSelection,
} from "@/lib/products/storefront-variants";
import { storefrontHref } from "@/lib/commerce-os/storefront-url";

type VariantOption = {
  id: string;
  name?: string | null;
  price?: number | string | null;
  options?: unknown;
  inventory_quantity?: number | null;
  image_url?: string | null;
  is_active?: boolean | null;
};

type Props = {
  productId: string;
  vendorId: string;
  variants?: VariantOption[];
  storeHandle: string;
  storeId: string;
  currency?: string;
  /** Catalog currency for price conversion into store display currency. */
  sourceCurrency?: string;
  className?: string;
  price?: number | string | null;
  soldOut?: boolean;
  sticky?: boolean;
  onStoreHost?: boolean;
  trackInventory?: boolean;
  /** Notify parent when the selected variant has a dedicated image. */
  onVariantImageChange?: (src: string | null) => void;
};

type CtaMode = "idle" | "adding" | "added" | "checkout" | "select";

export function StorefrontAddToCartButton({
  productId,
  vendorId,
  variants = [],
  storeHandle,
  storeId,
  currency = "USD",
  sourceCurrency,
  className,
  price,
  soldOut = false,
  sticky = false,
  onStoreHost = true,
  trackInventory = false,
  onVariantImageChange,
}: Props) {
  const needsSelection = requiresPurchasableVariantSelection(variants);
  const axes = useMemo(() => getPurchasableOptionAxes(variants), [variants]);
  const checkoutResumeRef = useRef(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(
    {}
  );
  const [manualVariantId, setManualVariantId] = useState<string | null>(
    needsSelection ? null : variants[0]?.id ?? null
  );
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [actionMode, setActionMode] = useState<"idle" | "adding" | "added" | "checkout">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const { incrementCartCount } = useCartStore();
  const cartHref = storefrontHref(storeHandle, "/cart", { onStoreHost });

  const optionMatch = useMemo(() => {
    if (!needsSelection || axes.length === 0) return null;
    const complete = axes.every((axis) => selectedOptions[axis.key]);
    if (!complete) return null;
    return findVariantForSelectedOptions(variants, selectedOptions);
  }, [axes, needsSelection, selectedOptions, variants]);

  const optionIncomplete =
    needsSelection &&
    axes.length > 0 &&
    !axes.every((axis) => selectedOptions[axis.key]);

  const optionUnavailable =
    needsSelection &&
    axes.length > 0 &&
    axes.every((axis) => selectedOptions[axis.key]) &&
    !optionMatch;

  const variantId = needsSelection
    ? optionMatch?.id ?? null
    : manualVariantId ?? variants[0]?.id ?? null;

  const selected = useMemo(
    () => variants.find((v) => v.id === variantId) ?? null,
    [variants, variantId]
  );
  const displayPrice = selected?.price ?? price;
  const selectedSoldOut =
    soldOut ||
    (typeof selected?.inventory_quantity === "number" &&
      selected.inventory_quantity <= 0);
  const selectionBlocked = needsSelection && !variantId;
  const canPurchase = !selectedSoldOut && !selectionBlocked && !loading;

  useEffect(() => {
    onVariantImageChange?.(selected?.image_url?.trim() || null);
  }, [selected?.image_url, onVariantImageChange]);

  const mode: CtaMode =
    actionMode !== "idle"
      ? actionMode
      : selectionBlocked || optionIncomplete || optionUnavailable
        ? "select"
        : "idle";

  function pickOption(axisKey: string, value: string) {
    setSelectedOptions((prev) => {
      const next = { ...prev, [axisKey]: value };
      for (const axis of axes) {
        if (axis.key === axisKey) continue;
        const cur = next[axis.key];
        if (
          cur &&
          !isOptionValueAvailable(variants, axis.key, cur, next, trackInventory)
        ) {
          delete next[axis.key];
        }
      }
      return next;
    });
    setError(null);
  }

  async function handleAdd(goCheckout = false) {
    if (selectedSoldOut || loading) return;
    if (selectionBlocked) {
      setError(
        optionUnavailable
          ? "That combination isn’t available. Try another selection."
          : "Please select your options first"
      );
      return;
    }
    setLoading(true);
    setError(null);
    setActionMode(goCheckout ? "checkout" : "adding");
    try {
      document.cookie = `jimvio_store_handle=${encodeURIComponent(storeHandle)}; path=/; max-age=86400; samesite=lax`;
      const result = await addToCart(productId, vendorId, qty, variantId, {
        jimvioStoreId: storeId,
        jimvioStoreHandle: storeHandle,
      });
      if (result.success) {
        incrementCartCount(qty);
        if (goCheckout) {
          const checkout = await proceedToCheckout();
          if (checkout.ok) {
            window.location.href = `/checkout?order_id=${encodeURIComponent(checkout.orderId)}`;
            return;
          }
          setError(checkout.error || "Could not start checkout.");
          setActionMode("idle");
          return;
        }
        setActionMode("added");
        setTimeout(() => setActionMode("idle"), 3500);
      } else if (result.error === "Authentication required") {
        const path =
          typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}` || "/"
            : "/";
        const next = goCheckout
          ? `${path}${path.includes("?") ? "&" : "?"}checkout=1`
          : path;
        window.location.href = `/login?next=${encodeURIComponent(next)}`;
      } else {
        setError(result.error || "Could not add this product to your cart.");
        setActionMode("idle");
      }
    } catch {
      setError("Cart is temporarily unavailable. Please try again.");
      setActionMode("idle");
    } finally {
      setLoading(false);
    }
  }

  // Resume Buy Now after login (?checkout=1) once a purchasable variant is ready.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (checkoutResumeRef.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "1") return;
    if (needsSelection && !variantId) return;
    if (soldOut || selectedSoldOut) return;
    checkoutResumeRef.current = true;
    params.delete("checkout");
    const clean = `${window.location.pathname}${
      params.toString() ? `?${params}` : ""
    }`;
    window.history.replaceState({}, "", clean || window.location.pathname);
    // Defer so we don't setState synchronously inside the effect body.
    queueMicrotask(() => {
      void handleAdd(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- auth-return resume only
  }, [variantId, needsSelection, soldOut, selectedSoldOut]);

  const addLabel = selectedSoldOut
    ? "Out of stock"
    : mode === "select" || selectionBlocked
      ? "Select options"
      : mode === "adding"
        ? "Adding…"
        : mode === "added"
          ? "Added to cart"
          : "Add to Cart";

  const buyLabel = selectedSoldOut
    ? "Out of stock"
    : mode === "checkout"
      ? "Preparing checkout…"
      : selectionBlocked
        ? "Select options"
        : "Buy now";

  const optionPickers =
    axes.length > 0 ? (
      <div className="space-y-4">
        {axes.map((axis) => (
          <div key={axis.key}>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide opacity-60">
              {axis.label}
              {selectedOptions[axis.key] ? (
                <span className="ml-1.5 font-medium normal-case tracking-normal opacity-100">
                  · {selectedOptions[axis.key]}
                </span>
              ) : null}
            </label>
            <div className="flex flex-wrap gap-2">
              {axis.values.map((value) => {
                const on = selectedOptions[axis.key] === value;
                const available = isOptionValueAvailable(
                  variants,
                  axis.key,
                  value,
                  selectedOptions,
                  trackInventory
                );
                return (
                  <button
                    key={`${axis.key}:${value}`}
                    type="button"
                    disabled={!available && !on}
                    onClick={() => pickOption(axis.key, value)}
                    className={`min-h-10 rounded-full border px-3.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      on
                        ? "border-[var(--store-primary,#FF5A1F)] bg-[var(--store-primary,#FF5A1F)] text-white"
                        : "border-[var(--store-border,rgba(0,0,0,0.1))] bg-[var(--store-surface,#fff)] text-[var(--store-text,#111827)]"
                    }`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    ) : variants.length > 1 ? (
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide opacity-60">
          Variant
        </label>
        <div className="flex flex-wrap gap-2">
          {variants.map((v) => {
            const on = v.id === variantId;
            const label =
              v.name ||
              (v.options && typeof v.options === "object"
                ? Object.values(v.options as Record<string, unknown>)
                    .filter((x) => typeof x === "string")
                    .join(" / ")
                : v.id.slice(0, 8));
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setManualVariantId(v.id);
                  setError(null);
                }}
                className={`min-h-10 rounded-full border px-3.5 text-sm font-semibold ${
                  on
                    ? "border-[var(--store-primary,#FF5A1F)] bg-[var(--store-primary,#FF5A1F)] text-white"
                    : "border-[var(--store-border,rgba(0,0,0,0.1))] bg-[var(--store-surface,#fff)] text-[var(--store-text,#111827)]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    ) : null;

  const displayError =
    error ||
    (optionUnavailable
      ? "That combination isn’t available. Try another selection."
      : null);

  const actions = (
    <>
      {optionPickers}
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="inline-flex items-center rounded-full border border-[var(--store-border,rgba(0,0,0,0.1))]"
          role="group"
          aria-label="Quantity"
        >
          <button
            type="button"
            className="grid h-11 w-11 place-items-center text-lg"
            onClick={() => setQty((n) => Math.max(1, n - 1))}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="min-w-8 text-center text-sm font-semibold">{qty}</span>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center text-lg"
            onClick={() => setQty((n) => Math.min(99, n + 1))}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        {displayPrice != null ? (
          <p className="text-sm font-semibold text-[var(--store-text,#111827)]">
            {formatStorefrontMoney(
              displayPrice,
              sourceCurrency || currency,
              currency,
            )}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          size="lg"
          onClick={() => void handleAdd(false)}
          disabled={!canPurchase || mode === "added"}
          className={
            className ||
            "h-12 flex-1 rounded-[var(--store-btn-radius,9999px)] bg-[var(--store-primary,#FF5A1F)] text-white hover:opacity-90"
          }
        >
          {mode === "adding" ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : mode === "added" ? (
            <CheckCircle2 className="mr-2 h-5 w-5" />
          ) : (
            <ShoppingCart className="mr-2 h-5 w-5" />
          )}
          {addLabel}
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => void handleAdd(true)}
          disabled={!canPurchase || mode === "checkout"}
          className="h-12 flex-1 rounded-[var(--store-btn-radius,9999px)]"
        >
          {mode === "checkout" ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : null}
          {buyLabel}
        </Button>
      </div>
      {mode === "added" ? (
        <p className="flex flex-wrap items-center gap-3 text-sm text-[var(--store-text,#111827)]">
          <span className="font-medium text-emerald-700">Added to cart</span>
          <Link
            href={cartHref}
            className="font-semibold text-[var(--store-primary,#FF5A1F)] underline"
          >
            View cart
          </Link>
          <span className="text-[var(--store-muted,#6B7280)]">
            Continue shopping
          </span>
        </p>
      ) : null}
      {displayError ? (
        <p className="text-xs text-red-600" role="alert">
          {displayError}
        </p>
      ) : null}
    </>
  );

  return (
    <div className="space-y-3">
      {actions}
      {sticky ? (
        <div
          className="fixed inset-x-0 z-30 border-t border-[var(--store-border)] bg-[var(--store-surface)]/95 p-3 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] lg:hidden"
          style={{
            bottom:
              "calc(var(--store-mobile-nav-h, 3.5rem) + env(safe-area-inset-bottom, 0px))",
          }}
          data-storefront-chrome="sticky-atc"
        >
          <Button
            size="lg"
            onClick={() => void handleAdd(false)}
            disabled={!canPurchase || mode === "added"}
            className="h-12 w-full rounded-[var(--store-btn-radius,9999px)] bg-[var(--store-primary,#FF5A1F)] text-white"
          >
            {addLabel}
            {displayPrice != null && !selectionBlocked && !selectedSoldOut
              ? ` · ${formatStorefrontMoney(
                  displayPrice,
                  sourceCurrency || currency,
                  currency,
                )}`
              : ""}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
