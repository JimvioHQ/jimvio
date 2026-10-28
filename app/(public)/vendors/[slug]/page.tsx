import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import {
  Star,
  ShieldCheck,
  Package,
  MessageCircle,
  Share2,
  CheckCircle2,
  Users,
  Video,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAdminDB, queryVendorStoreProducts, getVendorClipsWithDetails } from "@/services/db";
import { getCartProductIds, getFollowedVendorIds } from "@/lib/actions/marketplace";
import { ProductCardClient } from "@/components/marketplace/product-card-client";
import { StoreProductControls } from "@/components/marketplace/store-product-controls";
import { FollowButton } from "@/components/marketplace/follow-button";
import { notFound, redirect } from "next/navigation";
import {
  formatFollowerCount,
  formatStoreRating,
  formatStoreSales,
  storefrontFollowerCount,
  storefrontLogoSrc,
} from "@/lib/marketplace/store-display";
import {
  DEFAULT_STORE_PRODUCT_PAGE_SIZE,
  buildStoreProductsHref,
  parseStorePage,
  parseStoreProductSort,
  parseStoreSearchQuery,
} from "@/lib/marketplace/store-product-query";
import { constructMetadata, truncateDescription } from "@/lib/seo";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { FinancialRiskNotice } from "@/components/compliance/FinancialRiskNotice";
import { TrustReceipt } from "@/components/trust/TrustReceipt";
import { ShareLinkButton } from "@/components/marketplace/share-link-button";
import { loadStoreTrustFacts } from "@/lib/trust/store-receipt";
import { isFinancialRiskTopic } from "@/lib/compliance/financial-risk";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "jimvio-dropshipping") {
    redirect("/vendors/jimvio-store");
  }
  const admin = getAdminDB();
  const { data: vendor } = await admin
    .from("vendors")
    .select("business_name, business_description, business_logo, business_banner")
    .eq("business_slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!vendor) return { title: "Store not found" };

  return constructMetadata({
    title: vendor.business_name ?? "Vendor store",
    description: truncateDescription(
      vendor.business_description ?? `Shop ${vendor.business_name} on Jimvio.`,
    ),
    image: vendor.business_banner ?? vendor.business_logo ?? undefined,
    path: `/vendors/${slug}`,
  });
}

export default async function VendorStorePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  if (slug === "jimvio-dropshipping") {
    redirect("/vendors/jimvio-store");
  }
  const admin = getAdminDB();

  const searchQuery = parseStoreSearchQuery(sp.q);
  const sort = parseStoreProductSort(sp.sort);
  const page = parseStorePage(sp.page);
  const pageSize = DEFAULT_STORE_PRODUCT_PAGE_SIZE;
  const offset = (page - 1) * pageSize;
  
  // Fetch vendor by slug from DB
  const { data: vendorData } = await admin
    .from("vendors")
    .select("*")
    .eq("business_slug", slug)
    .single();

  if (!vendorData) {
    notFound();
  }

  const vendor = vendorData as any;

  const [productPage, clips, cartProductIds, followedVendorIds, trustFacts] = await Promise.all([
    queryVendorStoreProducts(vendor.id, {
      search: searchQuery || undefined,
      sort,
      limit: pageSize,
      offset,
    }),
    getVendorClipsWithDetails(vendor.id),
    getCartProductIds().catch(() => [] as string[]),
    getFollowedVendorIds().catch(() => [] as string[]),
    loadStoreTrustFacts(admin, vendor, 0),
  ]);

  const products = productPage.products;
  const totalProducts = productPage.total;
  trustFacts.liveProducts = totalProducts;
  const totalPages = Math.max(1, Math.ceil(totalProducts / pageSize));
  const cartSet = new Set(cartProductIds);
  const isFollowing = followedVendorIds.includes(vendor.id);
  const storeRating = formatStoreRating(vendor);
  const storeSales = formatStoreSales(vendor.total_sales);
  const followerCount = storefrontFollowerCount(vendor);
  const isVerified = vendor.verification_status === "verified";

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Vendors", path: "/vendors" },
          { name: vendor.business_name ?? "Store", path: `/vendors/${slug}` },
        ]}
      />
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Vendor Cover */}
      <div className="h-64 relative bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-hover)] overflow-hidden">
        {vendor.business_banner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vendor.business_banner}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 -mt-32 relative z-10 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,300px] gap-8">
          
          <div className="space-y-8">
            {/* Vendor Header Card */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-8 shadow-xl">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="h-32 w-32 rounded-2xl bg-[var(--color-surface)] dark:bg-[var(--color-surface)] shadow-lg border border-[var(--color-border)] p-2 shrink-0">
                  {storefrontLogoSrc(vendor) ? (
                    <img src={storefrontLogoSrc(vendor)!} alt={vendor.business_name} className="w-full h-full object-contain rounded-xl" />
                  ) : (
                    <div className="w-full h-full bg-[var(--color-accent-light)] flex items-center justify-center text-4xl font-black text-[var(--color-accent)]">
                      {vendor.business_name.charAt(0)}
                    </div>
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <h1 className="text-3xl font-black text-[var(--color-text-primary)]">{vendor.business_name}</h1>
                    {vendor.verification_status === "verified" && (
                      <Badge className="bg-green-50 text-green-600 border border-green-200 font-bold">
                        <ShieldCheck className="h-3 w-3 mr-1" /> VERIFIED STORE
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-[var(--color-text-secondary)] mb-6 max-w-2xl">
                    {vendor.business_description || vendor.about || `Welcome to ${vendor.business_name}. Shop creator-ready products from this Jimvio storefront.`}
                  </p>
                  {isFinancialRiskTopic({ name: vendor.business_name, tagline: vendor.business_description }) ? (
                    <FinancialRiskNotice className="mb-6 rounded-lg border" />
                  ) : null}

                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <p className="text-xs text-[var(--color-text-muted)] font-bold capitalize mb-1">Rating</p>
                      {storeRating.hasRating ? (
                        <div>
                          <div className="flex items-center gap-1 font-black text-lg">
                            <Star className="h-4 w-4 fill-[#f59e0b] text-[#f59e0b]" />
                            {storeRating.label}
                          </div>
                          {storeRating.reviewLabel && (
                            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                              {storeRating.reviewLabel}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="font-semibold text-[15px] text-[var(--color-text-muted)]">
                          No ratings yet
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-[var(--color-text-muted)] font-bold capitalize mb-1">Sales</p>
                      <p className="font-black text-lg">{storeSales.label}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--color-text-muted)] font-bold capitalize mb-1">Followers</p>
                      <p className="font-black text-lg">
                        {formatFollowerCount(followerCount)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Tabs */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm overflow-hidden">
              <Tabs defaultValue="products">
                <TabsList className="bg-transparent border-b border-[var(--color-border)] w-full justify-start h-auto rounded-sm p-0">
                  <TabsTrigger value="products" className="py-4 px-8 font-black rounded-sm data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)] data-[state=active]:text-[var(--color-accent)]">
                    Products ({totalProducts})
                  </TabsTrigger>
                  <TabsTrigger value="videos" className="py-4 px-8 font-black rounded-sm data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)] data-[state=active]:text-[var(--color-accent)]">
                    Videos ({clips.length})
                  </TabsTrigger>
                  <TabsTrigger value="profile" className="py-4 px-8 font-black rounded-sm data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)] data-[state=active]:text-[var(--color-accent)]">
                    Company Profile
                  </TabsTrigger>
                </TabsList>
                
                <div className="p-8">
                  <TabsContent value="products" className="mt-0">
                    <StoreProductControls
                      key={`${searchQuery}::${sort}`}
                      slug={slug}
                      initialQuery={searchQuery}
                      initialSort={sort}
                      resultCount={totalProducts}
                      totalCount={totalProducts}
                    />

                    {products.length > 0 ? (
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                          {products.map((p) => (
                            <ProductCardClient
                              key={p.id}
                              p={{
                                ...(p as any),
                                vendors: (p as any).vendors ?? {
                                  id: vendor.id,
                                  business_name: vendor.business_name,
                                  business_slug: vendor.business_slug,
                                  business_logo: vendor.business_logo,
                                  verification_status: vendor.verification_status,
                                },
                              }}
                              initialInCart={cartSet.has(p.id)}
                            />
                          ))}
                        </div>

                        {totalPages > 1 && (
                          <div className="mt-8 flex items-center justify-center gap-3">
                            {page > 1 ? (
                              <Link
                                href={buildStoreProductsHref({
                                  slug,
                                  q: searchQuery,
                                  sort,
                                  page: page - 1,
                                })}
                                className="h-10 rounded-xl border border-[var(--color-border)] px-4 text-sm font-semibold hover:bg-[var(--color-surface-secondary)]"
                              >
                                Previous
                              </Link>
                            ) : null}
                            <span className="text-sm text-[var(--color-text-muted)]">
                              Page {page} of {totalPages}
                            </span>
                            {page < totalPages ? (
                              <Link
                                href={buildStoreProductsHref({
                                  slug,
                                  q: searchQuery,
                                  sort,
                                  page: page + 1,
                                })}
                                className="h-10 rounded-xl border border-[var(--color-border)] px-4 text-sm font-semibold hover:bg-[var(--color-surface-secondary)]"
                              >
                                Next
                              </Link>
                            ) : null}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="py-16 text-center text-[var(--color-text-muted)]">
                        <Package className="mx-auto mb-4 h-12 w-12 opacity-50" />
                        <p className="font-bold text-[var(--color-text-primary)]">
                          {searchQuery ? "No products found" : "No products yet"}
                        </p>
                        <p className="mt-1 text-sm">
                          {searchQuery
                            ? "Try another search term."
                            : "This store has not published products yet."}
                        </p>
                        {searchQuery ? (
                          <Link
                            href={buildStoreProductsHref({ slug, sort })}
                            className="mt-4 inline-flex h-10 items-center rounded-xl bg-[var(--color-text-primary)] px-4 text-sm font-semibold text-[var(--color-surface)]"
                          >
                            Clear search
                          </Link>
                        ) : null}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="videos" className="mt-0">
                    {clips.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {clips.map((clip: any) => (
                          <Link
                            key={clip.id}
                            href={`/influencers/${vendor.business_slug}`}
                            className="group aspect-[9/16] rounded-xl overflow-hidden bg-ink-dark relative border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-all"
                          >
                            <div
                              className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform"
                              style={{ backgroundImage: clip.thumbnail_url ? `url(${clip.thumbnail_url})` : "linear-gradient(to bottom, var(--color-bg-dark), #431407)" }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-ink-darker/80 to-transparent" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-14 h-14 rounded-full bg-white dark:bg-surface/20 flex items-center justify-center group-hover:bg-[var(--color-accent)] transition-colors">
                                <Play className="h-7 w-7 text-white fill-white ml-1" />
                              </div>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                              <p className="text-sm font-bold line-clamp-2">{clip.title}</p>
                              <p className="text-xs text-white/70 mt-1">{(clip.total_views ?? 0).toLocaleString()} views</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="py-16 text-center text-[var(--color-text-muted)]">
                        <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="font-bold">No videos yet</p>
                        <p className="text-sm mt-1">Viral clips from this store will appear here.</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="profile" className="mt-0">
                    <div className="prose prose-sm max-w-none text-[var(--color-text-secondary)]">
                      <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">About {vendor.business_name}</h3>
                      <p className="text-lg leading-relaxed mb-6">
                        {vendor.about || vendor.business_description || "This store has not provided a company profile yet."}
                      </p>
                      {(vendor.business_type || vendor.main_products) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
                          {vendor.business_type && (
                            <div className="space-y-2">
                              <h4 className="font-bold text-[var(--color-text-primary)] border-b pb-2">Business Type</h4>
                              <p>{vendor.business_type}</p>
                            </div>
                          )}
                          {vendor.main_products && (
                            <div className="space-y-2">
                              <h4 className="font-bold text-[var(--color-text-primary)] border-b pb-2">Main Products</h4>
                              <p>{vendor.main_products}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>

          {/* Contact Actions Sidebar */}
          <aside className="space-y-6">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm sticky top-[calc(var(--navbar-height)+20px)]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-lg text-[var(--color-text-primary)]">Store Actions</h3>
                <div className="h-px flex-1 ml-4 bg-[var(--color-border)] opacity-50" />
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                <Button className="w-full bg-ink-dark hover:opacity-90 font-black text-[13px] h-12 rounded-xl shadow-lg shadow-ink-dark/20" asChild>
                  <Link href={`/messages?vendor=${vendor.id}`}>
                    <MessageCircle className="mr-2 h-4 w-4" /> Chat Now
                  </Link>
                </Button>
                  <ShareLinkButton
                    title={vendor.business_name ?? "Jimvio store"}
                    className="w-full font-black text-[13px] h-12 rounded-xl border-2 hover:bg-[var(--color-surface-secondary)]"
                  />
                </div>
                
                {vendor.id && <FollowButton vendorId={vendor.id} initialFollowing={isFollowing} className="w-full h-12 font-black text-[13px] rounded-xl border-2" />}
              </div>

              <div className="mt-8 pt-8 border-t border-[var(--color-border)] space-y-4">
                <TrustReceipt facts={trustFacts} />
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Followers</span>
                  </div>
                  <span className="font-black text-[var(--color-text-primary)]">
                    {formatFollowerCount(followerCount)}
                  </span>
                </div>
              </div>
            </div>

          </aside>
        </div>
      </div>
    </div>
    </>
  );
}
