import React from "react";
import type { Metadata } from "next";
import { getDB, getVendorClipsWithDetails, getVendorProducts } from "@/services/db";
import { getCartProductIds, getFollowedVendorIds } from "@/lib/actions/marketplace";
import { notFound } from "next/navigation";
import { constructMetadata, truncateDescription } from "@/lib/seo";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { mapCommunities, mapVendorToCreatorProfile } from "@/lib/creator-profile";
import { CreatorProfilePage } from "@/components/creator-profile/CreatorProfilePage";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const db = await getDB();
  const { data: vendor } = await db
    .from("vendors")
    .select("business_name, business_description, business_logo, business_banner")
    .eq("business_slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!vendor) return { title: "Creator not found" };

  return constructMetadata({
    title: vendor.business_name ?? "Creator profile",
    description: truncateDescription(
      vendor.business_description ?? `${vendor.business_name} on Jimvio.`,
    ),
    image: vendor.business_banner ?? vendor.business_logo ?? undefined,
    path: `/influencers/${slug}`,
  });
}

export default async function InfluencerProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const db = await getDB();
  const { data: vendor } = await db
    .from("vendors")
    .select("*")
    .eq("business_slug", slug)
    .eq("is_active", true)
    .single();

  if (!vendor) notFound();

  const [clips, products, cartProductIds, followedVendorIds, communitiesRaw] = await Promise.all([
    getVendorClipsWithDetails(vendor.id),
    getVendorProducts(vendor.id),
    getCartProductIds().catch(() => [] as string[]),
    getFollowedVendorIds().catch(() => [] as string[]),
    db
      .from("communities")
      .select("id, name, slug, tagline, member_count, cover_image, avatar_url, is_free")
      .eq("owner_id", vendor.user_id)
      .eq("is_active", true)
      .order("member_count", { ascending: false })
      .limit(12),
  ]);

  const communities = mapCommunities((communitiesRaw.data ?? []) as Record<string, unknown>[]);
  const mapped = mapVendorToCreatorProfile(vendor, {
    products: products as Record<string, unknown>[],
    clips: clips as Record<string, unknown>[],
    communities,
  });

  const payload = {
    profile: mapped.profile,
    products: mapped.products,
    communities: mapped.communities,
    courses: mapped.courses,
    videos: mapped.videos,
    reviews: mapped.reviews,
    ugcCampaigns: mapped.ugcCampaigns,
    affiliateCampaigns: mapped.affiliateCampaigns,
    posts: [],
    isFollowing: followedVendorIds.includes(vendor.id),
    cartProductIds,
  };

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Creators", path: "/influencers" },
          { name: vendor.business_name ?? "Creator", path: `/influencers/${slug}` },
        ]}
      />
      <CreatorProfilePage payload={payload} />
    </>
  );
}
