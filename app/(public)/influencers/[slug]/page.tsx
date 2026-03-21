import React from "react";
import Link from "next/link";
import Image from "next/image";
import { MessageCircle, Video, Package, User } from "lucide-react";
import { getDB, getVendorClipsWithDetails, getVendorProducts } from "@/services/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FollowButton } from "@/components/marketplace/follow-button";
import { TikTokFeed } from "@/components/influencer/tiktok-feed";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function InfluencerProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const db = await getDB();
  const { data: vendor } = await db.from("vendors").select("*").eq("business_slug", slug).eq("is_active", true).single();
  if (!vendor) notFound();

  const [clips, products] = await Promise.all([
    getVendorClipsWithDetails(vendor.id),
    getVendorProducts(vendor.id),
  ]);

  const totalLikes = clips.reduce((s, c) => s + Number(c.total_views ?? 0) * 0.12, 0);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Profile header — TikTok-style */}
      <div className="bg-white border-b border-[var(--color-border)]">
        <div className="max-w-[900px] mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="shrink-0">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[var(--color-accent)]/20 bg-[var(--color-surface-secondary)]">
                {vendor.business_logo ? (
                  <Image src={vendor.business_logo} alt={vendor.business_name} width={96} height={96} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-black text-[var(--color-accent)]">
                    {vendor.business_name?.charAt(0)}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black text-[var(--color-text-primary)]">{vendor.business_name}</h1>
              <p className="text-[var(--color-text-secondary)] mt-1 text-sm">
                {vendor.business_description || `Creator & supplier on Jimvio. ${clips.length} viral clips.`}
              </p>
              <div className="flex flex-wrap gap-4 mt-4 text-sm">
                <span className="font-black text-[var(--color-text-primary)]">
                  <strong>{clips.length}</strong> Videos
                </span>
                <span className="text-[var(--color-text-muted)] font-bold">·</span>
                <span className="font-black text-[var(--color-text-primary)]">
                  <strong>{products.length}</strong> Products
                </span>
                <span className="text-[var(--color-text-muted)] font-bold">·</span>
                <span className="font-black text-[var(--color-text-primary)]">
                  <strong>{Math.round(totalLikes / 1000)}K</strong> Likes
                </span>
              </div>
              <div className="flex gap-3 mt-5">
                <FollowButton followLabel="Follow" vendorId={vendor.id} className="rounded-xl h-10 px-6 font-black bg-[var(--color-accent)] text-white border-0" />
                <Link
                  href={`/vendors/${vendor.business_slug}`}
                  className="inline-flex items-center gap-2 rounded-xl h-10 px-6 font-bold border-2 border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                  <MessageCircle className="h-4 w-4" />
                  Visit Store
                </Link>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="videos" className="w-full">
          <TabsList className="w-full max-w-[900px] mx-auto rounded-none border-b border-[var(--color-border)] bg-transparent h-12 px-4 gap-0">
            <TabsTrigger value="videos" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--color-accent)] data-[state=active]:bg-transparent font-black">
              <Video className="h-4 w-4 mr-2" />
              Videos
            </TabsTrigger>
            <TabsTrigger value="products" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--color-accent)] data-[state=active]:bg-transparent font-black">
              <Package className="h-4 w-4 mr-2" />
              Products
            </TabsTrigger>
            <TabsTrigger value="about" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--color-accent)] data-[state=active]:bg-transparent font-black">
              <User className="h-4 w-4 mr-2" />
              About
            </TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="mt-0">
            {clips.length > 0 ? (
              <div className="max-w-[900px] mx-auto p-4">
                <TikTokFeed clips={clips} className="rounded-2xl h-[80vh] max-h-[700px]" />
              </div>
            ) : (
              <div className="max-w-[900px] mx-auto p-12 text-center text-[var(--color-text-muted)]">
                <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-bold">No videos yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="products" className="mt-0">
            <div className="max-w-[900px] mx-auto p-4">
              {products.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {products.slice(0, 12).map((p: any) => (
                    <Link
                      key={p.id}
                      href={`/marketplace/${p.slug}`}
                      className="bg-white border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="aspect-square bg-[var(--color-surface-secondary)] relative">
                        {p.images?.[0] ? (
                          <Image src={p.images[0]} alt={p.name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[var(--color-text-muted)] font-black">
                            {p.name?.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="font-bold text-[var(--color-text-primary)] text-sm line-clamp-2">{p.name}</p>
                        <p className="text-[var(--color-accent)] font-black text-sm">${Number(p.price).toFixed(2)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-[var(--color-text-muted)]">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-bold">No products listed yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="about" className="mt-0">
            <div className="max-w-[900px] mx-auto p-4">
              <div className="bg-white border border-[var(--color-border)] rounded-2xl p-6">
                <h3 className="font-black text-[var(--color-text-primary)] mb-3">About</h3>
                <p className="text-[var(--color-text-secondary)] leading-relaxed">
                  {vendor.business_description || `${vendor.business_name} is a verified creator and supplier on Jimvio. Browse videos and products above.`}
                </p>
                {vendor.business_country && (
                  <p className="text-sm text-[var(--color-text-muted)] mt-4 font-bold">Location: {vendor.business_country}</p>
                )}
                <Link href={`/vendors/${vendor.business_slug}`} className="inline-block mt-6 font-black text-[var(--color-accent)] hover:underline">
                  Visit full store →
                </Link>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
