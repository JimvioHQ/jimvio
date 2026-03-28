import React from "react";
import Link from "next/link";
import {
  Star,
  MapPin,
  ShieldCheck,
  Clock,
  MessageSquare,
  CheckCircle2,
  Globe,
  Share2,
  Truck,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  Package,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getProductBySlug, getTrendingProducts } from "@/services/db";
import { formatCurrency, cn } from "@/lib/utils";
import { ProductCardClient } from "@/components/marketplace/product-card-client";
import { ProductActionModule } from "@/components/marketplace/product-action-module";
import { FollowButton } from "@/components/marketplace/follow-button";
import { ReviewForm } from "@/components/marketplace/review-form";
import { ImageGallery } from "@/components/marketplace/image-gallery";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const relatedProducts = await getTrendingProducts(4);
  const images: string[] = product.images ?? [];
  const vendor = product.vendors;

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
    <div className="min-h-screen bg-zinc-50/60">
      {/* Breadcrumb */}
      <div className="bg-white/95 backdrop-blur-xl border-b border-zinc-200/80 sticky top-[var(--navbar-height,64px)] z-30">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-11">
          <nav className="flex items-center gap-1 text-[10px] font-semibold text-zinc-400 min-w-0">
            <Link href="/" className="hover:text-[var(--color-accent)] transition-colors shrink-0">Home</Link>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <Link href="/marketplace" className="hover:text-[var(--color-accent)] transition-colors shrink-0">Marketplace</Link>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <span className="text-zinc-600 font-bold truncate">{product.name}</span>
          </nav>
          <button className="flex items-center gap-1 text-zinc-400 hover:text-[var(--color-accent)] transition-colors text-[11px] font-semibold shrink-0 ml-4">
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px] gap-8 xl:gap-12">

          {/* ══ LEFT ══ */}
          <div className="space-y-8">

            {/* Images + Core Info */}
            <div className="grid grid-cols-1 md:grid-cols-[380px_1fr] gap-6 xl:gap-8">

              {/* Working Image Gallery */}
              <div className="space-y-3">
                <ImageGallery
                  images={images}
                  productName={product.name}
                  isFeatured={product.is_featured}
                  savings={savings}
                />

                {/* Trust Pills */}
                <div className="hidden md:grid grid-cols-3 gap-2 mt-1">
                  {[
                    { icon: <ShieldCheck className="h-3.5 w-3.5 text-green-500" />, label: "Buyer Safe" },
                    { icon: <Truck className="h-3.5 w-3.5 text-blue-500" />, label: "Fast Ship" },
                    { icon: <RefreshCw className="h-3.5 w-3.5 text-purple-500" />, label: "14-Day Return" },
                  ].map(({ icon, label }) => (
                    <div key={label} className="flex items-center justify-center gap-1.5 border border-zinc-200 bg-white rounded-lg px-2 py-2">
                      {icon}
                      <span className="text-[9px] font-black uppercase tracking-wide text-zinc-500">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Core Info */}
              <div className="flex flex-col gap-4">
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {product.product_type && (
                    <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)] border border-[var(--color-accent)]/20">
                      {product.product_type}
                    </span>
                  )}
                  <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-400">
                    Direct Sourcing
                  </span>
                </div>

                {/* Name */}
                <h1 className="text-xl sm:text-2xl font-black text-zinc-900 leading-snug">
                  {product.name}
                </h1>

                {/* Rating Row */}
                <div className="flex flex-wrap items-center gap-3 py-2.5 border-y border-zinc-100">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={cn("h-3.5 w-3.5 fill-current", i < 4 ? "text-amber-400" : "text-zinc-200")} />
                    ))}
                    <span className="text-xs font-bold text-zinc-700 ml-1">4.8</span>
                  </div>
                  <div className="h-3 w-px bg-zinc-200" />
                  <span className="text-xs text-zinc-400 flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> {product.review_count ?? 0} reviews
                  </span>
                  <span className="text-xs text-zinc-400 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> {product.sale_count ?? 120}+ sold
                  </span>
                </div>

                {/* Price */}
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-3xl font-black text-[var(--color-accent)] tracking-tight">
                      {formatCurrency(product.price)}
                    </span>
                    {product.compare_at_price && (
                      <span className="text-sm text-zinc-300 line-through font-semibold">
                        {formatCurrency(product.compare_at_price)}
                      </span>
                    )}
                    {savings && (
                      <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                        −{savings}%
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Listed on Jimvio · Bulk quotes available
                  </p>
                </div>

                {/* Short description */}
                {product.description && (
                  <p className="text-xs text-zinc-500 leading-relaxed line-clamp-4">
                    {product.description}
                  </p>
                )}

                {/* Mobile action module */}
                <div className="lg:hidden mt-1">
                  <ProductActionModule product={productProps} vendor={vendorProps} currentPath={`/marketplace/${slug}`} />
                </div>

                {/* Mobile trust pills */}
                <div className="md:hidden grid grid-cols-3 gap-1.5">
                  {[
                    { icon: <ShieldCheck className="h-3.5 w-3.5 text-green-500" />, label: "Buyer Safe" },
                    { icon: <Truck className="h-3.5 w-3.5 text-blue-500" />, label: "Fast Ship" },
                    { icon: <RefreshCw className="h-3.5 w-3.5 text-purple-500" />, label: "14-Day Return" },
                  ].map(({ icon, label }) => (
                    <div key={label} className="flex flex-col items-center gap-1 border border-zinc-200 bg-white rounded-lg px-2 py-2.5 text-center">
                      {icon}
                      <span className="text-[8px] font-black uppercase tracking-wide text-zinc-500">{label}</span>
                    </div>
                  ))}
                </div>

                {/* Vendor inline (desktop) */}
                {vendor && (
                  <div className="hidden md:flex items-center gap-3 p-2.5 rounded-lg border border-zinc-100 bg-white mt-auto">
                    <div className="h-8 w-8 rounded-md border border-zinc-100 overflow-hidden shrink-0 bg-zinc-50 flex items-center justify-center">
                      {vendor.business_logo ? (
                        <img src={vendor.business_logo} alt={vendor.business_name ?? ""} className="w-full h-full object-cover" />
                      ) : (
                        <Globe className="h-4 w-4 text-zinc-300" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-zinc-800 truncate">{vendor.business_name}</p>
                      <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                        <BadgeCheck className="h-3 w-3 text-green-500" /> Verified Supplier
                      </p>
                    </div>
                    <Link href={`/vendors/${vendor.business_slug}`} className="text-[10px] font-black uppercase tracking-widest text-[var(--color-accent)] hover:underline shrink-0">
                      View →
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
              <Tabs defaultValue="overview">
                <div className="border-b border-zinc-100 px-4">
                  <TabsList className="bg-transparent h-auto p-0 gap-0">
                    {["Overview", "Specifications", "Vendor Info", "Reviews"].map((tab) => (
                      <TabsTrigger
                        key={tab}
                        value={tab.toLowerCase().split(" ")[0]}
                        className="px-3 py-3.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-[var(--color-accent)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)] transition-colors"
                      >
                        {tab}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                <div className="p-5 sm:p-7">
                  <TabsContent value="overview" className="mt-0 focus-visible:outline-none">
                    <h3 className="text-sm font-black text-zinc-900 mb-3">Product Description</h3>
                    <div className="text-xs leading-6 text-zinc-500 whitespace-pre-wrap">
                      {product.description || "No description available."}
                    </div>
                  </TabsContent>

                  <TabsContent value="specifications" className="mt-0 focus-visible:outline-none">
                    <h3 className="text-sm font-black text-zinc-900 mb-4">Specifications</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
                      {[
                        { label: "Category", val: product.product_type ?? "—" },
                        { label: "Condition", val: "Brand New" },
                        { label: "Lead Time", val: "3–5 Business Days" },
                        { label: "Shipping", val: "Air / Sea Cargo" },
                        { label: "Min. Order", val: "1 Piece" },
                        { label: "Returns", val: "14 days" },
                      ].map(({ label, val }) => (
                        <div key={label} className="flex items-center justify-between py-3 border-b border-zinc-50">
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{label}</span>
                          <span className="text-xs font-semibold text-zinc-700">{val}</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="vendor" className="mt-0 focus-visible:outline-none">
                    {vendor ? (
                      <div className="flex flex-col sm:flex-row gap-5 items-start">
                        <div className="h-16 w-16 rounded-xl border-2 border-zinc-100 overflow-hidden bg-zinc-50 flex items-center justify-center shrink-0">
                          {vendor.business_logo ? (
                            <img src={vendor.business_logo} alt={vendor.business_name ?? ""} className="w-full h-full object-cover" />
                          ) : (
                            <Globe className="h-7 w-7 text-zinc-300" />
                          )}
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-base font-black text-zinc-900">{vendor.business_name ?? "Official Merchant"}</h4>
                            <Badge className="bg-green-50 text-green-700 border-none font-black text-[9px] uppercase tracking-wider">Top Rated</Badge>
                          </div>
                          <p className="text-xs text-zinc-500 leading-relaxed">
                            {(vendor as any).business_description ?? "A verified Jimvio merchant dedicated to global sourcing and logistics excellence."}
                          </p>
                          <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
                            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-[var(--color-accent)]" /> {(vendor as any).business_country ?? "Regional"}</span>
                            <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> 99.2% Success</span>
                          </div>
                          <Button variant="outline" size="sm" className="h-8 rounded-lg font-black text-[10px] uppercase tracking-widest border-2 px-4" asChild>
                            <Link href={`/vendors/${vendor.business_slug}`}>Visit Store</Link>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-400">No vendor information available.</p>
                    )}
                  </TabsContent>

                  <TabsContent value="reviews" className="mt-0 focus-visible:outline-none">
                    <ReviewForm productId={product.id} vendorId={product.vendor_id} />
                    {product.reviews && product.reviews.length > 0 ? (
                      <div className="mt-8 space-y-6 divide-y divide-zinc-50">
                        {product.reviews.map((rev: any, i: number) => (
                          <div key={i} className="pt-6 first:pt-0">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-full bg-[var(--color-accent-light)] flex items-center justify-center font-black text-[var(--color-accent)] text-xs shrink-0">
                                  {rev.profiles?.full_name?.charAt(0) ?? "U"}
                                </div>
                                <div>
                                  <p className="text-xs font-black text-zinc-800">{rev.profiles?.full_name ?? "Verified Buyer"}</p>
                                  <div className="flex items-center gap-0.5 mt-0.5">
                                    {Array.from({ length: 5 }).map((_, j) => (
                                      <Star key={j} className={cn("h-2.5 w-2.5 fill-current", j < rev.rating ? "text-amber-400" : "text-zinc-200")} />
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <span className="text-[10px] text-zinc-400 shrink-0">
                                {new Date(rev.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 leading-relaxed pl-10">{rev.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-8 text-center py-12 bg-zinc-50 rounded-xl border-2 border-dashed border-zinc-200">
                        <MessageSquare className="h-10 w-10 text-zinc-300 mx-auto mb-2" />
                        <p className="text-xs text-zinc-400 font-semibold">No reviews yet — be the first!</p>
                      </div>
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>

          {/* ══ SIDEBAR ══ */}
          <aside className="hidden lg:block">
            <div className="sticky top-[calc(var(--navbar-height,64px)+56px)] space-y-4">

              {/* Buy Box */}
              <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5 space-y-5">
                {/* Price */}
                <div className="space-y-1.5">
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-3xl font-black text-zinc-900 tracking-tight">
                      {formatCurrency(product.price)}
                    </span>
                    {product.compare_at_price && (
                      <span className="text-sm text-zinc-300 line-through font-semibold">
                        {formatCurrency(product.compare_at_price)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-100">
                      In Stock
                    </span>
                    {savings && (
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-50 text-red-500">
                        Save {savings}%
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                      <Truck className="h-3 w-3" /> Free Delivery
                    </span>
                  </div>
                </div>

                {/* Action Module */}
                <div className="border-t border-zinc-50 pt-5">
                  <ProductActionModule product={productProps} vendor={vendorProps} currentPath={`/marketplace/${slug}`} />
                </div>

                {/* Assurance */}
                <div className="border-t border-zinc-50 pt-4 space-y-2.5">
                  {[
                    { icon: <ShieldCheck className="h-3.5 w-3.5 text-green-500" />, text: "Escrow — funds released after delivery" },
                    { icon: <RefreshCw className="h-3.5 w-3.5 text-purple-400" />, text: "14-day return policy" },
                    { icon: <Package className="h-3.5 w-3.5 text-blue-400" />, text: "Tracked global shipping" },
                  ].map(({ icon, text }) => (
                    <div key={text} className="flex items-center gap-2 text-[10px] text-zinc-400 font-medium">
                      {icon} {text}
                    </div>
                  ))}
                </div>
              </div>

              {/* Vendor Card */}
              <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5 space-y-4">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg border-2 border-zinc-100 overflow-hidden bg-zinc-50 flex items-center justify-center shrink-0">
                    {vendor?.business_logo ? (
                      <img src={vendor.business_logo} alt={vendor.business_name ?? ""} className="w-full h-full object-cover" />
                    ) : (
                      <Globe className="h-5 w-5 text-zinc-300" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-zinc-900 leading-tight truncate">
                      {vendor?.business_name ?? "Top Supplier"}
                    </h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      <span className="text-[10px] font-semibold text-zinc-400">Verified Partner</span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 bg-zinc-50 rounded-lg p-2.5">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-0.5 text-sm font-black text-zinc-800">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {(vendor as any)?.rating ?? "4.9"}
                    </div>
                    <p className="text-[8px] font-black uppercase tracking-wider text-zinc-400 mt-0.5">Rating</p>
                  </div>
                  <div className="text-center border-x border-zinc-200">
                    <div className="text-sm font-black text-zinc-800">
                      {(() => {
                        const fc = (vendor as any)?.follower_count ?? 45;
                        return fc > 1000 ? `${(fc / 1000).toFixed(1)}k` : fc;
                      })()}
                    </div>
                    <p className="text-[8px] font-black uppercase tracking-wider text-zinc-400 mt-0.5">Followers</p>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-black text-zinc-800">99%</div>
                    <p className="text-[8px] font-black uppercase tracking-wider text-zinc-400 mt-0.5">Success</p>
                  </div>
                </div>

                {/* Meta */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-zinc-400">Origin</span>
                    <span className="font-semibold text-zinc-600 flex items-center gap-1">
                      <Globe className="h-3 w-3 text-blue-400" />
                      {(vendor as any)?.business_country ?? "Regional"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-zinc-400">Delivery Rate</span>
                    <span className="font-bold text-green-600">99.2%</span>
                  </div>
                </div>

                {/* Follow + Visit */}
                <div className="space-y-2 pt-1 border-t border-zinc-50">
                  <FollowButton
                    vendorId={vendor?.id ?? ""}
                    className="w-full h-9 rounded-lg font-black text-[10px] uppercase tracking-widest border-2 transition-all active:scale-95"
                  />
                  <Button variant="ghost" size="sm" className="w-full h-8 font-semibold text-[10px] text-zinc-400 hover:text-[var(--color-accent)] uppercase tracking-widest" asChild>
                    <Link href={`/vendors/${vendor?.business_slug}`}>
                      Visit Store Profile →
                    </Link>
                  </Button>
                </div>
              </div>

              {/* B2B Card */}
              <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-xl p-5 text-white shadow-md group">
                <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-[var(--color-accent)]/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
                <TrendingUp className="h-6 w-6 text-[var(--color-accent)] mb-3" />
                <h3 className="text-sm font-black mb-1">Bulk Pricing?</h3>
                <p className="text-white/50 text-[10px] font-medium leading-relaxed mb-4">
                  High-volume orders qualify for special B2B rates.
                </p>
                <Button className="w-full h-9 bg-[var(--color-accent)] hover:brightness-110 text-white font-black text-[10px] uppercase tracking-widest rounded-lg transition-all border-0">
                  Request Wholesale Quote
                </Button>
              </div>

            </div>
          </aside>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-16 pt-10 border-t border-zinc-200">
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-accent)] mb-1.5">Discover More</p>
                <h2 className="text-xl font-black text-zinc-900">You Might Also Like</h2>
              </div>
              <Link href="/marketplace" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-[var(--color-accent)] transition-colors flex items-center gap-1">
                View All <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
              {relatedProducts.map((p) => (
                <ProductCardClient key={p.id} p={p as any} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
