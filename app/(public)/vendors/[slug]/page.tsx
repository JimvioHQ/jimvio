import React from "react";
import Link from "next/link";
import { 
  Star, 
  MapPin, 
  ShieldCheck, 
  Package, 
  MessageCircle,
  Globe, 
  Share2, 
  Heart,
  Search,
  CheckCircle2,
  Users,
  Send,
  Video,
  Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAdminDB, getVendorProducts, getVendorClipsWithDetails } from "@/services/db";
import { ProductCardClient } from "@/components/marketplace/product-card-client";
import { FollowButton } from "@/components/marketplace/follow-button";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function VendorStorePage({ params }: PageProps) {
  const { slug } = await params;
  const admin = getAdminDB();
  
  // Fetch vendor by slug from DB
  const { data: vendor } = await admin
    .from("vendors")
    .select("*")
    .eq("business_slug", slug)
    .single();

  if (!vendor) {
    notFound();
  }

  const [products, clips] = await Promise.all([
    getVendorProducts(vendor.id),
    getVendorClipsWithDetails(vendor.id),
  ]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Vendor Cover */}
      <div className="h-64 bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-hover)] relative">
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
      </div>

      <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 -mt-32 relative z-10 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,300px] gap-8">
          
          <div className="space-y-8">
            {/* Vendor Header Card */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-8 shadow-xl">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="h-32 w-32 rounded-2xl bg-white shadow-lg border border-[var(--color-border)] p-2 shrink-0">
                  {vendor.business_logo ? (
                    <img src={vendor.business_logo} alt={vendor.business_name} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <div className="w-full h-full bg-[var(--color-accent-light)] flex items-center justify-center text-4xl font-black text-[var(--color-accent)]">
                      {vendor.business_name.charAt(0)}
                    </div>
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <h1 className="text-3xl font-black text-[var(--color-text-primary)]">{vendor.business_name}</h1>
                    <Badge className="bg-green-50 text-green-600 border border-green-200 font-bold">
                      <ShieldCheck className="h-3 w-3 mr-1" /> VERIFIED SUPPLIER
                    </Badge>
                  </div>
                  
                  <p className="text-[var(--color-text-secondary)] mb-6 max-w-2xl">
                    {vendor.about || `Welcome to ${vendor.business_name}. We are a professional manufacturer and distributor based in ${vendor.business_country || "Africa"}, dedicated to providing high-quality products to creators and businesses globally.`}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                    <div>
                      <p className="text-xs text-[var(--color-text-muted)] font-bold capitalize mb-1">Rating</p>
                      <div className="flex items-center gap-1 font-black text-lg">
                        <Star className="h-4 w-4 fill-[#f59e0b] text-[#f59e0b]" /> {vendor.rating || "4.9"}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--color-text-muted)] font-bold capitalize mb-1">Experience</p>
                      <p className="font-black text-lg">5+ Years</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--color-text-muted)] font-bold capitalize mb-1">Followers</p>
                      <p className="font-black text-lg">
                        {(vendor.follower_count || 0) > 1000 ? `${((vendor.follower_count || 0) / 1000).toFixed(1)}k` : vendor.follower_count || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--color-text-muted)] font-bold capitalize mb-1">Country</p>
                      <p className="font-black text-lg flex items-center gap-1">
                         {vendor.business_country || "Global"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Tabs */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm overflow-hidden">
              <Tabs defaultValue="products">
                <TabsList className="bg-transparent border-b border-[var(--color-border)] w-full justify-start h-auto rounded-none p-0">
                  <TabsTrigger value="products" className="py-4 px-8 font-black rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)] data-[state=active]:text-[var(--color-accent)]">
                    Products ({products.length})
                  </TabsTrigger>
                  <TabsTrigger value="videos" className="py-4 px-8 font-black rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)] data-[state=active]:text-[var(--color-accent)]">
                    Videos ({clips.length})
                  </TabsTrigger>
                  <TabsTrigger value="profile" className="py-4 px-8 font-black rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)] data-[state=active]:text-[var(--color-accent)]">
                    Company Profile
                  </TabsTrigger>
                  <TabsTrigger value="capabilities" className="py-4 px-8 font-black rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)] data-[state=active]:text-[var(--color-accent)]">
                    Capabilities
                  </TabsTrigger>
                </TabsList>
                
                <div className="p-8">
                  <TabsContent value="products" className="mt-0">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
                        <input placeholder="Search in this store..." className="w-full h-11 pl-10 pr-4 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-xl text-sm outline-none focus:border-[var(--color-accent)]" />
                      </div>
                      <select className="h-11 px-4 border border-[var(--color-border)] rounded-xl text-sm font-bold bg-white">
                        <option>Sort by: Newest</option>
                        <option>Sort by: Bestselling</option>
                        <option>Sort by: Price Low to High</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      {products.map((p) => (
                        <ProductCardClient key={p.id} p={p as any} />
                      ))}
                    </div>
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
                              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-[var(--color-accent)] transition-colors">
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
                      <p className="text-lg leading-relaxed mb-6">{vendor.about || "This supplier has not provided a detailed biography yet."}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
                        <div className="space-y-4">
                          <h4 className="font-bold text-[var(--color-text-primary)] border-b pb-2">Business Type</h4>
                          <p>Manufacturer, Trading Company</p>
                          <h4 className="font-bold text-[var(--color-text-primary)] border-b pb-2">Main Products</h4>
                          <p>Industrial components, electronics, customized gear</p>
                        </div>
                        <div className="space-y-4">
                          <h4 className="font-bold text-[var(--color-text-primary)] border-b pb-2">Total Annual Revenue</h4>
                          <p>US$10 Million - US$50 Million</p>
                          <h4 className="font-bold text-[var(--color-text-primary)] border-b pb-2">Certifications</h4>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">ISO 9001</Badge>
                            <Badge variant="outline">CE</Badge>
                            <Badge variant="outline">RoHS</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>

          {/* Contact Actions Sidebar */}
          <aside className="space-y-6">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm sticky top-[150px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-lg text-[var(--color-text-primary)]">Store Actions</h3>
                <div className="h-px flex-1 ml-4 bg-[var(--color-border)] opacity-50" />
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                <Button className="w-full bg-ink-dark hover:opacity-90 font-black text-[13px] h-12 rounded-xl shadow-lg shadow-ink-dark/20" asChild>
                  <Link href="/messages">
                    <MessageCircle className="mr-2 h-4 w-4" /> Chat Now
                  </Link>
                </Button>
                  <Button variant="outline" className="w-full font-black text-[13px] h-12 rounded-xl border-2 hover:bg-[var(--color-surface-secondary)]">
                    <Share2 className="mr-2 h-4 w-4" /> Share
                  </Button>
                </div>
                
                {vendor.id && <FollowButton vendorId={vendor.id} className="w-full h-12 font-black text-[13px] rounded-xl border-2" />}
              </div>

              <div className="mt-8 pt-8 border-t border-[var(--color-border)] space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="font-medium">On-time Delivery</span>
                  </div>
                  <span className="font-black text-green-600">99.2%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Followers</span>
                  </div>
                  <span className="font-black text-[var(--color-text-primary)]">
                    {(vendor.follower_count || 0) > 1000 ? `${((vendor.follower_count || 0) / 1000).toFixed(1)}k` : vendor.follower_count || 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-ink-dark text-white rounded-2xl p-6">
              <h4 className="font-black text-lg mb-3">Custom Sourcing</h4>
              <p className="text-white/60 text-sm mb-6">Need something custom built? This supplier offers OEM/ODM services.</p>
              <Button className="w-full bg-white text-text-primary hover:bg-white/90 font-black h-12 rounded-xl">
                Send RFQ
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
