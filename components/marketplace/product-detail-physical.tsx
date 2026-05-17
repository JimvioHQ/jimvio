// "use client";

// import React, { useMemo } from "react";
// import Link from "next/link";
// import DOMPurify from "isomorphic-dompurify";
// import {
//    Star, ShieldCheck, Clock,
//    Loader2,
//    BadgeCheck,
//    ShoppingBag, Shield, Truck, Info, ArrowRight,
// } from "lucide-react";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { cn } from "@/lib/utils";
// import {
//    ProductPriceDisplay,
//    ProductBuyBoxPrice,
// } from "@/components/marketplace/product-price-display";
// import { ProductActionModule } from "@/components/marketplace/product-action-module";
// import { FollowButton } from "@/components/marketplace/follow-button";
// import { ReviewForm } from "@/components/marketplace/review-form";
// import { ImageGallery } from "@/components/marketplace/image-gallery";
// import { useCurrency } from "@/context/CurrencyContext";
// import {
//    ProductBreadcrumb,
//    SaveShareBar,
//    SocialProofBar,
//    AffiliateBanner,
//    FaqSection,
//    CommunityAccessCard,
//    UrgencyStrip,
//    RelatedProducts,
// } from "@/components/marketplace/product-detail-shared";
// import {
//    getCJTitle,
//    cleanCJDescription,
//    parseCJSpecifications,
//    formatCJWeight,
// } from "@/lib/cj/render";

// interface PhysicalProductDetailProps {
//    product: any;
//    vendor: any;
//    relatedProducts: any[];
//    cartSet: Set<string>;
//    followedVendorIds: string[];
// }

// const ALLOWED_HTML_TAGS = ["p", "ul", "ol", "li", "strong", "em", "br", "h3", "h4", "span"];
// const ALLOWED_HTML_ATTR: string[] = [];

// function htmlToPlainText(html: string): string {
//    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
// }

// export function PhysicalProductDetail({
//    product,
//    vendor,
//    relatedProducts,
//    cartSet,
//    followedVendorIds,
// }: PhysicalProductDetailProps) {
//    const { formatMoney } = useCurrency();

//    const images = product.images ?? [];
//    const reviewCount = product.review_count ?? 0;
//    const saleCount = product.sale_count ?? 120;
//    const savings =
//       product.compare_at_price && product.compare_at_price > product.price
//          ? Math.round((1 - product.price / product.compare_at_price) * 100)
//          : null;

//    const title = useMemo(
//       () => getCJTitle({ productNameEn: product.name, productName: null }) || product.name,
//       [product.name]
//    );

//    const cleanedHtml = useMemo(
//       () => cleanCJDescription(product.description),
//       [product.description]
//    );

//    const safeHtml = useMemo(
//       () =>
//          DOMPurify.sanitize(cleanedHtml, {
//             ALLOWED_TAGS: ALLOWED_HTML_TAGS,
//             ALLOWED_ATTR: ALLOWED_HTML_ATTR,
//          }),
//       [cleanedHtml]
//    );

//    const descriptionPreview = useMemo(() => {
//       const plain = htmlToPlainText(cleanedHtml);
//       return plain.length > 220 ? `${plain.slice(0, 220)}…` : plain;
//    }, [cleanedHtml]);

//    const { specs: parsedSpecs, notes: specNotes } = useMemo(
//       () => parseCJSpecifications(product.description),
//       [product.description]
//    );

//    const weightDisplay = formatCJWeight(product.weight);

//    const cjMeta = product.source_metadata ?? {};
//    const isFreeShipping =
//       product.is_free_shipping ?? cjMeta.cj_is_free_shipping ?? false;
//    const shippingCountries: string[] = cjMeta.cj_shipping_countries ?? [];

//    const specRows = useMemo(() => {
//       if (parsedSpecs.length > 0) {
//          const rows = parsedSpecs.map((s) => ({ label: s.key, value: s.value }));
//          if (weightDisplay) rows.push({ label: "Weight", value: weightDisplay });
//          if (product.sku) rows.push({ label: "SKU", value: String(product.sku) });
//          return rows;
//       }
//       return [
//          { label: "Weight", value: weightDisplay || "—" },
//          { label: "Condition", value: "Brand New" },
//          { label: "SKU", value: product.sku || "—" },
//          {
//             label: "Shipping",
//             value: isFreeShipping ? "Free shipping" : "Standard rates apply",
//          },
//       ];
//    }, [parsedSpecs, weightDisplay, product.sku, isFreeShipping]);

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
//       name: title,
//       slug: product.slug,
//       price: Number(product.price),
//       images: product.images,
//       vendor_id: product.vendor_id,
//       currency: product.currency,
//    };

//    return (
//       <div className="min-h-screen bg-[var(--color-bg)]">

//          {/* ── Breadcrumb + share ── */}
//          <div className="sticky top-[var(--navbar-height,64px)] z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-sm">
//             <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-11 flex items-center justify-between">
//                <ProductBreadcrumb productName={title} />
//                <SaveShareBar />
//             </div>
//          </div>

//          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">

//             {/* ── Page header ── */}
//             <div className="mb-6">
//                <div className="flex items-center gap-2 mb-3">
//                   <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
//                      <Truck className="h-3 w-3" />
//                      Physical product
//                   </span>
//                   {savings && (
//                      <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20">
//                         {savings}% off
//                      </span>
//                   )}
//                   {product.affiliate_enabled && (
//                      <span
//                         className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border"
//                         style={{
//                            background: "rgba(253,80,0,0.08)",
//                            color: "var(--color-accent)",
//                            borderColor: "rgba(253,80,0,0.20)",
//                         }}
//                      >
//                         {product.affiliate_commission_rate ?? 10}% affiliate
//                      </span>
//                   )}
//                </div>

//                <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] leading-tight tracking-tight mb-3">
//                   {title}
//                </h1>

//                <div className="flex flex-wrap items-center gap-4 text-[13px] text-[var(--color-text-muted)] mb-4">
//                   <div className="flex items-center gap-1.5">
//                      {[1, 2, 3, 4, 5].map(i => (
//                         <Star key={i} className={cn("h-3.5 w-3.5", i <= 4 ? "fill-amber-400 text-amber-400" : "fill-amber-200 text-amber-200")} />
//                      ))}
//                      <span className="font-semibold text-[var(--color-text-primary)] ml-0.5">4.8</span>
//                      <span>({reviewCount} reviews)</span>
//                   </div>
//                   <span className="select-none text-[var(--color-border-strong)]">·</span>
//                   <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
//                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
//                      In stock
//                   </span>
//                   <span className="select-none text-[var(--color-border-strong)]">·</span>
//                   <span>{saleCount.toLocaleString()}+ sold</span>
//                </div>

//                <SocialProofBar saleCount={saleCount} reviewCount={reviewCount} />
//             </div>

//             <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-16">

//                {/* ── LEFT ── */}
//                <div className="lg:col-span-8 space-y-10">

//                   {/* Gallery + essentials */}
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

//                      {/* Gallery */}
//                      <div className="space-y-3">
//                         <ImageGallery
//                            images={images}
//                            productName={title}
//                            isFeatured={product.is_featured}
//                            savings={savings}
//                         />
//                         <div className="grid grid-cols-3 gap-2 pt-1">
//                            {isFreeShipping && (
//                               <TrustPill icon={<Truck className="h-3.5 w-3.5" />} label="Free Shipping" color="blue" />
//                            )}
//                            <TrustPill icon={<Loader2 className="h-3.5 w-3.5" />} label="14-day Returns" color="violet" />
//                            <TrustPill icon={<Shield className="h-3.5 w-3.5" />} label="Buyer Protection" color="emerald" />
//                         </div>
//                      </div>

//                      {/* Essential info */}
//                      <div className="flex flex-col gap-5">
//                         <div className="space-y-2.5">
//                            <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider text-orange-500 bg-orange-500/10 px-2.5 py-1 rounded-md">
//                               {product.product_type || "Physical Product"}
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

//                         <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
//                            {descriptionPreview}
//                         </p>

//                         {/* Vendor inline card */}
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

//                   {/* ── Tabs ── */}
//                   <div
//                      className="rounded-xl overflow-hidden"
//                      style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}
//                   >
//                      <Tabs defaultValue="overview" className="w-full">
//                         <div className="px-5 pt-5 sm:px-7 sm:pt-7">
//                            <TabsList className="h-10 p-1 gap-1 rounded-xl w-fit bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
//                               {[
//                                  { id: "overview", label: "Overview", badge: null },
//                                  { id: "specs", label: "Specs", badge: parsedSpecs.length > 0 ? parsedSpecs.length : null },
//                                  { id: "reviews", label: "Reviews", badge: reviewCount > 0 ? reviewCount : null },
//                                  { id: "faq", label: "FAQ", badge: null },
//                               ].map(({ id, label, badge }) => (
//                                  <TabsTrigger
//                                     key={id}
//                                     value={id}
//                                     className={cn(
//                                        "px-5 h-8 rounded-lg text-[12px] font-semibold capitalize tracking-wide gap-1.5",
//                                        "text-[var(--color-text-muted)]",
//                                        "data-[state=active]:bg-[var(--color-surface)]",
//                                        "data-[state=active]:text-[var(--color-text-primary)]",
//                                        "data-[state=active]:shadow-none"
//                                     )}
//                                  >
//                                     {label}
//                                     {badge !== null && (
//                                        <span
//                                           className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-[9px] font-bold"
//                                           style={{
//                                              background: "var(--color-accent-light)",
//                                              color: "var(--color-accent)",
//                                              border: "1px solid var(--color-accent-subtle)",
//                                           }}
//                                        >
//                                           {badge}
//                                        </span>
//                                     )}
//                                  </TabsTrigger>
//                               ))}
//                            </TabsList>
//                         </div>

//                         <div className="p-5 sm:p-7">
//                            {/* Overview */}
//                            <TabsContent value="overview" className="mt-0 space-y-6">
//                               {safeHtml ? (
//                                  <div
//                                     className="prose prose-sm dark:prose-invert max-w-none text-[15px] leading-relaxed text-[var(--color-text-secondary)]"
//                                     dangerouslySetInnerHTML={{ __html: safeHtml }}
//                                  />
//                               ) : (
//                                  <p className="text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
//                                     A professionally crafted product built for everyday use.
//                                  </p>
//                               )}

//                               {specNotes.length > 0 && (
//                                  <div className="rounded-lg p-4 text-xs space-y-1.5" style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}>
//                                     <p className="font-semibold text-[var(--color-text-primary)] mb-1">Notes</p>
//                                     {specNotes.map((n, i) => (
//                                        <p key={i} className="text-[var(--color-text-muted)] leading-relaxed">• {n}</p>
//                                     ))}
//                                  </div>
//                               )}
//                            </TabsContent>

//                            {/* Specs */}
//                            <TabsContent value="specs" className="mt-0">
//                               <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
//                                  {specRows.map(({ label, value }, i, arr) => (
//                                     <div
//                                        key={`${label}-${i}`}
//                                        className="flex items-center justify-between px-4 py-3.5"
//                                        style={{
//                                           borderBottom: i < arr.length - 1 ? "1px solid var(--color-border)" : "none",
//                                           background: i % 2 === 0 ? "var(--color-surface)" : "var(--color-surface-secondary)",
//                                        }}
//                                     >
//                                        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
//                                           {label}
//                                        </span>
//                                        <span className="text-sm font-medium text-right max-w-[60%]" style={{ color: "var(--color-text-primary)" }}>
//                                           {value}
//                                        </span>
//                                     </div>
//                                  ))}
//                               </div>

//                               {shippingCountries.length > 0 && (
//                                  <p className="mt-3 text-[11px] text-[var(--color-text-muted)]">
//                                     Ships to: {shippingCountries.join(", ")}
//                                  </p>
//                               )}
//                            </TabsContent>

//                            {/* Reviews */}
//                            <TabsContent value="reviews" className="mt-0 space-y-6">
//                               {reviewCount > 0 && (
//                                  <div
//                                     className="flex items-center gap-6 p-5 rounded-xl"
//                                     style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}
//                                  >
//                                     <div className="text-center shrink-0">
//                                        <p className="text-5xl font-bold tabular-nums leading-none" style={{ color: "var(--color-text-primary)" }}>4.8</p>
//                                        <div className="flex gap-0.5 mt-2 justify-center">
//                                           {[1, 2, 3, 4, 5].map(i => (
//                                              <Star key={i} className={cn("h-3.5 w-3.5", i <= 4 ? "fill-amber-400 text-amber-400" : "fill-amber-200 text-amber-200")} />
//                                           ))}
//                                        </div>
//                                        <p className="text-[10px] mt-1.5" style={{ color: "var(--color-text-muted)" }}>
//                                           {reviewCount} review{reviewCount !== 1 ? "s" : ""}
//                                        </p>
//                                     </div>
//                                     <div className="h-16 w-px" style={{ background: "var(--color-border)" }} />
//                                     <div className="flex-1 space-y-2">
//                                        {[{ star: 5, pct: 72 }, { star: 4, pct: 18 }, { star: 3, pct: 6 }, { star: 2, pct: 2 }, { star: 1, pct: 2 }].map(({ star, pct }) => (
//                                           <div key={star} className="flex items-center gap-2.5">
//                                              <span className="text-[10px] font-semibold tabular-nums w-2 text-right shrink-0" style={{ color: "var(--color-text-muted)" }}>{star}</span>
//                                              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
//                                                 <div
//                                                    className="h-full rounded-full transition-all duration-700"
//                                                    style={{ width: `${pct}%`, background: pct >= 50 ? "#f59e0b" : pct >= 15 ? "#fbbf24" : "var(--color-border-strong)" }}
//                                                 />
//                                              </div>
//                                              <span className="text-[10px] tabular-nums w-6 text-right shrink-0" style={{ color: "var(--color-text-muted)" }}>{pct}%</span>
//                                           </div>
//                                        ))}
//                                     </div>
//                                  </div>
//                               )}
//                               <ReviewForm productId={product.id} vendorId={product.vendor_id} />
//                            </TabsContent>

//                            {/* FAQ */}
//                            <TabsContent value="faq" className="mt-0">
//                               <FaqSection />
//                            </TabsContent>
//                         </div>
//                      </Tabs>
//                   </div>

//                   <AffiliateBanner product={product} />

//                   <CommunityAccessCard
//                      vendorSlug={vendor?.business_slug}
//                      productName={title}
//                   />

//                   <RelatedProducts products={relatedProducts} formatMoney={formatMoney} />
//                </div>

//                {/* ── RIGHT: Buy Box ── */}
//                <aside className="lg:col-span-4">
//                   <div
//                      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden sticky top-[calc(var(--navbar-height,64px)+56px)]"
//                      style={{ background: "var(--color-surface)" }}
//                   >
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
//                            </div>
//                            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
//                               <ShoppingBag className="h-5 w-5 text-emerald-500" />
//                            </div>
//                         </div>
//                      </div>

//                      <div className="p-6 space-y-3">
//                         {/* <UrgencyStrip saleCount={saleCount} /> */}

//                         <ProductActionModule
//                            product={productProps}
//                            vendor={vendorProps}
//                            currentPath={`/marketplace/${product.slug}`}
//                            className="h-12 rounded-xl text-sm font-bold"
//                         />

//                         <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
//                            <Info className="h-3.5 w-3.5 shrink-0 text-amber-500" />
//                            <span>Only a few left — order soon</span>
//                         </div>
//                      </div>

//                      <div className="px-6 pb-6 space-y-3">
//                         <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
//                            What's included
//                         </p>
//                         <div className="space-y-2.5">
//                            {[
//                               isFreeShipping
//                                  ? { icon: Truck, text: "Free shipping", sub: "Delivered in 5–10 days" }
//                                  : { icon: Truck, text: "Standard shipping", sub: "Delivered in 7–14 days" },
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

//                      {vendor && (
//                         <div className="px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
//                            <div className="flex items-center gap-3 mb-3">
//                               <div className="h-8 w-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden flex items-center justify-center shrink-0">
//                                  {vendor.business_logo ? (
//                                     <img src={vendor.business_logo} className="w-full h-full object-cover" alt="" />
//                                  ) : (
//                                     <ShoppingBag className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
//                                  )}
//                               </div>
//                               <div className="flex-1 min-w-0">
//                                  <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate leading-none">
//                                     {vendor.business_name}
//                                  </p>
//                                  <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1">
//                                     <BadgeCheck className="h-3 w-3 text-blue-500 shrink-0" />
//                                     Verified Supplier
//                                  </p>
//                               </div>
//                               <Link
//                                  href={`/vendors/${vendor.business_slug}`}
//                                  className="text-[10px] font-semibold text-orange-500 hover:text-orange-600 transition-colors flex items-center gap-0.5 shrink-0"
//                               >
//                                  Store <ArrowRight className="h-3 w-3" />
//                               </Link>
//                            </div>
//                            <FollowButton
//                               vendorId={vendor.id}
//                               initialFollowing={followedVendorIds.includes(String(vendor.id))}
//                               className="w-full h-9 rounded-xl border border-[var(--color-border)] text-[12px] font-semibold"
//                            />
//                         </div>
//                      )}
//                   </div>
//                </aside>
//             </div>
//          </div>
//       </div>
//    );
// }

// function TrustPill({ icon, label, color }: { icon: React.ReactNode; label: string; color: "blue" | "violet" | "emerald" }) {
//    const colors = {
//       blue: "text-blue-500   bg-blue-500/8",
//       violet: "text-violet-500 bg-violet-500/8",
//       emerald: "text-emerald-500 bg-emerald-500/8",
//    };
//    return (
//       <div className={cn("flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]")}>
//          <span className={cn("shrink-0", colors[color])}>{icon}</span>
//          <span className="text-[9px] font-semibold text-[var(--color-text-muted)] leading-tight">{label}</span>
//       </div>
//    );
// }

"use client";

import React, { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import DOMPurify from "isomorphic-dompurify";
import {
   Star, ShieldCheck, Clock, Loader2, BadgeCheck,
   ShoppingBag, Shield, Truck, Info, ArrowRight,
} from "lucide-react";
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
import {
   VariantSelector,
   VariantStockBadge,
   type ProductVariant,
} from "@/components/marketplace/variant-selector";
import { useCurrency } from "@/context/CurrencyContext";
import {
   ProductBreadcrumb, SaveShareBar, SocialProofBar,
   AffiliateBanner, FaqSection, CommunityAccessCard, RelatedProducts,
} from "@/components/marketplace/product-detail-shared";
import {
   getCJTitle, cleanCJDescription, parseCJSpecifications, formatCJWeight,
} from "@/lib/cj/render";

interface PhysicalProductDetailProps {
   product: any;
   vendor: any;
   relatedProducts: any[];
   cartSet: Set<string>;
   followedVendorIds: string[];
}

const ALLOWED_HTML_TAGS = ["p", "ul", "ol", "li", "strong", "em", "br", "h3", "h4", "span"];
const ALLOWED_HTML_ATTR: string[] = [];

function htmlToPlainText(html: string): string {
   return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function PhysicalProductDetail({
   product, vendor, relatedProducts, followedVendorIds,
}: PhysicalProductDetailProps) {
   const { formatMoney } = useCurrency();

   const title = useMemo(
      () => getCJTitle({ productNameEn: product.name, productName: null }) || product.name,
      [product.name]
   );

   // ─── Variants ──────────────────────────────────────────────────────────────
   const variants: ProductVariant[] = useMemo(
      () =>
         (product.product_variants ?? [])
            .filter((v: any) => v.is_active)
            .map((v: any) => ({
               id: v.id,
               name: v.name ?? "",
               price: Number(v.price),
               compare_at_price: v.compare_at_price ? Number(v.compare_at_price) : null,
               inventory_quantity: v.inventory_quantity ?? 0,
               image_url: v.image_url ?? null,
               options: v.options ?? null,
               is_active: Boolean(v.is_active),
               sku: v.sku ?? null,
            })),
      [product.product_variants]
   );

   const hasVariants = variants.length > 0;

   const defaultVariant = useMemo(
      () => variants.find((v) => v.inventory_quantity > 0) ?? variants[0] ?? null,
      [variants]
   );

   const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(defaultVariant);

   const handleVariantSelect = useCallback((v: ProductVariant) => {
      setSelectedVariant(v);
   }, []);

   // ─── Derived values ─────────────────────────────────────────────────────────
   const activePrice = selectedVariant ? selectedVariant.price : Number(product.price);
   const activeCompareAt = selectedVariant?.compare_at_price ?? product.compare_at_price ?? null;
   const activeInventory = selectedVariant?.inventory_quantity ?? product.inventory_quantity ?? 0;

   const baseImages: string[] = product.images ?? [];
   const activeImages = useMemo(() => {
      if (selectedVariant?.image_url) {
         return [selectedVariant.image_url, ...baseImages.filter((img) => img !== selectedVariant.image_url)];
      }
      return baseImages;
   }, [selectedVariant, baseImages]);

   const savings =
      activeCompareAt && activeCompareAt > activePrice
         ? Math.round((1 - activePrice / activeCompareAt) * 100)
         : null;

   const reviewCount = product.review_count ?? 0;
   const saleCount = product.sale_count ?? 0;

   const cleanedHtml = useMemo(() => cleanCJDescription(product.description), [product.description]);

   const safeHtml = useMemo(
      () => DOMPurify.sanitize(cleanedHtml, { ALLOWED_TAGS: ALLOWED_HTML_TAGS, ALLOWED_ATTR: ALLOWED_HTML_ATTR }),
      [cleanedHtml]
   );

   const descriptionPreview = useMemo(() => {
      const plain = htmlToPlainText(cleanedHtml);
      return plain.length > 220 ? `${plain.slice(0, 220)}…` : plain;
   }, [cleanedHtml]);

   const { specs: parsedSpecs, notes: specNotes } = useMemo(
      () => parseCJSpecifications(product.description),
      [product.description]
   );

   const weightDisplay = formatCJWeight(product.weight);
   const cjMeta = product.source_metadata ?? {};
   const isFreeShipping = product.is_free_shipping ?? cjMeta.cj_is_free_shipping ?? false;
   const shippingCountries: string[] = cjMeta.cj_shipping_countries ?? [];

   const specRows = useMemo(() => {
      if (parsedSpecs.length > 0) {
         const rows = parsedSpecs.map((s) => ({ label: s.key, value: s.value }));
         if (weightDisplay) rows.push({ label: "Weight", value: weightDisplay });
         if (product.sku) rows.push({ label: "SKU", value: String(product.sku) });
         return rows;
      }
      return [
         { label: "Weight", value: weightDisplay || "—" },
         { label: "Condition", value: "Brand New" },
         { label: "SKU", value: product.sku || "—" },
         { label: "Shipping", value: isFreeShipping ? "Free shipping" : "Standard rates apply" },
      ];
   }, [parsedSpecs, weightDisplay, product.sku, isFreeShipping]);

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
      name: title,
      slug: product.slug,
      price: activePrice,
      images: activeImages,
      vendor_id: product.vendor_id,
      currency: product.currency,
   };

   return (
      <div className="min-h-screen bg-[var(--color-bg)]">

         {/* ── Breadcrumb ── */}
         <div className="sticky top-[var(--navbar-height,64px)] z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-sm">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-11 flex items-center justify-between">
               <ProductBreadcrumb productName={title} />
               <SaveShareBar />
            </div>
         </div>

         <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">

            {/* ── Page header ── */}
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
                        style={{ background: "rgba(253,80,0,0.08)", color: "var(--color-accent)", borderColor: "rgba(253,80,0,0.20)" }}
                     >
                        {product.affiliate_commission_rate ?? 10}% affiliate
                     </span>
                  )}
               </div>

               <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] leading-tight tracking-tight mb-3">
                  {title}
               </h1>

               <div className="flex flex-wrap items-center gap-4 text-[13px] text-[var(--color-text-muted)] mb-4">
                  {reviewCount > 0 && (
                     <>
                        <div className="flex items-center gap-1.5">
                           {[1, 2, 3, 4, 5].map((i) => (
                              <Star key={i} className={cn("h-3.5 w-3.5", i <= Math.round(product.rating ?? 0) ? "fill-amber-400 text-amber-400" : "fill-amber-200 text-amber-200")} />
                           ))}
                           <span className="font-semibold text-[var(--color-text-primary)] ml-0.5">{(product.rating ?? 0).toFixed(1)}</span>
                           <span>({reviewCount} reviews)</span>
                        </div>
                        <span className="select-none text-[var(--color-border-strong)]">·</span>
                     </>
                  )}
                  <VariantStockBadge quantity={activeInventory} />
                  {saleCount > 0 && (
                     <>
                        <span className="select-none text-[var(--color-border-strong)]">·</span>
                        <span>{saleCount.toLocaleString()}+ sold</span>
                     </>
                  )}
               </div>

               <SocialProofBar saleCount={saleCount} reviewCount={reviewCount} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-16">

               {/* ── LEFT ── */}
               <div className="lg:col-span-8 space-y-10">

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

                     {/* Gallery */}
                     <div className="space-y-3">
                        <ImageGallery
                           images={activeImages}
                           productName={title}
                           isFeatured={product.is_featured}
                           savings={savings}
                        />
                        <div className="grid grid-cols-3 gap-2 pt-1">
                           {isFreeShipping && (
                              <TrustPill icon={<Truck className="h-3.5 w-3.5" />} label="Free Shipping" color="blue" />
                           )}
                           <TrustPill icon={<Loader2 className="h-3.5 w-3.5" />} label="14-day Returns" color="violet" />
                           <TrustPill icon={<Shield className="h-3.5 w-3.5" />} label="Buyer Protection" color="emerald" />
                        </div>
                     </div>

                     {/* Essential info */}
                     <div className="flex flex-col gap-5">
                        <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider text-orange-500 bg-orange-500/10 px-2.5 py-1 rounded-md w-fit">
                           {product.product_type || "Physical Product"}
                        </span>

                        {/* Price */}
                        <div className="py-4 border-y border-[var(--color-border)]">
                           <ProductPriceDisplay
                              price={activePrice}
                              compareAtPrice={activeCompareAt}
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

                        {/* Variant selector — left column */}
                        {hasVariants && (
                           <VariantSelector
                              variants={variants}
                              productName={product.name}
                              selectedVariantId={selectedVariant?.id ?? null}
                              onSelect={handleVariantSelect}
                           />
                        )}

                        {!hasVariants && (
                           <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                              {descriptionPreview}
                           </p>
                        )}

                        {/* Vendor inline card */}
                        {vendor && (
                           <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex items-center gap-4">
                              <div className="h-10 w-10 rounded-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-center shrink-0 overflow-hidden">
                                 {vendor.business_logo
                                    ? <img src={vendor.business_logo} className="w-full h-full object-cover" alt={vendor.business_name} />
                                    : <ShoppingBag className="h-4 w-4 text-[var(--color-text-muted)]" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate leading-none">{vendor.business_name}</p>
                                 <p className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1 mt-1">
                                    <BadgeCheck className="h-3 w-3 text-blue-500 shrink-0" />
                                    Verified Supplier
                                 </p>
                              </div>
                              <Link href={`/vendors/${vendor.business_slug}`} className="flex items-center gap-1 text-xs font-semibold text-[var(--color-text-muted)] hover:text-orange-500 transition-colors shrink-0">
                                 Visit <ArrowRight className="h-3 w-3" />
                              </Link>
                           </div>
                        )}
                     </div>
                  </div>

                  {/* ── Tabs ── */}
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
                     <Tabs defaultValue="overview" className="w-full">
                        <div className="px-5 pt-5 sm:px-7 sm:pt-7">
                           <TabsList className="h-10 p-1 gap-1 rounded-xl w-fit bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
                              {[
                                 { id: "overview", label: "Overview", badge: null },
                                 { id: "specs", label: "Specs", badge: parsedSpecs.length > 0 ? parsedSpecs.length : null },
                                 { id: "variants", label: "Variants", badge: hasVariants ? variants.length : null },
                                 { id: "reviews", label: "Reviews", badge: reviewCount > 0 ? reviewCount : null },
                                 { id: "faq", label: "FAQ", badge: null },
                              ]
                                 .filter((t) => t.id !== "variants" || hasVariants)
                                 .map(({ id, label, badge }) => (
                                    <TabsTrigger
                                       key={id}
                                       value={id}
                                       className={cn(
                                          "px-5 h-8 rounded-lg text-[12px] font-semibold capitalize tracking-wide gap-1.5",
                                          "text-[var(--color-text-muted)]",
                                          "data-[state=active]:bg-[var(--color-surface)] data-[state=active]:text-[var(--color-text-primary)] data-[state=active]:shadow-none"
                                       )}
                                    >
                                       {label}
                                       {badge !== null && (
                                          <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-[9px] font-bold" style={{ background: "var(--color-accent-light)", color: "var(--color-accent)", border: "1px solid var(--color-accent-subtle)" }}>
                                             {badge}
                                          </span>
                                       )}
                                    </TabsTrigger>
                                 ))}
                           </TabsList>
                        </div>

                        <div className="p-5 sm:p-7">

                           <TabsContent value="overview" className="mt-0 space-y-6">
                              {safeHtml
                                 ? <div className="prose prose-sm dark:prose-invert max-w-none text-[15px] leading-relaxed text-[var(--color-text-secondary)]" dangerouslySetInnerHTML={{ __html: safeHtml }} />
                                 : <p className="text-[15px] leading-relaxed text-[var(--color-text-secondary)]">A professionally crafted product built for everyday use.</p>}
                              {specNotes.length > 0 && (
                                 <div className="rounded-lg p-4 text-xs space-y-1.5" style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}>
                                    <p className="font-semibold text-[var(--color-text-primary)] mb-1">Notes</p>
                                    {specNotes.map((n, i) => <p key={i} className="text-[var(--color-text-muted)] leading-relaxed">• {n}</p>)}
                                 </div>
                              )}
                           </TabsContent>

                           <TabsContent value="specs" className="mt-0">
                              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
                                 {specRows.map(({ label, value }, i, arr) => (
                                    <div key={`${label}-${i}`} className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--color-border)" : "none", background: i % 2 === 0 ? "var(--color-surface)" : "var(--color-surface-secondary)" }}>
                                       <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>{label}</span>
                                       <span className="text-sm font-medium text-right max-w-[60%]" style={{ color: "var(--color-text-primary)" }}>{value}</span>
                                    </div>
                                 ))}
                              </div>
                              {shippingCountries.length > 0 && (
                                 <p className="mt-3 text-[11px] text-[var(--color-text-muted)]">Ships to: {shippingCountries.join(", ")}</p>
                              )}
                           </TabsContent>

                           {hasVariants && (
                              <TabsContent value="variants" className="mt-0">
                                 <VariantsTable variants={variants} productName={product.name} currency={product.currency} />
                              </TabsContent>
                           )}

                           <TabsContent value="reviews" className="mt-0 space-y-6">
                              {reviewCount > 0 && (
                                 <div className="flex items-center gap-6 p-5 rounded-xl" style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}>
                                    <div className="text-center shrink-0">
                                       <p className="text-5xl font-bold tabular-nums leading-none" style={{ color: "var(--color-text-primary)" }}>{(product.rating ?? 0).toFixed(1)}</p>
                                       <div className="flex gap-0.5 mt-2 justify-center">
                                          {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={cn("h-3.5 w-3.5", i <= Math.round(product.rating ?? 0) ? "fill-amber-400 text-amber-400" : "fill-amber-200 text-amber-200")} />)}
                                       </div>
                                       <p className="text-[10px] mt-1.5" style={{ color: "var(--color-text-muted)" }}>{reviewCount} review{reviewCount !== 1 ? "s" : ""}</p>
                                    </div>
                                    <div className="h-16 w-px" style={{ background: "var(--color-border)" }} />
                                    <ReviewBreakdown rating={product.rating ?? 0} />
                                 </div>
                              )}
                              <ReviewForm productId={product.id} vendorId={product.vendor_id} />
                           </TabsContent>

                           <TabsContent value="faq" className="mt-0">
                              <FaqSection />
                           </TabsContent>
                        </div>
                     </Tabs>
                  </div>

                  <AffiliateBanner product={product} />
                  <CommunityAccessCard vendorSlug={vendor?.business_slug} productName={title} />
                  <RelatedProducts products={relatedProducts} formatMoney={formatMoney} />
               </div>

               {/* ── RIGHT: Buy Box ── */}
               <aside className="lg:col-span-4">
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden sticky top-[calc(var(--navbar-height,64px)+56px)]">

                     {/* Price header */}
                     <div className="px-6 pt-6 pb-5 border-b border-[var(--color-border)]">
                        <div className="flex items-start justify-between gap-4">
                           <div>
                              <ProductBuyBoxPrice
                                 price={activePrice}
                                 compareAtPrice={activeCompareAt}
                                 currency={product.currency}
                                 savings={savings}
                                 className="text-3xl"
                              />
                              {hasVariants && selectedVariant && (
                                 <p className="text-[11px] text-[var(--color-text-muted)] mt-1 truncate max-w-[180px]">
                                    {selectedVariant.name}
                                 </p>
                              )}
                           </div>
                           <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                              <ShoppingBag className="h-5 w-5 text-emerald-500" />
                           </div>
                        </div>
                     </div>

                     {/* Variant selector in buy box */}
                     {hasVariants && (
                        <div className="px-6 pt-4 pb-4 border-b border-[var(--color-border)]">
                           <VariantSelector
                              variants={variants}
                              productName={product.name}
                              selectedVariantId={selectedVariant?.id ?? null}
                              onSelect={handleVariantSelect}
                           />
                        </div>
                     )}

                     {/* Actions */}
                     <div className="p-6 space-y-3">
                        <ProductActionModule
                           product={productProps}
                           vendor={vendorProps}
                           selectedVariantId={selectedVariant?.id ?? null}
                           selectedVariantOutOfStock={hasVariants && activeInventory <= 0}
                           currentPath={`/marketplace/${product.slug}`}
                           className="h-12 rounded-xl text-sm font-bold"
                        />

                        {activeInventory > 0 && activeInventory <= 5 && (
                           <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                              <Info className="h-3.5 w-3.5 shrink-0" />
                              <span>Only {activeInventory} left — order soon</span>
                           </div>
                        )}

                        {hasVariants && activeInventory <= 0 && (
                           <div className="flex items-center gap-2 text-xs text-red-500">
                              <Info className="h-3.5 w-3.5 shrink-0" />
                              <span>This option is out of stock</span>
                           </div>
                        )}
                     </div>

                     {/* Inclusions */}
                     <div className="px-6 pb-6 space-y-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">What's included</p>
                        <div className="space-y-2.5">
                           {[
                              isFreeShipping
                                 ? { icon: Truck, text: "Free shipping", sub: "Delivered in 5–10 days" }
                                 : { icon: Truck, text: "Standard shipping", sub: "Delivered in 7–14 days" },
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
                                 {vendor.business_logo
                                    ? <img src={vendor.business_logo} className="w-full h-full object-cover" alt="" />
                                    : <ShoppingBag className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate leading-none">{vendor.business_name}</p>
                                 <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1">
                                    <BadgeCheck className="h-3 w-3 text-blue-500 shrink-0" />
                                    Verified Supplier
                                 </p>
                              </div>
                              <Link href={`/vendors/${vendor.business_slug}`} className="text-[10px] font-semibold text-orange-500 hover:text-orange-600 transition-colors flex items-center gap-0.5 shrink-0">
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

// ─── Variants table ───────────────────────────────────────────────────────────

function VariantsTable({ variants, productName, currency }: { variants: ProductVariant[]; productName: string; currency?: string | null }) {
   // Derive suffix labels using the same prefix-stripping logic
   const names = variants.map((v) => v.name ?? "");
   const prefixLen = commonPrefixLength(names);

   return (
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
         <table className="w-full text-sm">
            <thead>
               <tr style={{ background: "var(--color-surface-secondary)", borderBottom: "1px solid var(--color-border)" }}>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Variant</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Price</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Stock</th>
               </tr>
            </thead>
            <tbody>
               {variants.map((v, i) => {
                  const words = (v.name ?? "").split(" ");
                  const label = words.slice(prefixLen).join(" ").trim() || v.name;
                  return (
                     <tr key={v.id} style={{ background: i % 2 === 0 ? "var(--color-surface)" : "var(--color-surface-secondary)", borderBottom: i < variants.length - 1 ? "1px solid var(--color-border)" : "none" }}>
                        <td className="px-4 py-3 text-[13px] font-medium text-[var(--color-text-primary)]">{label}</td>
                        <td className="px-4 py-3 text-right text-[13px] font-semibold text-[var(--color-text-primary)]">{currency} {v.price.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">
                           {v.inventory_quantity <= 0
                              ? <span className="text-[11px] font-semibold text-red-500">Out of stock</span>
                              : v.inventory_quantity <= 5
                                 ? <span className="text-[11px] font-semibold text-amber-500">{v.inventory_quantity} left</span>
                                 : <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{v.inventory_quantity.toLocaleString()} in stock</span>}
                        </td>
                     </tr>
                  );
               })}
            </tbody>
         </table>
      </div>
   );
}

function commonPrefixLength(names: string[]): number {
   if (names.length === 0) return 0;
   const first = names[0].split(" ");
   let len = first.length;
   for (const name of names.slice(1)) {
      const parts = name.split(" ");
      let i = 0;
      while (i < len && i < parts.length && first[i].toLowerCase() === parts[i].toLowerCase()) i++;
      len = i;
   }
   return len;
}

// ─── Review breakdown ─────────────────────────────────────────────────────────

function ReviewBreakdown({ rating }: { rating: number }) {
   const pcts = useMemo(() => {
      const r = Math.min(5, Math.max(1, rating));
      const five = Math.round(((r - 1) / 4) * 65 + 10);
      const four = Math.round((5 - r) * 5 + 10);
      const three = Math.max(0, 100 - five - four - 5 - 3);
      return [{ star: 5, pct: five }, { star: 4, pct: four }, { star: 3, pct: three }, { star: 2, pct: 5 }, { star: 1, pct: 3 }];
   }, [rating]);

   return (
      <div className="flex-1 space-y-2">
         {pcts.map(({ star, pct }) => (
            <div key={star} className="flex items-center gap-2.5">
               <span className="text-[10px] font-semibold tabular-nums w-2 text-right shrink-0" style={{ color: "var(--color-text-muted)" }}>{star}</span>
               <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: pct >= 50 ? "#f59e0b" : pct >= 15 ? "#fbbf24" : "var(--color-border-strong)" }} />
               </div>
               <span className="text-[10px] tabular-nums w-6 text-right shrink-0" style={{ color: "var(--color-text-muted)" }}>{pct}%</span>
            </div>
         ))}
      </div>
   );
}

// ─── Trust pill ───────────────────────────────────────────────────────────────

function TrustPill({ icon, label, color }: { icon: React.ReactNode; label: string; color: "blue" | "violet" | "emerald" }) {
   const colors = { blue: "text-blue-500 bg-blue-500/8", violet: "text-violet-500 bg-violet-500/8", emerald: "text-emerald-500 bg-emerald-500/8" };
   return (
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
         <span className={cn("shrink-0", colors[color])}>{icon}</span>
         <span className="text-[9px] font-semibold text-[var(--color-text-muted)] leading-tight">{label}</span>
      </div>
   );
}