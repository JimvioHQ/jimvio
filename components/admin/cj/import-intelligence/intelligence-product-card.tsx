"use client";

import { memo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Check,
  Loader2,
  Package,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import type { EnrichedProduct } from "@/lib/cj/import-intelligence/types";
import {
  deliveryDays,
  getHealthLabel,
  WAREHOUSE_LABELS,
} from "@/lib/cj/import-intelligence/product-utils";
import { HealthScoreCircle } from "./health-score-circle";
import { CatalogBadgesRow } from "./catalog-badges-row";
import { AutoPublishBadge } from "./auto-publish-badge";
import { AutoPublishChecklist } from "./auto-publish-checklist";
import { evaluateAutoPublish } from "@/lib/cj/import-intelligence/auto-publish-engine";
import { CATALOG_TIER_STYLES } from "@/lib/cj/import-intelligence/quality-engine";
import { cn } from "@/lib/utils";

export const CARD_WIDTH = 210;
export const CARD_HEIGHT = 368;
export const GRID_GAP = 12;

export const IntelligenceProductCard = memo(function IntelligenceProductCard({
  product,
  importing,
  selected,
  onToggleSelect,
  onPreview,
  onPublish,
  onResync,
}: {
  product: EnrichedProduct;
  importing: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onPreview: () => void;
  onPublish: () => void;
  onResync: () => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  const { intelligence: intel } = product;
  const enriched = product.intelligenceEnriched === true;
  const days = deliveryDays(product);
  const warehouse = product.countryCode
    ? WAREHOUSE_LABELS[product.countryCode] ?? product.countryCode
    : product.warehouseName ?? "CN";
  const showVerified =
    product.verifiedWarehouse === 1 || product.supplierVerified === true;
  const { profit } = intel;
  const healthLabel = getHealthLabel(intel.healthScore);
  const tierStyle = CATALOG_TIER_STYLES[intel.catalogTier];
  const showTierBadge =
    intel.catalogTier === "ELITE" ||
    intel.catalogTier === "PREMIUM" ||
    intel.catalogTier === "PENDING";
  const reviewCount =
    enriched && product.reviewCount != null && product.reviewCount > 0
      ? product.reviewCount
      : product.listedNum;
  const autoPublish = intel.autoPublish ?? evaluateAutoPublish(product);

  return (
    <article
      data-cj-pid={product.pid}
      className={cn(
        "group flex h-[368px] w-full max-w-[210px] flex-col overflow-hidden rounded-[14px] border bg-white mx-auto",
        "shadow-[0_1px_3px_rgba(17,24,39,0.06)] transition-all duration-200",
        "hover:border-[var(--color-accent)]/35 hover:shadow-[0_8px_28px_rgba(17,24,39,0.1)]",
        selected
          ? "border-[var(--color-accent)]/50 ring-2 ring-[var(--color-accent)]/12"
          : "border-[#E5E7EB]",
        intel.isImported && "from-emerald-50/50 to-white bg-gradient-to-b"
      )}
    >
      {/* Image — top 60% */}
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
        className="relative h-[192px] w-full shrink-0 cursor-pointer overflow-hidden bg-[#F9FAFB]"
      >
        {product.bigImage && !imgErr ? (
          <Image
            src={product.bigImage}
            alt={product.productNameEn}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            onError={() => setImgErr(true)}
            unoptimized
            loading="lazy"
            sizes="210px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package className="h-8 w-8 text-[#D1D5DB]" />
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/5" />

        <div className="absolute top-2 left-2 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
            disabled={intel.isImported}
            className={cn(
              "flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border backdrop-blur-md",
              selected
                ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                : "border-white/50 bg-black/40 text-white",
              intel.isImported && "opacity-40"
            )}
          >
            {selected && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
          </button>
        </div>

        <div className="absolute top-2 right-2 z-10">
          <HealthScoreCircle score={intel.healthScore} label={healthLabel} size={30} />
        </div>

        <div className="absolute bottom-2 left-2 right-2 z-10 space-y-1">
          {showTierBadge && (
            <span
              className="inline-flex items-center gap-0.5 rounded-[6px] px-1.5 py-0.5 text-[7.5px] font-bold uppercase tracking-wide text-white backdrop-blur-sm"
              style={{ background: tierStyle.bg, color: tierStyle.color }}
            >
              <span>{tierStyle.emoji}</span>
              {tierStyle.label}
            </span>
          )}
          <CatalogBadgesRow badges={intel.catalogBadges} max={3} />
          <span className="inline-flex items-center rounded-[6px] bg-[#111827]/80 px-1.5 py-0.5 text-[7.5px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
            {warehouse}
          </span>
        </div>
      </div>

      {/* Info — bottom 40% */}
      <div className="flex min-h-0 flex-1 flex-col px-2.5 pt-2 pb-2.5">
        <button type="button" onClick={onPreview} className="text-left">
          <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-[#111827] group-hover:text-[var(--color-accent)]">
            {product.productNameEn}
          </p>
        </button>

        <div className="mt-0.5 flex items-center gap-1">
          <span className="truncate text-[9.5px] text-[#9CA3AF]">
            {product.supplierName ?? "CJ"}
          </span>
          {showVerified && (
            <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-500" />
          )}
        </div>

        <div className="mt-1 space-y-1">
          <AutoPublishBadge
            status={autoPublish.status}
            score={autoPublish.score}
          />
          <AutoPublishChecklist checks={autoPublish.checks} compact />
        </div>

        <div className="mt-1 grid flex-1 grid-cols-3 gap-x-2 gap-y-0.5 text-[9px]">
          <Metric
            label="Profit"
            value={`$${profit.estimatedProfit.toFixed(0)}`}
            accent={profit.estimatedProfit > 0}
          />
          <Metric label="ROI" value={`${profit.roi}%`} accent={profit.roi >= 50} />
          <Metric label="Ship" value={days !== null ? `${days}d` : "—"} />
          <Metric label="Orders" value={String(product.listedNum)} />
          <Metric label="Reviews" value={String(reviewCount)} />
          <Metric
            label="Margin"
            value={`${profit.marginPercent}%`}
            accent={profit.marginPercent >= 40}
          />
        </div>

        <div className="mt-auto pt-2">
          {intel.isImported && intel.importedProductId ? (
            <div className="flex gap-1.5">
              <Link
                href={`/admin/products/${intel.importedProductId}`}
                className="inline-flex h-[30px] flex-1 items-center justify-center rounded-[10px] bg-emerald-600 text-[10px] font-semibold text-white"
              >
                Open Product
              </Link>
              <button
                type="button"
                onClick={onResync}
                disabled={importing}
                className="inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[10px] border border-[#E5E7EB] text-[11px]"
              >
                {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "↻"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onPublish}
              disabled={importing}
              className="inline-flex h-[30px] w-full items-center justify-center gap-1.5 rounded-[10px] bg-[var(--color-accent)] text-[10.5px] font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
            >
              {importing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Rocket className="h-3.5 w-3.5" />
                  Publish
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </article>
  );
});

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[8.5px] text-[#9CA3AF]">{label}</p>
      <p
        className={cn(
          "truncate font-semibold tabular-nums",
          accent ? "text-emerald-600" : "text-[#111827]"
        )}
      >
        {value}
      </p>
    </div>
  );
}
