"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X, AlertCircle } from "lucide-react";
import { LocalizedPrice } from "@/components/currency/localized-price";
import { cn, isRenderableImageSrc } from "@/lib/utils";

interface Variant {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  inventory_quantity: number | null;
  image_url: string | null;
  options: Record<string, string> | null;
  is_active: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (variantId: string) => void | Promise<void>;
  variants: Variant[];
  productName: string;
  productImage: string | null;
  currency?: string;
  loadingVariantId?: string | null;
}

export function VariantPickerDialog({
  open,
  onClose,
  onSelect,
  variants,
  productName,
  productImage,
  currency,
  loadingVariantId,
}: Props) {
  // SSR-safe portal target
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const formatOptions = (options: Record<string, string> | null) => {
    if (!options || Object.keys(options).length === 0) return null;
    return Object.entries(options)
      .map(([k, v]) => `${k}: ${v}`)
      .join(" · ");
  };

  const dialog = (
    <div
      className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative w-full max-w-md max-h-[85vh]",
          "bg-white dark:bg-[#121212]",
          "rounded-t-2xl sm:rounded-2xl",
          "shadow-2xl border border-stone-200 dark:border-white/10",
          "flex flex-col overflow-hidden"
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-stone-100 dark:border-white/10">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">
              Select an option
            </p>
            <h2 className="text-base font-bold text-[#0f0f0f] dark:text-white line-clamp-2">
              {productName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center hover:bg-stone-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4 text-stone-500" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {variants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <AlertCircle className="h-8 w-8 text-stone-300 mb-3" />
              <p className="text-sm font-medium text-stone-600 dark:text-stone-400">
                No options available right now
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {variants.map((v) => {
                const outOfStock =
                  v.inventory_quantity !== null && v.inventory_quantity <= 0;
                const isLoading = loadingVariantId === v.id;
                const optStr = formatOptions(v.options);
                const candidate = v.image_url ?? productImage;
                const img = isRenderableImageSrc(candidate) ? candidate : null;

                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={outOfStock || isLoading || !!loadingVariantId}
                    onClick={() => onSelect(v.id)}
                    className={cn(
                      "group/v flex items-center gap-3 w-full p-2.5",
                      "rounded-xl border text-left transition-all duration-200",
                      outOfStock
                        ? "border-stone-100 dark:border-white/[0.05] opacity-50 cursor-not-allowed"
                        : "border-stone-200 dark:border-white/[0.08] hover:border-[#fd5000] hover:bg-orange-50/40 dark:hover:bg-orange-500/[0.04] active:scale-[0.99]",
                      isLoading && "border-[#fd5000] bg-orange-50/40"
                    )}
                  >
                    <div className="relative h-14 w-14 flex-shrink-0 rounded-lg overflow-hidden bg-stone-100 dark:bg-white/5">
                      {img ? (
                        <Image
                          src={img}
                          alt={v.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-stone-400 text-xs">
                          —
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[13px] text-[#0f0f0f] dark:text-white truncate">
                        {v.name}
                      </p>
                      {optStr && (
                        <p className="text-[11px] text-stone-500 truncate mt-0.5">
                          {optStr}
                        </p>
                      )}
                      <div className="flex items-baseline gap-2 mt-1">
                        <LocalizedPrice
                          amount={Number(v.price)}
                          currency={currency}
                          className="text-[14px] font-bold text-[#0f0f0f] dark:text-white"
                        />
                        {v.compare_at_price &&
                          Number(v.compare_at_price) > Number(v.price) && (
                            <LocalizedPrice
                              amount={Number(v.compare_at_price)}
                              currency={currency}
                              className="text-[11px] text-stone-400 line-through"
                            />
                          )}
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {isLoading ? (
                        <span className="h-5 w-5 border-2 border-stone-300 border-t-[#fd5000] rounded-full animate-spin inline-block" />
                      ) : outOfStock ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                          Sold out
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#fd5000] opacity-0 group-hover/v:opacity-100 transition-opacity">
                          Add →
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}