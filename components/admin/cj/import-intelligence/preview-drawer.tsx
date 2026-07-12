"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Package,
  Play,
  X,
} from "lucide-react";
import type { EnrichedProduct, ImportSettings } from "@/lib/cj/import-intelligence/types";
import {
  cjVideoPreviewSrc,
  fetchProductPreview,
  type ProductPreviewDetail,
} from "@/lib/cj/import-intelligence/api";
import { calculateProfitMetrics, productHasVideo } from "@/lib/cj/import-intelligence/product-utils";
import { OPPORTUNITY_LEVELS } from "@/lib/cj/import-intelligence/opportunity-score";
import { HealthScoreBadge } from "./health-score-badge";
import { OpportunityScoreBadge } from "./opportunity-score-badge";
import { ProfitDisplay } from "./profit-display";
import { ImportSettingsPanel } from "./import-settings-panel";
import { AutoPublishBadge } from "./auto-publish-badge";
import { AutoPublishChecklist } from "./auto-publish-checklist";
import { ForcePublishDialog } from "./force-publish-dialog";
import { evaluateAutoPublish } from "@/lib/cj/import-intelligence/auto-publish-engine";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function copyText(text: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success("Copied"),
    () => toast.error("Copy failed")
  );
}

export function PreviewDrawer({
  product,
  importing,
  importSettings,
  onImportSettingsChange,
  duplicateInfo,
  onClose,
  onImport,
  onImportAndPublish,
  onResync,
}: {
  product: EnrichedProduct;
  importing: boolean;
  importSettings: ImportSettings;
  onImportSettingsChange: (s: ImportSettings) => void;
  duplicateInfo?: {
    byPid: boolean;
    bySku?: boolean;
    byName?: boolean;
    existingProductId?: string;
    existingName?: string;
  };
  onClose: () => void;
  onImport: () => void;
  onImportAndPublish?: () => void;
  onResync: () => void;
}) {
  const { intelligence: intel } = product;
  const listHasVideo = productHasVideo(product);
  const [detail, setDetail] = useState<ProductPreviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [mediaView, setMediaView] = useState<"video" | "image">("image");
  const [activeImage, setActiveImage] = useState(0);
  const [activeVideo, setActiveVideo] = useState(0);
  const [videoError, setVideoError] = useState(false);
  const [forceOpen, setForceOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const autoPublish = intel.autoPublish ?? evaluateAutoPublish(product);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchProductPreview(product.pid)
      .then((data) => {
        if (!cancelled) {
          setDetail(data);
          if (data.videos?.length) setMediaView("video");
        }
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [product.pid]);

  const images = detail?.images?.length
    ? detail.images
    : product.bigImage
      ? [product.bigImage]
      : [];
  const videos = detail?.videos ?? product.videoList ?? [];
  const profit = detail?.profit ?? calculateProfitMetrics(product);

  const hasDuplicate =
    duplicateInfo?.byPid ||
    duplicateInfo?.bySku ||
    duplicateInfo?.byName ||
    intel.isImported;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-[#111827]/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full max-w-2xl",
          "bg-[var(--color-surface)]/95 backdrop-blur-xl border-l border-[var(--color-border)]",
          "shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]/80">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <OpportunityScoreBadge
                score={intel.opportunityScore}
                level={intel.opportunityLevel}
                compact={false}
              />
              <HealthScoreBadge score={intel.healthScore} label={intel.healthLabel} />
              {intel.trending && (
                <span className="text-[10px] font-semibold text-[#FF5A1F]">🔥 Trending</span>
              )}
            </div>
            <h2 className="text-[15px] font-bold text-[var(--color-text-primary)] line-clamp-2">
              {product.productNameEn}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-sm hover:bg-[var(--color-surface-secondary)] inline-flex items-center justify-center shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-5">
            {/* Duplicate warning */}
            {hasDuplicate && (
              <div className="flex items-start gap-3 p-3 rounded-sm border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[12px]">
                  <p className="font-semibold text-amber-800 dark:text-amber-400">Already Imported</p>
                  {duplicateInfo?.byPid && <p className="text-amber-700 dark:text-amber-500 mt-0.5">Matching CJ PID found in catalog.</p>}
                  {duplicateInfo?.bySku && <p className="text-amber-700 dark:text-amber-500 mt-0.5">SKU match detected.</p>}
                  {duplicateInfo?.byName && <p className="text-amber-700 dark:text-amber-500 mt-0.5">Similar product name exists.</p>}
                  {(duplicateInfo?.existingProductId || intel.importedProductId) && (
                    <Link
                      href={`/admin/products/${duplicateInfo?.existingProductId ?? intel.importedProductId}`}
                      className="inline-flex items-center gap-1 mt-1.5 text-[#FF5A1F] font-medium hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View existing product
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Media */}
            <div className="space-y-2">
              {(videos.length > 0 || listHasVideo) && (
                <div className="inline-flex overflow-hidden rounded-sm ring-1 ring-[var(--color-border)]">
                  {videos.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setMediaView("video")}
                      className={cn(
                        "h-8 px-3 text-[12px] font-medium",
                        mediaView === "video"
                          ? "bg-[#111827] text-white"
                          : "bg-[var(--color-surface)] text-[var(--color-text-muted)]"
                      )}
                    >
                      Video{videos.length > 1 ? ` (${videos.length})` : ""}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setMediaView("image")}
                    className={cn(
                      "h-8 px-3 text-[12px] font-medium",
                      videos.length > 0 && "border-l border-[var(--color-border)]",
                      mediaView === "image"
                        ? "bg-[#111827] text-white"
                        : "bg-[var(--color-surface)] text-[var(--color-text-muted)]"
                    )}
                  >
                    Images ({images.length})
                  </button>
                </div>
              )}

              <div className="relative aspect-video rounded-sm overflow-hidden bg-[#111827]/5 ring-1 ring-[var(--color-border)]">
                {loading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--color-text-muted)]" />
                  </div>
                ) : mediaView === "video" && videos[activeVideo] && !videoError ? (
                  <video
                    ref={videoRef}
                    key={videos[activeVideo]}
                    src={cjVideoPreviewSrc(videos[activeVideo])}
                    poster={detail?.poster ?? product.bigImage}
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 h-full w-full object-contain"
                    onError={() => setVideoError(true)}
                  />
                ) : images[activeImage] ? (
                  <Image
                    src={images[activeImage]}
                    alt={product.productNameEn}
                    fill
                    className="object-contain p-2"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Package className="h-12 w-12 text-[var(--color-text-muted)]/30" />
                  </div>
                )}
              </div>

              {mediaView === "image" && images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, i) => (
                    <button
                      key={img}
                      type="button"
                      onClick={() => setActiveImage(i)}
                      className={cn(
                        "relative h-14 w-14 shrink-0 rounded-sm overflow-hidden ring-2",
                        i === activeImage ? "ring-[#FF5A1F]" : "ring-transparent"
                      )}
                    >
                      <Image src={img} alt="" fill className="object-cover" unoptimized />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* AI Opportunity Score */}
            <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Opportunity Score
                </h3>
                <span
                  className="text-[13px] font-bold"
                  style={{ color: OPPORTUNITY_LEVELS[intel.opportunityLevel].color === "#ffffff" ? "var(--color-text-primary)" : OPPORTUNITY_LEVELS[intel.opportunityLevel].color }}
                >
                  {OPPORTUNITY_LEVELS[intel.opportunityLevel].emoji}{" "}
                  {intel.opportunityScore}/100
                </span>
              </div>
              <p className="text-[12px] font-medium text-[var(--color-text-secondary)]">
                {OPPORTUNITY_LEVELS[intel.opportunityLevel].label}
              </p>
              {intel.opportunityReasons.length > 0 && (
                <ul className="space-y-1">
                  {intel.opportunityReasons.map((reason) => (
                    <li
                      key={reason}
                      className="flex items-center gap-2 text-[12px] text-[var(--color-text-secondary)]"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      {reason}
                    </li>
                  ))}
                </ul>
              )}
              {(intel.opportunityScore >= 90 || intel.aiRecommendation) && (
                <div className="text-[12px] font-semibold text-[#FF5A1F] pt-1 border-t border-[var(--color-border)]/50 space-y-0.5">
                  {intel.opportunityScore >= 95 && (
                    <p>Potential winner product.</p>
                  )}
                  {intel.opportunityScore >= 90 && (
                    <p>AI recommends importing this product.</p>
                  )}
                </div>
              )}
            </div>

            {/* Intelligence summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <IntelChip label="Profitable" ok={profit.estimatedProfit > 5} />
              <IntelChip label="Fast Ship" ok={intel.stockStable} />
              <IntelChip label="US Market" ok={intel.marketFit.us} />
              <IntelChip label="EU Market" ok={intel.marketFit.eu} />
              <IntelChip label="Has Video" ok={videos.length > 0 || listHasVideo} />
              <IntelChip label="Verified Supplier" ok={product.verifiedWarehouse === 1} />
              <IntelChip label="Enough Reviews" ok={product.listedNum >= 20} />
              <IntelChip label="Stable Stock" ok={intel.stockStable} />
            </div>

            {/* Profit */}
            <div>
              <h3 className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                Profit Calculator
              </h3>
              <ProfitDisplay profit={profit} />
            </div>

            {/* Details */}
            <dl className="space-y-0 text-[13px] divide-y divide-[var(--color-border)]/50">
              <DetailRow label="PID" value={product.pid} mono copyable />
              <DetailRow label="SKU" value={product.productSku} mono copyable />
              <DetailRow label="Category" value={product.categoryName ?? product.threeCategoryName ?? "—"} />
              <DetailRow label="Stock" value={product.warehouseInventoryNum != null ? String(product.warehouseInventoryNum) : "—"} />
              <DetailRow label="Store Listings" value={String(product.listedNum)} />
              <DetailRow label="Delivery" value={product.deliveryCycle ? `${product.deliveryCycle} days` : "—"} />
              <DetailRow label="Supplier Score" value={`${intel.supplierScore}/100`} />
            </dl>

            {/* Variants */}
            {detail?.variants && detail.variants.length > 0 && (
              <div>
                <h3 className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                  Variants ({detail.variants.length})
                </h3>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {detail.variants.map((v) => (
                    <div key={v.vid} className="flex items-center justify-between text-[12px] py-1.5 px-2 rounded-sm bg-[var(--color-surface-secondary)]">
                      <span className="truncate">{v.name}</span>
                      <span className="tabular-nums font-medium shrink-0 ml-2">${v.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {detail?.description && (
              <div>
                <h3 className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                  Description
                </h3>
                <div
                  className="text-[12px] text-[var(--color-text-secondary)] max-h-48 overflow-y-auto prose prose-sm dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: detail.description.slice(0, 3000) }}
                />
              </div>
            )}

            {/* Specifications */}
            {detail?.specifications && detail.specifications.length > 0 && (
              <div>
                <h3 className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                  Specifications
                </h3>
                <dl className="space-y-1">
                  {detail.specifications.map((s) => (
                    <div key={s.key} className="flex justify-between text-[12px] py-1 border-b border-[var(--color-border)]/30">
                      <dt className="text-[var(--color-text-muted)]">{s.key}</dt>
                      <dd className="font-medium">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* Auto Publish Intelligence */}
            <div className="rounded-sm border border-[var(--color-border)] p-3 space-y-2">
              <h3 className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                Auto Publish
              </h3>
              <AutoPublishBadge status={autoPublish.status} score={autoPublish.score} />
              <AutoPublishChecklist checks={autoPublish.checks} />
              {autoPublish.pendingEnrichment.length > 0 && (
                <ul className="space-y-0.5 text-[11px] text-sky-700">
                  {autoPublish.pendingEnrichment.map((r) => (
                    <li key={r}>⏳ {r}</li>
                  ))}
                </ul>
              )}
              {autoPublish.failures.length > 0 && (
                <ul className="space-y-0.5 text-[11px] text-amber-700">
                  {autoPublish.failures.map((r) => (
                    <li key={r}>• {r}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Import settings */}
            <ImportSettingsPanel
              settings={importSettings}
              onChange={onImportSettingsChange}
              compact
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface)]/90 space-y-2">
          {intel.isImported && intel.importedProductId ? (
            <>
              <Link
                href={`/admin/products/${intel.importedProductId}`}
                className="flex h-11 items-center justify-center rounded-sm bg-emerald-600 text-white text-[13px] font-semibold"
              >
                Open in Admin
              </Link>
              <button
                type="button"
                onClick={onResync}
                disabled={importing}
                className="w-full h-10 rounded-sm border border-[var(--color-border)] text-[13px] font-medium inline-flex items-center justify-center gap-2"
              >
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Re-sync from CJ
              </button>
              <button
                type="button"
                onClick={() => setForceOpen(true)}
                className="w-full h-10 rounded-sm border border-violet-200 bg-violet-50 text-violet-800 text-[13px] font-semibold"
              >
                Force Publish (Admin)
              </button>
              <ForcePublishDialog
                productId={intel.importedProductId}
                productName={product.productNameEn}
                open={forceOpen}
                onClose={() => setForceOpen(false)}
              />
            </>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onImport}
                disabled={importing}
                className="flex-1 h-11 rounded-sm bg-[#111827] text-white text-[12px] font-bold hover:opacity-90 disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Import as Draft
              </button>
              {onImportAndPublish && (
                <button
                  type="button"
                  onClick={onImportAndPublish}
                  disabled={importing}
                  className="flex-1 h-11 rounded-sm bg-[#FF5A1F] text-white text-[12px] font-bold hover:opacity-90 disabled:opacity-60 inline-flex items-center justify-center gap-2"
                >
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Import & Publish
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function IntelChip({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-1.5 rounded-sm text-[10px] font-medium border",
        ok
          ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400"
          : "bg-[var(--color-surface-secondary)] border-[var(--color-border)] text-[var(--color-text-muted)]"
      )}
    >
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <span className="h-3 w-3 rounded-full border border-current opacity-40" />}
      {label}
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
  copyable,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <dt className="text-[var(--color-text-muted)] shrink-0 text-[12px]">{label}</dt>
      <dd className={cn("text-right flex items-center gap-1 min-w-0 text-[12px]", mono && "font-mono")}>
        <span className="truncate">{value}</span>
        {copyable && (
          <button type="button" onClick={() => copyText(value)} className="shrink-0 p-1 rounded-sm hover:bg-[var(--color-surface-secondary)]">
            <Copy className="h-3 w-3 text-[var(--color-text-muted)]" />
          </button>
        )}
      </dd>
    </div>
  );
}
