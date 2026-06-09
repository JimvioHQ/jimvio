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
  CreditCard,
  Globe,
  Shield,
  Gift,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  updateCartItemQuantity,
  removeFromCart,
} from "@/lib/actions/marketplace";
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
    const c = (item.currency_at_add || "RWF").toUpperCase();
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

  return (
    <div className="inline-flex items-center border border-gray-300 rounded overflow-hidden bg-white">
      <button
        onClick={() => value > 1 && onChange(value - 1)}
        disabled={value <= 1 || loading}
        aria-label="Decrease quantity"
        className="h-7 w-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
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
        className="w-8 h-7 text-center text-[13px] font-medium text-gray-900 bg-transparent outline-none border-x border-gray-300 tabular-nums"
      />
      <button
        onClick={() => (!max || value < max) && onChange(value + 1)}
        disabled={(max ? value >= max : false) || loading}
        aria-label="Increase quantity"
        className="h-7 w-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        <Plus className="h-3 w-3" />
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
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <span
        onClick={() => onChange(!checked)}
        className={cn(
          "h-[18px] w-[18px] rounded flex items-center justify-center border-2 transition-colors shrink-0",
          checked
            ? "bg-[#F97316] border-[#F97316]"
            : "bg-white border-gray-300 hover:border-[#F97316]"
        )}
      >
        {checked && (
          <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-white">
            <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {label && <span className="text-sm text-gray-600">{label}</span>}
    </label>
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
  const hasMountedRef = useRef(false);

  /* Sync external prop changes after mount */
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    setItems(initialItems ?? []);
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
        items.map((i) => (i.currency_at_add || "RWF").toUpperCase())
      ).size > 1,
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

  /* Quantity update */
  const handleUpdateQuantity = async (itemId: string, newQty: number) => {
    if (newQty < 1) return;
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
      <div className="max-w-md mx-auto py-20 text-center">
        <div className="h-20 w-20 mx-auto mb-6 rounded-full bg-orange-50 flex items-center justify-center">
          <ShoppingCart className="h-9 w-9 text-[#F97316]" strokeWidth={1.5} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Your cart is empty
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Add items to your cart to checkout.
        </p>
        <Button
          asChild
          className="h-10 px-6 rounded-md text-sm bg-[#F97316] text-white hover:bg-[#EA6C0A] font-semibold"
        >
          <Link href="/marketplace">Browse Marketplace</Link>
        </Button>
      </div>
    );
  }

  /* ── Main layout ── */
  return (
    <div className="pb-24">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center">
            <ShoppingCart className="h-5 w-5 text-[#F97316]" strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">
              Shopping Cart
            </h1>
            <p className="text-sm text-gray-500">
              {totalUnits} {totalUnits === 1 ? "item" : "items"} &bull; Ready for checkout
            </p>
          </div>
        </div>
        <Link
          href="/marketplace"
          className="hidden sm:inline-flex items-center gap-1.5 text-sm text-gray-600 border border-gray-300 hover:border-gray-400 rounded-sm px-3.5 py-2 hover:bg-gray-50 transition-colors"
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
          <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm">
            <div className="hidden md:grid grid-cols-[auto_1fr_140px_90px_110px_90px_80px] gap-2 items-center px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="w-5" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Products
              </span>
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Variant
              </span>
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Weight
              </span>
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide text-center">
                Quantity
              </span>
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide text-right">
                Price
              </span>
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide text-center">
                Action
              </span>
            </div>

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
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                      <Package className="h-3.5 w-3.5 text-[#F97316] shrink-0" />
                      <Link
                        href={`/vendors/${vendor?.business_slug ?? "#"}`}
                        className="text-sm font-medium text-gray-700 hover:text-[#F97316] transition-colors truncate"
                      >
                        Supplier:{" "}
                        <span className="font-semibold">
                          {vendor?.business_name || "Marketplace"}
                        </span>
                      </Link>
                      {isVerified && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
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
                        const lineTotal =
                          Number(item.unit_price_at_add) *
                          Number(item.quantity);
                        const currency = item.currency_at_add ?? "RWF";

                        return (
                          <motion.div
                            key={item.id}
                            layout
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.18 }}
                            className={cn(
                              "overflow-hidden border-b border-gray-100 last:border-b-0",
                              isRemoving && "opacity-50 pointer-events-none"
                            )}
                          >
                            {/* Desktop row */}
                            <div className="hidden md:grid grid-cols-[auto_1fr_140px_90px_110px_90px_80px] gap-2 items-center px-4 py-4">
                              {/* Checkbox */}
                              <OrangeCheckbox
                                checked={isSelected}
                                onChange={() => toggleSelect(item.id)}
                              />

                              {/* Product */}
                              <div className="flex items-center gap-3 min-w-0">
                                <Link
                                  href={slug ? `/marketplace/${slug}` : "#"}
                                  className="relative h-16 w-16 shrink-0 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden"
                                >
                                  {image && !imageErrors[item.id] ? (
                                    <Image
                                      src={image}
                                      alt={name}
                                      fill
                                      sizes="64px"
                                      className="object-cover"
                                      onError={() =>
                                        setImageErrors((p) => ({
                                          ...p,
                                          [item.id]: true,
                                        }))
                                      }
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <ShoppingCart className="h-5 w-5 text-gray-300" strokeWidth={1.5} />
                                    </div>
                                  )}
                                </Link>
                                <div className="min-w-0">
                                  <Link
                                    href={slug ? `/marketplace/${slug}` : "#"}
                                    className="text-sm font-medium text-gray-900 hover:text-[#F97316] line-clamp-2 leading-snug transition-colors"
                                  >
                                    {name}
                                  </Link>
                                  <p className="text-[11px] text-gray-400 mt-0.5">
                                    SKU:{" "}
                                    {item.source_metadata?.sku as string ||
                                      item.product_id.slice(0, 14).toUpperCase()}
                                  </p>
                                </div>
                              </div>

                              {/* Variant */}
                              <div>
                                {variantLabel ? (
                                  <div className="inline-flex items-center gap-1 border border-gray-300 rounded text-xs text-gray-700 px-2.5 py-1.5 bg-white min-w-0 max-w-[130px]">
                                    <span className="truncate">{variantLabel}</span>
                                    <ChevronRight className="h-3 w-3 rotate-90 shrink-0 text-gray-400" />
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400">—</span>
                                )}
                              </div>

                              {/* Weight */}
                              <div className="text-sm text-gray-600 tabular-nums">
                                {(item.source_metadata?.weight as string) || "—"}
                              </div>

                              {/* Quantity */}
                              <div className="flex justify-center">
                                {isLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-[#F97316]" />
                                ) : (
                                  <QtyInput
                                    value={item.quantity}
                                    loading={isLoading}
                                    onChange={(q) =>
                                      handleUpdateQuantity(item.id, q)
                                    }
                                  />
                                )}
                              </div>

                              {/* Price */}
                              <div className="text-sm font-semibold text-gray-900 text-right tabular-nums">
                                {formatMoney(lineTotal, currency)}
                              </div>

                              {/* Actions */}
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:text-[#F97316] hover:bg-orange-50 transition-colors"
                                  aria-label="Save for later"
                                  title="Save for later"
                                >
                                  <Bookmark className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleRemove(item.id)}
                                  disabled={isRemoving}
                                  className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
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

                            {/* Mobile row */}
                            <div className="md:hidden px-4 py-4 flex gap-3">
                              <div className="flex flex-col items-center gap-2 pt-1">
                                <OrangeCheckbox
                                  checked={isSelected}
                                  onChange={() => toggleSelect(item.id)}
                                />
                              </div>
                              <Link
                                href={slug ? `/marketplace/${slug}` : "#"}
                                className="relative h-[72px] w-[72px] shrink-0 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden"
                              >
                                {image && !imageErrors[item.id] ? (
                                  <Image
                                    src={image}
                                    alt={name}
                                    fill
                                    sizes="72px"
                                    className="object-cover"
                                    onError={() =>
                                      setImageErrors((p) => ({
                                        ...p,
                                        [item.id]: true,
                                      }))
                                    }
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ShoppingCart className="h-5 w-5 text-gray-300" strokeWidth={1.5} />
                                  </div>
                                )}
                              </Link>
                              <div className="flex-1 min-w-0">
                                <Link
                                  href={slug ? `/marketplace/${slug}` : "#"}
                                  className="text-sm font-medium text-gray-900 hover:text-[#F97316] line-clamp-2"
                                >
                                  {name}
                                </Link>
                                {variantLabel && (
                                  <p className="text-xs text-gray-500 mt-0.5">{variantLabel}</p>
                                )}
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {formatMoney(item.unit_price_at_add, currency)} each
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                  <QtyInput
                                    value={item.quantity}
                                    loading={isLoading}
                                    onChange={(q) =>
                                      handleUpdateQuantity(item.id, q)
                                    }
                                  />
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold tabular-nums text-gray-900">
                                      {formatMoney(lineTotal, currency)}
                                    </span>
                                    <button
                                      onClick={() => handleRemove(item.id)}
                                      disabled={isRemoving}
                                      className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-red-500 disabled:opacity-50"
                                    >
                                      {isRemoving ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-3.5 w-3.5" />
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
            <div className="bg-white border-t my-3 border-gray-200 rounded-none">
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100">
                {[
                  {
                    icon: <Shield className="h-5 w-5 text-[#F97316]" />,
                    title: "Buyer Protection",
                    sub: "Shop with confidence",
                  },
                  {
                    icon: <Lock className="h-5 w-5 text-blue-500" />,
                    title: "Secure Payment",
                    sub: "100% safe & secure",
                  },
                  {
                    icon: <Globe className="h-5 w-5 text-sky-500" />,
                    title: "Worldwide Shipping",
                    sub: "Fast & reliable delivery",
                  },
                  {
                    icon: <ShieldCheck className="h-5 w-5 text-emerald-500" />,
                    title: "Escrow Protected",
                    sub: "Your money is safe",
                  },
                ].map((b) => (
                  <div
                    key={b.title}
                    className="flex items-center gap-3 px-4 py-3.5"
                  >
                    <div className="shrink-0">{b.icon}</div>
                    <div>
                      <p className="text-[13px] font-semibold text-gray-800">
                        {b.title}
                      </p>
                      <p className="text-[11px] text-gray-500">{b.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Mobile continue shopping */}
          <Link
            href="/marketplace"
            className="sm:hidden inline-flex items-center gap-1 text-sm text-gray-600 hover:text-[#F97316] transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Continue shopping
          </Link>
        </div>

        {/* ── Right: Order summary sidebar ── */}
        <aside className="lg:sticky lg:top-[calc(var(--navbar-height,64px)+16px)] space-y-3">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-3.5 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                Order Summary
              </h2>
            </div>

            {/* Discount code */}
            <div className="border-b border-gray-100">
              <button
                onClick={() => setDiscountExpanded((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50 transition-colors"
              >
                <span className="flex items-center gap-2 text-[#F97316] font-medium">
                  <Tag className="h-4 w-4" />
                  Add discount code
                </span>
                <ChevronRight
                  className={cn(
                    "h-4 w-4 text-gray-400 transition-transform",
                    discountExpanded && "rotate-90"
                  )}
                />
              </button>
              {discountExpanded && (
                <div className="px-4 pb-3 flex gap-2">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    placeholder="Enter code"
                    className="flex-1 h-9 border border-gray-300 rounded text-sm px-3 outline-none focus:border-[#F97316] transition-colors"
                  />
                  <button className="h-9 px-3 rounded bg-[#F97316] text-white text-sm font-semibold hover:bg-[#EA6C0A] transition-colors">
                    Apply
                  </button>
                </div>
              )}
            </div>

            {/* Line items */}
            <div className="px-4 py-3.5 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">
                  Subtotal ({selectedUnits || totalUnits}{" "}
                  {(selectedUnits || totalUnits) === 1 ? "item" : "items"})
                </span>
                <span className="font-semibold text-gray-900 tabular-nums">
                  {totalsLabel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Shipping</span>
                <span className="text-gray-400 text-xs self-center">
                  Calculated at checkout
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tax</span>
                <span className="text-gray-400 text-xs self-center">
                  Calculated at checkout
                </span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1 text-gray-500">
                  Escrow Protection
                  <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                </span>
                <span className="font-medium text-gray-700 tabular-nums">
                  ${ESCROW_FEE.toFixed(2)}
                </span>
              </div>
              {hasMixedCurrencies && (
                <p className="text-xs text-gray-400 leading-relaxed pt-1">
                  Cart contains items in multiple currencies. Each vendor's
                  order is processed separately.
                </p>
              )}
            </div>

            {/* Total */}
            <div className="px-4 py-3 border-t border-gray-100 flex justify-between items-baseline">
              <span className="text-sm font-semibold text-gray-700">
                Total
              </span>
              <span className="text-xl font-bold text-[#F97316] tabular-nums">
                {totalsLabel}
              </span>
            </div>

            {/* Checkout button */}
            <div className="px-4 pb-4">
              <Button
                onClick={handleProceedToCheckout}
                disabled={proceedingCheckout || items.length === 0}
                className="w-full rounded-md h-11 bg-[#F97316] hover:bg-[#EA6C0A] text-white font-semibold text-sm disabled:opacity-60 transition-colors"
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
              <p className="mt-2.5 flex items-start gap-1.5 text-[11px] text-gray-400 leading-relaxed">
                <Shield className="h-3 w-3 mt-0.5 text-[#F97316] shrink-0" />
                Payment is held in escrow until you receive your order.
              </p>
            </div>

            {/* Commission notice */}
            <div className="mx-4 mb-4 flex items-start gap-2.5 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2.5">
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
          <div className="px-1 text-xs text-gray-400 space-y-1.5">
            <p>
              <Link
                href="/help/returns"
                className="hover:text-[#F97316] hover:underline transition-colors"
              >
                Return policy
              </Link>
            </p>
            <p>
              <Link
                href="/help/shipping"
                className="hover:text-[#F97316] hover:underline transition-colors"
              >
                Shipping information
              </Link>
            </p>
            <p>
              <Link
                href="/support"
                className="hover:text-[#F97316] hover:underline transition-colors"
              >
                Contact support
              </Link>
            </p>
          </div>
        </aside>
      </div>

      {/* ── Sticky bottom bar ── */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3">
          {/* Select all */}
          <OrangeCheckbox
            checked={allSelected}
            onChange={toggleSelectAll}
            label="Select All"
          />

          {/* Selected count */}
          <span className="text-sm text-gray-500">
            Selected:{" "}
            <span className="font-semibold text-[#F97316]">
              {selectedIds.size}{" "}
              {selectedIds.size === 1 ? "item" : "items"}
            </span>
          </span>

          <div className="flex-1" />

          {/* Subtotal */}
          <div className="text-sm">
            <span className="text-gray-500 mr-1">Subtotal:</span>
            <span className="font-bold text-gray-900 tabular-nums text-base">
              {totalsLabel}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRemoveSelected}
              disabled={selectedIds.size === 0}
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 border border-gray-300 rounded-sm px-3.5 py-2 hover:bg-gray-50 hover:text-red-500 hover:border-red-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove Selected
            </button>
            <button className="hidden sm:inline-flex items-center gap-1.5 text-sm text-gray-600 border border-gray-300 rounded-sm px-3.5 py-2 hover:bg-gray-50 transition-colors">
              <Bookmark className="h-3.5 w-3.5" />
              Save For Later
            </button>
            <Button
              onClick={handleProceedToCheckout}
              disabled={proceedingCheckout || selectedIds.size === 0}
              className="h-9 px-5 bg-[#F97316] hover:bg-[#EA6C0A] text-white font-semibold text-sm rounded-sm disabled:opacity-60 transition-colors"
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
  );
}