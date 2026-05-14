"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/** Rate constants — adjust via env or admin later */
const RATE_PER_1K_VIEWS_RWF = 200;  // FRw 200 per 1,000 views
const RATE_PER_CLICK_RWF = 10;      // FRw 10 per click on product link

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

async function getCreatorId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from("influencers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.id ?? null;
}

// ─────────────────────────────────────────────────────────────
// UPLOAD / CREATE VIDEO
// ─────────────────────────────────────────────────────────────

export async function createShortVideo(formData: {
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  duration_sec?: number;
  product_id?: string | null;
  community_id?: string | null;
  video_type?: "product" | "community" | "general";
  external_link?: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const creatorId = await getCreatorId(supabase, user.id);
  if (!creatorId) return { error: "Creator profile not found. Activate Creator role first." };

  try {
    const { data, error } = await supabase
      .from("short_videos")
      .insert({
        creator_id: creatorId,
        user_id: user.id,
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        video_url: formData.video_url,
        thumbnail_url: formData.thumbnail_url || null,
        duration_sec: formData.duration_sec || 0,
        product_id: formData.product_id || null,
        community_id: formData.community_id || null,
        video_type: formData.video_type || "product",
        external_link: formData.external_link || null,
        status: "active",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Supabase Short Video Insert Error:", error);
      return { error: `Database Error: ${error.message}. Ensure the 'external_link' and 'video_type' columns exist in your Supabase project.` };
    }

    revalidatePath("/dashboard/influencer/videos");
    revalidatePath("/shorts");
    return { success: true, videoId: data.id };
  } catch (err: any) {
    console.error("Unexpected Error in createShortVideo:", err);
    return { error: err.message || "An unexpected error occurred during video creation." };
  }
}

// ─────────────────────────────────────────────────────────────
// LIST MY VIDEOS
// ─────────────────────────────────────────────────────────────

export async function getMyShortVideos() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", videos: [] };

  const { data, error } = await supabase
    .from("short_videos")
    .select(`
      id, title, description, video_url, thumbnail_url, duration_sec,
      status, view_count, like_count, click_count, comment_count, total_earnings,
      created_at, updated_at, video_type, external_link,
      products ( id, name, slug, images ),
      communities ( id, name, slug )
    `)
    .eq("user_id", user.id)
    .neq("status", "deleted")
    .order("created_at", { ascending: false });

  if (error) return { error: error.message, videos: [] };
  return { videos: data ?? [] };
}

// ─────────────────────────────────────────────────────────────
// UPDATE / DELETE
// ─────────────────────────────────────────────────────────────

export async function updateShortVideo(videoId: string, updates: {
  title?: string;
  description?: string;
  status?: "active" | "paused";
  thumbnail_url?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("short_videos")
    .update(updates)
    .eq("id", videoId)
    .eq("user_id", user.id);  // RLS guard at query level too

  if (error) return { error: error.message };
  revalidatePath("/dashboard/influencer/videos");
  return { success: true };
}

export async function deleteShortVideo(videoId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Soft-delete
  const { error } = await supabase
    .from("short_videos")
    .update({ status: "deleted" })
    .eq("id", videoId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/influencer/videos");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────
// VIDEO ANALYTICS (per-video detail)
// ─────────────────────────────────────────────────────────────

export async function getVideoAnalytics(videoId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Verify ownership
  const { data: video } = await supabase
    .from("short_videos")
    .select("id, user_id, view_count, like_count, click_count, comment_count, duration_sec, total_earnings")
    .eq("id", videoId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!video) return null;

  // Views bucketed by day (last 30 days)
  const { data: viewRows } = await supabase
    .from("short_video_views")
    .select("created_at, watch_time_sec")
    .eq("video_id", videoId)
    .gte("created_at", new Date(Date.now() - 30 * 86400_000).toISOString());

  // Click rows
  const { data: clickRows } = await supabase
    .from("short_video_clicks")
    .select("created_at, converted")
    .eq("video_id", videoId)
    .gte("created_at", new Date(Date.now() - 30 * 86400_000).toISOString());

  const avgWatchSec = viewRows && viewRows.length > 0
    ? Math.round(viewRows.reduce((s, r) => s + (r.watch_time_sec ?? 0), 0) / viewRows.length)
    : 0;

  const conversions = clickRows?.filter(c => c.converted).length ?? 0;
  const clickRate = video.view_count > 0
    ? ((video.click_count / video.view_count) * 100).toFixed(1)
    : "0.0";
  const conversionRate = video.click_count > 0
    ? ((conversions / video.click_count) * 100).toFixed(1)
    : "0.0";

  return {
    videoId,
    totalViews: video.view_count,
    totalLikes: video.like_count,
    totalClicks: video.click_count,
    totalComments: video.comment_count,
    totalEarnings: video.total_earnings,
    avgWatchSec,
    clickRate,
    conversionRate,
    conversions,
    viewRows: viewRows ?? [],
    clickRows: clickRows ?? [],
  };
}

// ─────────────────────────────────────────────────────────────
// EARNINGS BREAKDOWN
// ─────────────────────────────────────────────────────────────

export async function getVideoEarnings() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", data: null };

  const creatorId = await getCreatorId(supabase, user.id);
  if (!creatorId) return { error: "No creator profile", data: null };

  const { data: rows } = await supabase
    .from("short_video_earnings")
    .select("event_type, amount, currency, created_at, video_id")
    .eq("creator_id", creatorId)
    .order("created_at", { ascending: false });

  if (!rows) return { data: null };

  const viewEarnings = rows.filter(r => r.event_type === "view").reduce((s, r) => s + Number(r.amount), 0);
  const clickEarnings = rows.filter(r => r.event_type === "click").reduce((s, r) => s + Number(r.amount), 0);
  const saleEarnings = rows.filter(r => r.event_type === "sale").reduce((s, r) => s + Number(r.amount), 0);
  const total = viewEarnings + clickEarnings + saleEarnings;

  // Get total from videos
  const { data: videos } = await supabase
    .from("short_videos")
    .select("id, title, total_earnings, view_count, click_count")
    .eq("user_id", user.id)
    .neq("status", "deleted")
    .order("total_earnings", { ascending: false })
    .limit(10);

  return {
    data: {
      viewEarnings,
      clickEarnings,
      saleEarnings,
      total,
      recentRows: rows.slice(0, 20),
      topVideos: videos ?? [],
      currency: "RWF",
    }
  };
}

// ─────────────────────────────────────────────────────────────
// RECORD A VIEW (called from client after 5s watch)
// ─────────────────────────────────────────────────────────────

export async function recordVideoView(videoId: string, watchTimeSec: number) {
  if (watchTimeSec < 5) return { skipped: true };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const viewerId = user?.id ?? null;

  // Upsert — prevents duplicate view rows for same user
  const { error: insertError } = await supabase
    .from("short_video_views")
    .upsert(
      { video_id: videoId, viewer_id: viewerId, watch_time_sec: watchTimeSec },
      { onConflict: "video_id,viewer_id", ignoreDuplicates: true }
    );

  if (insertError) {
    console.error("[DATABASE ERROR] Failed to insert view record:", insertError);
    return { error: insertError.message };
  }

  const { error: rpcError } = await supabase.rpc("increment_video_view_count" as any, { vid: videoId });

  if (rpcError) {
    console.error("[DATABASE ERROR] increment_video_view_count failed:", rpcError);
  }

  // Award earnings: FRw 200 / 1000 views = FRw 0.20 per view
  const earningRwf = RATE_PER_1K_VIEWS_RWF / 1000;
  const { data: vid } = await supabase
    .from("short_videos")
    .select("creator_id")
    .eq("id", videoId)
    .single();

  if (vid?.creator_id) {
    await supabase.from("short_video_earnings").insert({
      video_id: videoId,
      creator_id: vid.creator_id,
      event_type: "view",
      amount: earningRwf,
      currency: "RWF",
    });
    await supabase
      .from("short_videos")
      .update({ total_earnings: supabase.rpc as any })  // updated via separate RPC below
      .eq("id", videoId);

    await supabase.rpc("add_video_earnings" as any, { vid: videoId, amt: earningRwf });
  }

  return { success: true };
}

// ─────────────────────────────────────────────────────────────
// RECORD A CLICK
// ─────────────────────────────────────────────────────────────

export async function recordVideoClick(videoId: string, productId?: string, communityId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  await supabase.from("short_video_clicks").insert({
    video_id: videoId,
    user_id: user?.id ?? null,
    product_id: productId ?? null,
    community_id: communityId ?? null,
  });

  // Increment click counter
  const { error: rpcError } = await supabase.rpc("increment_video_click_count" as any, { vid: videoId });

  if (rpcError) {
    console.error("[DATABASE ERROR] increment_video_click_count failed:", rpcError);
  }

  // Award click earning
  const { data: vid } = await supabase
    .from("short_videos")
    .select("creator_id")
    .eq("id", videoId)
    .single();

  if (vid?.creator_id) {
    await supabase.from("short_video_earnings").insert({
      video_id: videoId,
      creator_id: vid.creator_id,
      event_type: "click",
      amount: RATE_PER_CLICK_RWF,
      currency: "RWF",
    });
    await supabase
      .from("short_videos")
      .update({ total_earnings: supabase.rpc as any })
      .eq("id", videoId);
  }

  return { success: true };
}

// ─────────────────────────────────────────────────────────────
// FETCH PRODUCTS for "attach product" dropdown
// ─────────────────────────────────────────────────────────────

export async function getMyProductsForVideo() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Fetch active products from across the marketplace so influencers can promote anything
  const { data } = await supabase
    .from("products")
    .select("id, name, slug, images, price, currency")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────
// FETCH COMMUNITIES for "attach community" dropdown
// ─────────────────────────────────────────────────────────────

export async function getMyCommunitiesForVideo() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get communities where user is owner or admin (or just all active ones for now if simplified)
  const { data } = await supabase
    .from("communities")
    .select("id, name, slug")
    .eq("is_active", true)
    .limit(50);

  return data ?? [];
}
export async function toggleShortVideoLike(videoId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required" };

  try {
    const { data: existing } = await supabase
      .from("short_video_likes")
      .select("id")
      .eq("video_id", videoId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("short_video_likes")
        .delete()
        .eq("video_id", videoId)
        .eq("user_id", user.id);

      if (error) throw error;
      const { error: rpcError } = await supabase.rpc("decrement_video_like_count" as any, { vid: videoId });
      if (rpcError) {
        console.error("[DATABASE ERROR] decrement_video_like_count failed:", rpcError);
      }
      return { success: true, action: "unliked" };
    } else {
      const { error } = await supabase
        .from("short_video_likes")
        .insert({
          video_id: videoId,
          user_id: user.id
        });

      if (error) throw error;
      const { error: rpcError } = await supabase.rpc("increment_video_like_count" as any, { vid: videoId });

      if (rpcError) {
        console.error("[DATABASE ERROR] increment_video_like_count failed:", rpcError);
      }
      return { success: true, action: "liked" };
    }
  } catch (err: any) {
    console.error("Toggle like error:", err);
    return { error: err.message };
  }
}
