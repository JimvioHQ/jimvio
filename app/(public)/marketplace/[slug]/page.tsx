import React from "react";
import Link from "next/link";
import {
  Star,
  MapPin,
  ShieldCheck,
  Clock,
  Package,
  MessageSquare,
  CheckCircle2,
  Globe,
  Share2,
  Heart,
  ChevronRight,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getProductBySlug, getTrendingProducts } from "@/services/db";
import { formatCurrency } from "@/lib/utils";
import { ProductCardClient } from "@/components/marketplace/product-card-client";
import { BuyButton } from "@/components/marketplace/buy-button";
import { FollowButton } from "@/components/marketplace/follow-button";
import { ReviewForm } from "@/components/marketplace/review-form";
import { ProductChatTrigger } from "@/components/marketplace/product-chat-trigger";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const relatedProducts = await getTrendingProducts(4);
  const mainImage = product.images?.[0] || null;
  const vendor = product.vendors;
  const categories = product.product_categories;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Breadcrumbs */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] py-3">
        <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
          <Link href="/" className="hover:text-[var(--color-accent)] transition-colors">Home</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/marketplace" className="hover:text-[var(--color-accent)] transition-colors">Marketplace</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-[var(--color-text-primary)] font-medium line-clamp-1">{product.name}</span>
        </div>
      </div>

      <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-8">
          
          {/* Main Info */}
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-[var(--shadow-sm)]">
              {/* Image Gallery */}
              <div className="space-y-4">
                <div className="aspect-square bg-[#f9f9fb] rounded-xl overflow-hidden border border-[#eee] flex items-center justify-center p-4">
                  {mainImage ? (
                    <img src={mainImage} alt={product.name} className="w-full h-full object-contain" />
                  ) : (
                    <Package className="h-20 w-20 text-[#ccc]" />
                  )}
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {product.images?.slice(0, 4).map((img: string, i: number) => (
                    <div key={i} className="aspect-square bg-[#f9f9fb] rounded-lg border border-[#eee] p-1 cursor-pointer hover:border-[var(--color-accent)] transition-all">
                      <img src={img} alt={product.name} className="w-full h-full object-contain rounded-md" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Product Info */}
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-[var(--color-accent-light)] text-[var(--color-accent)] border-none">
                    {product.product_type?.toUpperCase()}
                  </Badge>
                  {product.is_featured && (
                    <Badge className="bg-ink-dark text-white border-none">BEST SELLER</Badge>
                  )}
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-[var(--color-text-primary)] leading-tight mb-4">
                  {product.name}
                </h1>
                
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-1 text-[#f59e0b]">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="font-bold text-sm">{product.rating || "4.8"}</span>
                  </div>
                  <span className="text-[var(--color-text-muted)] text-sm">{product.review_count || 0} reviews</span>
                  <span className="text-[var(--color-text-muted)] text-sm">|</span>
                  <span className="text-[var(--color-text-muted)] text-sm">{product.sale_count || 0} sold</span>
                </div>

                <div className="bg-[var(--color-surface-secondary)] rounded-xl p-5 mb-6">
                  <div className="flex items-baseline gap-3 mb-1">
                    <span className="text-3xl font-black text-[var(--color-accent)]">
                      {formatCurrency(product.price)}
                    </span>
                    {product.compare_at_price && (
                      <span className="text-lg text-[var(--color-text-muted)] line-through">
                        {formatCurrency(product.compare_at_price)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] font-medium">Inclusive of all taxes</p>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium">Ready to ship - Global Sourcing</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-blue-500" />
                    <span className="text-sm font-medium">Buyer Protection & Quality Assurance</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-orange-500" />
                    <span className="text-sm font-medium">Lead time: 3-5 business days</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-auto">
                  <BuyButton 
                    productId={product.id} 
                    className="flex-1 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] font-bold rounded-xl h-14" 
                  />
                  <ProductChatTrigger
                    variant="outline"
                    className="flex-1 font-bold rounded-xl h-14 border-2"
                    vendor={vendor ? { id: vendor.id, business_name: vendor.business_name ?? null, business_logo: vendor.business_logo ?? null, business_slug: vendor.business_slug ?? null } : undefined}
                    product={{ id: product.id, name: product.name, slug: product.slug, price: Number(product.price), images: product.images ?? null }}
                    currentPath={`/marketplace/${slug}`}
                  >
                    <MessageSquare className="mr-2 h-5 w-5" /> Chat Now
                  </ProductChatTrigger>
                </div>
              </div>
            </div>

            {/* Details Tabs */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-[var(--shadow-sm)]">
              <Tabs defaultValue="details">
                <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b border-[var(--color-border)] rounded-none">
                  <TabsTrigger value="details" className="py-4 px-8 data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)] data-[state=active]:text-[var(--color-accent)] data-[state=active]:bg-transparent rounded-none font-bold">Details</TabsTrigger>
                  <TabsTrigger value="specs" className="py-4 px-8 data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)] data-[state=active]:text-[var(--color-accent)] data-[state=active]:bg-transparent rounded-none font-bold">Specifications</TabsTrigger>
                  <TabsTrigger value="reviews" className="py-4 px-8 data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)] data-[state=active]:text-[var(--color-accent)] data-[state=active]:bg-transparent rounded-none font-bold">Reviews ({product.review_count || 0})</TabsTrigger>
                </TabsList>
                <div className="p-8">
                  <TabsContent value="details" className="mt-0">
                    <div className="prose prose-sm max-w-none text-[var(--color-text-secondary)]">
                      <div className="text-lg leading-relaxed whitespace-pre-wrap break-words">
                        {product.description?.trim() || "No detailed description provided."}
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="specs" className="mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-[var(--color-surface-secondary)] p-4 rounded-lg flex justify-between">
                        <span className="font-medium text-[var(--color-text-secondary)]">Material</span>
                        <span className="font-bold">Premium Sourcing</span>
                      </div>
                      <div className="bg-[var(--color-surface-secondary)] p-4 rounded-lg flex justify-between">
                        <span className="font-medium text-[var(--color-text-secondary)]">Condition</span>
                        <span className="font-bold">New</span>
                      </div>
                      <div className="bg-[var(--color-surface-secondary)] p-4 rounded-lg flex justify-between">
                        <span className="font-medium text-[var(--color-text-secondary)]">Weight</span>
                        <span className="font-bold">N/A</span>
                      </div>
                      <div className="bg-[var(--color-surface-secondary)] p-4 rounded-lg flex justify-between">
                        <span className="font-medium text-[var(--color-text-secondary)]">Dimension</span>
                        <span className="font-bold">N/A</span>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="reviews" className="mt-0">
                    <ReviewForm productId={product.id} vendorId={product.vendor_id} />
                    {product.reviews && product.reviews.length > 0 ? (
                      <div className="space-y-6">
                        {product.reviews.map((rev: any, i: number) => (
                          <div key={i} className="border-b border-[var(--color-border)] last:border-none pb-6">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-[var(--color-accent-light)] flex items-center justify-center font-bold text-[var(--color-accent)]">
                                  {rev.profiles?.full_name?.charAt(0) || "U"}
                                </div>
                                <div>
                                  <p className="font-bold text-sm">{rev.profiles?.full_name || "Verified User"}</p>
                                  <div className="flex items-center gap-1 text-[#f59e0b]">
                                    {Array.from({ length: 5 }).map((_, j) => (
                                      <Star key={j} className={cn("h-3 w-3 fill-current", j >= rev.rating && "text-gray-200")} />
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <span className="text-xs text-[var(--color-text-muted)]">{new Date(rev.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm text-[var(--color-text-secondary)]">{rev.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <MessageSquare className="h-12 w-12 text-[var(--color-border)] mx-auto mb-4" />
                        <p className="text-[var(--color-text-secondary)]">No reviews yet. Be the first to review!</p>
                      </div>
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>

          {/* Sticky Sidebar (Vendor Info) */}
          <aside>
            <div className="sticky top-[150px] space-y-6">
              {/* Vendor Card */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-[var(--shadow-sm)]">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-16 w-16 rounded-xl bg-[var(--color-accent-light)] border border-[var(--color-accent-subtle)] flex items-center justify-center overflow-hidden shrink-0">
                    {vendor?.business_logo ? (
                      <img src={vendor.business_logo} alt={vendor.business_name} className="w-full h-full object-cover" />
                    ) : (
                      <Globe className="h-8 w-8 text-[var(--color-accent)]" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-[var(--color-text-primary)] leading-tight mb-1">
                      {vendor?.business_name || "Global Supplier"}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-green-600 font-bold capitalize tracking-wider">
                      <ShieldCheck className="h-3 w-3" /> {vendor?.verification_status || "Verified"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4 mt-2">
                  <h4 className="text-[12px] font-black text-[var(--color-text-muted)] capitalize tracking-[0.2em]">Store Actions</h4>
                  <div className="h-px flex-1 ml-4 bg-[var(--color-border)] opacity-50" />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-[var(--color-surface-secondary)] p-3 rounded-xl text-center border border-[var(--color-border)]/50">
                    <p className="text-[10px] text-[var(--color-text-muted)] font-black capitalize tracking-wider mb-1">Store Rating</p>
                    <div className="flex items-center justify-center gap-1 text-sm font-black text-[var(--color-text-primary)]">
                      <Star className="h-3.5 w-3.5 fill-[#f59e0b] text-[#f59e0b]" /> {vendor?.rating || "4.9"}
                    </div>
                  </div>
                  <div className="bg-[var(--color-surface-secondary)] p-3 rounded-xl text-center border border-[var(--color-border)]/50">
                    <p className="text-[10px] text-[var(--color-text-muted)] font-black capitalize tracking-wider mb-1">Followers</p>
                    <p className="text-sm font-black text-[var(--color-text-primary)]">
                       {(vendor?.follower_count || 0) > 1000 ? `${((vendor?.follower_count || 0) / 1000).toFixed(1)}k` : vendor?.follower_count || 0}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-text-secondary)] font-medium">Location</span>
                    <span className="font-bold flex items-center gap-1 text-[var(--color-text-primary)]"><MapPin className="h-3 w-3 text-[var(--color-accent)]" /> {vendor?.business_country || "Rwanda"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-text-secondary)] font-medium">On-time delivery</span>
                    <span className="font-black text-green-600">99.2%</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <ProductChatTrigger
                        className="w-full bg-ink-dark hover:opacity-90 font-black text-[12px] h-11 rounded-xl shadow-lg shadow-ink-dark/20"
                        vendor={vendor ? { id: vendor.id, business_name: vendor.business_name ?? null, business_logo: vendor.business_logo ?? null, business_slug: vendor.business_slug ?? null } : undefined}
                        product={{ id: product.id, name: product.name, slug: product.slug, price: Number(product.price), images: product.images ?? null }}
                        currentPath={`/marketplace/${slug}`}
                      >
                        <MessageCircle className="mr-2 h-4 w-4" /> Chat with Supplier
                      </ProductChatTrigger>
                    <Button variant="outline" className="w-full font-black text-[12px] h-11 rounded-xl border-2 hover:bg-[var(--color-surface-secondary)]">
                      <Share2 className="mr-2 h-4 w-4" /> Share Store
                    </Button>
                  </div>
                  {vendor?.id && <FollowButton vendorId={vendor.id} className="w-full h-11 font-black text-[12px] rounded-xl border-2" />}
                  <Button variant="ghost" className="w-full font-black text-[11px] h-10 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-accent)] capitalize tracking-widest" asChild>
                    <Link href={`/vendors/${vendor?.business_slug}`}>Visit Official Store →</Link>
                  </Button>
                </div>
              </div>

              {/* Action Card */}
              <div className="bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-hover)] rounded-2xl p-6 text-white shadow-xl shadow-[var(--color-accent)]/20">
                <Package className="h-10 w-10 mb-4 opacity-30" />
                <h3 className="text-xl font-black mb-2">Want a bulk discount?</h3>
                <p className="text-white/80 text-sm mb-6">Contact the supplier directly for specialized B2B pricing and shipping quotes.</p>
                <Button className="w-full bg-white text-[var(--color-accent)] hover:bg-white/90 font-black h-12 rounded-xl border-none">
                  Request Bulk Quote
                </Button>
              </div>
            </div>
          </aside>
        </div>

        {/* Related Products */}
        <div className="mt-20">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-[var(--color-text-primary)]">Related Products</h2>
            <Link href="/marketplace" className="text-[var(--color-accent)] font-bold text-sm hover:underline">View All</Link>
          </div>
          <div className="product-grid sm:grid-cols-3 lg:grid-cols-4 sm:gap-6">
            {relatedProducts.map((p) => (
              <ProductCardClient key={p.id} p={p as any} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
