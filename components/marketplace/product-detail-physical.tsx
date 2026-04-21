"use client";

import React from "react";
import Link from "next/link";
import {
  Star, MapPin, ShieldCheck, Clock, MessageSquare, 
  CheckCircle2, Globe, Share2, Truck, ChevronRight, 
  TrendingUp, RefreshCw, Package, BadgeCheck,
  ShoppingBag, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { 
  ProductPriceDisplay, 
  ProductBuyBoxPrice 
} from "@/components/marketplace/product-price-display";
import { ProductCardClient } from "@/components/marketplace/product-card-client";
import { ProductActionModule } from "@/components/marketplace/product-action-module";
import { FollowButton } from "@/components/marketplace/follow-button";
import { ReviewForm } from "@/components/marketplace/review-form";
import { ImageGallery } from "@/components/marketplace/image-gallery";
import { useCurrency } from "@/context/CurrencyContext";

interface PhysicalProductDetailProps {
  product: any;
  vendor: any;
  relatedProducts: any[];
  cartSet: Set<string>;
  followedVendorIds: string[];
}

export function PhysicalProductDetail({ 
  product, 
  vendor, 
  relatedProducts, 
  cartSet, 
  followedVendorIds 
}: PhysicalProductDetailProps) {
  const { formatMoney } = useCurrency();
  const images: string[] = product.images ?? [];
  
  const savings =
    product.compare_at_price && product.compare_at_price > product.price
      ? Math.round((1 - product.price / product.compare_at_price) * 100)
      : null;

  const vendorProps = vendor ? {
    id: vendor.id,
    business_name: vendor.business_name ?? null,
    business_logo: vendor.business_logo ?? null,
    business_slug: vendor.business_slug ?? null,
  } : null;

  const productProps = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: Number(product.price),
    images: product.images,
    vendor_id: product.vendor_id,
    currency: product.currency,
  };

  return (
    <div className="min-h-screen bg-stone-50/50 dark:bg-[#070707]">
      {/* Breadcrumb Sticky */}
      <div className="bg-white/80 dark:bg-zinc-950/80 border-b border-stone-200 dark:border-white/5 sticky top-[var(--navbar-height,64px)] z-30">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-12">
          <nav className="flex items-center gap-1 text-[10px] font-bold text-stone-400 uppercase tracking-widest min-w-0">
            <Link href="/" className="hover:text-orange-500 transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/marketplace" className="hover:text-orange-500 transition-colors">Shop</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-stone-900 dark:text-white truncate max-w-[200px]">{product.name}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-16">

          {/* LEFT COLUMN: Gallery + Details */}
          <div className="lg:col-span-8 space-y-12">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
               {/* Gallery */}
               <div className="space-y-4">
                  <ImageGallery
                    images={images}
                    productName={product.name}
                    isFeatured={product.is_featured}
                    savings={savings}
                  />
                  
                  {/* trust trust trust */}
                  <div className="grid grid-cols-3 gap-2">
                     <TrustMiniCard icon={<Truck className="h-3 w-3 text-blue-500" />} label="Free Ship" />
                     <TrustMiniCard icon={<RefreshCw className="h-3 w-3 text-purple-500" />} label="14d Returns" />
                     <TrustMiniCard icon={<Shield className="h-3 w-3 text-green-500" />} label="Buy Safe" />
                  </div>
               </div>

               {/* Essential Stats */}
               <div className="flex flex-col gap-6">
                  <div className="space-y-2">
                     <Badge variant="outline" className="rounded-none bg-orange-500/10 text-orange-600 dark:text-orange-500 border-orange-500/20 font-black text-[9px] uppercase tracking-widest px-3">
                        {product.product_type || "Physical Product"}
                     </Badge>
                     <h1 className="text-2xl md:text-3xl font-black text-stone-900 dark:text-white leading-tight">
                        {product.name}
                     </h1>
                  </div>

                  <div className="flex items-center gap-4 py-4 border-y border-stone-200 dark:border-white/5">
                     <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span className="font-black text-sm">4.8</span>
                        <span className="text-stone-400 font-medium text-xs ml-0.5">({product.review_count ?? 0})</span>
                     </div>
                     <div className="w-px h-4 bg-stone-200 dark:bg-stone-800" />
                     <div className="text-xs font-bold text-emerald-600">In Stock & Ready</div>
                  </div>

                  <div className="space-y-3">
                     <ProductPriceDisplay
                        price={Number(product.price)}
                        compareAtPrice={product.compare_at_price}
                        currency={product.currency}
                        savings={savings}
                        className="text-3xl"
                     />
                     <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                        {product.description?.slice(0, 200)}...
                     </p>
                  </div>

                  {/* Vendor Quick Info */}
                  {vendor && (
                     <div className="p-4 rounded-none bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/5 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-none bg-stone-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                           {vendor.business_logo ? (
                              <img src={vendor.business_logo} className="w-full h-full object-cover rounded-none" />
                           ) : (
                              <ShoppingBag className="h-5 w-5 text-stone-300" />
                           )}
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="text-xs font-bold truncate">{vendor.business_name}</p>
                           <p className="text-[10px] text-stone-400 flex items-center gap-1">
                              <BadgeCheck className="h-3 w-3 text-blue-500" /> Verified Supplier
                           </p>
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 rounded-none text-[10px] font-bold uppercase tracking-widest px-3" asChild>
                           <Link href={`/vendors/${vendor.business_slug}`}>Visit â†’</Link>
                        </Button>
                     </div>
                  )}
               </div>
            </div>

            {/* In-depth details */}
            <div className="bg-white dark:bg-zinc-900/50 rounded-none border border-stone-200 dark:border-white/5 overflow-hidden">
               <Tabs defaultValue="details">
                  <TabsList className="w-full h-14 bg-stone-50 dark:bg-zinc-950/50 border-b border-stone-200 dark:border-white/5 rounded-none p-0">
                     <TabsTrigger value="details" className="flex-1 h-full font-bold text-[11px] uppercase tracking-widest data-[state=active]:bg-transparent data-[state=active]:text-orange-500 data-[state=active]:border-b-2 border-orange-500">Details</TabsTrigger>
                     <TabsTrigger value="specs" className="flex-1 h-full font-bold text-[11px] uppercase tracking-widest data-[state=active]:bg-transparent data-[state=active]:text-orange-500 data-[state=active]:border-b-2 border-orange-500">Specs</TabsTrigger>
                     <TabsTrigger value="reviews" className="flex-1 h-full font-bold text-[11px] uppercase tracking-widest data-[state=active]:bg-transparent data-[state=active]:text-orange-500 data-[state=active]:border-b-2 border-orange-500">Reviews</TabsTrigger>
                  </TabsList>
                  
                  <div className="p-8">
                     <TabsContent value="details" className="mt-0">
                        <div className="prose prose-stone dark:prose-invert max-w-none">
                           {product.description}
                        </div>
                     </TabsContent>
                     <TabsContent value="specs" className="mt-0">
                        <div className="grid sm:grid-cols-2 gap-4">
                           <SpecRow label="Material" value="Premium Composite" />
                           <SpecRow label="Weight" value={product.weight ? `${product.weight}kg` : "1.2kg"} />
                           <SpecRow label="Condition" value="Brand New" />
                           <SpecRow label="SKU" value={product.sku || "JMV-PRO-X"} />
                        </div>
                     </TabsContent>
                     <TabsContent value="reviews" className="mt-0">
                        <ReviewForm productId={product.id} vendorId={product.vendor_id} />
                     </TabsContent>
                  </div>
               </Tabs>
            </div>
          </div>

          {/* RIGHT COLUMN: Buy Box */}
          <aside className="lg:col-span-4 flex flex-col gap-6">
             <div className="bg-white dark:bg-zinc-900 rounded-none border-2 border-stone-100 dark:border-white/5 p-8 shadow-none shadow-stone-200/20 dark:shadow-none sticky top-[calc(var(--navbar-height,64px)+80px)]">
                <div className="flex justify-between items-start mb-8">
                   <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-1">Buy Now</p>
                      <ProductBuyBoxPrice
                        price={Number(product.price)}
                        compareAtPrice={product.compare_at_price}
                        currency={product.currency}
                        savings={savings}
                        className="text-3xl"
                      />
                   </div>
                   <div className="h-12 w-12 rounded-none bg-emerald-500/10 flex items-center justify-center">
                      <ShoppingBag className="h-6 w-6 text-emerald-500" />
                   </div>
                </div>

                <ProductActionModule product={productProps} vendor={vendorProps} currentPath={`/marketplace/${product.slug}`} className="h-14 rounded-none text-lg font-black" />

                <div className="mt-8 pt-8 border-t border-stone-100 dark:border-white/5 space-y-4">
                   <FeatureRow icon={<Truck className="h-4 w-4" />} text="Free shipping on first order" />
                   <FeatureRow icon={<ShieldCheck className="h-4 w-4" />} text="7-day money back guarantee" />
                   <FeatureRow icon={<Clock className="h-4 w-4" />} text="Priority global logistics" />
                </div>
             </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function TrustMiniCard({ icon, label }: { icon: React.ReactNode; label: string }) {
   return (
      <div className="flex flex-col items-center gap-1 p-2 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/10 rounded-none">
         {icon}
         <span className="text-[8px] font-black uppercase tracking-widest text-stone-400">{label}</span>
      </div>
   );
}

function SpecRow({ label, value }: { label: string; value: string }) {
   return (
      <div className="flex justify-between items-center py-3 border-b border-stone-100 dark:border-white/5">
         <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{label}</span>
         <span className="text-sm font-bold text-stone-900 dark:text-white">{value}</span>
      </div>
   );
}

function FeatureRow({ icon, text }: { icon: React.ReactNode; text: string }) {
   return (
      <div className="flex items-center gap-3 text-xs font-medium text-stone-500 dark:text-stone-400">
         <div className="text-orange-500">{icon}</div>
         <span>{text}</span>
      </div>
   );
}

