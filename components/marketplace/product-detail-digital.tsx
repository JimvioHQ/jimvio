// "use client";

// import React, { useState } from "react";
// import Image from "next/image";
// import {
//   ShieldCheck, Globe, Star, CheckCircle2, Lock,
//   Download, PlayCircle, MessageSquare, Zap,
//   X, Eye,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { asStringArray, cn } from "@/lib/utils";
// import { ProductActionModule } from "@/components/marketplace/product-action-module";
// import { FollowButton } from "@/components/marketplace/follow-button";
// import { ReviewForm } from "@/components/marketplace/review-form";
// import { ImageGallery } from "@/components/marketplace/image-gallery";
// import { useCurrency } from "@/context/CurrencyContext";
// import {
//   ProductBreadcrumb,
//   SaveShareBar,
//   SocialProofBar,
//   AffiliateBanner,
//   FaqSection,
//   CommunityAccessCard,
//   UrgencyStrip,
//   VendorCard,
//   RelatedProducts,
// } from "@/components/marketplace/product-detail-shared";
// import type { Tables } from "@/types/supabase";
// import type { ProductWithRelations } from "@/services/products";

// // ─── Props type ───────────────────────────────────────────────────────────────
// // The container passes the product plus related context.

// interface DigitalProductDetailProps {
//   product: ProductWithRelations;
//   vendor: Tables<"vendors"> | null;
//   followedVendorIds: string[];
//   relatedProducts?: Tables<"products">[];
// }

// // ─── Static content ───────────────────────────────────────────────────────────

// const DEFAULT_FEATURES = [
//   "Instant download after payment",
//   "Commercial use license included",
//   "Lifetime access to all updates",
//   "Compatible with all major tools",
//   "Creator support via direct message",
// ];

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// /** Read features whether they live in a real column or inside source_metadata. */
// function getFeatures(product: ProductWithRelations): string[] {
//   // Case 1: real column (after regenerating types)
//   const direct = (product as { features?: unknown }).features;
//   if (Array.isArray(direct)) {
//     return direct.filter((v): v is string => typeof v === "string");
//   }
//   // Case 2: stored in source_metadata jsonb
//   const meta = product.source_metadata as { features?: unknown } | null;
//   if (meta && Array.isArray(meta.features)) {
//     return meta.features.filter((v): v is string => typeof v === "string");
//   }
//   return [];
// }

// /** Same pattern for preview_url. */
// function getPreviewUrl(product: ProductWithRelations): string | undefined {
//   const direct = (product as { preview_url?: unknown }).preview_url;
//   if (typeof direct === "string" && direct) return direct;

//   const meta = product.source_metadata as { preview_url?: unknown } | null;
//   if (meta && typeof meta.preview_url === "string" && meta.preview_url) {
//     return meta.preview_url;
//   }
//   return undefined;
// }

// // ─── Preview modal ────────────────────────────────────────────────────────────

// function PreviewModal({
//   open, onClose, previewUrl, productName, images,
// }: {
//   open: boolean;
//   onClose: () => void;
//   previewUrl?: string;
//   productName: string;
//   images: string[];
// }) {
//   if (!open) return null;
//   return (
//     <div
//       className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
//       style={{ background: "rgba(0,0,0,0.75)" }}
//       onClick={onClose}
//     >
//       <div
//         className="relative w-full max-w-3xl bg-[var(--color-surface)] rounded-2xl overflow-hidden border border-[var(--color-border)]"
//         onClick={e => e.stopPropagation()}
//       >
//         <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-border)]">
//           <p className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate max-w-[80%]">
//             Preview — {productName}
//           </p>
//           <button
//             onClick={onClose}
//             aria-label="Close preview"
//             className="w-7 h-7 rounded-lg flex items-center justify-center border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
//           >
//             <X className="h-3.5 w-3.5" />
//           </button>
//         </div>
//         <div className="bg-[var(--color-surface-secondary)]" style={{ minHeight: 360 }}>
//           {previewUrl ? (
//             <iframe
//               src={previewUrl}
//               title={`Preview of ${productName}`}
//               className="w-full"
//               style={{ height: 480, border: "none" }}
//               sandbox="allow-scripts allow-same-origin"
//             />
//           ) : images[0] ? (
//             <Image
//               src={images[0]}
//               alt={`Preview of ${productName}`}
//               width={800}
//               height={480}
//               className="w-full object-contain"
//               style={{ maxHeight: 480 }}
//             />
//           ) : (
//             <div className="flex flex-col items-center justify-center h-[360px] gap-3">
//               <Eye className="h-8 w-8 text-[var(--color-text-muted)]" />
//               <p className="text-[13px] text-[var(--color-text-muted)]">No preview available</p>
//             </div>
//           )}
//         </div>
//         <div className="px-5 py-3.5 border-t border-[var(--color-border)] flex items-center justify-between">
//           <p className="text-[11px] text-[var(--color-text-muted)]">
//             Preview only — purchase to access all files
//           </p>
//           <button onClick={onClose} className="text-[12px] font-semibold text-[var(--color-accent)] hover:underline">
//             Close
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// function BenefitCard({
//   icon, title, desc,
// }: { icon: React.ReactNode; title: string; desc: string }) {
//   return (
//     <div className="flex gap-3 p-4 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
//       <div className="h-8 w-8 rounded-lg flex-shrink-0 flex items-center justify-center bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
//         {icon}
//       </div>
//       <div>
//         <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-0.5">{title}</p>
//         <p className="text-[12px] text-[var(--color-text-muted)] leading-relaxed">{desc}</p>
//       </div>
//     </div>
//   );
// }

// // ─── Main component ───────────────────────────────────────────────────────────

// export function DigitalProductDetail({
//   product,
//   vendor,
//   followedVendorIds,
//   relatedProducts = [],
// }: DigitalProductDetailProps) {
//   const [previewOpen, setPreviewOpen] = useState(false);
//   const { formatMoney } = useCurrency();

//   // Derived values — computed once at the top so types stay clean below.
//   const images: string[] = asStringArray(product.images ?? []);
//   const saleCount = product.sale_count ?? 120;
//   const reviewCount = product.review_count ?? 0;

//   const featuresFromProduct = getFeatures(product);
//   const features: string[] = featuresFromProduct.length
//     ? featuresFromProduct
//     : DEFAULT_FEATURES;

//   const previewUrl = getPreviewUrl(product);

//   const price = Number(product.price ?? 0);
//   const compareAtPrice =
//     product.compare_at_price != null ? Number(product.compare_at_price) : null;
//   const savings =
//     compareAtPrice && compareAtPrice > price
//       ? Math.round((1 - price / compareAtPrice) * 100)
//       : null;

//   const productProps = {
//     id: product.id,
//     name: product.name,
//     slug: product.slug,
//     price,
//     images,
//     vendor_id: product.vendor_id,
//     currency: product.currency,
//     pricing_type: product.pricing_type,
//     button_text: product.button_text,
//     is_digital: true,
//   };

//   const vendorProps = vendor
//     ? {
//       id: vendor.id,
//       business_name: vendor.business_name ?? null,
//       business_logo: vendor.business_logo ?? null,
//       business_slug: vendor.business_slug ?? null,
//     }
//     : null;

//   return (
//     <div className="min-h-screen bg-[var(--color-bg)]">
//       <PreviewModal
//         open={previewOpen}
//         onClose={() => setPreviewOpen(false)}
//         previewUrl={previewUrl}
//         productName={product.name}
//         images={images}
//       />

//       {/* ── Breadcrumb ── */}
//       <div className="sticky top-[var(--navbar-height,64px)] z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-sm">
//         <div className="max-w-6xl mx-auto px-4 sm:px-6 h-11 flex items-center justify-between">
//           <ProductBreadcrumb productName={product.name} />
//           <SaveShareBar />
//         </div>
//       </div>

//       <div className="max-w-6xl mx-auto px-4 pt-8 pb-24">
//         {/* ── Page header ── */}
//         <div className="mb-6">
//           <div className="flex items-center gap-2 mb-3">
//             <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20">
//               <Download className="h-3 w-3" />
//               Digital asset
//             </span>
//             {savings && (
//               <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20">
//                 {savings}% off
//               </span>
//             )}
//             {product.affiliate_enabled && (
//               <span
//                 className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border"
//                 style={{
//                   background: "rgba(253,80,0,0.08)",
//                   color: "var(--color-accent)",
//                   borderColor: "rgba(253,80,0,0.20)",
//                 }}
//               >
//                 {product.affiliate_commission_rate ?? 10}% affiliate
//               </span>
//             )}
//           </div>

//           <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--color-text-primary)] tracking-tight leading-snug mb-3">
//             {product.name}
//           </h1>

//           <div className="flex flex-wrap items-center gap-4 text-[13px] text-[var(--color-text-muted)] mb-4">
//             <div className="flex items-center gap-1.5">
//               <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 flex-shrink-0" />
//               <span className="font-semibold text-[var(--color-text-primary)]">4.9</span>
//               <span>({reviewCount} reviews)</span>
//             </div>
//             <span className="select-none text-[var(--color-border-strong)]">·</span>
//             <div className="flex items-center gap-1.5">
//               <CheckCircle2 className="h-3.5 w-3.5 text-sky-500 flex-shrink-0" />
//               Instant access
//             </div>
//             <span className="select-none text-[var(--color-border-strong)]">·</span>
//             <div className="flex items-center gap-1.5">
//               <Star className="h-3.5 w-3.5 flex-shrink-0" />
//               {saleCount.toLocaleString()}+ users
//             </div>
//           </div>

//           <SocialProofBar saleCount={saleCount} reviewCount={reviewCount} />
//         </div>

//         {/* ── Body grid ── */}
//         <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
//           {/* Left column */}
//           <div className="lg:col-span-8 space-y-8">
//             {/* Gallery */}
//             <div className="rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
//               <ImageGallery
//                 images={images}
//                 productName={product.name}
//                 isFeatured={product.is_featured ?? false}
//                 savings={savings}
//                 className="aspect-video"
//               />
//             </div>

//             {/* Mobile CTAs */}
//             <div className="flex flex-col sm:flex-row gap-3 lg:hidden">
//               <ProductActionModule
//                 product={productProps}
//                 vendor={vendorProps}
//                 currentPath={`/marketplace/${product.slug}`}
//                 className="flex-1"
//               />
//               <Button
//                 variant="outline"
//                 onClick={() => setPreviewOpen(true)}
//                 className="flex-1 h-11 rounded-xl border-[var(--color-border)] font-semibold text-[13px] text-[var(--color-text-secondary)]"
//               >
//                 <PlayCircle className="h-4 w-4 mr-2" />
//                 Live preview
//               </Button>
//             </div>

//             {/* Tabs */}
//             <Tabs defaultValue="overview" className="w-full">
//               <TabsList className="h-10 p-1 gap-1 rounded-xl w-fit bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
//                 {(["overview", "features", "reviews", "faq"] as const).map(tab => (
//                   <TabsTrigger
//                     key={tab}
//                     value={tab}
//                     className={cn(
//                       "px-5 h-8 rounded-lg text-[12px] font-semibold capitalize tracking-wide",
//                       "text-[var(--color-text-muted)]",
//                       "data-[state=active]:bg-[var(--color-surface)]",
//                       "data-[state=active]:text-[var(--color-text-primary)]",
//                       "data-[state=active]:shadow-none",
//                     )}
//                   >
//                     {tab === "faq" ? "FAQ" : tab}
//                   </TabsTrigger>
//                 ))}
//               </TabsList>

//               <TabsContent value="overview" className="mt-6 space-y-6">
//                 <p className="text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
//                   {product.description ||
//                     "A professionally crafted digital asset built for modern workflows. Optimized for speed, flexibility, and long-term maintainability."}
//                 </p>
//                 <div className="grid sm:grid-cols-2 gap-3">
//                   <BenefitCard icon={<Download className="h-4 w-4" />} title="Direct download" desc="Source files delivered the moment payment clears — no waiting." />
//                   <BenefitCard icon={<ShieldCheck className="h-4 w-4" />} title="Lifetime updates" desc="Every future version is included. Pay once, keep everything." />
//                   <BenefitCard icon={<Lock className="h-4 w-4" />} title="License included" desc="Commercial use license ships with every purchase." />
//                   <BenefitCard icon={<MessageSquare className="h-4 w-4" />} title="Creator support" desc="Direct access to the creator for integration questions." />
//                 </div>
//               </TabsContent>

//               <TabsContent value="features" className="mt-6">
//                 <ul className="space-y-3">
//                   {features.map(feat => (
//                     <li key={feat} className="flex items-start gap-3 text-[14px] text-[var(--color-text-secondary)]">
//                       <CheckCircle2 className="h-4 w-4 text-sky-500 flex-shrink-0 mt-0.5" />
//                       {feat}
//                     </li>
//                   ))}
//                 </ul>
//               </TabsContent>

//               <TabsContent value="reviews" className="mt-6">
//                 <ReviewForm productId={product.id} vendorId={product.vendor_id} />
//               </TabsContent>

//               <TabsContent value="faq" className="mt-6">
//                 <FaqSection />
//               </TabsContent>
//             </Tabs>

//             {/* Affiliate banner */}
//             <AffiliateBanner product={product} />

//             {/* Community card */}
//             <CommunityAccessCard
//               vendorSlug={vendor?.business_slug}
//               productName={product.name}
//             />
//             <RelatedProducts products={relatedProducts} formatMoney={formatMoney} />
//           </div>

//           {/* Right sidebar */}
//           <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">

//             {/* Purchase card */}
//             <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 space-y-4">
//               <div>
//                 <div className="flex items-baseline gap-2">
//                   <span className="text-2xl font-semibold text-[var(--color-text-primary)] tabular-nums">
//                     ${price.toFixed(2)}
//                   </span>
//                   {compareAtPrice && compareAtPrice > price && (
//                     <>
//                       <span className="text-[14px] line-through text-[var(--color-text-muted)]">
//                         ${compareAtPrice.toFixed(2)}
//                       </span>
//                       <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
//                         Save {savings}%
//                       </span>
//                     </>
//                   )}
//                 </div>
//                 {product.pricing_type === "recurring" && (
//                   <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
//                     Billed monthly · Cancel anytime
//                   </p>
//                 )}
//               </div>

//               <ProductActionModule
//                 product={productProps}
//                 vendor={vendorProps}
//                 currentPath={`/marketplace/${product.slug}`}
//                 className="w-full"
//               />

//               <div className="grid grid-cols-2 gap-2">
//                 <Button
//                   variant="outline"
//                   onClick={() => setPreviewOpen(true)}
//                   className="h-10 rounded-xl border-[var(--color-border)] text-[12px] font-semibold text-[var(--color-text-secondary)]"
//                 >
//                   <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
//                   Preview
//                 </Button>
//                 <Button
//                   variant="outline"
//                   onClick={() => navigator.clipboard.writeText(window.location.href)}
//                   className="h-10 rounded-xl border-[var(--color-border)] text-[12px] font-semibold text-[var(--color-text-secondary)]"
//                 >
//                   Share
//                 </Button>
//               </div>
//             </div>

//             {/* Security + vendor */}
//             {vendor && (
//               <VendorCard
//                 vendor={vendor}
//                 followedVendorIds={followedVendorIds}
//                 followButton={
//                   <FollowButton
//                     vendorId={vendor.id}
//                     initialFollowing={followedVendorIds.includes(vendor.id)}
//                     className="w-full h-9 rounded-xl border border-[var(--color-border)] text-[12px] font-semibold"
//                   />
//                 }
//               />
//             )}

//             {/* Enterprise CTA */}
//             <div className="rounded-2xl p-5 text-white relative overflow-hidden" style={{ background: "var(--color-accent)" }}>
//               <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full pointer-events-none" />
//               <div className="relative z-10 space-y-3">
//                 <div className="flex items-center gap-2">
//                   <Zap className="h-4 w-4" />
//                   <span className="text-[11px] font-semibold uppercase tracking-widest opacity-90">Enterprise</span>
//                 </div>
//                 <p className="text-[14px] font-semibold leading-snug">Need a custom plan?</p>
//                 <p className="text-[12px] opacity-80 leading-relaxed">
//                   Enterprise licenses and dedicated support available.
//                 </p>
//                 <Button className="w-full h-9 bg-white/20 hover:bg-white/30 border-0 text-white rounded-xl text-[12px] font-semibold transition-colors">
//                   <MessageSquare className="h-3.5 w-3.5 mr-2" />
//                   Message creator
//                 </Button>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck, Star, CheckCircle2, Lock, Download, PlayCircle,
  MessageSquare, Zap, X, Eye, Package, ArrowRight, Headphones,
  RotateCcw, FileText, Sparkles, TrendingUp, Clock, Layers,
  Globe, BadgeCheck, AlertTriangle, ShoppingBag,
  Infinity as InfinityIcon,
} from "lucide-react";
import { cn, asStringArray, getEffectiveCompareAtPrice, getProductDiscountPercent } from "@/lib/utils";
import { ProductActionModule } from "@/components/marketplace/product-action-module";
import { FollowButton } from "@/components/marketplace/follow-button";
import { ReviewForm } from "@/components/marketplace/review-form";
import { ImageGallery } from "@/components/marketplace/image-gallery";
import { useCurrency } from "@/context/CurrencyContext";
import {
  ProductBreadcrumb,
  SaveShareBar,
  AffiliateBanner,
  FaqSection,
  CommunityAccessCard,
  RelatedProducts,
} from "@/components/marketplace/product-detail-shared";
import type { Tables } from "@/types/supabase";
import type { ProductWithRelations, VendorPublic } from "@/services/products";

// ─── Props ────────────────────────────────────────────────────────────────────

interface DigitalProductDetailProps {
  product: ProductWithRelations;
  vendor: VendorPublic | null;
  followedVendorIds: string[];
  relatedProducts?: Tables<"products">[];
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_FEATURES = [
  "Instant download after payment",
  "Commercial use license included",
  "Lifetime access to all updates",
  "Compatible with all major tools",
  "Creator support via direct message",
];

const DEFAULT_INCLUDED = [
  "Source files (editable)",
  "High-resolution exports",
  "Commercial use license",
  "Setup & integration guide",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFeatures(product: ProductWithRelations): string[] {
  const direct = (product as { features?: unknown }).features;
  if (Array.isArray(direct)) return direct.filter((v): v is string => typeof v === "string");
  const meta = product.source_metadata as { features?: unknown } | null;
  if (meta && Array.isArray(meta.features)) {
    return meta.features.filter((v): v is string => typeof v === "string");
  }
  return [];
}

function getPreviewUrl(product: ProductWithRelations): string | undefined {
  const direct = (product as { preview_url?: unknown }).preview_url;
  if (typeof direct === "string" && direct) return direct;
  const meta = product.source_metadata as { preview_url?: unknown } | null;
  if (meta && typeof meta.preview_url === "string" && meta.preview_url) return meta.preview_url;
  return undefined;
}

function getMetaArray(product: ProductWithRelations, key: string): string[] {
  const direct = (product as Record<string, unknown>)[key];
  if (Array.isArray(direct)) return direct.filter((v): v is string => typeof v === "string");
  const meta = product.source_metadata as Record<string, unknown> | null;
  if (meta && Array.isArray(meta[key])) {
    return (meta[key] as unknown[]).filter((v): v is string => typeof v === "string");
  }
  return [];
}

function getMetaString(product: ProductWithRelations, key: string): string | undefined {
  const direct = (product as Record<string, unknown>)[key];
  if (typeof direct === "string" && direct) return direct;
  const meta = product.source_metadata as Record<string, unknown> | null;
  if (meta && typeof meta[key] === "string" && meta[key]) return meta[key] as string;
  return undefined;
}

// ─── Live viewers hook ────────────────────────────────────────────────────────

function useLiveViewers(baseCount: number = 0) {
  const base = Math.max(baseCount, 3);
  const [viewers, setViewers] = useState(base);
  useEffect(() => {
    setViewers(base + Math.floor(Math.random() * 8));
    const interval = setInterval(() => {
      setViewers((prev) => {
        const delta = Math.random() > 0.5 ? 1 : -1;
        return Math.max(base, Math.min(prev + delta, base + 15));
      });
    }, 4500);
    return () => clearInterval(interval);
  }, [base]);
  return viewers;
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
        onClick={(e) => e.stopPropagation()}
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
          <button
            onClick={onClose}
            className="text-[12px] font-semibold text-[var(--color-accent)] hover:underline"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Digital badge pills (top of gallery) ─────────────────────────────────────

function DigitalBadgePills({
  product,
  savings,
}: { product: ProductWithRelations; savings: number | null }) {
  const isBestseller = (product.sale_count ?? 0) >= 100;
  const hasAffiliate = product.affiliate_enabled;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
        <Download className="h-3 w-3" /> Instant Download
      </span>
      {isBestseller && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
          <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> Bestseller
        </span>
      )}
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
        <InfinityIcon className="h-3 w-3" /> Lifetime Updates
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
        <FileText className="h-3 w-3" /> Commercial License
      </span>
      {savings !== null && savings > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-semibold text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
          <Sparkles className="h-3 w-3" /> {savings}% Off
        </span>
      )}
      {hasAffiliate && (
        <span
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold border"
          style={{
            background: "rgba(253,80,0,0.08)",
            color: "var(--color-accent)",
            borderColor: "rgba(253,80,0,0.20)",
          }}
        >
          <TrendingUp className="h-3 w-3" />
          {product.affiliate_commission_rate ?? 10}% affiliate
        </span>
      )}
    </div>
  );
}

// ─── Social-proof activity feed ───────────────────────────────────────────────

const ACTIVITY_AVATARS = [
  { name: "Alex K.", initial: "A", city: "Berlin", color: "#FF6B35" },
  { name: "Priya R.", initial: "P", city: "Mumbai", color: "#4ECDC4" },
  { name: "Sam T.", initial: "S", city: "Toronto", color: "#45B7D1" },
];

function SocialProofActivityFeed({
  liveViewers,
  saleCount,
}: { liveViewers: number; saleCount: number }) {
  const items = useMemo(
    () =>
      ACTIVITY_AVATARS.map((a, i) => ({
        ...a,
        action: i === 0 ? "downloaded this asset" : i === 1 ? "favorited this" : "purchased this",
        time: `${(i + 1) * 2} mins ago`,
      })),
    [],
  );

  return (
    <div className="space-y-3">
      <div
        className="flex items-center gap-2 text-[12px] px-3 py-2 rounded-lg"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <Eye className="h-4 w-4 text-emerald-500 shrink-0" />
        <span className="text-[var(--color-text-muted)]">
          <strong className="text-[var(--color-text-primary)]">{liveViewers} people</strong> are
          viewing this right now
        </span>
      </div>
      <div
        className="rounded-lg overflow-hidden"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <div className="divide-y divide-[var(--color-border)]">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 px-3 py-2.5">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-sm"
                style={{ background: item.color }}
              >
                {item.initial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] leading-tight">
                  <strong className="text-[var(--color-text-primary)]">{item.name}</strong>{" "}
                  <span className="text-[var(--color-text-muted)]">from {item.city}</span>
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{item.action}</p>
              </div>
              <span className="text-[11px] text-[var(--color-text-muted)] shrink-0 tabular-nums">
                {item.time}
              </span>
            </div>
          ))}
        </div>
        {saleCount > 0 && (
          <div
            className="flex items-center gap-2 px-3 py-2 border-t border-[var(--color-border)] text-[12px]"
            style={{ background: "rgba(253,80,0,0.04)" }}
          >
            <TrendingUp className="h-4 w-4 text-orange-500 shrink-0" />
            <span className="text-[var(--color-text-muted)]">
              <strong className="text-[var(--color-text-primary)]">
                {saleCount >= 100 ? `${Math.round(saleCount / 10) * 10}` : saleCount}
              </strong>{" "}
              downloads in the last 24 hours
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Vendor section card ──────────────────────────────────────────────────────

function VendorSectionCard({
  vendor,
  followedVendorIds,
}: { vendor: VendorPublic; followedVendorIds: string[] }) {
  const rating = Number(vendor.rating ?? 0);
  const followerCount = vendor.follower_count ?? null;
  const positiveRate = 99;
  const responseTime = vendor.response_time ?? "5 min";
  const fulfilledOrders = vendor.total_sales ?? 0;
  const isVerified = vendor.verification_status === "verified" || true;

  const ordersLabel =
    fulfilledOrders >= 1000
      ? `${(fulfilledOrders / 1000).toFixed(fulfilledOrders >= 10000 ? 0 : 1)}k`
      : fulfilledOrders > 0
        ? fulfilledOrders.toLocaleString()
        : "1,200";

  return (
    <div
      className="rounded-md overflow-hidden"
      style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}
    >
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Link
            href={`/vendors/${vendor.business_slug}`}
            className="h-10 w-10 rounded-md border border-[var(--color-border)] overflow-hidden flex items-center justify-center shrink-0 bg-[var(--color-surface-secondary)] hover:border-[var(--color-text-muted)] transition-colors"
          >
            {vendor.business_logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={vendor.business_logo}
                className="w-full h-full object-cover"
                alt=""
                loading="lazy"
              />
            ) : (
              <ShoppingBag className="h-4 w-4 text-[var(--color-text-muted)]" />
            )}
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-[var(--color-text-muted)] mb-0.5">Created by</p>
            <div className="flex items-center gap-1.5">
              <Link
                href={`/vendors/${vendor.business_slug}`}
                className="text-[14px] font-semibold text-[var(--color-text-primary)] hover:underline underline-offset-2 truncate"
              >
                {vendor.business_name ?? "Independent Creator"}
              </Link>
              {isVerified && (
                <BadgeCheck className="h-4 w-4 text-sky-500 shrink-0" aria-label="Verified" />
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)] flex-wrap mt-0.5">
              {rating > 0 && (
                <span className="inline-flex items-center gap-0.5">
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {rating.toFixed(1)}
                  </span>
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  Creator Rating
                </span>
              )}
              <span aria-hidden>|</span>
              <span>{positiveRate}% Positive</span>
              <span aria-hidden>|</span>
              <span>
                {followerCount && followerCount > 0
                  ? `${followerCount >= 1000 ? `${(followerCount / 1000).toFixed(1)}K` : followerCount} Followers`
                  : "1.2K Followers"}
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-[var(--color-border)] pt-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-3 w-3" />
            </span>
            <div>
              <div className="font-bold text-[var(--color-text-primary)]">{positiveRate}%</div>
              <div className="text-[var(--color-text-muted)] text-[10px]">Positive Reviews</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Download className="h-4 w-4 text-orange-500 shrink-0" />
            <div>
              <div className="font-bold text-[var(--color-text-primary)]">{ordersLabel}</div>
              <div className="text-[var(--color-text-muted)] text-[10px]">Downloads</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-sky-500 shrink-0" />
            <div>
              <div className="font-bold text-[var(--color-text-primary)]">{responseTime}</div>
              <div className="text-[var(--color-text-muted)] text-[10px]">Avg. Response</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button
            className="h-9 rounded-md text-[12px] font-semibold transition-colors"
            style={{
              border: "1px solid var(--color-border)",
              color: "var(--color-text-primary)",
              background: "var(--color-surface)",
            }}
          >
            Message Creator
          </button>
          <Link
            href={`/vendors/${vendor.business_slug}`}
            className="h-9 rounded-md text-[12px] font-semibold text-[var(--color-text-primary)] transition-colors flex items-center justify-center"
            style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}
          >
            Visit Profile
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Digital delivery card (sidebar) ──────────────────────────────────────────

function DigitalDeliveryCard({ product }: { product: ProductWithRelations }) {
  const fileFormats = getMetaArray(product, "file_formats");
  const fileSize = getMetaString(product, "file_size");
  const compatibility = getMetaArray(product, "compatibility");
  const lastUpdated = getMetaString(product, "last_updated");

  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: "Delivery",
      value: (
        <span className="text-[13px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 justify-end">
          <Zap className="h-3.5 w-3.5" />
          Instant
        </span>
      ),
    },
    {
      label: "File formats",
      value: (
        <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">
          {fileFormats.length > 0 ? fileFormats.slice(0, 3).join(", ") : "PDF, PNG, SVG"}
        </span>
      ),
    },
  ];
  if (fileSize) {
    rows.push({
      label: "File size",
      value: (
        <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">
          {fileSize}
        </span>
      ),
    });
  }
  if (compatibility.length > 0) {
    rows.push({
      label: "Works with",
      value: (
        <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">
          {compatibility.slice(0, 2).join(", ")}
          {compatibility.length > 2 ? "…" : ""}
        </span>
      ),
    });
  }
  rows.push({
    label: "Last updated",
    value: (
      <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">
        {lastUpdated ?? "This month"}
      </span>
    ),
  });

  return (
    <div
      className="rounded-md overflow-hidden"
      style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}
    >
      <div className="px-5 py-3.5 border-b border-[var(--color-border)]">
        <p className="text-[13px] font-bold text-[var(--color-text-primary)]">Delivery & Files</p>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {rows.map(({ label, value }, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-3 gap-3">
            <span className="text-[11px] text-[var(--color-text-muted)] shrink-0">{label}</span>
            <div className="text-right min-w-0">{value}</div>
          </div>
        ))}
      </div>
      <div
        className="px-5 py-2"
        style={{ background: "rgba(16,185,129,0.06)", borderTop: "1px solid rgba(16,185,129,0.2)" }}
      >
        <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
          ✓ Download link delivered to your email instantly
        </p>
      </div>
    </div>
  );
}

// ─── License info card (sidebar) ──────────────────────────────────────────────

function LicenseInfoCard() {
  const items = [
    { allowed: true, text: "Use in personal & client projects" },
    { allowed: true, text: "Use in unlimited products" },
    { allowed: true, text: "Modify & adapt freely" },
    { allowed: false, text: "Resell or redistribute as-is" },
  ];
  return (
    <div
      className="rounded-md overflow-hidden"
      style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}
    >
      <div className="px-5 py-3.5 border-b border-[var(--color-border)] flex items-center gap-2">
        <FileText className="h-4 w-4 text-violet-500" />
        <p className="text-[13px] font-bold text-[var(--color-text-primary)]">Commercial License</p>
      </div>
      <ul className="p-4 space-y-2.5">
        {items.map((item) => (
          <li key={item.text} className="flex items-start gap-2 text-[12px]">
            {item.allowed ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <X className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
            )}
            <span
              className={cn(
                item.allowed
                  ? "text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-muted)]",
              )}
            >
              {item.text}
            </span>
          </li>
        ))}
      </ul>
      <Link
        href="#"
        className="px-4 pb-4 inline-flex items-center gap-1 text-[12px] font-semibold text-sky-600 hover:text-sky-700"
      >
        Read full license <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

// ─── Compact buyer protection card ────────────────────────────────────────────

function CompactBuyerProtectionCard() {
  const items = [
    "14-day refund guarantee",
    "Secure payment",
    "Creator-verified files",
    "Dispute support",
  ];
  return (
    <div
      className="rounded-md p-4"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="h-4 w-4 text-sky-500" />
        <p className="text-[13px] font-bold text-[var(--color-text-primary)]">Buyer Protection</p>
      </div>
      <ul className="space-y-2">
        {items.map((p) => (
          <li
            key={p}
            className="flex items-center gap-2 text-[12px] text-[var(--color-text-primary)]"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            {p}
          </li>
        ))}
      </ul>
      <Link
        href="#"
        className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-sky-600 hover:text-sky-700"
      >
        Learn more <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

// ─── Why choose section ───────────────────────────────────────────────────────

function WhyChooseSection({ brandName = "Jimvio" }: { brandName?: string }) {
  const stats = [
    { value: "50K+", label: "Creators" },
    { value: "120K+", label: "Assets" },
    { value: "2M+", label: "Downloads" },
    { value: "4.9", label: "Avg Rating", isRating: true },
  ];
  return (
    <div
      className="rounded-md overflow-hidden"
      style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}
    >
      <div className="px-5 py-3.5 border-b border-[var(--color-border)]">
        <p className="text-[13px] font-bold text-[var(--color-text-primary)]">
          Why Choose {brandName}?
        </p>
      </div>
      <div className="grid grid-cols-4 divide-x divide-[var(--color-border)] py-4">
        {stats.map(({ value, label, isRating }) => (
          <div key={label} className="flex flex-col items-center gap-1 px-2">
            <div className="flex items-center gap-0.5">
              <p className="text-[15px] font-bold text-orange-600 tabular-nums">{value}</p>
              {isRating && (
                <Star className="h-3 w-3 fill-amber-400 text-amber-400 mb-0.5" />
              )}
            </div>
            <p className="text-[9px] text-[var(--color-text-muted)] text-center leading-tight">
              {label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Live activity feed sidebar ───────────────────────────────────────────────

const SIDEBAR_PRODUCTS = [
  { name: "Notion Dashboard Template", location: "Berlin, DE" },
  { name: "Figma UI Kit Pro", location: "Tokyo, JP" },
  { name: "Lightroom Preset Pack", location: "Paris, FR" },
  { name: "Marketing Strategy eBook", location: "Toronto, CA" },
];
const SIDEBAR_TIME_LABELS = ["just now", "1 min ago", "2 mins ago", "4 mins ago"];

function LiveActivityFeedSidebar({ liveViewers }: { liveViewers: number }) {
  return (
    <div
      className="rounded-md overflow-hidden"
      style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}
    >
      <div className="px-5 py-3.5 border-b border-[var(--color-border)] flex items-center justify-between">
        <p className="text-[13px] font-bold text-[var(--color-text-primary)]">Live Downloads</p>
        <Link href="#" className="text-[11px] font-semibold text-sky-600 hover:text-sky-700">
          See All
        </Link>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {SIDEBAR_PRODUCTS.map((item, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="h-9 w-9 rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
              <Download className="h-4 w-4 text-[var(--color-text-muted)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-[var(--color-text-primary)] truncate leading-none">
                {item.name}
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                Downloaded in {item.location}
              </p>
            </div>
            <span className="text-[9px] text-[var(--color-text-muted)] shrink-0 tabular-nums">
              {SIDEBAR_TIME_LABELS[i]}
            </span>
          </div>
        ))}
      </div>
      <div
        className="px-4 py-3 border-t border-[var(--color-border)]"
        style={{ background: "var(--color-surface-secondary)" }}
      >
        <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>
            <strong className="text-[var(--color-text-primary)]">{liveViewers}</strong> people
            viewing assets right now
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Mobile sticky buy bar ────────────────────────────────────────────────────

function MobileStickyBuyBar({
  price,
  compareAtPrice,
  currency,
  savings,
  onBuyClick,
  formatMoney,
}: {
  price: number;
  compareAtPrice: number | null;
  currency: string;
  savings: number | null;
  onBuyClick: () => void;
  formatMoney: (v: number, c: string) => string;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 flex items-center gap-3 shadow-lg">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-[var(--color-text-primary)]">
            {formatMoney(price, currency)}
          </span>
          {compareAtPrice && (
            <span className="text-[11px] text-[var(--color-text-muted)] line-through">
              {formatMoney(compareAtPrice, currency)}
            </span>
          )}
        </div>
        {savings !== null && savings > 0 && (
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
            Save {savings}% · Instant access
          </p>
        )}
      </div>
      <button
        onClick={onBuyClick}
        className="h-11 px-6 rounded-md text-sm font-bold transition-colors shrink-0 bg-orange-500 hover:bg-orange-600 text-white"
      >
        Get instant access
      </button>
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
  const [activeTab, setActiveTab] = useState<string>("overview");
  const { formatMoney } = useCurrency();

  // Derived values
  const images: string[] = asStringArray(product.images ?? []);
  const saleCount = product.sale_count ?? 120;
  const reviewCount = product.review_count ?? 0;
  const rating = (product as { rating?: number | null }).rating ?? 4.9;

  const featuresFromProduct = getFeatures(product);
  const features: string[] = featuresFromProduct.length ? featuresFromProduct : DEFAULT_FEATURES;
  const included: string[] = getMetaArray(product, "package_includes").length
    ? getMetaArray(product, "package_includes")
    : DEFAULT_INCLUDED;

  const previewUrl = getPreviewUrl(product);

  const price = Number(product.price ?? 0);
  const compareAtPrice = getEffectiveCompareAtPrice({
    price,
    compare_at_price: product.compare_at_price != null ? Number(product.compare_at_price) : null,
    discount_label: product.discount_label ?? null,
    is_flash_deal: product.is_flash_deal ?? null,
  });
  const savings = compareAtPrice ? getProductDiscountPercent({
    price,
    compare_at_price: compareAtPrice,
    discount_label: product.discount_label ?? null,
    is_flash_deal: product.is_flash_deal ?? null,
  }) : null;
  const savingsAmount = compareAtPrice ? compareAtPrice - price : 0;

  const liveViewers = useLiveViewers(5);
  const buyBoxRef = useRef<HTMLDivElement>(null);

  // Specifications derived from metadata
  const specRows = useMemo(() => {
    const rows: { label: string; value: string }[] = [];
    const fileFormats = getMetaArray(product, "file_formats");
    const fileSize = getMetaString(product, "file_size");
    const compatibility = getMetaArray(product, "compatibility");
    const dimensions = getMetaString(product, "dimensions");
    const language = getMetaString(product, "language");
    const lastUpdated = getMetaString(product, "last_updated");
    const version = getMetaString(product, "version");

    if (fileFormats.length) rows.push({ label: "File formats", value: fileFormats.join(", ") });
    if (fileSize) rows.push({ label: "File size", value: fileSize });
    if (compatibility.length)
      rows.push({ label: "Compatibility", value: compatibility.join(", ") });
    if (dimensions) rows.push({ label: "Dimensions", value: dimensions });
    if (language) rows.push({ label: "Language", value: language });
    if (version) rows.push({ label: "Version", value: version });
    if (lastUpdated) rows.push({ label: "Last updated", value: lastUpdated });
    rows.push({ label: "Delivery", value: "Instant download" });
    rows.push({ label: "License", value: "Commercial use included" });
    rows.push({ label: "Updates", value: "Free lifetime updates" });

    return rows;
  }, [product]);

  const specHalf = Math.ceil(specRows.length / 2);
  const specsLeft = specRows.slice(0, specHalf);
  const specsRight = specRows.slice(specHalf);

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

  // Shared sidebar cards (used in mobile inline + desktop sidebar)
  const sidebarCards = (
    <>
      <DigitalDeliveryCard product={product} />
      <LicenseInfoCard />
    </>
  );

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-20 lg:pb-0">
      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        previewUrl={previewUrl}
        productName={product.name}
        images={images}
      />

      {/* ── Sticky breadcrumb ── */}
      <div className="sticky top-[var(--navbar-height,64px)] z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-sm">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-11 flex items-center justify-between">
          <ProductBreadcrumb productName={product.name} />
          <SaveShareBar />
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
        {/* ══ TOP-LEVEL GRID: 12 cols, 9 main + 3 sidebar ══ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 xl:gap-6">
          {/* ════════════ COLUMN A: main (9 cols) ════════════ */}
          <div className="lg:col-span-9 space-y-6">
            {/* ── Top row: gallery (7) + info (5) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 xl:gap-6">
              {/* Sub-col 1: Gallery */}
              <section className="lg:col-span-7 space-y-3">
                <DigitalBadgePills product={product} savings={savings} />
                <ImageGallery
                  images={images}
                  productName={product.name}
                  isFeatured={product.is_featured ?? false}
                  savings={savings}
                  thumbnailsPosition="left"
                />
                <SocialProofActivityFeed liveViewers={liveViewers} saleCount={saleCount} />
              </section>

              {/* Sub-col 2: Info + buy box */}
              <section className="lg:col-span-5 space-y-4">
                <div>
                  {/* Title */}
                  <h1 className="text-[20px] lg:text-[22px] font-bold leading-snug text-[var(--color-text-primary)] tracking-tight">
                    {product.name}
                  </h1>

                  {/* Rating row */}
                  <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--color-text-muted)] mt-1">
                    <span className="font-bold text-[var(--color-text-primary)]">
                      {rating.toFixed(1)}
                    </span>
                    <span className="inline-flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className={cn(
                            "h-3.5 w-3.5",
                            i <= Math.round(rating)
                              ? "fill-amber-400 text-amber-400"
                              : "fill-gray-200 text-gray-200",
                          )}
                        />
                      ))}
                    </span>
                    <span>({reviewCount || 128} reviews)</span>
                    <span aria-hidden className="text-[var(--color-border-strong)]">·</span>
                    <span className="tabular-nums">
                      {saleCount >= 1000
                        ? `${(saleCount / 1000).toFixed(1)}K`
                        : saleCount.toLocaleString()}{" "}
                      downloads
                    </span>
                    <span aria-hidden className="text-[var(--color-border-strong)]">·</span>
                    <span className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <strong className="text-[var(--color-text-primary)]">
                        {liveViewers}
                      </strong>{" "}
                      viewing
                    </span>
                  </div>

                  {/* Price */}
                  <div className="mt-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[30px] font-extrabold text-orange-600 leading-none">
                        {formatMoney(price, product.currency)}
                      </span>
                      {compareAtPrice && (
                        <span className="text-base text-[var(--color-text-muted)] line-through">
                          {formatMoney(compareAtPrice, product.currency)}
                        </span>
                      )}
                      {savings !== null && savings > 0 && (
                        <span className="rounded-md bg-orange-100 px-1.5 py-0.5 text-[11px] font-bold text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                          -{savings}%
                        </span>
                      )}
                    </div>
                    {savingsAmount > 0 && (
                      <p className="mt-1 text-[12px] font-medium text-emerald-600 dark:text-emerald-400">
                        You save {formatMoney(savingsAmount, product.currency)} today
                      </p>
                    )}
                    {product.pricing_type === "recurring" && (
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                        Billed monthly · Cancel anytime
                      </p>
                    )}
                  </div>

                  {/* Vendor card */}
                  {vendor && (
                    <div className="mt-3">
                      <VendorSectionCard
                        vendor={vendor}
                        followedVendorIds={followedVendorIds}
                      />
                    </div>
                  )}

                  {/* Key features preview (no variants for digital → use feature highlights) */}
                  <div className="mt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                      What you get
                    </p>
                    <ul className="space-y-1.5">
                      {features.slice(0, 4).map((feat) => (
                        <li
                          key={feat}
                          className="flex items-start gap-2 text-[12.5px] text-[var(--color-text-secondary)]"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          {feat}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Buy box */}
                  <div ref={buyBoxRef} className="mt-4 space-y-2">
                    <ProductActionModule
                      product={productProps}
                      vendor={vendorProps}
                      currentPath={`/marketplace/${product.slug}`}
                      className="w-full"
                    />
                    <button
                      onClick={() => setPreviewOpen(true)}
                      className="w-full h-10 rounded-md text-[12.5px] font-semibold transition-colors flex items-center justify-center gap-2"
                      style={{
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text-primary)",
                        background: "var(--color-surface)",
                      }}
                    >
                      <PlayCircle className="h-4 w-4" />
                      Live preview
                    </button>
                  </div>

                  {/* Mobile-only delivery + license cards */}
                  <div className="mt-4 space-y-4 lg:hidden">{sidebarCards}</div>

                  {/* 4-badge trust row */}
                  <div className="grid grid-cols-4 gap-3 border-t border-[var(--color-border)] pt-3 mt-4 text-[11px]">
                    {[
                      { icon: Lock, label: "Secure Checkout", sub: "SSL Encrypted" },
                      { icon: Zap, label: "Instant Access", sub: "After payment" },
                      { icon: ShieldCheck, label: "14-Day Refund", sub: "No questions asked" },
                      { icon: Headphones, label: "Creator Support", sub: "Direct message" },
                    ].map(({ icon: Icon, label, sub }) => (
                      <div key={label} className="flex items-start gap-1.5">
                        <Icon className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div className="leading-tight">
                          <p className="text-[10.5px] font-semibold text-[var(--color-text-primary)]">
                            {label}
                          </p>
                          <p className="text-[10px] text-[var(--color-text-muted)]">{sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            {/* ── Tabs ── */}
            <div
              className="rounded-md overflow-hidden"
              style={{
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
              }}
            >
              <div className="px-2 pt-1 overflow-x-auto border-b border-[var(--color-border)]">
                <div className="h-11 flex items-center gap-1 w-fit">
                  {[
                    { id: "overview", label: "Overview", badge: null },
                    {
                      id: "features",
                      label: "Features",
                      badge: features.length > 0 ? features.length : null,
                    },
                    {
                      id: "specs",
                      label: "Specifications",
                      badge: specRows.length > 0 ? specRows.length : null,
                    },
                    {
                      id: "reviews",
                      label: `Reviews (${reviewCount || 0})`,
                      badge: null,
                    },
                    { id: "license", label: "License", badge: null },
                    { id: "creator", label: "Creator", badge: null },
                    { id: "faq", label: "FAQ", badge: null },
                  ].map(({ id, label, badge }) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id)}
                      className={cn(
                        "relative px-3 h-11 rounded-none text-[13px] font-medium gap-1.5 flex items-center transition-colors whitespace-nowrap",
                        activeTab === id
                          ? "text-orange-600"
                          : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]",
                      )}
                    >
                      {label}
                      {badge !== null && (
                        <span
                          className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-[9px] font-bold"
                          style={{
                            background: "var(--color-accent-light)",
                            color: "var(--color-accent)",
                            border: "1px solid var(--color-accent-subtle)",
                          }}
                        >
                          {badge}
                        </span>
                      )}
                      {activeTab === id && (
                        <span className="absolute inset-x-3 -bottom-px h-[2px] bg-orange-500 rounded-full" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-5 lg:p-6">
                {/* Overview */}
                {activeTab === "overview" && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8">
                    <div className="lg:col-span-5">
                      <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)] mb-2">
                        Product Description
                      </h3>
                      <p className="text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">
                        {product.description ||
                          "A professionally crafted digital asset built for modern workflows. Optimized for speed, flexibility, and long-term maintainability."}
                      </p>
                      <ul className="mt-4 space-y-1.5 text-[12.5px] text-[var(--color-text-secondary)]">
                        {features.slice(0, 6).map((f) => (
                          <li key={f} className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-none text-emerald-500" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="lg:col-span-4">
                      <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)] mb-2">
                        Specifications
                      </h3>
                      <div className="grid grid-cols-1 rounded-lg border border-[var(--color-border)] overflow-hidden">
                        {specRows.slice(0, 7).map(({ label, value }, i, arr) => (
                          <div
                            key={`o-${i}`}
                            className={cn(
                              "flex items-center justify-between gap-3 px-3 py-2 text-[12px]",
                              i < arr.length - 1 && "border-b border-[var(--color-border)]",
                            )}
                            style={{
                              background:
                                i % 2 === 0
                                  ? "var(--color-surface)"
                                  : "var(--color-surface-secondary)",
                            }}
                          >
                            <span className="text-[var(--color-text-muted)]">{label}</span>
                            <span className="font-medium text-[var(--color-text-primary)] text-right truncate max-w-[60%]">
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="lg:col-span-3">
                      <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)] mb-2">
                        What&apos;s Included
                      </h3>
                      <ul className="space-y-2 text-[12.5px] text-[var(--color-text-secondary)]">
                        {included.map((item) => (
                          <li
                            key={item}
                            className="flex items-center gap-2 rounded-md border border-[var(--color-border)] px-3 py-2"
                            style={{ background: "var(--color-surface-secondary)" }}
                          >
                            <Layers className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Features */}
                {activeTab === "features" && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {features.map((feat) => (
                      <div
                        key={feat}
                        className="flex items-start gap-3 p-3.5 rounded-lg"
                        style={{
                          background: "var(--color-surface-secondary)",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        <div className="h-7 w-7 rounded-md flex items-center justify-center bg-emerald-500/10 text-emerald-500 shrink-0">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <p className="text-[13px] text-[var(--color-text-primary)] leading-relaxed">
                          {feat}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Specifications */}
                {activeTab === "specs" && (
                  <div
                    className="rounded-md overflow-hidden"
                    style={{ border: "1px solid var(--color-border)" }}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x sm:divide-[var(--color-border)]">
                      <div>
                        {specsLeft.map(({ label, value }, i) => (
                          <div
                            key={`sl-${i}`}
                            className={cn(
                              "flex items-center justify-between px-4 py-3 text-[12px]",
                              i < specsLeft.length - 1 && "border-b border-[var(--color-border)]",
                            )}
                            style={{
                              background:
                                i % 2 === 0
                                  ? "var(--color-surface)"
                                  : "var(--color-surface-secondary)",
                            }}
                          >
                            <span
                              className="text-[10px] font-semibold uppercase tracking-wider"
                              style={{ color: "var(--color-text-muted)" }}
                            >
                              {label}
                            </span>
                            <span
                              className="text-sm font-medium text-right max-w-[60%]"
                              style={{ color: "var(--color-text-primary)" }}
                            >
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div>
                        {specsRight.map(({ label, value }, i) => (
                          <div
                            key={`sr-${i}`}
                            className={cn(
                              "flex items-center justify-between px-4 py-3 text-[12px]",
                              i < specsRight.length - 1 && "border-b border-[var(--color-border)]",
                            )}
                            style={{
                              background:
                                i % 2 === 0
                                  ? "var(--color-surface)"
                                  : "var(--color-surface-secondary)",
                            }}
                          >
                            <span
                              className="text-[10px] font-semibold uppercase tracking-wider"
                              style={{ color: "var(--color-text-muted)" }}
                            >
                              {label}
                            </span>
                            <span
                              className="text-sm font-medium text-right max-w-[60%]"
                              style={{ color: "var(--color-text-primary)" }}
                            >
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Reviews */}
                {activeTab === "reviews" && (
                  <div className="space-y-6">
                    {reviewCount > 0 ? (
                      <div
                        className="flex items-center gap-6 p-5 rounded-md"
                        style={{
                          background: "var(--color-surface-secondary)",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        <div className="text-center shrink-0">
                          <p
                            className="text-5xl font-bold tabular-nums leading-none"
                            style={{ color: "var(--color-text-primary)" }}
                          >
                            {rating.toFixed(1)}
                          </p>
                          <div className="flex gap-0.5 mt-2 justify-center">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "h-3.5 w-3.5",
                                  i <= Math.round(rating)
                                    ? "fill-amber-400 text-amber-400"
                                    : "fill-amber-200 text-amber-200",
                                )}
                              />
                            ))}
                          </div>
                          <p
                            className="text-[10px] mt-1.5"
                            style={{ color: "var(--color-text-muted)" }}
                          >
                            {reviewCount} review{reviewCount !== 1 ? "s" : ""}
                          </p>
                          <div className="flex items-center gap-1 justify-center mt-2">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              Verified reviews
                            </span>
                          </div>
                        </div>
                        <div
                          className="h-16 w-px"
                          style={{ background: "var(--color-border)" }}
                        />
                        <div className="flex-1">
                          <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
                            Reviews from verified buyers who have downloaded this asset. Help others
                            decide by sharing your experience.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="text-center py-8 rounded-md"
                        style={{
                          background: "var(--color-surface-secondary)",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        <Star className="h-8 w-8 text-[var(--color-text-muted)] mx-auto mb-2" />
                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                          No reviews yet
                        </p>
                        <p className="text-[12px] text-[var(--color-text-muted)] mt-1">
                          Be the first to review this product
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
                      <BadgeCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span>
                        Reviews marked with a badge are from verified buyers
                      </span>
                    </div>
                    <ReviewForm productId={product.id} vendorId={product.vendor_id} />
                  </div>
                )}

                {/* License */}
                {activeTab === "license" && (
                  <div className="space-y-5">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-violet-500" />
                      </div>
                      <div>
                        <h3 className="text-[15px] font-bold text-[var(--color-text-primary)]">
                          Commercial Use License
                        </h3>
                        <p className="text-[12.5px] text-[var(--color-text-muted)] leading-relaxed mt-0.5">
                          Every purchase includes a commercial license that lets you use this asset
                          in unlimited projects.
                        </p>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <div
                        className="rounded-md p-4"
                        style={{
                          background: "rgba(16,185,129,0.06)",
                          border: "1px solid rgba(16,185,129,0.2)",
                        }}
                      >
                        <p className="text-[12px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-3">
                          ✓ Allowed
                        </p>
                        <ul className="space-y-2 text-[12.5px] text-[var(--color-text-primary)]">
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            Use in personal and client projects
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            Use in unlimited end products
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            Modify and adapt the files freely
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            Use globally, no geographic limits
                          </li>
                        </ul>
                      </div>
                      <div
                        className="rounded-md p-4"
                        style={{
                          background: "rgba(244,63,94,0.06)",
                          border: "1px solid rgba(244,63,94,0.2)",
                        }}
                      >
                        <p className="text-[12px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 mb-3">
                          ✗ Not allowed
                        </p>
                        <ul className="space-y-2 text-[12.5px] text-[var(--color-text-primary)]">
                          <li className="flex items-start gap-2">
                            <X className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                            Reselling or redistributing as-is
                          </li>
                          <li className="flex items-start gap-2">
                            <X className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                            Sharing source files publicly
                          </li>
                          <li className="flex items-start gap-2">
                            <X className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                            Using in trademarks or logos
                          </li>
                          <li className="flex items-start gap-2">
                            <X className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                            Sublicensing to third parties
                          </li>
                        </ul>
                      </div>
                    </div>

                    <Link
                      href="#"
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-sky-600 hover:text-sky-700"
                    >
                      Read the full license terms <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}

                {/* Creator */}
                {activeTab === "creator" && (
                  <div className="space-y-5">
                    {vendor ? (
                      <>
                        <VendorSectionCard
                          vendor={vendor}
                          followedVendorIds={followedVendorIds}
                        />
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            {
                              icon: Download,
                              value:
                                (vendor.total_sales ?? 0) >= 1000
                                  ? `${((vendor.total_sales ?? 0) / 1000).toFixed(1)}k`
                                  : `${vendor.total_sales ?? 1200}`,
                              label: "Total Downloads",
                              color: "text-orange-500",
                              bg: "bg-orange-500/10",
                            },
                            {
                              icon: Star,
                              value: `${rating.toFixed(1)}`,
                              label: "Creator Rating",
                              color: "text-amber-500",
                              bg: "bg-amber-500/10",
                            },
                            {
                              icon: MessageSquare,
                              value: vendor.response_time ?? "5 min",
                              label: "Avg. Response",
                              color: "text-sky-500",
                              bg: "bg-sky-500/10",
                            },
                          ].map(({ icon: Icon, value, label, color, bg }) => (
                            <div
                              key={label}
                              className="flex flex-col items-center p-4 rounded-md text-center"
                              style={{
                                border: "1px solid var(--color-border)",
                                background: "var(--color-surface-secondary)",
                              }}
                            >
                              <div
                                className={cn(
                                  "h-9 w-9 rounded-full flex items-center justify-center mb-2",
                                  bg,
                                )}
                              >
                                <Icon className={cn("h-4 w-4", color)} />
                              </div>
                              <p className="text-[15px] font-bold text-[var(--color-text-primary)]">
                                {value}
                              </p>
                              <p className="text-[10px] text-[var(--color-text-muted)] leading-tight mt-0.5">
                                {label}
                              </p>
                            </div>
                          ))}
                        </div>
                        <FollowButton
                          vendorId={vendor.id}
                          initialFollowing={followedVendorIds.includes(String(vendor.id))}
                          className="w-full h-10 rounded-md border border-[var(--color-border)] text-[12px] font-semibold"
                        />
                      </>
                    ) : (
                      <p className="text-[13px] text-[var(--color-text-muted)]">
                        No creator information available.
                      </p>
                    )}
                  </div>
                )}

                {/* FAQ */}
                {activeTab === "faq" && <FaqSection />}
              </div>
            </div>

            {/* ── Below tabs ── */}
            <AffiliateBanner product={product} />
            <CommunityAccessCard
              vendorSlug={vendor?.business_slug}
              productName={product.name}
            />
            <RelatedProducts products={relatedProducts} formatMoney={formatMoney} />
          </div>

          {/* ════════════ COLUMN B: sidebar (3 cols) ════════════ */}
          <aside className="lg:col-span-3 hidden lg:block">
            <div className="sticky top-24 space-y-4">
              {sidebarCards}
              <CompactBuyerProtectionCard />
              <WhyChooseSection brandName="Jimvio" />
              <LiveActivityFeedSidebar liveViewers={liveViewers} />

              {/* Enterprise CTA */}
              <div
                className="rounded-md p-5 text-white relative overflow-hidden"
                style={{ background: "var(--color-accent)" }}
              >
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full pointer-events-none" />
                <div className="relative z-10 space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    <span className="text-[11px] font-semibold uppercase tracking-widest opacity-90">
                      Enterprise
                    </span>
                  </div>
                  <p className="text-[14px] font-semibold leading-snug">Need a custom plan?</p>
                  <p className="text-[12px] opacity-80 leading-relaxed">
                    Extended licenses, team seats, and white-glove onboarding available.
                  </p>
                  <button className="w-full h-9 bg-white/20 hover:bg-white/30 border-0 text-white rounded-md text-[12px] font-semibold transition-colors flex items-center justify-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Contact sales
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <MobileStickyBuyBar
        price={price}
        compareAtPrice={compareAtPrice}
        currency={product.currency ?? "USD"}
        savings={savings}
        onBuyClick={() =>
          buyBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
        }
        formatMoney={formatMoney}
      />
    </div>
  );
}