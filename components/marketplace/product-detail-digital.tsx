"use client";

import React from "react";
import Link from "next/link";
import { 
  Zap, ShieldCheck, Globe, Star, MessageSquare, 
  ChevronRight, Share2, CheckCircle2, Lock, Sparkles,
  Download, Box, PlayCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ProductPriceDisplay } from "@/components/marketplace/product-price-display";
import { ProductActionModule } from "@/components/marketplace/product-action-module";
import { FollowButton } from "@/components/marketplace/follow-button";
import { ReviewForm } from "@/components/marketplace/review-form";
import { ImageGallery } from "@/components/marketplace/image-gallery";
import { GlassCard, GlassAmbientGlow } from "@/components/ui/glass";

interface DigitalProductDetailProps {
  product: any;
  vendor: any;
  relatedProducts: any[];
  cartSet: Set<string>;
  followedVendorIds: string[];
}

export function DigitalProductDetail({ 
  product, 
  vendor, 
  relatedProducts, 
  cartSet, 
  followedVendorIds 
}: DigitalProductDetailProps) {
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
    images: product.images,
    vendor_id: product.vendor_id,
    currency: product.currency,
    pricing_type: product.pricing_type,
    button_text: product.button_text,
    is_digital: true,
  };

  const vendorProps = vendor ? {
    id: vendor.id,
    business_name: vendor.business_name ?? null,
    business_logo: vendor.business_logo ?? null,
    business_slug: vendor.business_slug ?? null,
  } : null;

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] relative overflow-hidden">
      {/* Background ambient effects - Only for digital */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-500/5 via-transparent to-transparent" />
        <GlassAmbientGlow color="sky" position="top-center" className="opacity-30 blur-[120px]" />
      </div>

      {/* Hero Header Area */}
      <div className="relative pt-10 pb-16 px-4 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-500 text-[10px] font-bold uppercase tracking-widest mb-6 animate-fade-in">
          <Sparkles className="h-3 w-3" /> Digital Asset
        </div>
        
        <h1 className="text-4xl md:text-6xl font-black text-stone-900 dark:text-white tracking-tight leading-[1.1] mb-6">
          {product.name}
        </h1>
        
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm mb-10">
          <div className="flex items-center gap-1.5 font-bold text-stone-600 dark:text-stone-300">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> 4.9 <span className="text-stone-400 font-medium">({product.review_count ?? 0})</span>
          </div>
          <div className="w-px h-4 bg-stone-200 dark:bg-stone-800" />
          <div className="flex items-center gap-1.5 font-bold text-stone-600 dark:text-stone-300">
            <CheckCircle2 className="h-4 w-4 text-sky-500" /> Instant Access
          </div>
          <div className="w-px h-4 bg-stone-200 dark:bg-stone-800" />
          <div className="flex items-center gap-1.5 font-bold text-stone-600 dark:text-stone-300 text-[var(--color-accent)]">
             {product.sale_count ?? 120}+ Productive Users
          </div>
        </div>

        {/* Action / Buy / Preview Row */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4">
          <ProductActionModule 
             product={productProps} 
             vendor={vendorProps} 
             currentPath={`/marketplace/${product.slug}`}
             className="w-full md:w-auto h-14 md:px-12 rounded-2xl text-lg"
          />
          <Button variant="outline" className="w-full md:w-auto h-14 md:px-10 rounded-2xl border-2 border-stone-200 dark:border-stone-800 font-bold">
            <PlayCircle className="h-5 w-5 mr-2" /> Live Preview
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Main Content (Images + Specs) */}
          <div className="lg:col-span-8 space-y-12">
            <div className="rounded-[40px] overflow-hidden border border-stone-200 dark:border-white/5 bg-stone-50 dark:bg-zinc-900/50 shadow-2xl">
               <ImageGallery
                  images={images}
                  productName={product.name}
                  isFeatured={product.is_featured}
                  savings={savings}
                  className="aspect-video"
                />
            </div>

            {/* Content Tabs */}
            <div className="space-y-6">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="bg-stone-100 dark:bg-zinc-900 border-none h-12 p-1.5 rounded-2xl mb-8">
                  <TabsTrigger value="overview" className="rounded-xl px-8 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 shadow-none">Overview</TabsTrigger>
                  <TabsTrigger value="curriculum" className="rounded-xl px-8 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 shadow-none">Features</TabsTrigger>
                  <TabsTrigger value="reviews" className="rounded-xl px-8 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 shadow-none">Reviews</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="prose prose-stone dark:prose-invert max-w-none">
                  <h3 className="text-2xl font-black mb-4 tracking-tight">Transforming your workflow</h3>
                  <div className="text-lg leading-relaxed text-stone-500 dark:text-stone-400">
                    {product.description || "Unlocking the future of high-frequency digital interactions."}
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-6 mt-12">
                    <BenefitCard 
                      icon={<Download className="text-sky-500" />} 
                      title="Direct Download" 
                      desc="Get instant access to your source files as soon as payment is confirmed." 
                    />
                    <BenefitCard 
                      icon={<ShieldCheck className="text-emerald-500" />} 
                      title="Future Updates" 
                      desc="Access all future versions and improvements of this asset at no extra cost." 
                    />
                  </div>
                </TabsContent>

                <TabsContent value="reviews">
                   <ReviewForm productId={product.id} vendorId={product.vendor_id} />
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Sidebar (Vendor + Security) */}
          <div className="lg:col-span-4 space-y-6">
             <GlassCard className="p-8 rounded-[40px] border border-stone-200 dark:border-white/5 bg-white dark:bg-zinc-950/20 shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                   <Lock className="h-24 w-24" />
                </div>
                
                <h4 className="text-[11px] font-black uppercase tracking-widest text-sky-500 mb-6">Secured by Jimvio</h4>
                
                <div className="space-y-5">
                   <SecurityFeature title="Encrypted Delivery" desc="End-to-end encrypted asset distribution." />
                   <SecurityFeature title="Verified Source" desc="Rigorous quality check on all files." />
                   <SecurityFeature title="Purchase Protection" desc="Funds held until you confirm access." />
                </div>

                <div className="mt-10 pt-8 border-t border-stone-100 dark:border-white/5">
                   <div className="flex items-center gap-4 mb-6">
                      <div className="h-16 w-16 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-zinc-900 overflow-hidden flex items-center justify-center">
                         {vendor?.business_logo ? (
                           <img src={vendor.business_logo} className="w-full h-full object-cover" />
                         ) : (
                           <Globe className="h-6 w-6 text-stone-300" />
                         )}
                      </div>
                      <div>
                         <p className="font-black text-stone-900 dark:text-white">{vendor?.business_name}</p>
                         <p className="text-xs text-stone-400">Official Creator</p>
                      </div>
                   </div>
                   
                   <FollowButton
                      vendorId={vendor?.id ?? ""}
                      initialFollowing={followedVendorIds.includes(String(vendor?.id ?? ""))}
                      className="w-full h-12 rounded-xl border-2 font-bold"
                   />
                </div>
             </GlassCard>

             <div className="rounded-[40px] bg-sky-600 p-8 text-white relative overflow-hidden group">
                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl transition-transform group-hover:scale-150" />
                <Zap className="h-8 w-8 mb-4" />
                <h3 className="text-xl font-bold mb-2">Need a custom plan?</h3>
                <p className="text-white/70 text-sm mb-6">Connect with the creator for enterprise-level licenses and personalized support.</p>
                <Button className="w-full bg-white text-sky-600 hover:bg-stone-50 font-black rounded-xl h-11">Message Creator</Button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BenefitCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="p-6 rounded-3xl bg-stone-50 dark:bg-zinc-900/40 border border-stone-100 dark:border-white/5">
      <div className="h-10 w-10 rounded-xl bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center mb-4">
        {icon}
      </div>
      <h4 className="font-bold text-stone-900 dark:text-white mb-2">{title}</h4>
      <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">{desc}</p>
    </div>
  );
}

function SecurityFeature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="mt-1">
        <div className="h-2 w-2 rounded-full bg-sky-500" />
      </div>
      <div>
        <p className="font-bold text-stone-900 dark:text-white text-sm">{title}</p>
        <p className="text-xs text-stone-400">{desc}</p>
      </div>
    </div>
  );
}
