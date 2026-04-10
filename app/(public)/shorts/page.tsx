import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { TikTokFeed, FeedClip } from "@/components/influencer/tiktok-feed";

export const metadata: Metadata = {
  title: "Videos | Jimvio",
  description: "Watch high-conversion short videos from top creators and shop the buzz.",
};

export const dynamic = "force-dynamic";

export default async function ShortsFeedPage() {
  const supabase = await createClient();

  const { data: videos } = await supabase
    .from("short_videos")
    .select(`
      id, title, description, video_url, thumbnail_url, view_count, like_count, click_count, status,
      creator_id,
      video_type, community_id, external_link,
      communities ( id, name, slug, member_count, description, cover_image ),
      influencers ( user_id ),
      products ( id, name, slug, price, currency, images, vendor_id )
    `)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (!videos || videos.length === 0) {
    return (
      <main className="bg-zinc-950 min-h-screen">
        <div className="flex bg-black items-center justify-center text-white min-h-[80vh]">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-black">No Shorts Available</h1>
            <p className="text-zinc-500">Check back later when creators upload new videos.</p>
          </div>
        </div>
      </main>
    );
  }

  // We need the creator profiles since short_videos links to influencers
  const userIds = [
    ...new Set(videos.map((v: any) => v.influencers?.user_id).filter(Boolean)),
  ];
  let profilesMap: Record<string, any> = {};

  if (userIds.length > 0) {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", userIds);

    // Fetch vendors linked to these users
    const { data: vendorsData } = await supabase
      .from("vendors")
      .select("id, user_id, business_name, business_slug, business_logo")
      .in("user_id", userIds);

    if (profilesData) {
      profilesData.forEach((p: any) => {
        profilesMap[p.id] = {
          ...p,
          vendor: vendorsData?.find((v: any) => v.user_id === p.id) || null
        };
      });
    }
  }

  // Map to FeedClip format for TikTokFeed
  const mappedClips: FeedClip[] = videos.map((v: any): FeedClip => {
    const p = profilesMap[v.influencers?.user_id];
    const vendor = p?.vendor;
    
    // Vendor mimicking structure for Follow feature & naming expected by TikTokFeed
    const vendorsObj = vendor ? {
      id: vendor.id,
      business_name: vendor.business_name,
      business_slug: vendor.business_slug,
      business_logo: vendor.business_logo || p.avatar_url,
    } : p ? {
      id: p.id, // Fallback to profile ID (might still fail follow if not a vendor)
      business_name: p.full_name || "Jimvio Creator",
      business_slug: undefined,
      business_logo: p.avatar_url,
    } : null;

    const prod = v.products
      ? {
          id: (v.products as any).id,
          vendor_id: (v.products as any).vendor_id || "creator_" + v.creator_id, // ensure addToCart works normally
          name: (v.products as any).name,
          slug: (v.products as any).slug,
          price: (v.products as any).price,
          currency: (v.products as any).currency,
          images: (v.products as any).images,
        }
      : null;

    return {
      id: v.id,
      title: v.title,
      video_url: v.video_url,
      thumbnail_url: v.thumbnail_url,
      total_views: v.view_count, // Use total_views field natively if desired
      itemType: "short",
      video_type: v.video_type || "product",
      external_link: v.external_link,
      communities: v.communities,
      hubLikes: v.like_count,
      hubComments: v.comment_count || 0, // Real-time count from DB trigger
      vendors: vendorsObj,
      products: prod,
    };
  });

  return (
    <main className="fixed inset-0 bg-black z-[200] flex flex-col overflow-hidden overscroll-none">
      <TikTokFeed clips={mappedClips} />
    </main>
  );
}
