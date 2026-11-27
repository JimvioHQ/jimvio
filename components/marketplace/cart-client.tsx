"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Minus,
  Plus,
  Loader2,
  ShieldCheck,
  ShoppingCart,
  ChevronLeft,
  Trash2,
  Bookmark,
  Tag,
  ChevronRight,
  Lock,
  Package,
  Globe,
  Shield,
  Gift,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  updateCartItemQuantity,
  removeFromCart,
  getProductVariants,
  updateCartItemVariant,
} from "@/lib/actions/marketplace";
import { isPendingVariantSelection } from "@/lib/cart/pending-variant";
import { VariantPickerDialog, type Variant } from "@/components/marketplace/variant-picker-dialog";
import { useCurrency } from "@/context/CurrencyContext";
import {
  formatAggregatedCartTotalInDisplayCurrency,
  CartOrderLikeForTotal,
} from "@/lib/currency/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { proceedToCheckout } from "@/lib/actions/checkout";

/* ─── Types ─────────────────────────────────────────────────────────────── */

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

/* ─── Constants ──────────────────────────────────────────────────────────── */

const CHECKOUT_ERROR_MESSAGES: Record<string, string> = {
  order_not_found: "That order couldn't be found or has already been paid.",
  mixed_products:
    "Your cart has both digital and physical items. Please check them out separately.",
  checkout_failed:
    "We couldn't start your checkout. Please try again or contact support.",
  no_items: "Your cart is empty.",
  stale_order:
    "There was a problem creating your order. Please try again.",
  sync_failed: "We couldn't sync your cart. Please try again.",
};

const ESCROW_FEE = 0.5;
const COMMISSION_RATE = 0.02; // 2%

/* ─── Helpers ────────────────────────────────────────────────────────────── */

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
  return items.reduce(
    (s, i) => s + Number(i.unit_price_at_add) * Number(i.quantity),
    0
  );
}

function itemsToCartOrders(items: CartItem[]): CartOrderLikeForTotal[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const c = (item.currency_at_add || "USD").toUpperCase();
    map.set(
      c,
      (map.get(c) ?? 0) + Number(item.unit_price_at_add) * Number(item.quantity)
    );
  }
  return [...map.entries()].map(([currency, total]) => ({
    currency,
    order_items: [{ total_price: total }],
  }));
}

/* ─── Quantity stepper ───────────────────────────────────────────────────── */

function QtyInput({
  value,
  max,
  loading,
  onChange,
}: {
  value: number;
  max?: number;
  loading: boolean;
  onChange: (n: number) => void;
}) {
  const [local, setLocal] = useState(value.toString());
  const lockRef = useRef(false);

  useEffect(() => {
    if (!loading) setLocal(value.toString());
  }, [value, loading]);

  const commit = () => {
    const n = parseInt(local, 10);
    if (isNaN(n) || n < 1) {
      setLocal(value.toString());
      return;
    }
    const clamped = max ? Math.min(n, max) : n;
    if (clamped !== value) onChange(clamped);
    else setLocal(value.toString());
  };

  const step = (delta: number) => {
    if (loading || lockRef.current) return;
    lockRef.current = true;
    const next = value + delta;
    if (next < 1) {
      lockRef.current = false;
      return;
    }
    if (max && next > max) {
      lockRef.current = false;
      return;
    }
    onChange(next);
    window.setTimeout(() => {
      lockRef.current = false;
    }, 280);
  };

  return (
    <div
      className={cn(
        "inline-flex h-10 items-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-1",
        loading && "opacity-70",
      )}
      role="group"
      aria-label="Quantity"
    >
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={value <= 1 || loading}
        aria-label="Decrease quantity"
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)]",
          "transition-[transform,background-color,color] duration-200",
          "hover:bg-[var(--color-surface)] hover:text-[var(--color-accent)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/35 focus-visible:ring-offset-1",
          "active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
        )}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <div className="relative min-w-[2rem] text-center">
        {loading ? (
          <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin text-[var(--color-accent)]" aria-hidden />
        ) : (
          <input
            type="text"
            inputMode="numeric"
            value={local}
            onChange={(e) => setLocal(e.target.value.replace(/\D/g, ""))}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            disabled={loading}
            aria-label="Quantity"
            className="h-8 w-8 bg-transparent text-center text-[13px] font-bold tabular-nums text-[var(--color-text-primary)] outline-none"
          />
        )}
      </div>
      <button
        type="button"
        onClick={() => step(1)}
        disabled={(max ? value >= max : false) || loading}
        aria-label="Increase quantity"
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)]",
          "transition-[transform,background-color,color] duration-200",
          "hover:bg-[var(--color-surface)] hover:text-[var(--color-accent)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/35 focus-visible:ring-offset-1",
          "active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
        )}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ─── Orange checkbox ────────────────────────────────────────────────────── */

function OrangeCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2">
      <span
        role="checkbox"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            onChange(!checked);
          }
        }}
        onClick={() => onChange(!checked)}
        className={cn(
          "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border-2 transition-[transform,border-color,background-color] duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/35 focus-visible:ring-offset-2",
          checked
            ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
            : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)]/50",
        )}
      >
        {checked && (
          <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-white" aria-hidden>
            <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {label && <span className="text-sm text-[var(--color-text-muted)]">{label}</span>}
    </label>
  );
}

/* ─── Empty cart ─────────────────────────────────────────────────────────── */

function EmptyCartIllustration() {
  return (
    <div className="relative mx-auto mb-8 h-36 w-36" aria-hidden>
      <div className="absolute inset-0 rounded-full bg-[var(--color-accent-light)] opacity-80" />
      <div className="absolute inset-3 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_12px_40px_rgba(0,0,0,0.06)]" />
      <div className="absolute inset-0 flex items-center justify-center">
        <ShoppingCart className="h-12 w-12 text-[var(--color-accent)]" strokeWidth={1.5} />
      </div>
      <div className="absolute -right-1 top-6 grid h-10 w-10 place-items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <Package className="h-4 w-4 text-[var(--color-text-muted)]" />
      </div>
      <div className="absolute -left-1 bottom-5 grid h-9 w-9 place-items-center rounded-full bg-emerald-500/10">
        <ShieldCheck className="h-4 w-4 text-emerald-600" />
      </div>
    </div>
  );
}

/* ─── Cart skeleton ──────────────────────────────────────────────────────── */

function CartItemSkeleton() {
  return (
    <div className="animate-pulse border-b border-[var(--color-border)] px-4 py-4 last:border-b-0">
      <div className="flex gap-3">
        <div className="h-[18px] w-[18px] rounded-md bg-[var(--color-surface-secondary)]" />
        <div className="h-16 w-16 shrink-0 rounded-xl bg-[var(--color-surface-secondary)]" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-[var(--color-surface-secondary)]" />
          <div className="h-3 w-1/3 rounded bg-[var(--color-surface-secondary)]" />
          <div className="h-10 w-28 rounded-xl bg-[var(--color-surface-secondary)]" />
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */

export function CartClient({ initialItems }: CartClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { formatMoney, displayCurrency, rates } = useCurrency();

  const [items, setItems] = useState<CartItem[]>(initialItems ?? []);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set((initialItems ?? []).map((i) => i.id))
  );
  const [loadingItems, setLoadingItems] = useState<string[]>([]);
  const [removingItems, setRemovingItems] = useState<string[]>([]);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [proceedingCheckout, setProceedingCheckout] = useState(false);
  const [discountExpanded, setDiscountExpanded] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [variantPickerItem, setVariantPickerItem] = useState<CartItem | null>(null);
  const [pickerVariants, setPickerVariants] = useState<Variant[]>([]);
  const [loadingVariantId, setLoadingVariantId] = useState<string | null>(null);
  const [openingVariantPicker, setOpeningVariantPicker] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const hasMountedRef = useRef(false);

  /* Sync external prop changes after mount */
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    setIsSyncing(true);
    setItems(initialItems ?? []);
    const t = window.setTimeout(() => setIsSyncing(false), 180);
    return () => window.clearTimeout(t);
  }, [initialItems]);

  /* Handle checkout error params */
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

  /* Derived values */
  const vendorGroups = useMemo(() => groupByVendor(items), [items]);

  const selectedItems = useMemo(
    () => items.filter((i) => selectedIds.has(i.id)),
    [items, selectedIds]
  );

  const totalUnits = items.reduce((s, i) => s + Number(i.quantity), 0);
  const selectedUnits = selectedItems.reduce((s, i) => s + Number(i.quantity), 0);

  const rawSubtotal = useMemo(
    () =>
      selectedItems.reduce(
        (s, i) => s + Number(i.unit_price_at_add) * Number(i.quantity),
        0
      ),
    [selectedItems]
  );

  const commission = useMemo(() => rawSubtotal * COMMISSION_RATE, [rawSubtotal]);

  const totalsLabel = useMemo(() => {
    const cartOrders = itemsToCartOrders(selectedItems.length ? selectedItems : items);
    return formatAggregatedCartTotalInDisplayCurrency(
      cartOrders,
      displayCurrency,
      rates
    );
  }, [selectedItems, items, displayCurrency, rates]);

  const hasMixedCurrencies = useMemo(
    () =>
      new Set(
        items.map((i) => (i.currency_at_add || "USD").toUpperCase())
      ).size > 1,
    [items]
  );

  const hasPendingVariants = useMemo(
    () => items.some(isPendingVariantSelection),
    [items]
  );

  const allSelected =
    items.length > 0 && selectedIds.size === items.length;

  /* Selection helpers */
  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map((i) => i.id)));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* Checkout */
  const handleProceedToCheckout = async () => {
    if (proceedingCheckout || items.length === 0) return;
    if (hasPendingVariants) return;

    setProceedingCheckout(true);
    try {
      const result = await proceedToCheckout();
      if (!result.ok) {
        toast.error(result.error);
        setProceedingCheckout(false);
        return;
      }
      const checkoutOrderIds = result.orderIds?.length ? result.orderIds : [result.orderId];
      router.push(
        `/checkout?order_id=${result.orderId}&order_ids=${encodeURIComponent(checkoutOrderIds.join(","))}`
      );
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
      setProceedingCheckout(false);
    }
  };

  const openVariantPicker = async (item: CartItem) => {
    setOpeningVariantPicker(true);
    setVariantPickerItem(item);
    try {
      const res = await getProductVariants(item.product_id);
      setPickerVariants((res.variants ?? []) as Variant[]);
    } catch (err) {
      console.error(err);
      setVariantPickerItem(null);
    } finally {
      setOpeningVariantPicker(false);
    }
  };

  const handleVariantSelect = async (variantId: string) => {
    if (!variantPickerItem) return;
    setLoadingVariantId(variantId);
    try {
      const res = await updateCartItemVariant(variantPickerItem.id, variantId);
      if (!res.success) {
        toast.error(res.error || "Couldn't update options");
        return;
      }
      setVariantPickerItem(null);
      setPickerVariants([]);
      window.dispatchEvent(new CustomEvent("cart-updated"));
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    } finally {
      setLoadingVariantId(null);
    }
  };

  /* Quantity update */
  const handleUpdateQuantity = async (itemId: string, newQty: number) => {
    if (newQty < 1 || loadingItems.includes(itemId)) return;
    setLoadingItems((p) => [...p, itemId]);
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, quantity: newQty } : i))
    );
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

  /* Remove */
  const handleRemove = async (itemId: string) => {
    setRemovingItems((p) => [...p, itemId]);
    try {
      const res = await removeFromCart(itemId);
      if (res.success) {
        window.dispatchEvent(new CustomEvent("cart-updated"));
        setItems((prev) => prev.filter((i) => i.id !== itemId));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
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

  /* Remove selected */
  const handleRemoveSelected = async () => {
    for (const id of Array.from(selectedIds)) {
      await handleRemove(id);
    }
  };

  /* ── Empty state ── */
  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="mx-auto max-w-lg py-16 text-center sm:py-24"
      >
        <EmptyCartIllustration />
        <h2 className="mb-2 text-2xl font-bold tracking-[-0.02em] text-[var(--color-text-primary)]">
          Your cart is empty
        </h2>
        <p className="mx-auto mb-8 max-w-sm text-sm leading-relaxed text-[var(--color-text-muted)]">
          Looks like you haven&apos;t added anything yet. Discover products from verified sellers and start building your order.
        </p>
        <Button
          asChild
          className={cn(
            "h-11 rounded-xl px-8 text-sm font-semibold text-white",
            "bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90",
            "shadow-[0_4px_14px_rgba(253,80,0,0.22)] transition-[transform,box-shadow] duration-200",
            "hover:scale-[1.02] active:scale-[0.98]",
            "focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 focus-visible:ring-offset-2",
          )}
        >
          <Link href="/marketplace">Continue Shopping</Link>
        </Button>
      </motion.div>
    );
  }

  /* ── Main layout ── */
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="pb-28 max-lg:pb-32 lg:pb-24"
    >
      {/* ── Page header ── */}
      <div className="mb-5 flex items-center justify-between max-lg:mb-4">
        <div className="flex items-center gap-3 max-lg:gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-accent-light)] shadow-[0_2px_8px_rgba(253,80,0,0.08)] max-lg:h-12 max-lg:w-12 lg:h-12 lg:w-12">
            <ShoppingCart className="h-5 w-5 text-[var(--color-accent)]" strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight tracking-[-0.02em] text-[var(--color-text-primary)] max-lg:text-2xl lg:text-2xl">
              Shopping Cart
            </h1>
            <p className="text-[13px] text-[var(--color-text-muted)] max-lg:text-sm">
              {totalUnits} {totalUnits === 1 ? "item" : "items"} · Ready for checkout
            </p>
          </div>
        </div>
        <Link
          href="/marketplace"
          className={cn(
            "hidden items-center gap-1.5 rounded-xl border border-[var(--color-border)] px-3.5 py-2.5 text-sm",
            "text-[var(--color-text-muted)] transition-[transform,background-color,border-color,color] duration-200 sm:inline-flex",
            "hover:scale-[1.01] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/35 focus-visible:ring-offset-2",
          )}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Continue Shopping
        </Link>
      </div>

      {/* ── Two-column grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">

        {/* ── Left: items ── */}
        <div className="space-y-4">

          {/* Table header */}
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] max-lg:border-0 max-lg:bg-transparent max-lg:shadow-none max-lg:overflow-visible">
            <div className="hidden items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-3 lg:grid lg:grid-cols-[auto_1fr_140px_90px_110px_90px_80px]">
              <div className="w-5" />
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Products
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Variant
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Weight
              </span>
              <span className="text-center text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Quantity
              </span>
              <span className="text-right text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Price
              </span>
              <span className="text-center text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Action
              </span>
            </div>

            {isSyncing ? (
              <>
                <CartItemSkeleton />
                <CartItemSkeleton />
              </>
            ) : (
            <AnimatePresence mode="popLayout" initial={false}>
              {[...vendorGroups.entries()].map(([vendorId, vendorItems]) => {
                const vendor = vendorItems[0]?.vendors;
                const isVerified =
                  vendor?.verification_status === "verified";

                return (
                  <motion.div
                    key={vendorId}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    {/* Supplier row */}
                    <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-3 max-lg:mb-2 max-lg:rounded-xl max-lg:border max-lg:px-3.5 max-lg:py-2.5 max-lg:shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                      <Package className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]" />
                      <Link
                        href={`/vendors/${vendor?.business_slug ?? "#"}`}
                        className="truncate text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent)]"
                      >
                        Sold by{" "}
                        <span className="font-semibold text-[var(--color-text-primary)]">
                          {vendor?.business_name || "Marketplace"}
                        </span>
                      </Link>
                      {isVerified && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
                          <ShieldCheck className="h-3 w-3" />
                          Verified
                        </span>
                      )}
                    </div>

                    {/* Item rows */}
                    <AnimatePresence mode="popLayout" initial={false}>
                      {vendorItems.map((item, idx) => {
                        const isLoading = loadingItems.includes(item.id);
                        const isRemoving = removingItems.includes(item.id);
                        const isSelected = selectedIds.has(item.id);
                        const product = item.products;
                        const variant = item.product_variants;
                        const image =
                          variant?.image_url ||
                          product?.images?.[0] ||
                          null;
                        const slug = product?.slug ?? null;
                        const name = product?.name ?? "Product";
                        const variantLabel =
                          variant?.name ??
                          (variant?.options
                            ? Object.values(variant.options).join(" / ")
                            : null);
                        const needsOptions = isPendingVariantSelection(item);
                        const lineTotal =
                          Number(item.unit_price_at_add) *
                          Number(item.quantity);
                        const currency = item.currency_at_add ?? "USD";

                        return (
                          <motion.div
                            key={item.id}
                            layout
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.18 }}
                            className={cn(
                              "overflow-hidden border-b border-[var(--color-border)] last:border-b-0 transition-opacity duration-200",
                              isRemoving && "pointer-events-none opacity-50",
                            )}
                          >
                            {/* Desktop row */}
                            <div className="hidden lg:grid grid-cols-[auto_1fr_140px_90px_110px_90px_80px] gap-2 items-center px-4 py-4">
                              {/* Checkbox */}
                              <OrangeCheckbox
                                checked={isSelected}
                                onChange={() => toggleSelect(item.id)}
                              />

                              {/* Product */}
                              <div className="flex min-w-0 items-center gap-3">
                                <Link
                                  href={slug ? `/marketplace/${slug}` : "#"}
                                  className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] transition-transform duration-200 hover:scale-[1.02]"
                                >
                                  {image && !imageErrors[item.id] ? (
                                    <Image
                                      src={image}
                                      alt={name}
                                      fill
                                      sizes="64px"
                                      className="object-cover [image-rendering:auto]"
                                      onError={() =>
                                        setImageErrors((p) => ({
                                          ...p,
                                          [item.id]: true,
                                        }))
                                      }
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center">
                                      <ShoppingCart className="h-5 w-5 text-[var(--color-border)]" strokeWidth={1.5} />
                                    </div>
                                  )}
                                </Link>
                                <div className="min-w-0">
                                  <Link
                                    href={slug ? `/marketplace/${slug}` : "#"}
                                    className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--color-text-primary)] transition-colors hover:text-[var(--color-accent)]"
                                  >
                                    {name}
                                  </Link>
                                  <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                                    SKU:{" "}
                                    <span className="font-medium text-[var(--color-text-secondary)]">
                                      {(item.source_metadata?.sku as string) ||
                                        item.product_id.slice(0, 14).toUpperCase()}
                                    </span>
                                  </p>
                                </div>
                              </div>

                              {/* Variant */}
                              <div>
                                {needsOptions ? (
                                  <div className="space-y-2">
                                    <p className="text-[11px] leading-snug text-amber-700">
                                      Please choose your product options before checkout.
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => openVariantPicker(item)}
                                      disabled={openingVariantPicker && variantPickerItem?.id === item.id}
                                      className="inline-flex items-center justify-center rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent-light)] px-3 py-1.5 text-xs font-semibold text-[var(--color-accent)] transition-[transform,background-color] duration-200 hover:scale-[1.02] hover:bg-[var(--color-accent)]/10 disabled:opacity-60"
                                    >
                                      {openingVariantPicker && variantPickerItem?.id === item.id
                                        ? "Loading…"
                                        : "Choose Options"}
                                    </button>
                                  </div>
                                ) : variantLabel ? (
                                  <div className="inline-flex max-w-[130px] min-w-0 items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-text-secondary)]">
                                    <span className="truncate">{variantLabel}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-[var(--color-text-muted)]">—</span>
                                )}
                              </div>

                              {/* Weight */}
                              <div className="text-sm tabular-nums text-[var(--color-text-secondary)]">
                                {(item.source_metadata?.weight as string) || "—"}
                              </div>

                              {/* Quantity */}
                              <div className="flex justify-center">
                                <QtyInput
                                  value={item.quantity}
                                  loading={isLoading}
                                  onChange={(q) =>
                                    handleUpdateQuantity(item.id, q)
                                  }
                                />
                              </div>

                              {/* Price */}
                              <div className="text-right text-sm font-bold tabular-nums text-[var(--color-text-primary)]">
                                {formatMoney(lineTotal, currency)}
                              </div>

                              {/* Actions */}
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)]",
                                    "transition-[transform,background-color,color] duration-200",
                                    "hover:scale-[1.05] hover:bg-[var(--color-accent-light)] hover:text-[var(--color-accent)]",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/30 focus-visible:ring-offset-1",
                                  )}
                                  aria-label="Save for later"
                                  title="Save for later"
                                >
                                  <Bookmark className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemove(item.id)}
                                  disabled={isRemoving}
                                  className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)]",
                                    "transition-[transform,background-color,color] duration-200",
                                    "hover:scale-[1.05] hover:bg-rose-50 hover:text-rose-600",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/30 focus-visible:ring-offset-1",
                                    "disabled:opacity-50",
                                  )}
                                  aria-label="Remove item"
                                  title="Remove"
                                >
                                  {isRemoving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Mobile premium card */}
                            <div className="px-2 py-2 lg:hidden">
                              <div
                                className={cn(
                                  "rounded-2xl border bg-[var(--color-surface)] p-4",
                                  "shadow-[0_2px_16px_rgba(0,0,0,0.06)] transition-[border-color,box-shadow] duration-200",
                                  isSelected
                                    ? "border-[var(--color-accent)]/35 ring-1 ring-[var(--color-accent)]/15"
                                    : "border-[var(--color-border)]",
                                )}
                              >
                                <div className="flex gap-3.5">
                                  <div className="flex shrink-0 flex-col items-center gap-2 pt-1">
                                    <OrangeCheckbox
                                      checked={isSelected}
                                      onChange={() => toggleSelect(item.id)}
                                    />
                                  </div>
                                  <Link
                                    href={slug ? `/marketplace/${slug}` : "#"}
                                    className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
                                  >
                                    {image && !imageErrors[item.id] ? (
                                      <Image
                                        src={image}
                                        alt={name}
                                        fill
                                        sizes="88px"
                                        loading="lazy"
                                        className="object-cover [image-rendering:auto]"
                                        onError={() =>
                                          setImageErrors((p) => ({
                                            ...p,
                                            [item.id]: true,
                                          }))
                                        }
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center">
                                        <ShoppingCart className="h-6 w-6 text-[var(--color-border)]" strokeWidth={1.5} />
                                      </div>
                                    )}
                                  </Link>
                                  <div className="min-w-0 flex-1">
                                    <Link
                                      href={slug ? `/marketplace/${slug}` : "#"}
                                      className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-[-0.01em] text-[var(--color-text-primary)] hover:text-[var(--color-accent)]"
                                    >
                                      {name}
                                    </Link>
                                    {variantLabel && !needsOptions && (
                                      <p className="mt-1 inline-flex max-w-full truncate rounded-md bg-[var(--color-surface-secondary)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-text-muted)]">
                                        {variantLabel}
                                      </p>
                                    )}
                                    {needsOptions && (
                                      <div className="mt-2 space-y-2">
                                        <p className="text-[11px] leading-snug text-amber-700">
                                          Please choose your product options before checkout.
                                        </p>
                                        <button
                                          type="button"
                                          onClick={() => openVariantPicker(item)}
                                          disabled={openingVariantPicker && variantPickerItem?.id === item.id}
                                          className="inline-flex min-h-[36px] items-center justify-center rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent-light)] px-3.5 py-2 text-xs font-semibold text-[var(--color-accent)] transition-[transform,background-color] duration-200 active:scale-[0.98] disabled:opacity-60"
                                        >
                                          {openingVariantPicker && variantPickerItem?.id === item.id
                                            ? "Loading…"
                                            : "Choose Options"}
                                        </button>
                                      </div>
                                    )}
                                    <p className="mt-1.5 text-[12px] text-[var(--color-text-muted)]">
                                      {formatMoney(item.unit_price_at_add, currency)} each
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--color-border)] pt-3.5">
                                  <QtyInput
                                    value={item.quantity}
                                    loading={isLoading}
                                    onChange={(q) => handleUpdateQuantity(item.id, q)}
                                  />
                                  <div className="flex items-center gap-2.5">
                                    <span className="text-[16px] font-bold tabular-nums tracking-[-0.02em] text-[var(--color-text-primary)]">
                                      {formatMoney(lineTotal, currency)}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemove(item.id)}
                                      disabled={isRemoving}
                                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] transition-[transform,background-color,color,border-color] duration-200 active:scale-95 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                                      aria-label="Remove item"
                                    >
                                      {isRemoving ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-4 w-4" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            )}
            <div className="my-3 rounded-none border-t border-[var(--color-border)] bg-[var(--color-surface)] max-lg:mx-0 max-lg:rounded-2xl max-lg:border max-lg:shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
              <div className="grid grid-cols-2 divide-x divide-y divide-[var(--color-border)] max-lg:gap-0 sm:grid-cols-4 sm:divide-y-0">
                {[
                  {
                    icon: <Shield className="h-5 w-5 text-[var(--color-accent)]" />,
                    title: "Buyer Protection",
                    sub: "Eligible orders reviewed",
                  },
                  {
                    icon: <Lock className="h-5 w-5 text-blue-500" />,
                    title: "Secure Payment",
                    sub: "Encrypted checkout",
                  },
                  {
                    icon: <Globe className="h-5 w-5 text-sky-500" />,
                    title: "Shipping at Checkout",
                    sub: "Rates and times shown before you pay",
                  },
                  {
                    icon: <ShieldCheck className="h-5 w-5 text-emerald-500" />,
                    title: "Held Until Delivery",
                    sub: "Seller earnings stay pending until the order completes",
                  },
                ].map((b) => (
                  <div
                    key={b.title}
                    className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--color-surface-secondary)]"
                  >
                    <div className="shrink-0">{b.icon}</div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                        {b.title}
                      </p>
                      <p className="text-[11px] text-[var(--color-text-muted)]">{b.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Mobile continue shopping */}
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)] sm:hidden"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Continue shopping
          </Link>
        </div>

        {/* ── Right: Order summary sidebar ── */}
        <aside className="space-y-3 lg:sticky lg:top-[calc(var(--navbar-height,64px)+16px)]">
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] max-lg:rounded-2xl max-lg:shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
            <div className="border-b border-[var(--color-border)] px-4 py-4">
              <h2 className="text-base font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">
                Order Summary
              </h2>
            </div>

            {/* Discount code */}
            <div className="border-b border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setDiscountExpanded((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3.5 text-sm transition-colors hover:bg-[var(--color-surface-secondary)]"
              >
                <span className="flex items-center gap-2 font-medium text-[var(--color-accent)]">
                  <Tag className="h-4 w-4" />
                  Add discount code
                </span>
                <ChevronRight
                  className={cn(
                    "h-4 w-4 text-[var(--color-text-muted)] transition-transform duration-200",
                    discountExpanded && "rotate-90",
                  )}
                />
              </button>
              {discountExpanded && (
                <div className="flex gap-2 px-4 pb-3">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    placeholder="Enter code"
                    className="h-10 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm outline-none transition-colors focus:border-[var(--color-accent)]"
                  />
                  <button
                    type="button"
                    className="h-10 rounded-xl bg-[var(--color-accent)] px-3.5 text-sm font-semibold text-white transition-[transform,background-color] duration-200 hover:bg-[var(--color-accent)]/90 active:scale-[0.98]"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>

            {/* Line items */}
            <div className="space-y-3 px-4 py-4 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-[var(--color-text-muted)]">
                  Subtotal ({selectedUnits || totalUnits}{" "}
                  {(selectedUnits || totalUnits) === 1 ? "item" : "items"})
                </span>
                <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">
                  {totalsLabel}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[var(--color-text-muted)]">Shipping</span>
                <span className="self-center text-xs text-[var(--color-text-muted)]">
                  Calculated at checkout
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[var(--color-text-muted)]">Tax</span>
                <span className="self-center text-xs text-[var(--color-text-muted)]">
                  Calculated at checkout
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="flex items-center gap-1 text-[var(--color-text-muted)]">
                  Buyer Protection Included
                  <Info className="h-3.5 w-3.5 cursor-help text-[var(--color-text-muted)]" />
                </span>
                <span className="sr-only font-medium tabular-nums text-[var(--color-text-secondary)]">
                  ${ESCROW_FEE.toFixed(2)}
                </span>
              </div>
              {hasMixedCurrencies && (
                <p className="pt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">
                  Cart contains items in multiple currencies. Each vendor&apos;s
                  order is processed separately.
                </p>
              )}
            </div>

            {/* Total */}
            <div className="flex items-baseline justify-between border-t border-[var(--color-border)] px-4 py-3.5">
              <span className="text-sm font-semibold text-[var(--color-text-secondary)]">
                Total
              </span>
              <span className="text-xl font-extrabold tabular-nums tracking-[-0.02em] text-[var(--color-accent)]">
                {totalsLabel}
              </span>
            </div>

            {/* Checkout button */}
            <div className="px-4 pb-6">
              {hasPendingVariants && (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] leading-relaxed text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                  Please choose your product options before checkout.
                </div>
              )}
              <Button
                onClick={handleProceedToCheckout}
                disabled={proceedingCheckout || items.length === 0 || hasPendingVariants}
                className={cn(
                  "h-11 w-full rounded-xl border-none text-sm font-semibold text-white",
                  "bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90",
                  "shadow-[0_4px_14px_rgba(253,80,0,0.22)] transition-[transform,box-shadow,opacity] duration-200",
                  "hover:scale-[1.01] active:scale-[0.99]",
                  "focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 focus-visible:ring-offset-2",
                  "disabled:opacity-60 disabled:hover:scale-100",
                )}
              >
                {proceedingCheckout ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Preparing checkout…
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Secure Checkout →
                  </span>
                )}
              </Button>
              <p className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                <Shield className="mt-0.5 h-3 w-3 shrink-0 text-[var(--color-accent)]" />
                Your order is protected until delivery is confirmed.
              </p>
            </div>

            {/* Commission notice */}
            <div className="mx-4 mb-4 hidden  items-start gap-2.5 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2.5">
              <Gift className="h-4 w-4 text-[#F97316] shrink-0 mt-0.5" />
              <p className="text-[12px] text-gray-700 leading-relaxed">
                You will earn{" "}
                <span className="font-semibold text-[#F97316]">
                  {formatMoney(commission, displayCurrency)}
                </span>{" "}
                commission when your order is completed.
              </p>
            </div>
          </div>

          {/* Help links */}
          <div className="space-y-1.5 px-1 text-xs text-[var(--color-text-muted)]">
            <p>
              <Link
                href="/help"
                className="transition-colors hover:text-[var(--color-accent)] hover:underline"
              >
                Return policy
              </Link>
            </p>
            <p>
              <Link
                href="/help"
                className="transition-colors hover:text-[var(--color-accent)] hover:underline"
              >
                Shipping information
              </Link>
            </p>
            <p>
              <Link
                href="/help"
                className="transition-colors hover:text-[var(--color-accent)] hover:underline"
              >
                Contact support
              </Link>
            </p>
          </div>
        </aside>
      </div>

      {/* ── Sticky bottom bar ── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 shadow-[0_-8px_28px_rgba(0,0,0,0.1)] backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
        <div className="mx-auto flex max-w-8xl flex-col gap-3 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:px-6 max-lg:gap-3.5 max-lg:py-3.5">
          {/* Select all + count row */}
          <div className="flex w-full min-w-0 items-center justify-between gap-3 sm:w-auto sm:flex-1">
          <OrangeCheckbox
            checked={allSelected}
            onChange={toggleSelectAll}
            label="Select All"
          />

          {/* Selected count */}
          <span className="text-sm text-[var(--color-text-muted)] shrink-0">
            Selected:{" "}
            <span className="font-semibold text-[var(--color-accent)]">
              {selectedIds.size}{" "}
              {selectedIds.size === 1 ? "item" : "items"}
            </span>
          </span>
          </div>

          <div className="hidden flex-1 sm:block" />

          {/* Subtotal + actions */}
          <div className="flex w-full min-w-0 items-center justify-between gap-3 sm:w-auto">
          <div className="text-sm shrink-0">
            <span className="mr-1 text-[var(--color-text-muted)]">Subtotal:</span>
            <span className="text-base font-bold tabular-nums text-[var(--color-text-primary)]">
              {totalsLabel}
            </span>
          </div>

          {/* Actions */}
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <button
              type="button"
              onClick={handleRemoveSelected}
              disabled={selectedIds.size === 0}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] px-3.5 py-2 text-sm",
                "text-[var(--color-text-muted)] transition-[transform,background-color,border-color,color] duration-200",
                "hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600",
                "disabled:cursor-not-allowed disabled:opacity-40",
              )}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove Selected
            </button>
            <button
              type="button"
              className="hidden items-center gap-1.5 rounded-xl border border-[var(--color-border)] px-3.5 py-2 text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] sm:inline-flex"
            >
              <Bookmark className="h-3.5 w-3.5" />
              Save For Later
            </button>
            <Button
              onClick={handleProceedToCheckout}
              disabled={proceedingCheckout || selectedIds.size === 0 || hasPendingVariants}
              className={cn(
                "h-11 flex-1 rounded-xl bg-[var(--color-accent)] px-5 text-sm font-semibold text-white sm:h-10 sm:flex-none",
                "max-lg:h-14 max-lg:flex-1 max-lg:rounded-2xl max-lg:text-[15px] max-lg:font-bold max-lg:shadow-[0_4px_18px_rgba(253,80,0,0.28)]",
                "hover:bg-[var(--color-accent)]/90 transition-[transform,opacity] duration-200",
                "hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100",
              )}
            >
              {proceedingCheckout ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" />
                  Secure Checkout →
                </span>
              )}
            </Button>
          </div>
          </div>
        </div>
      </div>

      <VariantPickerDialog
        open={Boolean(variantPickerItem)}
        onClose={() => {
          setVariantPickerItem(null);
          setPickerVariants([]);
        }}
        onSelect={handleVariantSelect}
        variants={pickerVariants}
        productName={variantPickerItem?.products?.name ?? "Product"}
        productImage={
          variantPickerItem?.products?.images?.[0] ??
          variantPickerItem?.product_variants?.image_url ??
          null
        }
        currency={variantPickerItem?.currency_at_add ?? "USD"}
        loadingVariantId={loadingVariantId}
      />
    </motion.div>
  );
}