// "use client";

// import React from "react";
// import { 
//   Zap, ShieldCheck, Globe, Star, MessageSquare, 
//   ChevronRight, Share2, CheckCircle2, Lock, Sparkles,
//   Download, Box, PlayCircle
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { cn } from "@/lib/utils";
// import { ProductPriceDisplay } from "@/components/marketplace/product-price-display";
// import { ProductActionModule } from "@/components/marketplace/product-action-module";
// import { FollowButton } from "@/components/marketplace/follow-button";
// import { ReviewForm } from "@/components/marketplace/review-form";
// import { ImageGallery } from "@/components/marketplace/image-gallery";
// import { GlassCard, GlassAmbientGlow } from "@/components/ui/glass";

// interface DigitalProductDetailProps {
//   product: any;
//   vendor: any;
//   relatedProducts: any[];
//   cartSet: Set<string>;
//   followedVendorIds: string[];
// }

// export function DigitalProductDetail({ 
//   product, 
//   vendor, 
//   relatedProducts, 
//   cartSet, 
//   followedVendorIds 
// }: DigitalProductDetailProps) {
//   const images: string[] = product.images ?? [];
//   const savings =
//     product.compare_at_price && product.compare_at_price > product.price
//       ? Math.round((1 - product.price / product.compare_at_price) * 100)
//       : null;

//   const productProps = {
//     id: product.id,
//     name: product.name,
//     slug: product.slug,
//     price: Number(product.price),
//     images: product.images,
//     vendor_id: product.vendor_id,
//     currency: product.currency,
//     pricing_type: product.pricing_type,
//     button_text: product.button_text,
//     is_digital: true,
//   };

//   const vendorProps = vendor ? {
//     id: vendor.id,
//     business_name: vendor.business_name ?? null,
//     business_logo: vendor.business_logo ?? null,
//     business_slug: vendor.business_slug ?? null,
//   } : null;

//   return (
//     <div className="min-h-screen bg-[var(--color-bg)] relative overflow-hidden">
//       {/* Background ambient effects - Only for digital */}
//       <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] pointer-events-none">
//         <div className="absolute inset-0 bg-gradient-to-b from-sky-500/5 via-transparent to-transparent" />
//         <GlassAmbientGlow color="sky" position="center" className="opacity-30 blur-[120px]" />
//       </div>

//       {/* Hero Header Area */}
//       <div className="relative pt-10 pb-16 px-4 max-w-6xl mx-auto text-center">
//         <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm bg-sky-500/10 border border-sky-500/20 text-sky-500 text-[10px] font-bold uppercase tracking-widest mb-6 animate-fade-in">
//           <Sparkles className="h-3 w-3" /> Digital Asset
//         </div>
        
//         <h1 className="text-4xl md:text-6xl font-black text-stone-900 dark:text-white tracking-tight leading-[1.1] mb-6">
//           {product.name}
//         </h1>
        
//         <div className="flex flex-wrap items-center justify-center gap-6 text-sm mb-10">
//           <div className="flex items-center gap-1.5 font-bold text-stone-600 dark:text-stone-300">
//             <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> 4.9 <span className="text-stone-400 font-medium">({product.review_count ?? 0})</span>
//           </div>
//           <div className="w-px h-4 bg-stone-200 dark:bg-stone-800" />
//           <div className="flex items-center gap-1.5 font-bold text-stone-600 dark:text-stone-300">
//             <CheckCircle2 className="h-4 w-4 text-sky-500" /> Instant Access
//           </div>
//           <div className="w-px h-4 bg-stone-200 dark:bg-stone-800" />
//           <div className="flex items-center gap-1.5 font-bold text-stone-600 dark:text-stone-300 text-[var(--color-accent)]">
//              {product.sale_count ?? 120}+ Productive Users
//           </div>
//         </div>

//         {/* Action / Buy / Preview Row */}
//         <div className="flex flex-col md:flex-row items-center justify-center gap-4">
//           <ProductActionModule 
//              product={productProps} 
//              vendor={vendorProps} 
//              currentPath={`/marketplace/${product.slug}`}
//              className="w-full md:w-auto h-14 md:px-12 rounded-sm text-lg"
//           />
//           <Button variant="outline" className="w-full md:w-auto h-14 md:px-10 rounded-sm border-2 border-stone-200 dark:border-stone-800 font-bold">
//             <PlayCircle className="h-5 w-5 mr-2" /> Live Preview
//           </Button>
//         </div>
//       </div>

//       <div className="max-w-7xl mx-auto px-4 pb-24">
//         <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
//           {/* Main Content (Images + Specs) */}
//           <div className="lg:col-span-8 space-y-12">
//             <div className="rounded-sm overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 dark:bg-[var(--color-surface)]/20 shadow-none">
//                <ImageGallery
//                   images={images}
//                   productName={product.name}
//                   isFeatured={product.is_featured}
//                   savings={savings}
//                   className="aspect-video"
//                 />
//             </div>

//             {/* Content Tabs */}
//             <div className="space-y-6">
//               <Tabs defaultValue="overview" className="w-full">
//                 <TabsList className="bg-[var(--color-surface-secondary)] dark:bg-[var(--color-surface-secondary)] border-none h-12 p-1.5 rounded-sm mb-8">
//                   <TabsTrigger value="overview" className="rounded-sm px-8 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 shadow-none">Overview</TabsTrigger>
//                   <TabsTrigger value="curriculum" className="rounded-sm px-8 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 shadow-none">Features</TabsTrigger>
//                   <TabsTrigger value="reviews" className="rounded-sm px-8 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 shadow-none">Reviews</TabsTrigger>
//                 </TabsList>

//                 <TabsContent value="overview" className="prose prose-stone dark:prose-invert max-w-none">
//                   <h3 className="text-2xl font-black mb-4 tracking-tight">Transforming your workflow</h3>
//                   <div className="text-lg leading-relaxed text-stone-500 dark:text-stone-400">
//                     {product.description || "Unlocking the future of high-frequency digital interactions."}
//                   </div>
                  
//                   <div className="grid sm:grid-cols-2 gap-6 mt-12">
//                     <BenefitCard 
//                       icon={<Download className="text-sky-500" />} 
//                       title="Direct Download" 
//                       desc="Get instant access to your source files as soon as payment is confirmed." 
//                     />
//                     <BenefitCard 
//                       icon={<ShieldCheck className="text-emerald-500" />} 
//                       title="Future Updates" 
//                       desc="Access all future versions and improvements of this asset at no extra cost." 
//                     />
//                   </div>
//                 </TabsContent>

//                 <TabsContent value="reviews">
//                    <ReviewForm productId={product.id} vendorId={product.vendor_id} />
//                 </TabsContent>
//               </Tabs>
//             </div>
//           </div>

//           {/* Sidebar (Vendor + Security) */}
//           <div className="lg:col-span-4 space-y-6">
//              <GlassCard className="p-8 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] dark:bg-[var(--color-surface)] shadow-none overflow-hidden relative">
//                 <div className="absolute top-0 right-0 p-4 opacity-5">
//                    <Lock className="h-24 w-24" />
//                 </div>
                
//                 <h4 className="text-[11px] font-black uppercase tracking-widest text-sky-500 mb-6">Secured by Jimvio</h4>
                
//                 <div className="space-y-5">
//                    <SecurityFeature title="Encrypted Delivery" desc="End-to-end encrypted asset distribution." />
//                    <SecurityFeature title="Verified Source" desc="Rigorous quality check on all files." />
//                    <SecurityFeature title="Purchase Protection" desc="Funds held until you confirm access." />
//                 </div>

//                 <div className="mt-10 pt-8 border-t border-stone-100 dark:border-white/5">
//                    <div className="flex items-center gap-4 mb-6">
//                       <div className="h-16 w-16 rounded-sm border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-zinc-900 overflow-hidden flex items-center justify-center">
//                          {vendor?.business_logo ? (
//                            <img src={vendor.business_logo} className="w-full h-full object-cover" />
//                          ) : (
//                            <Globe className="h-6 w-6 text-stone-300" />
//                          )}
//                       </div>
//                       <div>
//                          <p className="font-black text-stone-900 dark:text-white">{vendor?.business_name}</p>
//                          <p className="text-xs text-stone-400">Official Creator</p>
//                       </div>
//                    </div>
                   
//                    <FollowButton
//                       vendorId={vendor?.id ?? ""}
//                       initialFollowing={followedVendorIds.includes(String(vendor?.id ?? ""))}
//                       className="w-full h-12 rounded-sm border-2 font-bold"
//                    />
//                 </div>
//              </GlassCard>

//              <div className="rounded-sm bg-sky-600 p-8 text-white relative overflow-hidden group">
//                 <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/10 rounded-sm blur-2xl transition-transform group-hover:scale-150" />
//                 <Zap className="h-8 w-8 mb-4" />
//                 <h3 className="text-xl font-bold mb-2">Need a custom plan?</h3>
//                 <p className="text-white/70 text-sm mb-6">Connect with the creator for enterprise-level licenses and personalized support.</p>
//                 <Button className="w-full bg-white text-sky-600 hover:bg-stone-50 font-black rounded-sm h-11">Message Creator</Button>
//              </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// function BenefitCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
//   return (
//     <div className="p-6 rounded-sm bg-[var(--color-surface-secondary)]/50 dark:bg-[var(--color-surface-secondary)]/50 border border-[var(--color-border)]">
//       <div className="h-10 w-10 rounded-sm bg-[var(--color-surface)] dark:bg-[var(--color-surface)] shadow-none flex items-center justify-center mb-4">
//         {icon}
//       </div>
//       <h4 className="font-bold text-stone-900 dark:text-white mb-2">{title}</h4>
//       <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">{desc}</p>
//     </div>
//   );
// }

// function SecurityFeature({ title, desc }: { title: string; desc: string }) {
//   return (
//     <div className="flex gap-4">
//       <div className="mt-1">
//         <div className="h-2 w-2 rounded-sm bg-sky-500" />
//       </div>
//       <div>
//         <p className="font-bold text-stone-900 dark:text-white text-sm">{title}</p>
//         <p className="text-xs text-stone-400">{desc}</p>
//       </div>
//     </div>
//   );
// }

"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  ShieldCheck, Globe, Star, CheckCircle2, Lock,
  Download, PlayCircle, MessageSquare, Share2, Zap, Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ProductActionModule } from "@/components/marketplace/product-action-module";
import { FollowButton } from "@/components/marketplace/follow-button";
import { ReviewForm } from "@/components/marketplace/review-form";
import { ImageGallery } from "@/components/marketplace/image-gallery";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DigitalProductDetailProps {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    compare_at_price?: number;
    description?: string;
    images?: string[];
    review_count?: number;
    sale_count?: number;
    vendor_id: string;
    currency: string;
    pricing_type: string;
    button_text?: string;
    is_featured?: boolean;
    // FIX: optional features array — used in Features tab if provided
    features?: string[];
  };
  vendor: {
    id: string;
    business_name?: string | null;
    business_logo?: string | null;
    business_slug?: string | null;
  } | null;
  // FIX: removed unused relatedProducts and cartSet props
  followedVendorIds: string[];
}

// ─── Default features fallback ────────────────────────────────────────────────

const DEFAULT_FEATURES = [
  "Instant download after payment",
  "Commercial use license included",
  "Lifetime access to all updates",
  "Compatible with all major tools",
  "Creator support via direct message",
];

// ─── Component ────────────────────────────────────────────────────────────────

export function DigitalProductDetail({
  product,
  vendor,
  followedVendorIds,
}: DigitalProductDetailProps) {
  const [copied, setCopied] = useState(false);

  const images: string[] = product.images ?? [];
  const savings =
    product.compare_at_price && product.compare_at_price > product.price
      ? Math.round((1 - product.price / product.compare_at_price) * 100)
      : null;

  const productProps = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: Number(product.price),
    images: product.images ?? null,
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

  // FIX: catch clipboard failure and show toast
  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error("Could not copy link");
    });
  }

  const features = product.features?.length ? product.features : DEFAULT_FEATURES;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-6xl mx-auto px-4 pt-8 pb-24">

        {/* ── Header ── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className={cn(
              "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full",
              "bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400",
              "border border-sky-200 dark:border-sky-500/20"
            )}>
              <Download className="h-3 w-3" />
              Digital asset
            </span>
            {savings && (
              <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20">
                {savings}% off
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--color-text-primary)] tracking-tight leading-snug mb-4">
            {product.name}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-[13px] text-[var(--color-text-muted)]">
            <div className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 flex-shrink-0" />
              <span className="font-semibold text-[var(--color-text-primary)]">4.9</span>
              <span>({product.review_count ?? 0} reviews)</span>
            </div>
            <span className="select-none text-[var(--color-border-strong)]">·</span>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-sky-500 flex-shrink-0" />
              Instant access
            </div>
            <span className="select-none text-[var(--color-border-strong)]">·</span>
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 flex-shrink-0" />
              {product.sale_count ?? 120}+ users
            </div>
          </div>
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
                isFeatured={product.is_featured}
                savings={savings}
                className="aspect-video"
              />
            </div>

            {/* Mobile CTA — shown only below lg */}
            <div className="flex flex-col sm:flex-row gap-3 lg:hidden">
              <ProductActionModule
                product={productProps}
                vendor={vendorProps}
                currentPath={`/marketplace/${product.slug}`}
                className="flex-1"
              />
              <Button
                variant="outline"
                className="flex-1 h-11 rounded-xl border-[var(--color-border)] font-semibold text-[13px] text-[var(--color-text-secondary)]"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className={cn(
                "h-10 p-1 gap-1 rounded-xl w-fit",
                "bg-[var(--color-surface-secondary)] border border-[var(--color-border)]"
              )}>
                {(["overview", "features", "reviews"] as const).map((tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className={cn(
                      "px-5 h-8 rounded-lg text-[12px] font-semibold capitalize tracking-wide",
                      "text-[var(--color-text-muted)]",
                      "data-[state=active]:bg-[var(--color-surface)]",
                      "data-[state=active]:text-[var(--color-text-primary)]",
                      "data-[state=active]:shadow-none"
                    )}
                  >
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Overview */}
              <TabsContent value="overview" className="mt-6 space-y-6">
                <p className="text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
                  {product.description || "A professionally crafted digital asset built for modern workflows. Optimized for speed, flexibility, and long-term maintainability."}
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <BenefitCard icon={<Download className="h-4 w-4" />} title="Direct download" desc="Source files delivered the moment payment clears — no waiting." />
                  <BenefitCard icon={<ShieldCheck className="h-4 w-4" />} title="Lifetime updates" desc="Every future version is included. Pay once, keep everything." />
                  <BenefitCard icon={<Lock className="h-4 w-4" />} title="License included" desc="Commercial use license ships with every purchase." />
                  <BenefitCard icon={<MessageSquare className="h-4 w-4" />} title="Creator support" desc="Direct access to the creator for integration questions." />
                </div>
              </TabsContent>

              {/* Features — uses product.features if provided, falls back to defaults */}
              <TabsContent value="features" className="mt-6">
                <ul className="space-y-3">
                  {features.map((feat) => (
                    <li key={feat} className="flex items-start gap-3 text-[14px] text-[var(--color-text-secondary)]">
                      <CheckCircle2 className="h-4 w-4 text-sky-500 flex-shrink-0 mt-0.5" />
                      {feat}
                    </li>
                  ))}
                </ul>
              </TabsContent>

              {/* Reviews */}
              <TabsContent value="reviews" className="mt-6">
                <ReviewForm productId={product.id} vendorId={product.vendor_id} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right sidebar — sticky */}
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">

            {/* Purchase card */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-[var(--color-text-primary)] tabular-nums">
                  ${Number(product.price).toFixed(2)}
                </span>
                {product.compare_at_price && product.compare_at_price > product.price && (
                  <span className="text-[13px] line-through text-[var(--color-text-muted)]">
                    ${Number(product.compare_at_price).toFixed(2)}
                  </span>
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
                  className="h-10 rounded-xl border-[var(--color-border)] text-[12px] font-semibold text-[var(--color-text-secondary)]"
                >
                  <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
                  Preview
                </Button>
                <Button
                  variant="outline"
                  onClick={handleShare}
                  className="h-10 rounded-xl border-[var(--color-border)] text-[12px] font-semibold text-[var(--color-text-secondary)]"
                >
                  <Share2 className="h-3.5 w-3.5 mr-1.5" />
                  {copied ? "Copied!" : "Share"}
                </Button>
              </div>
            </div>

            {/* Security + vendor card */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
              <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-3">
                Secured by Jimvio
              </p>

              <div className="divide-y divide-[var(--color-border)]">
                {[
                  { title: "Encrypted delivery", desc: "End-to-end encrypted asset distribution" },
                  { title: "Verified source", desc: "Rigorous quality check on all files" },
                  { title: "Purchase protection", desc: "Funds held until you confirm access" },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3 py-3">
                    <span className="mt-[5px] h-1.5 w-1.5 rounded-full bg-sky-500 flex-shrink-0" />
                    <div>
                      <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">{item.title}</p>
                      <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {vendor && (
                <div className="pt-4 mt-1 border-t border-[var(--color-border)]">
                  <div className="flex items-center gap-3 mb-3">
                    {/* FIX: next/image instead of <img> */}
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex-shrink-0 overflow-hidden",
                      "border border-[var(--color-border)] bg-[var(--color-surface-secondary)]",
                      "flex items-center justify-center"
                    )}>
                      {vendor.business_logo ? (
                        <Image
                          src={vendor.business_logo}
                          alt={vendor.business_name ?? "Vendor logo"}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Globe className="h-4 w-4 text-[var(--color-text-muted)]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate">
                        {vendor.business_name}
                      </p>
                      <p className="text-[11px] text-[var(--color-text-muted)]">Official creator</p>
                    </div>
                  </div>
                  <FollowButton
                    vendorId={vendor.id}
                    initialFollowing={followedVendorIds.includes(String(vendor.id))}
                    className="w-full h-9 rounded-xl border border-[var(--color-border)] text-[12px] font-semibold"
                  />
                </div>
              )}
            </div>

            {/* Enterprise CTA */}
            <div className="bg-[var(--color-accent)] rounded-2xl p-5 text-white relative overflow-hidden">
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full pointer-events-none" aria-hidden="true" />
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

// ─── BenefitCard ──────────────────────────────────────────────────────────────

function BenefitCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-3 p-4 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
      <div className={cn(
        "h-8 w-8 rounded-lg flex-shrink-0 flex items-center justify-center",
        "bg-[var(--color-surface)] border border-[var(--color-border)]",
        "text-[var(--color-text-muted)]"
      )}>
        {icon}
      </div>
      <div>
        <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-1">{title}</p>
        <p className="text-[12px] text-[var(--color-text-muted)] leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}