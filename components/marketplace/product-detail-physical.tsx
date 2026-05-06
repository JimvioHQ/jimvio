// "use client";

// import React from "react";
// import Link from "next/link";
// import {
//   Star, MapPin, ShieldCheck, Clock, MessageSquare, 
//   CheckCircle2, Globe, Share2, Truck, ChevronRight, 
//   TrendingUp, Loader2, Package, BadgeCheck,
//   ShoppingBag, Shield
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { cn } from "@/lib/utils";
// import { 
//   ProductPriceDisplay, 
//   ProductBuyBoxPrice 
// } from "@/components/marketplace/product-price-display";
// import { ProductCardClient } from "@/components/marketplace/product-card-client";
// import { ProductActionModule } from "@/components/marketplace/product-action-module";
// import { FollowButton } from "@/components/marketplace/follow-button";
// import { ReviewForm } from "@/components/marketplace/review-form";
// import { ImageGallery } from "@/components/marketplace/image-gallery";
// import { useCurrency } from "@/context/CurrencyContext";

// interface PhysicalProductDetailProps {
//   product: any;
//   vendor: any;
//   relatedProducts: any[];
//   cartSet: Set<string>;
//   followedVendorIds: string[];
// }

// export function PhysicalProductDetail({ 
//   product, 
//   vendor, 
//   relatedProducts, 
//   cartSet, 
//   followedVendorIds 
// }: PhysicalProductDetailProps) {
//   const { formatMoney } = useCurrency();
//   const images: string[] = product.images ?? [];

//   const savings =
//     product.compare_at_price && product.compare_at_price > product.price
//       ? Math.round((1 - product.price / product.compare_at_price) * 100)
//       : null;

//   const vendorProps = vendor ? {
//     id: vendor.id,
//     business_name: vendor.business_name ?? null,
//     business_logo: vendor.business_logo ?? null,
//     business_slug: vendor.business_slug ?? null,
//   } : null;

//   const productProps = {
//     id: product.id,
//     name: product.name,
//     slug: product.slug,
//     price: Number(product.price),
//     images: product.images,
//     vendor_id: product.vendor_id,
//     currency: product.currency,
//   };

//   return (
//     <div className="min-h-screen bg-[var(--color-bg)]">
//       {/* Breadcrumb Sticky */}
//       <div className="bg-white/80 dark:bg-zinc-950/80 border-b border-stone-200 dark:border-white/5 sticky top-[var(--navbar-height,64px)] z-30">
//         <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-12">
//           <nav className="flex items-center gap-1 text-[10px] font-bold text-stone-400 uppercase tracking-widest min-w-0">
//             <Link href="/" className="hover:text-orange-500 transition-colors">Home</Link>
//             <ChevronRight className="h-3 w-3" />
//             <Link href="/marketplace" className="hover:text-orange-500 transition-colors">Shop</Link>
//             <ChevronRight className="h-3 w-3" />
//             <span className="text-stone-900 dark:text-white truncate max-w-[200px]">{product.name}</span>
//           </nav>
//         </div>
//       </div>

//       <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
//         <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-16">

//           {/* LEFT COLUMN: Gallery + Details */}
//           <div className="lg:col-span-8 space-y-12">

//             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
//                {/* Gallery */}
//                <div className="space-y-4">
//                   <ImageGallery
//                     images={images}
//                     productName={product.name}
//                     isFeatured={product.is_featured}
//                     savings={savings}
//                   />

//                   {/* trust trust trust */}
//                   <div className="grid grid-cols-3 gap-2">
//                      <TrustMiniCard icon={<Truck className="h-3 w-3 text-blue-500" />} label="Free Ship" />
//                      <TrustMiniCard icon={<Loader2 className="h-3 w-3 text-purple-500" />} label="14d Returns" />
//                      <TrustMiniCard icon={<Shield className="h-3 w-3 text-green-500" />} label="Buy Safe" />
//                   </div>
//                </div>

//                {/* Essential Stats */}
//                <div className="flex flex-col gap-6">
//                   <div className="space-y-2">
//                      <Badge variant="outline" className="rounded-sm bg-orange-500/10 text-orange-600 dark:text-orange-500 border-orange-500/20 font-black text-[9px] uppercase tracking-widest px-3">
//                         {product.product_type || "Physical Product"}
//                      </Badge>
//                      <h1 className="text-2xl md:text-3xl font-black text-stone-900 dark:text-white leading-tight">
//                         {product.name}
//                      </h1>
//                   </div>

//                   <div className="flex items-center gap-4 py-4 border-y border-stone-200 dark:border-white/5">
//                      <div className="flex items-center gap-1">
//                         <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
//                         <span className="font-black text-sm">4.8</span>
//                         <span className="text-stone-400 font-medium text-xs ml-0.5">({product.review_count ?? 0})</span>
//                      </div>
//                      <div className="w-px h-4 bg-stone-200 dark:bg-stone-800" />
//                      <div className="text-xs font-bold text-emerald-600">In Stock & Ready</div>
//                   </div>

//                   <div className="space-y-3">
//                      <ProductPriceDisplay
//                         price={Number(product.price)}
//                         compareAtPrice={product.compare_at_price}
//                         currency={product.currency}
//                         savings={savings}
//                         className="text-3xl"
//                      />
//                      <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
//                         {product.description?.slice(0, 200)}...
//                      </p>
//                   </div>

//                   {/* Vendor Quick Info */}
//                   {vendor && (
//                       <div className="p-4 rounded-sm bg-[var(--color-surface)] dark:bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center gap-4">
//                         <div className="h-10 w-10 rounded-sm bg-stone-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
//                            {vendor.business_logo ? (
//                               <img src={vendor.business_logo} className="w-full h-full object-cover rounded-sm" />
//                            ) : (
//                               <ShoppingBag className="h-5 w-5 text-stone-300" />
//                            )}
//                         </div>
//                         <div className="flex-1 min-w-0">
//                            <p className="text-xs font-bold truncate">{vendor.business_name}</p>
//                            <p className="text-[10px] text-stone-400 flex items-center gap-1">
//                               <BadgeCheck className="h-3 w-3 text-blue-500" /> Verified Supplier
//                            </p>
//                         </div>
//                         <Button variant="ghost" size="sm" className="h-8 rounded-sm text-[10px] font-bold uppercase tracking-widest px-3" asChild>
//                            <Link href={`/vendors/${vendor.business_slug}`}>Visit →</Link>
//                         </Button>
//                      </div>
//                   )}
//                </div>
//             </div>

//             {/* In-depth details */}
//             <div className="bg-[var(--color-surface)] dark:bg-[var(--color-surface)] rounded-sm border border-[var(--color-border)] overflow-hidden">
//                <Tabs defaultValue="details">
//                   <TabsList className="w-full h-14 bg-stone-50 dark:bg-zinc-950/50 border-b border-stone-200 dark:border-white/5 rounded-sm p-0">
//                      <TabsTrigger value="details" className="flex-1 h-full font-bold text-[11px] uppercase tracking-widest data-[state=active]:bg-transparent data-[state=active]:text-orange-500 data-[state=active]:border-b-2 border-orange-500">Details</TabsTrigger>
//                      <TabsTrigger value="specs" className="flex-1 h-full font-bold text-[11px] uppercase tracking-widest data-[state=active]:bg-transparent data-[state=active]:text-orange-500 data-[state=active]:border-b-2 border-orange-500">Specs</TabsTrigger>
//                      <TabsTrigger value="reviews" className="flex-1 h-full font-bold text-[11px] uppercase tracking-widest data-[state=active]:bg-transparent data-[state=active]:text-orange-500 data-[state=active]:border-b-2 border-orange-500">Reviews</TabsTrigger>
//                   </TabsList>

//                   <div className="p-8">
//                      <TabsContent value="details" className="mt-0">
//                         <div className="prose prose-stone dark:prose-invert max-w-none">
//                            {product.description}
//                         </div>
//                      </TabsContent>
//                      <TabsContent value="specs" className="mt-0">
//                         <div className="grid sm:grid-cols-2 gap-4">
//                            <SpecRow label="Material" value="Premium Composite" />
//                            <SpecRow label="Weight" value={product.weight ? `${product.weight}kg` : "1.2kg"} />
//                            <SpecRow label="Condition" value="Brand New" />
//                            <SpecRow label="SKU" value={product.sku || "JMV-PRO-X"} />
//                         </div>
//                      </TabsContent>
//                      <TabsContent value="reviews" className="mt-0">
//                         <ReviewForm productId={product.id} vendorId={product.vendor_id} />
//                      </TabsContent>
//                   </div>
//                </Tabs>
//             </div>
//           </div>

//           {/* RIGHT COLUMN: Buy Box */}
//           <aside className="lg:col-span-4 flex flex-col gap-6">
//              <div className="bg-[var(--color-surface)] dark:bg-[var(--color-surface)] rounded-sm border border-[var(--color-border)] p-8 shadow-none sticky top-[calc(var(--navbar-height,64px)+80px)]">
//                 <div className="flex justify-between items-start mb-8">
//                    <div>
//                       <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-1">Buy Now</p>
//                       <ProductBuyBoxPrice
//                         price={Number(product.price)}
//                         compareAtPrice={product.compare_at_price}
//                         currency={product.currency}
//                         savings={savings}
//                         className="text-3xl"
//                       />
//                    </div>
//                    <div className="h-12 w-12 rounded-sm bg-emerald-500/10 flex items-center justify-center">
//                       <ShoppingBag className="h-6 w-6 text-emerald-500" />
//                    </div>
//                 </div>

//                 <ProductActionModule product={productProps} vendor={vendorProps} currentPath={`/marketplace/${product.slug}`} className="h-14 rounded-sm text-lg font-black" />

//                 <div className="mt-8 pt-8 border-t border-stone-100 dark:border-white/5 space-y-4">
//                    <FeatureRow icon={<Truck className="h-4 w-4" />} text="Free shipping on first order" />
//                    <FeatureRow icon={<ShieldCheck className="h-4 w-4" />} text="7-day money back guarantee" />
//                    <FeatureRow icon={<Clock className="h-4 w-4" />} text="Priority global logistics" />
//                 </div>
//              </div>
//           </aside>
//         </div>
//       </div>
//     </div>
//   );
// }

// function TrustMiniCard({ icon, label }: { icon: React.ReactNode; label: string }) {
//    return (
//       <div className="flex flex-col items-center gap-1 p-2 bg-[var(--color-surface)] dark:bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm">
//          {icon}
//          <span className="text-[8px] font-black uppercase tracking-widest text-stone-400">{label}</span>
//       </div>
//    );
// }

// function SpecRow({ label, value }: { label: string; value: string }) {
//    return (
//       <div className="flex justify-between items-center py-3 border-b border-stone-100 dark:border-white/5">
//          <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{label}</span>
//          <span className="text-sm font-bold text-stone-900 dark:text-white">{value}</span>
//       </div>
//    );
// }

// function FeatureRow({ icon, text }: { icon: React.ReactNode; text: string }) {
//    return (
//       <div className="flex items-center gap-3 text-xs font-medium text-stone-500 dark:text-stone-400">
//          <div className="text-orange-500">{icon}</div>
//          <span>{text}</span>
//       </div>
//    );
// }

// "use client";

// import React, { useState } from "react";
// import Link from "next/link";
// import {
//    Star, ShieldCheck, Clock, CheckCircle2,
//    ChevronRight, Loader2, Package, BadgeCheck,
//    ShoppingBag, Shield, Truck, Share2, Heart,
//    MapPin, ArrowRight, Minus, Plus, Info,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { cn } from "@/lib/utils";
// import {
//    ProductPriceDisplay,
//    ProductBuyBoxPrice,
// } from "@/components/marketplace/product-price-display";
// import { ProductActionModule } from "@/components/marketplace/product-action-module";
// import { ReviewForm } from "@/components/marketplace/review-form";
// import { ImageGallery } from "@/components/marketplace/image-gallery";
// import { useCurrency } from "@/context/CurrencyContext";

// interface PhysicalProductDetailProps {
//    product: any;
//    vendor: any;
//    relatedProducts: any[];
//    cartSet: Set<string>;
//    followedVendorIds: string[];
// }

// export function PhysicalProductDetail({
//    product,
//    vendor,
//    relatedProducts,
//    cartSet,
//    followedVendorIds,
// }: PhysicalProductDetailProps) {
//    const { formatMoney } = useCurrency();
//    const [saved, setSaved] = useState(false);
//    const images: string[] = product.images ?? [];

//    const savings =
//       product.compare_at_price && product.compare_at_price > product.price
//          ? Math.round((1 - product.price / product.compare_at_price) * 100)
//          : null;

//    const vendorProps = vendor
//       ? {
//          id: vendor.id,
//          business_name: vendor.business_name ?? null,
//          business_logo: vendor.business_logo ?? null,
//          business_slug: vendor.business_slug ?? null,
//       }
//       : null;

//    const productProps = {
//       id: product.id,
//       name: product.name,
//       slug: product.slug,
//       price: Number(product.price),
//       images: product.images,
//       vendor_id: product.vendor_id,
//       currency: product.currency,
//    };

//    const reviewCount = product.review_count ?? 0;

//    return (
//       <div className="min-h-screen bg-[var(--color-bg)]">

//          {/* ── Breadcrumb ── */}
//          <div className="sticky top-[var(--navbar-height,64px)] z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-sm">
//             <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-11 flex items-center justify-between">
//                <nav className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--color-text-muted)] min-w-0">
//                   <Link href="/" className="hover:text-orange-500 transition-colors">Home</Link>
//                   <ChevronRight className="h-3 w-3 opacity-40 shrink-0" />
//                   <Link href="/marketplace" className="hover:text-orange-500 transition-colors">Shop</Link>
//                   <ChevronRight className="h-3 w-3 opacity-40 shrink-0" />
//                   <span className="text-[var(--color-text-primary)] font-semibold truncate max-w-[180px] sm:max-w-xs">
//                      {product.name}
//                   </span>
//                </nav>

//                {/* Share / Save */}
//                <div className="flex items-center gap-2">
//                   <button
//                      onClick={() => setSaved(v => !v)}
//                      className={cn(
//                         "h-8 w-8 rounded-lg border flex items-center justify-center transition-all",
//                         saved
//                            ? "border-rose-300 bg-rose-50 text-rose-500 dark:border-rose-500/30 dark:bg-rose-500/10"
//                            : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]"
//                      )}
//                   >
//                      <Heart className={cn("h-3.5 w-3.5 transition-all", saved && "fill-rose-500")} />
//                   </button>
//                   <button className="h-8 w-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] flex items-center justify-center transition-all">
//                      <Share2 className="h-3.5 w-3.5" />
//                   </button>
//                </div>
//             </div>
//          </div>

//          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
//             <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-16">

//                {/* ── LEFT: Gallery + Details ── */}
//                <div className="lg:col-span-8 space-y-10">

//                   {/* Top section: gallery + essentials */}
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

//                      {/* Gallery */}
//                      <div className="space-y-3">
//                         <ImageGallery
//                            images={images}
//                            productName={product.name}
//                            isFeatured={product.is_featured}
//                            savings={savings}
//                         />

//                         {/* Trust trio */}
//                         <div className="grid grid-cols-3 gap-2 pt-1">
//                            <TrustPill
//                               icon={<Truck className="h-3.5 w-3.5" />}
//                               label="Free Shipping"
//                               color="blue"
//                            />
//                            <TrustPill
//                               icon={<Loader2 className="h-3.5 w-3.5" />}
//                               label="14-day Returns"
//                               color="violet"
//                            />
//                            <TrustPill
//                               icon={<Shield className="h-3.5 w-3.5" />}
//                               label="Buyer Protection"
//                               color="emerald"
//                            />
//                         </div>
//                      </div>

//                      {/* Essential info */}
//                      <div className="flex flex-col gap-5">

//                         {/* Category + title */}
//                         <div className="space-y-2.5">
//                            <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider text-orange-500 bg-orange-500/10 px-2.5 py-1 rounded-md">
//                               {product.product_type || "Physical Product"}
//                            </span>
//                            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] leading-tight tracking-tight">
//                               {product.name}
//                            </h1>
//                         </div>

//                         {/* Rating + stock */}
//                         <div className="flex items-center gap-3">
//                            <div className="flex items-center gap-1.5">
//                               {[1, 2, 3, 4, 5].map(i => (
//                                  <Star
//                                     key={i}
//                                     className={cn(
//                                        "h-3.5 w-3.5",
//                                        i <= 4 ? "fill-amber-400 text-amber-400" : "fill-amber-200 text-amber-200"
//                                     )}
//                                  />
//                               ))}
//                               <span className="text-sm font-bold text-[var(--color-text-primary)] ml-0.5">4.8</span>
//                            </div>
//                            <span className="text-xs text-[var(--color-text-muted)]">
//                               {reviewCount > 0 ? `${reviewCount} reviews` : "No reviews yet"}
//                            </span>
//                            <span className="h-3 w-px bg-[var(--color-border)]" />
//                            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
//                               <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
//                               In stock
//                            </span>
//                         </div>

//                         {/* Price */}
//                         <div className="py-4 border-y border-[var(--color-border)]">
//                            <ProductPriceDisplay
//                               price={Number(product.price)}
//                               compareAtPrice={product.compare_at_price}
//                               currency={product.currency}
//                               savings={savings}
//                               className="text-3xl"
//                            />
//                            {savings && (
//                               <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1.5">
//                                  You save {savings}% on this item
//                               </p>
//                            )}
//                         </div>

//                         {/* Description excerpt */}
//                         <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
//                            {product.description?.slice(0, 220)}
//                            {product.description?.length > 220 && (
//                               <span className="text-orange-500 font-medium ml-1 cursor-pointer hover:underline">
//                                  read more
//                               </span>
//                            )}
//                         </p>

//                         {/* Vendor card */}
//                         {vendor && (
//                            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex items-center gap-4">
//                               <div className="h-10 w-10 rounded-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-center shrink-0 overflow-hidden">
//                                  {vendor.business_logo ? (
//                                     <img src={vendor.business_logo} className="w-full h-full object-cover" alt={vendor.business_name} />
//                                  ) : (
//                                     <ShoppingBag className="h-4 w-4 text-[var(--color-text-muted)]" />
//                                  )}
//                               </div>
//                               <div className="flex-1 min-w-0">
//                                  <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate leading-none">
//                                     {vendor.business_name}
//                                  </p>
//                                  <p className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1 mt-1">
//                                     <BadgeCheck className="h-3 w-3 text-blue-500 shrink-0" />
//                                     Verified Supplier
//                                  </p>
//                               </div>
//                               <Link
//                                  href={`/vendors/${vendor.business_slug}`}
//                                  className="flex items-center gap-1 text-xs font-semibold text-[var(--color-text-muted)] hover:text-orange-500 transition-colors shrink-0"
//                               >
//                                  Visit <ArrowRight className="h-3 w-3" />
//                               </Link>
//                            </div>
//                         )}
//                      </div>
//                   </div>

//                   {/* ── Tabs: Details / Specs / Reviews ── */}
//                   <div
//                      className="rounded-xl overflow-hidden"
//                      style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}
//                   >
//                      <Tabs defaultValue="details">
//                         {/* ── Tab bar ── */}
//                         <TabsList
//                            className="w-full rounded-none p-0 gap-0"
//                            style={{
//                               height: "auto",
//                               background: "var(--color-surface-secondary)",
//                               borderBottom: "1px solid var(--color-border)",
//                            }}
//                         >
//                            {[
//                               { id: "details", label: "Details", badge: null },
//                               { id: "specs", label: "Specs", badge: null },
//                               { id: "reviews", label: "Reviews", badge: reviewCount > 0 ? reviewCount : null },
//                            ].map(({ id, label, badge }) => (
//                               <TabsTrigger
//                                  key={id}
//                                  value={id}
//                                  className={cn(
//                                     "relative flex-1 h-11 rounded-none gap-2",
//                                     "text-xs font-semibold uppercase tracking-wider shadow-none",
//                                     "border-b-2 border-transparent",
//                                     "text-[var(--color-text-muted)] transition-all duration-150",
//                                     "data-[state=active]:bg-transparent",
//                                     "data-[state=active]:text-[var(--color-text-primary)]",
//                                     "data-[state=active]:border-orange-500",
//                                     "data-[state=active]:shadow-none",
//                                     "hover:text-[var(--color-text-primary)]"
//                                  )}
//                               >
//                                  {label}
//                                  {badge !== null && (
//                                     <span
//                                        className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-[9px] font-bold"
//                                        style={{
//                                           background: "var(--color-accent-light)",
//                                           color: "var(--color-accent)",
//                                           border: "1px solid var(--color-accent-subtle)",
//                                        }}
//                                     >
//                                        {badge}
//                                     </span>
//                                  )}
//                               </TabsTrigger>
//                            ))}
//                         </TabsList>

//                         {/* ── Tab content ── */}
//                         <div className="p-5 sm:p-7">

//                            {/* Details */}
//                            <TabsContent value="details" className="mt-0">
//                               <div className="prose prose-sm prose-stone dark:prose-invert max-w-none text-sm leading-relaxed"
//                                  style={{ color: "var(--color-text-muted)" }}
//                               >
//                                  {product.description}
//                               </div>
//                            </TabsContent>

//                            {/* Specs */}
//                            <TabsContent value="specs" className="mt-0">
//                               <div
//                                  className="rounded-xl overflow-hidden"
//                                  style={{ border: "1px solid var(--color-border)" }}
//                               >
//                                  {[
//                                     { label: "Material", value: "Premium Composite" },
//                                     { label: "Weight", value: product.weight ? `${product.weight} kg` : "1.2 kg" },
//                                     { label: "Condition", value: "Brand New" },
//                                     { label: "SKU", value: product.sku || "JMV-PRO-X" },
//                                     { label: "Shipping", value: "Worldwide · Free on first order" },
//                                  ].map(({ label, value }, i, arr) => (
//                                     <div
//                                        key={label}
//                                        className="flex items-center justify-between px-4 py-3.5"
//                                        style={{
//                                           borderBottom: i < arr.length - 1 ? "1px solid var(--color-border)" : "none",
//                                           background: i % 2 === 0 ? "var(--color-surface)" : "var(--color-surface-secondary)",
//                                        }}
//                                     >
//                                        <span
//                                           className="text-[10px] font-semibold uppercase tracking-wider"
//                                           style={{ color: "var(--color-text-muted)" }}
//                                        >
//                                           {label}
//                                        </span>
//                                        <span
//                                           className="text-sm font-medium text-right max-w-[60%]"
//                                           style={{ color: "var(--color-text-primary)" }}
//                                        >
//                                           {value}
//                                        </span>
//                                     </div>
//                                  ))}
//                               </div>
//                            </TabsContent>

//                            {/* Reviews */}
//                            <TabsContent value="reviews" className="mt-0 space-y-6">

//                               {/* Rating summary */}
//                               {reviewCount > 0 && (
//                                  <div
//                                     className="flex items-center gap-6 p-5 rounded-xl"
//                                     style={{
//                                        background: "var(--color-surface-secondary)",
//                                        border: "1px solid var(--color-border)",
//                                     }}
//                                  >
//                                     {/* Score */}
//                                     <div className="text-center shrink-0">
//                                        <p
//                                           className="text-5xl font-bold tabular-nums leading-none"
//                                           style={{ color: "var(--color-text-primary)" }}
//                                        >
//                                           4.8
//                                        </p>
//                                        <div className="flex gap-0.5 mt-2 justify-center">
//                                           {[1, 2, 3, 4, 5].map(i => (
//                                              <Star
//                                                 key={i}
//                                                 className={cn(
//                                                    "h-3.5 w-3.5",
//                                                    i <= 4 ? "fill-amber-400 text-amber-400" : "fill-amber-200 text-amber-200"
//                                                 )}
//                                              />
//                                           ))}
//                                        </div>
//                                        <p className="text-[10px] mt-1.5" style={{ color: "var(--color-text-muted)" }}>
//                                           {reviewCount} review{reviewCount !== 1 ? "s" : ""}
//                                        </p>
//                                     </div>

//                                     {/* Divider */}
//                                     <div className="h-16 w-px" style={{ background: "var(--color-border)" }} />

//                                     {/* Bars */}
//                                     <div className="flex-1 space-y-2">
//                                        {[
//                                           { star: 5, pct: 72 },
//                                           { star: 4, pct: 18 },
//                                           { star: 3, pct: 6 },
//                                           { star: 2, pct: 2 },
//                                           { star: 1, pct: 2 },
//                                        ].map(({ star, pct }) => (
//                                           <div key={star} className="flex items-center gap-2.5">
//                                              <span
//                                                 className="text-[10px] font-semibold tabular-nums w-2 text-right shrink-0"
//                                                 style={{ color: "var(--color-text-muted)" }}
//                                              >
//                                                 {star}
//                                              </span>
//                                              <div
//                                                 className="flex-1 h-1.5 rounded-full overflow-hidden"
//                                                 style={{ background: "var(--color-border)" }}
//                                              >
//                                                 <div
//                                                    className="h-full rounded-full transition-all duration-700"
//                                                    style={{
//                                                       width: `${pct}%`,
//                                                       background: pct >= 50
//                                                          ? "#f59e0b"        /* amber-400 — majority */
//                                                          : pct >= 15
//                                                             ? "#fbbf24"        /* amber-300 */
//                                                             : "var(--color-border-strong)",
//                                                    }}
//                                                 />
//                                              </div>
//                                              <span
//                                                 className="text-[10px] tabular-nums w-6 text-right shrink-0"
//                                                 style={{ color: "var(--color-text-muted)" }}
//                                              >
//                                                 {pct}%
//                                              </span>
//                                           </div>
//                                        ))}
//                                     </div>
//                                  </div>
//                               )}

//                               <ReviewForm productId={product.id} vendorId={product.vendor_id} />
//                            </TabsContent>
//                         </div>
//                      </Tabs>
//                   </div>

//                   {/* Related products */}
//                   {relatedProducts.length > 0 && (
//                      <div className="space-y-4">
//                         <div className="flex items-center justify-between">
//                            <h2 className="text-base font-bold text-[var(--color-text-primary)] tracking-tight">
//                               You might also like
//                            </h2>
//                            <Link
//                               href="/marketplace"
//                               className="text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors flex items-center gap-1"
//                            >
//                               View all <ArrowRight className="h-3 w-3" />
//                            </Link>
//                         </div>
//                         <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
//                            {relatedProducts.slice(0, 3).map((rp) => (
//                               <Link
//                                  key={rp.id}
//                                  href={`/marketplace/${rp.slug}`}
//                                  className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden hover:border-[var(--color-border-strong)] hover:shadow-sm transition-all"
//                               >
//                                  <div className="aspect-square bg-[var(--color-surface-secondary)] overflow-hidden">
//                                     {rp.images?.[0] ? (
//                                        <img
//                                           src={rp.images[0]}
//                                           alt={rp.name}
//                                           className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
//                                        />
//                                     ) : (
//                                        <div className="w-full h-full flex items-center justify-center">
//                                           <Package className="h-8 w-8 text-[var(--color-border)]" />
//                                        </div>
//                                     )}
//                                  </div>
//                                  <div className="p-3">
//                                     <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate leading-snug">
//                                        {rp.name}
//                                     </p>
//                                     <p className="text-xs font-bold text-orange-500 mt-1">
//                                        {formatMoney(Number(rp.price), rp.currency)}
//                                     </p>
//                                  </div>
//                               </Link>
//                            ))}
//                         </div>
//                      </div>
//                   )}
//                </div>

//                {/* ── RIGHT: Buy Box ── */}
//                <aside className="lg:col-span-4">
//                   <div
//                      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden sticky top-[calc(var(--navbar-height,64px)+56px)]"
//                   >
//                      {/* Price header */}
//                      <div className="px-6 pt-6 pb-5 border-b border-[var(--color-border)]">
//                         <div className="flex items-start justify-between gap-4">
//                            <div>
//                               <ProductBuyBoxPrice
//                                  price={Number(product.price)}
//                                  compareAtPrice={product.compare_at_price}
//                                  currency={product.currency}
//                                  savings={savings}
//                                  className="text-3xl"
//                               />
//                               {savings && (
//                                  <span className="inline-flex items-center text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md mt-2">
//                                     Save {savings}%
//                                  </span>
//                               )}
//                            </div>
//                            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
//                               <ShoppingBag className="h-5 w-5 text-emerald-500" />
//                            </div>
//                         </div>
//                      </div>

//                      {/* CTA */}
//                      <div className="p-6 space-y-3">
//                         <ProductActionModule
//                            product={productProps}
//                            vendor={vendorProps}
//                            currentPath={`/marketplace/${product.slug}`}
//                            className="h-12 rounded-xl text-sm font-bold"
//                         />

//                         {/* Stock urgency */}
//                         <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
//                            <Info className="h-3.5 w-3.5 shrink-0 text-amber-500" />
//                            <span>Only a few left — order soon</span>
//                         </div>
//                      </div>

//                      {/* Guarantees */}
//                      <div className="px-6 pb-6 space-y-3">
//                         <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
//                            What's included
//                         </p>
//                         <div className="space-y-2.5">
//                            {[
//                               { icon: Truck, text: "Free shipping on first order", sub: "Delivered in 5–10 days" },
//                               { icon: ShieldCheck, text: "7-day money-back guarantee", sub: "No questions asked" },
//                               { icon: Clock, text: "Priority global logistics", sub: "Tracked & insured" },
//                            ].map(({ icon: Icon, text, sub }) => (
//                               <div key={text} className="flex items-start gap-3">
//                                  <div className="h-7 w-7 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0 mt-0.5">
//                                     <Icon className="h-3.5 w-3.5 text-orange-500" />
//                                  </div>
//                                  <div>
//                                     <p className="text-xs font-semibold text-[var(--color-text-primary)] leading-none">{text}</p>
//                                     <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{sub}</p>
//                                  </div>
//                               </div>
//                            ))}
//                         </div>
//                      </div>

//                      {/* Vendor mini-footer */}
//                      {vendor && (
//                         <div className="px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)] flex items-center gap-3">
//                            <div className="h-8 w-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden flex items-center justify-center shrink-0">
//                               {vendor.business_logo ? (
//                                  <img src={vendor.business_logo} className="w-full h-full object-cover" alt="" />
//                               ) : (
//                                  <ShoppingBag className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
//                               )}
//                            </div>
//                            <div className="flex-1 min-w-0">
//                               <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate leading-none">
//                                  {vendor.business_name}
//                               </p>
//                               <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1">
//                                  <BadgeCheck className="h-3 w-3 text-blue-500 shrink-0" />
//                                  Verified Supplier
//                               </p>
//                            </div>
//                            <Link
//                               href={`/vendors/${vendor.business_slug}`}
//                               className="text-[10px] font-semibold text-orange-500 hover:text-orange-600 transition-colors flex items-center gap-0.5 shrink-0"
//                            >
//                               Store <ArrowRight className="h-3 w-3" />
//                            </Link>
//                         </div>
//                      )}
//                   </div>
//                </aside>

//             </div>
//          </div>
//       </div>
//    );
// }

// /* ── Sub-components ─────────────────────────────────────────────────────────── */

// function TrustPill({
//    icon, label, color,
// }: {
//    icon: React.ReactNode;
//    label: string;
//    color: "blue" | "violet" | "emerald";
// }) {
//    const colors = {
//       blue: "text-blue-500   bg-blue-500/8",
//       violet: "text-violet-500 bg-violet-500/8",
//       emerald: "text-emerald-500 bg-emerald-500/8",
//    };
//    return (
//       <div className={cn(
//          "flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[var(--color-border)]",
//          "bg-[var(--color-surface)]"
//       )}>
//          <span className={cn("shrink-0", colors[color])}>{icon}</span>
//          <span className="text-[9px] font-semibold text-[var(--color-text-muted)] leading-tight">{label}</span>
//       </div>
//    );
// }

"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
   Star, ShieldCheck, Clock, CheckCircle2,
   ChevronRight, Loader2, Package, BadgeCheck,
   ShoppingBag, Shield, Truck, Info, ArrowRight,
   Download,
   MessageSquare,
   Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
   ProductPriceDisplay,
   ProductBuyBoxPrice,
} from "@/components/marketplace/product-price-display";
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
   BenefitCard,
} from "@/components/marketplace/product-detail-shared";

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
   followedVendorIds,
}: PhysicalProductDetailProps) {
   const { formatMoney } = useCurrency();

   const images: string[] = product.images ?? [];
   const reviewCount = product.review_count ?? 0;
   const saleCount = product.sale_count ?? 120;
   const savings =
      product.compare_at_price && product.compare_at_price > product.price
         ? Math.round((1 - product.price / product.compare_at_price) * 100)
         : null;

   const vendorProps = vendor
      ? {
         id: vendor.id,
         business_name: vendor.business_name ?? null,
         business_logo: vendor.business_logo ?? null,
         business_slug: vendor.business_slug ?? null,
      }
      : null;

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
      <div className="min-h-screen bg-[var(--color-bg)]">

         {/* ── Breadcrumb + share ── */}
         <div className="sticky top-[var(--navbar-height,64px)] z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-sm">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-11 flex items-center justify-between">
               <ProductBreadcrumb productName={product.name} />
               <SaveShareBar />
            </div>
         </div>

         <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">

            {/* ── Page header (mirrors digital) ── */}
            <div className="mb-6">
               <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                     <Truck className="h-3 w-3" />
                     Physical product
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

               <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] leading-tight tracking-tight mb-3">
                  {product.name}
               </h1>

               <div className="flex flex-wrap items-center gap-4 text-[13px] text-[var(--color-text-muted)] mb-4">
                  <div className="flex items-center gap-1.5">
                     {[1, 2, 3, 4, 5].map(i => (
                        <Star key={i} className={cn("h-3.5 w-3.5", i <= 4 ? "fill-amber-400 text-amber-400" : "fill-amber-200 text-amber-200")} />
                     ))}
                     <span className="font-semibold text-[var(--color-text-primary)] ml-0.5">4.8</span>
                     <span>({reviewCount} reviews)</span>
                  </div>
                  <span className="select-none text-[var(--color-border-strong)]">·</span>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                     <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                     In stock
                  </span>
                  <span className="select-none text-[var(--color-border-strong)]">·</span>
                  <span>{saleCount.toLocaleString()}+ sold</span>
               </div>

               <SocialProofBar saleCount={saleCount} reviewCount={reviewCount} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-16">

               {/* ── LEFT ── */}
               <div className="lg:col-span-8 space-y-10">

                  {/* Gallery + essentials */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

                     {/* Gallery */}
                     <div className="space-y-3">
                        <ImageGallery
                           images={images}
                           productName={product.name}
                           isFeatured={product.is_featured}
                           savings={savings}
                        />
                        <div className="grid grid-cols-3 gap-2 pt-1">
                           <TrustPill icon={<Truck className="h-3.5 w-3.5" />} label="Free Shipping" color="blue" />
                           <TrustPill icon={<Loader2 className="h-3.5 w-3.5" />} label="14-day Returns" color="violet" />
                           <TrustPill icon={<Shield className="h-3.5 w-3.5" />} label="Buyer Protection" color="emerald" />
                        </div>
                     </div>

                     {/* Essential info */}
                     <div className="flex flex-col gap-5">
                        <div className="space-y-2.5">
                           <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider text-orange-500 bg-orange-500/10 px-2.5 py-1 rounded-md">
                              {product.product_type || "Physical Product"}
                           </span>
                        </div>

                        {/* Price */}
                        <div className="py-4 border-y border-[var(--color-border)]">
                           <ProductPriceDisplay
                              price={Number(product.price)}
                              compareAtPrice={product.compare_at_price}
                              currency={product.currency}
                              savings={savings}
                              className="text-3xl"
                           />
                           {savings && (
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1.5">
                                 You save {savings}% on this item
                              </p>
                           )}
                        </div>

                        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                           {product.description?.slice(0, 220)}
                           {product.description?.length > 220 && (
                              <span className="text-orange-500 font-medium ml-1 cursor-pointer hover:underline">
                                 read more
                              </span>
                           )}
                        </p>

                        {/* Vendor inline card */}
                        {vendor && (
                           <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex items-center gap-4">
                              <div className="h-10 w-10 rounded-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-center shrink-0 overflow-hidden">
                                 {vendor.business_logo ? (
                                    <img src={vendor.business_logo} className="w-full h-full object-cover" alt={vendor.business_name} />
                                 ) : (
                                    <ShoppingBag className="h-4 w-4 text-[var(--color-text-muted)]" />
                                 )}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate leading-none">
                                    {vendor.business_name}
                                 </p>
                                 <p className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1 mt-1">
                                    <BadgeCheck className="h-3 w-3 text-blue-500 shrink-0" />
                                    Verified Supplier
                                 </p>
                              </div>
                              <Link
                                 href={`/vendors/${vendor.business_slug}`}
                                 className="flex items-center gap-1 text-xs font-semibold text-[var(--color-text-muted)] hover:text-orange-500 transition-colors shrink-0"
                              >
                                 Visit <ArrowRight className="h-3 w-3" />
                              </Link>
                           </div>
                        )}
                     </div>
                  </div>
                  {/* ── Tabs (same tabs as digital) ── */}
                  <div
                     className="rounded-xl overflow-hidden"
                     style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}
                  >
                     <Tabs defaultValue="overview" className="w-full">
                        <div className="px-5 pt-5 sm:px-7 sm:pt-7">
                           <TabsList className="h-10 p-1 gap-1 rounded-xl w-fit bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
                              {[
                                 { id: "overview", label: "Overview", badge: null },
                                 { id: "specs", label: "Specs", badge: null },
                                 { id: "reviews", label: "Reviews", badge: reviewCount > 0 ? reviewCount : null },
                                 { id: "faq", label: "FAQ", badge: null },
                              ].map(({ id, label, badge }) => (
                                 <TabsTrigger
                                    key={id}
                                    value={id}
                                    className={cn(
                                       "px-5 h-8 rounded-lg text-[12px] font-semibold capitalize tracking-wide gap-1.5",
                                       "text-[var(--color-text-muted)]",
                                       "data-[state=active]:bg-[var(--color-surface)]",
                                       "data-[state=active]:text-[var(--color-text-primary)]",
                                       "data-[state=active]:shadow-none"
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
                                 </TabsTrigger>
                              ))}
                           </TabsList>
                        </div>

                        <div className="p-5 sm:p-7">
                           {/* Overview */}
                           <TabsContent value="overview" className="mt-0 space-y-6">
                              <p className="text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
                                 {product.description ||
                                    "A professionally crafted digital asset built for modern workflows. Optimized for speed, flexibility, and long-term maintainability."}
                              </p>
                           </TabsContent>
                           {/* Specs */}
                           <TabsContent value="specs" className="mt-0">
                              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
                                 {[
                                    { label: "Material", value: "Premium Composite" },
                                    { label: "Weight", value: product.weight ? `${product.weight} kg` : "1.2 kg" },
                                    { label: "Condition", value: "Brand New" },
                                    { label: "SKU", value: product.sku || "JMV-PRO-X" },
                                    { label: "Shipping", value: "Worldwide · Free on first order" },
                                 ].map(({ label, value }, i, arr) => (
                                    <div
                                       key={label}
                                       className="flex items-center justify-between px-4 py-3.5"
                                       style={{
                                          borderBottom: i < arr.length - 1 ? "1px solid var(--color-border)" : "none",
                                          background: i % 2 === 0 ? "var(--color-surface)" : "var(--color-surface-secondary)",
                                       }}
                                    >
                                       <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                                          {label}
                                       </span>
                                       <span className="text-sm font-medium text-right max-w-[60%]" style={{ color: "var(--color-text-primary)" }}>
                                          {value}
                                       </span>
                                    </div>
                                 ))}
                              </div>
                           </TabsContent>

                           {/* Reviews */}
                           <TabsContent value="reviews" className="mt-0 space-y-6">
                              {reviewCount > 0 && (
                                 <div
                                    className="flex items-center gap-6 p-5 rounded-xl"
                                    style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}
                                 >
                                    <div className="text-center shrink-0">
                                       <p className="text-5xl font-bold tabular-nums leading-none" style={{ color: "var(--color-text-primary)" }}>4.8</p>
                                       <div className="flex gap-0.5 mt-2 justify-center">
                                          {[1, 2, 3, 4, 5].map(i => (
                                             <Star key={i} className={cn("h-3.5 w-3.5", i <= 4 ? "fill-amber-400 text-amber-400" : "fill-amber-200 text-amber-200")} />
                                          ))}
                                       </div>
                                       <p className="text-[10px] mt-1.5" style={{ color: "var(--color-text-muted)" }}>
                                          {reviewCount} review{reviewCount !== 1 ? "s" : ""}
                                       </p>
                                    </div>
                                    <div className="h-16 w-px" style={{ background: "var(--color-border)" }} />
                                    <div className="flex-1 space-y-2">
                                       {[{ star: 5, pct: 72 }, { star: 4, pct: 18 }, { star: 3, pct: 6 }, { star: 2, pct: 2 }, { star: 1, pct: 2 }].map(({ star, pct }) => (
                                          <div key={star} className="flex items-center gap-2.5">
                                             <span className="text-[10px] font-semibold tabular-nums w-2 text-right shrink-0" style={{ color: "var(--color-text-muted)" }}>{star}</span>
                                             <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
                                                <div
                                                   className="h-full rounded-full transition-all duration-700"
                                                   style={{ width: `${pct}%`, background: pct >= 50 ? "#f59e0b" : pct >= 15 ? "#fbbf24" : "var(--color-border-strong)" }}
                                                />
                                             </div>
                                             <span className="text-[10px] tabular-nums w-6 text-right shrink-0" style={{ color: "var(--color-text-muted)" }}>{pct}%</span>
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              )}
                              <ReviewForm productId={product.id} vendorId={product.vendor_id} />
                           </TabsContent>

                           {/* FAQ */}
                           <TabsContent value="faq" className="mt-0">
                              <FaqSection />
                           </TabsContent>
                        </div>
                     </Tabs>
                  </div>
                  {/* Affiliate banner */}
                  <AffiliateBanner product={product} />

                  {/* Community card — same as digital */}
                  <CommunityAccessCard
                     vendorSlug={vendor?.business_slug}
                     productName={product.name}
                  />

                  {/* Related products */}
                  <RelatedProducts products={relatedProducts} formatMoney={formatMoney} />
               </div>

               {/* ── RIGHT: Buy Box ── */}
               <aside className="lg:col-span-4">
                  <div
                     className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden sticky top-[calc(var(--navbar-height,64px)+56px)]"
                     style={{ background: "var(--color-surface)" }}
                  >
                     {/* Price header */}
                     <div className="px-6 pt-6 pb-5 border-b border-[var(--color-border)]">
                        <div className="flex items-start justify-between gap-4">
                           <div>
                              <ProductBuyBoxPrice
                                 price={Number(product.price)}
                                 compareAtPrice={product.compare_at_price}
                                 currency={product.currency}
                                 savings={savings}
                                 className="text-3xl"
                              />
                              {savings && (
                                 <span className="inline-flex items-center text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md mt-2">
                                    Save {savings}%
                                 </span>
                              )}
                           </div>
                           <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                              <ShoppingBag className="h-5 w-5 text-emerald-500" />
                           </div>
                        </div>
                     </div>

                     {/* CTAs */}
                     <div className="p-6 space-y-3">
                        <UrgencyStrip saleCount={saleCount} />

                        <ProductActionModule
                           product={productProps}
                           vendor={vendorProps}
                           currentPath={`/marketplace/${product.slug}`}
                           className="h-12 rounded-xl text-sm font-bold"
                        />

                        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                           <Info className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                           <span>Only a few left — order soon</span>
                        </div>
                     </div>

                     {/* Guarantees */}
                     <div className="px-6 pb-6 space-y-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                           What's included
                        </p>
                        <div className="space-y-2.5">
                           {[
                              { icon: Truck, text: "Free shipping on first order", sub: "Delivered in 5–10 days" },
                              { icon: ShieldCheck, text: "7-day money-back guarantee", sub: "No questions asked" },
                              { icon: Clock, text: "Priority global logistics", sub: "Tracked & insured" },
                           ].map(({ icon: Icon, text, sub }) => (
                              <div key={text} className="flex items-start gap-3">
                                 <div className="h-7 w-7 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                    <Icon className="h-3.5 w-3.5 text-orange-500" />
                                 </div>
                                 <div>
                                    <p className="text-xs font-semibold text-[var(--color-text-primary)] leading-none">{text}</p>
                                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{sub}</p>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>

                     {/* Vendor footer */}
                     {vendor && (
                        <div className="px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                           <div className="flex items-center gap-3 mb-3">
                              <div className="h-8 w-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden flex items-center justify-center shrink-0">
                                 {vendor.business_logo ? (
                                    <img src={vendor.business_logo} className="w-full h-full object-cover" alt="" />
                                 ) : (
                                    <ShoppingBag className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                                 )}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate leading-none">
                                    {vendor.business_name}
                                 </p>
                                 <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1">
                                    <BadgeCheck className="h-3 w-3 text-blue-500 shrink-0" />
                                    Verified Supplier
                                 </p>
                              </div>
                              <Link
                                 href={`/vendors/${vendor.business_slug}`}
                                 className="text-[10px] font-semibold text-orange-500 hover:text-orange-600 transition-colors flex items-center gap-0.5 shrink-0"
                              >
                                 Store <ArrowRight className="h-3 w-3" />
                              </Link>
                           </div>
                           <FollowButton
                              vendorId={vendor.id}
                              initialFollowing={followedVendorIds.includes(String(vendor.id))}
                              className="w-full h-9 rounded-xl border border-[var(--color-border)] text-[12px] font-semibold"
                           />
                        </div>
                     )}
                  </div>
               </aside>
            </div>
         </div>
      </div>
   );
}

/* ── TrustPill ── */
function TrustPill({ icon, label, color }: { icon: React.ReactNode; label: string; color: "blue" | "violet" | "emerald" }) {
   const colors = {
      blue: "text-blue-500   bg-blue-500/8",
      violet: "text-violet-500 bg-violet-500/8",
      emerald: "text-emerald-500 bg-emerald-500/8",
   };
   return (
      <div className={cn("flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]")}>
         <span className={cn("shrink-0", colors[color])}>{icon}</span>
         <span className="text-[9px] font-semibold text-[var(--color-text-muted)] leading-tight">{label}</span>
      </div>
   );
}