"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  ShieldCheck, Globe, Star, CheckCircle2, Lock,
  Download, PlayCircle, MessageSquare, Zap,
  X, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { asStringArray, cn } from "@/lib/utils";
import { ProductActionModule } from "@/components/marketplace/product-action-module";
import { FollowButton } from "@/components/marketplace/follow-button";
import { ReviewForm } from "@/components/marketplace/review-form";
import { ImageGallery } from "@/components/marketplace/image-gallery";
import { useCurrency } from "@/context/CurrencyContext";
import {
  ProductBreadcrumb,
  SaveShareBar,
  SocialProofBar,
  AffiliateBanner,
  FaqSection,
  CommunityAccessCard,
  UrgencyStrip,
  VendorCard,
  RelatedProducts,
} from "@/components/marketplace/product-detail-shared";
import type { Tables } from "@/types/supabase";
import type { ProductWithRelations } from "@/services/products";

// ─── Props type ───────────────────────────────────────────────────────────────
// The container passes the product plus related context.

interface DigitalProductDetailProps {
  product: ProductWithRelations;
  vendor: Tables<"vendors"> | null;
  followedVendorIds: string[];
  relatedProducts?: Tables<"products">[];
}

// ─── Static content ───────────────────────────────────────────────────────────

const DEFAULT_FEATURES = [
  "Instant download after payment",
  "Commercial use license included",
  "Lifetime access to all updates",
  "Compatible with all major tools",
  "Creator support via direct message",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Read features whether they live in a real column or inside source_metadata. */
function getFeatures(product: ProductWithRelations): string[] {
  // Case 1: real column (after regenerating types)
  const direct = (product as { features?: unknown }).features;
  if (Array.isArray(direct)) {
    return direct.filter((v): v is string => typeof v === "string");
  }
  // Case 2: stored in source_metadata jsonb
  const meta = product.source_metadata as { features?: unknown } | null;
  if (meta && Array.isArray(meta.features)) {
    return meta.features.filter((v): v is string => typeof v === "string");
  }
  return [];
}

/** Same pattern for preview_url. */
function getPreviewUrl(product: ProductWithRelations): string | undefined {
  const direct = (product as { preview_url?: unknown }).preview_url;
  if (typeof direct === "string" && direct) return direct;

  const meta = product.source_metadata as { preview_url?: unknown } | null;
  if (meta && typeof meta.preview_url === "string" && meta.preview_url) {
    return meta.preview_url;
  }
  return undefined;
}

// ─── Preview modal ────────────────────────────────────────────────────────────

function PreviewModal({
  open, onClose, previewUrl, productName, images,
}: {
  open: boolean;
  onClose: () => void;
  previewUrl?: string;
  productName: string;
  images: string[];
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-[var(--color-surface)] rounded-2xl overflow-hidden border border-[var(--color-border)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-border)]">
          <p className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate max-w-[80%]">
            Preview — {productName}
          </p>
          <button
            onClick={onClose}
            aria-label="Close preview"
            className="w-7 h-7 rounded-lg flex items-center justify-center border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="bg-[var(--color-surface-secondary)]" style={{ minHeight: 360 }}>
          {previewUrl ? (
            <iframe
              src={previewUrl}
              title={`Preview of ${productName}`}
              className="w-full"
              style={{ height: 480, border: "none" }}
              sandbox="allow-scripts allow-same-origin"
            />
          ) : images[0] ? (
            <Image
              src={images[0]}
              alt={`Preview of ${productName}`}
              width={800}
              height={480}
              className="w-full object-contain"
              style={{ maxHeight: 480 }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-[360px] gap-3">
              <Eye className="h-8 w-8 text-[var(--color-text-muted)]" />
              <p className="text-[13px] text-[var(--color-text-muted)]">No preview available</p>
            </div>
          )}
        </div>
        <div className="px-5 py-3.5 border-t border-[var(--color-border)] flex items-center justify-between">
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Preview only — purchase to access all files
          </p>
          <button onClick={onClose} className="text-[12px] font-semibold text-[var(--color-accent)] hover:underline">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function BenefitCard({
  icon, title, desc,
}: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-3 p-4 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
      <div className="h-8 w-8 rounded-lg flex-shrink-0 flex items-center justify-center bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
        {icon}
      </div>
      <div>
        <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-0.5">{title}</p>
        <p className="text-[12px] text-[var(--color-text-muted)] leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DigitalProductDetail({
  product,
  vendor,
  followedVendorIds,
  relatedProducts = [],
}: DigitalProductDetailProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const { formatMoney } = useCurrency();

  // Derived values — computed once at the top so types stay clean below.
  const images: string[] = asStringArray(product.images ?? []);
  const saleCount = product.sale_count ?? 120;
  const reviewCount = product.review_count ?? 0;

  const featuresFromProduct = getFeatures(product);
  const features: string[] = featuresFromProduct.length
    ? featuresFromProduct
    : DEFAULT_FEATURES;

  const previewUrl = getPreviewUrl(product);

  const price = Number(product.price ?? 0);
  const compareAtPrice =
    product.compare_at_price != null ? Number(product.compare_at_price) : null;
  const savings =
    compareAtPrice && compareAtPrice > price
      ? Math.round((1 - price / compareAtPrice) * 100)
      : null;

  const productProps = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price,
    images,
    vendor_id: product.vendor_id,
    currency: product.currency,
    pricing_type: product.pricing_type,
    button_text: product.button_text,
    is_digital: true,
  };

  const vendorProps = vendor
    ? {
      id: vendor.id,
      business_name: vendor.business_name ?? null,
      business_logo: vendor.business_logo ?? null,
      business_slug: vendor.business_slug ?? null,
    }
    : null;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        previewUrl={previewUrl}
        productName={product.name}
        images={images}
      />

      {/* ── Breadcrumb ── */}
      <div className="sticky top-[var(--navbar-height,64px)] z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-11 flex items-center justify-between">
          <ProductBreadcrumb productName={product.name} />
          <SaveShareBar />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-8 pb-24">
        {/* ── Page header ── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20">
              <Download className="h-3 w-3" />
              Digital asset
            </span>
            {savings && (
              <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20">
                {savings}% off
              </span>
            )}
            {product.affiliate_enabled && (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border"
                style={{
                  background: "rgba(253,80,0,0.08)",
                  color: "var(--color-accent)",
                  borderColor: "rgba(253,80,0,0.20)",
                }}
              >
                {product.affiliate_commission_rate ?? 10}% affiliate
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--color-text-primary)] tracking-tight leading-snug mb-3">
            {product.name}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-[13px] text-[var(--color-text-muted)] mb-4">
            <div className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 flex-shrink-0" />
              <span className="font-semibold text-[var(--color-text-primary)]">4.9</span>
              <span>({reviewCount} reviews)</span>
            </div>
            <span className="select-none text-[var(--color-border-strong)]">·</span>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-sky-500 flex-shrink-0" />
              Instant access
            </div>
            <span className="select-none text-[var(--color-border-strong)]">·</span>
            <div className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 flex-shrink-0" />
              {saleCount.toLocaleString()}+ users
            </div>
          </div>

          <SocialProofBar saleCount={saleCount} reviewCount={reviewCount} />
        </div>

        {/* ── Body grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

          {/* Left column */}
          <div className="lg:col-span-8 space-y-8">

            {/* Gallery */}
            <div className="rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
              <ImageGallery
                images={images}
                productName={product.name}
                isFeatured={product.is_featured ?? false}
                savings={savings}
                className="aspect-video"
              />
            </div>

            {/* Mobile CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 lg:hidden">
              <ProductActionModule
                product={productProps}
                vendor={vendorProps}
                currentPath={`/marketplace/${product.slug}`}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => setPreviewOpen(true)}
                className="flex-1 h-11 rounded-xl border-[var(--color-border)] font-semibold text-[13px] text-[var(--color-text-secondary)]"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Live preview
              </Button>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="h-10 p-1 gap-1 rounded-xl w-fit bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
                {(["overview", "features", "reviews", "faq"] as const).map(tab => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className={cn(
                      "px-5 h-8 rounded-lg text-[12px] font-semibold capitalize tracking-wide",
                      "text-[var(--color-text-muted)]",
                      "data-[state=active]:bg-[var(--color-surface)]",
                      "data-[state=active]:text-[var(--color-text-primary)]",
                      "data-[state=active]:shadow-none",
                    )}
                  >
                    {tab === "faq" ? "FAQ" : tab}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="overview" className="mt-6 space-y-6">
                <p className="text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
                  {product.description ||
                    "A professionally crafted digital asset built for modern workflows. Optimized for speed, flexibility, and long-term maintainability."}
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <BenefitCard icon={<Download className="h-4 w-4" />} title="Direct download" desc="Source files delivered the moment payment clears — no waiting." />
                  <BenefitCard icon={<ShieldCheck className="h-4 w-4" />} title="Lifetime updates" desc="Every future version is included. Pay once, keep everything." />
                  <BenefitCard icon={<Lock className="h-4 w-4" />} title="License included" desc="Commercial use license ships with every purchase." />
                  <BenefitCard icon={<MessageSquare className="h-4 w-4" />} title="Creator support" desc="Direct access to the creator for integration questions." />
                </div>
              </TabsContent>

              <TabsContent value="features" className="mt-6">
                <ul className="space-y-3">
                  {features.map(feat => (
                    <li key={feat} className="flex items-start gap-3 text-[14px] text-[var(--color-text-secondary)]">
                      <CheckCircle2 className="h-4 w-4 text-sky-500 flex-shrink-0 mt-0.5" />
                      {feat}
                    </li>
                  ))}
                </ul>
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                <ReviewForm productId={product.id} vendorId={product.vendor_id} />
              </TabsContent>

              <TabsContent value="faq" className="mt-6">
                <FaqSection />
              </TabsContent>
            </Tabs>

            {/* Affiliate banner */}
            <AffiliateBanner product={product} />

            {/* Community card */}
            <CommunityAccessCard
              vendorSlug={vendor?.business_slug}
              productName={product.name}
            />
            <RelatedProducts products={relatedProducts} formatMoney={formatMoney} />
          </div>

          {/* Right sidebar */}
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">

            {/* Purchase card */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 space-y-4">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-[var(--color-text-primary)] tabular-nums">
                    ${price.toFixed(2)}
                  </span>
                  {compareAtPrice && compareAtPrice > price && (
                    <>
                      <span className="text-[14px] line-through text-[var(--color-text-muted)]">
                        ${compareAtPrice.toFixed(2)}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                        Save {savings}%
                      </span>
                    </>
                  )}
                </div>
                {product.pricing_type === "recurring" && (
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                    Billed monthly · Cancel anytime
                  </p>
                )}
              </div>
              
              <ProductActionModule
                product={productProps}
                vendor={vendorProps}
                currentPath={`/marketplace/${product.slug}`}
                className="w-full"
              />

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPreviewOpen(true)}
                  className="h-10 rounded-xl border-[var(--color-border)] text-[12px] font-semibold text-[var(--color-text-secondary)]"
                >
                  <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
                  Preview
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(window.location.href)}
                  className="h-10 rounded-xl border-[var(--color-border)] text-[12px] font-semibold text-[var(--color-text-secondary)]"
                >
                  Share
                </Button>
              </div>
            </div>

            {/* Security + vendor */}
            {vendor && (
              <VendorCard
                vendor={vendor}
                followedVendorIds={followedVendorIds}
                followButton={
                  <FollowButton
                    vendorId={vendor.id}
                    initialFollowing={followedVendorIds.includes(vendor.id)}
                    className="w-full h-9 rounded-xl border border-[var(--color-border)] text-[12px] font-semibold"
                  />
                }
              />
            )}

            {/* Enterprise CTA */}
            <div className="rounded-2xl p-5 text-white relative overflow-hidden" style={{ background: "var(--color-accent)" }}>
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full pointer-events-none" />
              <div className="relative z-10 space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-widest opacity-90">Enterprise</span>
                </div>
                <p className="text-[14px] font-semibold leading-snug">Need a custom plan?</p>
                <p className="text-[12px] opacity-80 leading-relaxed">
                  Enterprise licenses and dedicated support available.
                </p>
                <Button className="w-full h-9 bg-white/20 hover:bg-white/30 border-0 text-white rounded-xl text-[12px] font-semibold transition-colors">
                  <MessageSquare className="h-3.5 w-3.5 mr-2" />
                  Message creator
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}