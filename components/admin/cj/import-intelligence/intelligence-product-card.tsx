"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Check,
  Eye,
  Loader2,
  Package,
  ShieldCheck,
} from "lucide-react";
import type { EnrichedProduct, ImportMode } from "@/lib/cj/import-intelligence/types";
import {
  deliveryDays,
  productHasVideo,
  WAREHOUSE_LABELS,
} from "@/lib/cj/import-intelligence/product-utils";
import { OpportunityScoreBadge } from "./opportunity-score-badge";
import { cn } from "@/lib/utils";

export const CARD_WIDTH = 210;
export const CARD_HEIGHT = 290;

export function IntelligenceProductCard({
  product,
  importing,
  selected,
  importMode = "draft",
  onToggleSelect,
  onPreview,
  onImport,
  onImportAndPublish,
  onResync,
}: {
  product: EnrichedProduct;
  importing: boolean;
  selected: boolean;
  importMode?: ImportMode;
  onToggleSelect: () => void;
  onPreview: () => void;
  onImport: () => void;
  onImportAndPublish?: () => void;
  onResync: () => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  const { intelligence: intel } = product;
  const enriched = product.intelligenceEnriched === true;
  const videoReady = productHasVideo(product);
  const days = deliveryDays(product);
  const warehouse = product.countryCode
    ? WAREHOUSE_LABELS[product.countryCode] ?? product.countryCode
    : product.warehouseName ?? "CN";
  const showVerified =
    product.verifiedWarehouse === 1 || product.supplierVerified === true;
  const { profit } = intel;
  const reviewLabel =
    enriched && product.reviewCount != null && product.reviewCount > 0
      ? "Reviews"
      : "Orders";
  const reviewValue =
    enriched && product.reviewCount != null && product.reviewCount > 0
      ? String(product.reviewCount)
      : String(product.listedNum);

  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-sm border transition-all duration-200",
        "bg-[var(--color-surface)]/95 backdrop-blur-sm",
        selected
          ? "border-[#FF5A1F] ring-1 ring-[#FF5A1F]/25"
          : "border-[var(--color-border)] hover:border-[#FF5A1F]/35",
        intel.isImported && "bg-emerald-50/20 dark:bg-emerald-950/10"
      )}
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
    >
      {/* Image — 50% */}
      <div
        role="button"
        tabIndex={0}
        onClick={onPreview}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onPreview();
          }
        }}
        className="relative h-[145px] w-full cursor-pointer overflow-hidden bg-[#111827]/5 shrink-0"
      >
        {product.bigImage && !imgErr ? (
          <Image
            src={product.bigImage}
            alt={product.productNameEn}
            fill
            className="object-cover group-hover:scale-[1.02] transition-transform duration-200"
            onError={() => setImgErr(true)}
            unoptimized
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package className="h-6 w-6 text-[var(--color-text-muted)]/25" />
          </div>
        )}

        <div className="absolute top-1 left-1 right-1 flex items-start justify-between gap-0.5 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
            disabled={intel.isImported}
            className={cn(
              "h-4 w-4 rounded-sm border flex items-center justify-center",
              selected
                ? "bg-[#FF5A1F] border-[#FF5A1F] text-white"
                : "bg-black/45 border-white/25 text-white",
              intel.isImported && "opacity-40"
            )}
          >
            {selected && <Check className="h-2 w-2" strokeWidth={3} />}
          </button>
          <div className="h-6 w-[42px] flex justify-end shrink-0">
            <OpportunityScoreBadge
              score={intel.opportunityScore}
              level={intel.opportunityLevel}
            />
          </div>
        </div>

        <div className="absolute bottom-1 left-1 right-1 flex flex-wrap gap-0.5 z-10 min-h-[14px]">
          <span
            className={cn(
              "px-1 py-0.5 rounded-sm bg-[#FF5A1F]/90 text-[7.5px] font-bold text-white tracking-wide transition-opacity duration-500",
              videoReady ? "opacity-100" : "opacity-0"
            )}
          >
            ▶ VIDEO READY
          </span>
          <span className="px-1 py-0.5 rounded-sm bg-black/55 text-[7.5px] font-semibold text-white">
            {warehouse}
          </span>
          <span
            className={cn(
              "px-1 py-0.5 rounded-sm bg-emerald-600/85 text-[7.5px] font-semibold text-white transition-opacity duration-500",
              showVerified ? "opacity-100" : "opacity-0"
            )}
          >
            ✓ Supplier
          </span>
          {intel.isImported && (
            <span className="px-1 py-0.5 rounded-sm bg-emerald-600/90 text-[7.5px] font-semibold text-white">
              Imported
            </span>
          )}
        </div>
      </div>

      {/* Info — 50% */}
      <div className="flex flex-1 flex-col p-1.5 min-h-0 gap-1">
        <button type="button" onClick={onPreview} className="text-left shrink-0">
          <p className="text-[10px] font-semibold text-[var(--color-text-primary)] line-clamp-2 leading-[1.25] group-hover:text-[#FF5A1F]">
            {product.productNameEn}
          </p>
        </button>

        <div className="flex items-center gap-0.5 shrink-0">
          <span className="text-[8.5px] text-[var(--color-text-muted)] truncate flex-1">
            {product.supplierName ?? "CJ"}
          </span>
          {showVerified && (
            <ShieldCheck className="h-2.5 w-2.5 text-emerald-500 shrink-0 transition-opacity duration-500" />
          )}
          {enriched && product.rating != null && product.rating > 0 && (
            <span className="text-[8px] font-semibold text-amber-600 tabular-nums transition-opacity duration-500">
              ★{product.rating.toFixed(1)}
            </span>
          )}
          <span
            className={cn(
              "text-[8px] font-bold text-[#FF5A1F] tabular-nums transition-all duration-500",
              enriched && "scale-105"
            )}
          >
            {intel.supplierScore}
          </span>
        </div>

        {/* Dense metrics grid */}
        <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 text-[8.5px] shrink-0 rounded-sm bg-[var(--color-surface-secondary)]/60 p-1">
          <Metric label="CJ" value={`$${profit.cjCost.toFixed(2)}`} />
          <Metric label="Ship" value={`$${profit.shippingCost.toFixed(2)}`} />
          <Metric label="Sell" value={`$${profit.suggestedSelling.toFixed(2)}`} highlight />
          <Metric
            label="Profit"
            value={`$${profit.estimatedProfit.toFixed(2)}`}
            accent={profit.estimatedProfit > 0}
          />
          <Metric
            label="Margin"
            value={`${profit.marginPercent}%`}
            accent={profit.marginPercent >= 40}
          />
          <Metric label="Del" value={days !== null ? `${days}d` : "—"} pulse={enriched} />
          <Metric label={reviewLabel} value={reviewValue} pulse={enriched} />
          <Metric
            label="Stock"
            value={
              product.warehouseInventoryNum != null
                ? String(product.warehouseInventoryNum)
                : "—"
            }
            pulse={enriched}
          />
        </div>

        {/* Actions */}
        <div className="mt-auto flex gap-1 shrink-0 pt-0.5">
          <button
            type="button"
            onClick={onPreview}
            className="h-6 w-6 rounded-sm border border-[var(--color-border)] inline-flex items-center justify-center hover:bg-[var(--color-surface-secondary)]"
            title="Preview"
          >
            <Eye className="h-3 w-3" />
          </button>
          {intel.isImported && intel.importedProductId ? (
            <>
              <Link
                href={`/admin/products/${intel.importedProductId}`}
                className="flex-1 h-6 rounded-sm text-[9px] font-semibold bg-emerald-600 text-white inline-flex items-center justify-center"
              >
                Open
              </Link>
              <button
                type="button"
                onClick={onResync}
                disabled={importing}
                className="h-6 w-6 rounded-sm border border-[var(--color-border)] text-[10px]"
              >
                {importing ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : "↻"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onImport}
                disabled={importing}
                className="flex-1 h-6 rounded-sm bg-[#111827] text-white text-[9px] font-semibold hover:opacity-90 disabled:opacity-60"
              >
                {importing ? "…" : "Draft"}
              </button>
              {onImportAndPublish && (
                <button
                  type="button"
                  onClick={onImportAndPublish}
                  disabled={importing}
                  className="flex-1 h-6 rounded-sm bg-[#FF5A1F] text-white text-[9px] font-semibold hover:opacity-90 disabled:opacity-60"
                >
                  {importing ? "…" : importMode === "auto" ? "Auto" : "Publish"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function Metric({
  label,
  value,
  highlight,
  accent,
  pulse,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  accent?: boolean;
  pulse?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-0.5 min-w-0">
      <span className="text-[var(--color-text-muted)] truncate">{label}</span>
      <span
        className={cn(
          "tabular-nums font-semibold shrink-0 transition-colors duration-500",
          accent && "text-emerald-600",
          highlight && !accent && "text-[var(--color-text-primary)]",
          pulse && "text-[var(--color-text-primary)]"
        )}
      >
        {value}
      </span>
    </div>
  );
}
