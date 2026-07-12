import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getDB } from "@/services/db";
import { notFound } from "next/navigation";
import { mapInfluencerUserToCreatorProfile } from "@/lib/creator-profile";
import { CreatorProfilePage } from "@/components/creator-profile/CreatorProfilePage";

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function InfluencerByUserPage({ params }: PageProps) {
  const { userId } = await params;
  const db = (await getDB()) as any;

  const { data: influencer } = await db
    .from("influencers")
    .select("id, user_id, display_name, profile_image, bio, total_followers")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (!influencer) notFound();

  const { data: clips } = await db
    .from("viral_clips")
    .select("id, title, thumbnail_url, video_url, total_views")
    .eq("influencer_id", influencer.id)
    .eq("is_active", true)
    .not("video_url", "is", null)
    .order("total_views", { ascending: false })
    .limit(24);

  const mapped = mapInfluencerUserToCreatorProfile(influencer, clips ?? []);

  return (
    <>
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)]"
          >
            <ArrowLeft className="size-4" />
            Back to marketplace
          </Link>
        </div>
      </div>
      <CreatorProfilePage
        payload={{
          profile: mapped.profile,
          products: mapped.products,
          communities: mapped.communities,
          courses: mapped.courses,
          videos: mapped.videos,
          reviews: mapped.reviews,
          ugcCampaigns: mapped.ugcCampaigns,
          affiliateCampaigns: mapped.affiliateCampaigns,
          posts: [],
          isFollowing: false,
          cartProductIds: [],
        }}
      />
    </>
  );
}
