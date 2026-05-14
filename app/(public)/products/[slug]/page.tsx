import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/services/db";
import { formatDisplayMoney } from "@/lib/utils";
import { ChevronRight, Package, ShieldCheck, Star } from "lucide-react";
import { GlassCard, GlassAmbientGlow } from "@/components/ui/glass";
import { ProductDetailActions } from "./product-detail-actions";
import { constructMetadata } from "@/lib/seo";
import { ProductJsonLd } from "@/components/seo/ProductJsonLd";
import { LocalizedPrice } from "@/components/currency/localized-price";

const siteUrl = "https://jimvio.com";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  
  if (!product) {
    return constructMetadata({
      title: "Product Not Found",
      description: "The requested product could not be found.",
    });
  }

  const images = Array.isArray(product.images) ? (product.images as string[]) : undefined;

  return constructMetadata({
    title: product.name,
    description: product.description || `Buy ${product.name} on Jimvio. Premium B2B quality and global reach.`,
    image: images?.[0] || "/jimvio-og.png",
    path: `/products/${slug}`,
    type: "product",
  });
}

export default async function ProductBySlugPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const images = Array.isArray(product.images) ? (product.images as string[]) : undefined;
  const rawV = product.vendors as unknown;
  const vendor = (Array.isArray(rawV) ? rawV[0] : rawV) as {
    id: string;
    business_name: string;
    business_slug: string;
    rating?: number;
    follower_count?: number;
  } | null;
  const mainImage = images?.[0] || null;

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "var(--color-bg)" }}>
      <ProductJsonLd 
        siteUrl={siteUrl}
        product={{
          name: product.name,
          description: product.description || undefined,
          images: images || undefined,
          price: Number(product.price),
          currency: product.currency || "USD",
          vendorName: vendor?.business_name,
        }}
      />
      {/* Premium Dashboard Accents */}
      <GlassAmbientGlow color="orange" position="top-right" className="opacity-30" />
      <GlassAmbientGlow color="indigo" position="bottom-left" className="opacity-10" />

      {/* Breadcrumb Strip */}
      <div className="relative z-20 border-b border-stone-200/60 bg-white dark:bg-surface/40 backdrop-blur-md">
        <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 py-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-stone-400">
          <Link href="/" className="hover:text-orange-500 transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/marketplace" className="hover:text-orange-500 transition-colors">Marketplace</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-stone-900 dark:text-white border-b border-orange-500 pb-0.5">{product.name}</span>
        </div>
      </div>

      <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 py-10 lg:py-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,420px] gap-12 items-start">
          {/* Image Section */}
          <GlassCard className="aspect-square bg-white dark:bg-surface flex items-center justify-center overflow-hidden group border-white/80 shadow-2xl">
            {mainImage ? (
              <img 
                src={mainImage} 
                alt={product.name} 
                className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105" 
              />
            ) : (
              <Package className="h-24 w-24 text-stone-100" />
            )}
          </GlassCard>

          {/* Details Sidebar — Command Center Style */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                 <span className="px-3 py-1 rounded-full bg-orange-50 border border-orange-200/50 text-orange-600 text-[10px] font-black uppercase tracking-widest">
                   Verified Listing
                 </span>
                 <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                   {String(product.product_type)}
                 </span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl font-black text-stone-900 dark:text-white leading-[1.1] tracking-tight">
                {product.name}
              </h1>

              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-black text-orange-600">
                  <LocalizedPrice 
                    amount={Number(product.price)} 
                    currency={product.currency} 
                    period={product.pricing_type === "recurring" ? product.billing_period : null}
                  />
                </span>
                <span className="text-sm font-bold text-stone-400 line-through opacity-50">
                   {product.compare_at_price ? formatDisplayMoney(Number(product.compare_at_price), product.currency) : ""}
                </span>
              </div>
            </div>

            {/* Vendor Profile Card */}
            {vendor && (
              <GlassCard className="p-6 border-white/70 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                  <ShieldCheck className="h-12 w-12 text-orange-500" />
                </div>
                <div className="flex items-center justify-between gap-4 relative z-10">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-1">Authenticated Vendor</p>
                    <Link href={`/vendors/${vendor.business_slug}`} className="text-[18px] font-black text-stone-900 dark:text-white hover:text-orange-500 transition-colors truncate block">
                      {vendor.business_name}
                    </Link>
                    <div className="flex items-center gap-3 mt-2">
                       <span className="text-[11px] font-bold text-stone-600 flex items-center gap-1">
                          <Star className="h-3 w-3 fill-orange-400 text-orange-400" /> 
                          {vendor.rating ?? "No reviews"}
                       </span>
                       <span className="h-1 w-1 rounded-full bg-stone-200" />
                       <span className="text-[11px] font-bold text-stone-500">
                          {vendor.follower_count ?? 0} Global Customers
                       </span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            )}

            <div className="space-y-4">
               <p className="text-stone-500 font-medium leading-relaxed text-[15px] border-l-4 border-orange-500 pl-4 py-2 bg-orange-50/30 rounded-r-xl">
                 {product.description || product.short_description || "No extensive description provided by the vendor."}
               </p>
            </div>

            {/* Action Terminal */}
            <GlassCard className="p-1.5 rounded-[32px] bg-white dark:bg-surface/40 border-white/80 overflow-hidden">
               <ProductDetailActions
                productId={product.id}
                vendorId={product.vendor_id}
                buttonText={product.button_text}
                productType={product.product_type}
              />
            </GlassCard>

            <div className="flex items-center gap-2 px-2">
               <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
               <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                 Trade Operations Online · Secure Multi-Currency Gateway
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
