import { createClient } from "@supabase/supabase-js";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/service-role";

const STORY_TTL_MS = 48 * 60 * 60 * 1000;
const BATCH_LIMIT = 40;

type RefreshResult = {
  scanned: number;
  created: number;
  skipped_active: number;
  skipped_no_content: number;
  errors: number;
};

function extractPostImageUrl(images: unknown): string | null {
  if (!images) return null;
  if (typeof images === "string" && /^https?:\/\//i.test(images)) return images;
  if (Array.isArray(images)) {
    for (const item of images) {
      if (typeof item === "string" && /^https?:\/\//i.test(item)) return item;
      if (item && typeof item === "object") {
        const url =
          (item as { url?: string }).url ??
          (item as { src?: string }).src ??
          (item as { image_url?: string }).image_url;
        if (url && /^https?:\/\//i.test(url)) return url;
      }
    }
  }
  if (typeof images === "object" && images !== null) {
    const url =
      (images as { url?: string }).url ??
      (images as { src?: string }).src;
    if (url && /^https?:\/\//i.test(url)) return url;
  }
  return null;
}

/**
 * Idempotent community story refresh — safe to run on every cron tick.
 * Creates at most one active story per community when none exists.
 */
export async function refreshCommunityStories(): Promise<RefreshResult> {
  const admin = createClient(getSupabaseUrl(), getSupabaseSecretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const result: RefreshResult = {
    scanned: 0,
    created: 0,
    skipped_active: 0,
    skipped_no_content: 0,
    errors: 0,
  };

  const nowIso = new Date().toISOString();

  const { data: communities, error: commError } = await admin
    .from("communities")
    .select("id, owner_id, name, avatar_url, cover_image, is_active, is_private, visibility, visibility_mode, archived_at, is_featured, member_count")
    .eq("is_active", true)
    .or("is_private.eq.false,is_private.is.null")
    .order("is_featured", { ascending: false })
    .order("member_count", { ascending: false })
    .limit(BATCH_LIMIT);

  if (commError || !communities?.length) {
    return result;
  }

  for (const community of communities) {
    // Skip archived / non-public visibility when present
    if ((community as { archived_at?: string | null }).archived_at) {
      result.skipped_no_content += 1;
      continue;
    }
    const visibility = String((community as { visibility?: string | null }).visibility ?? "public");
    if (visibility === "private" || visibility === "hidden") {
      result.skipped_no_content += 1;
      continue;
    }
    result.scanned += 1;
    const communityId = community.id as string;
    const ownerId = community.owner_id as string | null;
    if (!ownerId) {
      result.skipped_no_content += 1;
      continue;
    }

    const { data: activeStories } = await (admin as any)
      .from("community_stories")
      .select("id")
      .eq("community_id", communityId)
      .gt("expires_at", nowIso)
      .limit(1);

    if (activeStories?.length) {
      result.skipped_active += 1;
      continue;
    }

    const { data: posts } = await admin
      .from("community_posts")
      .select("id, body, title, images, video_url, author_id, created_at")
      .eq("community_id", communityId)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(8);

    let mediaUrl: string | null = null;
    let mediaType: "photo" | "video" = "photo";
    let caption: string | null = null;
    let authorId = ownerId;

    for (const post of posts ?? []) {
      const img = extractPostImageUrl(post.images);
      const video =
        typeof post.video_url === "string" && /^https?:\/\//i.test(post.video_url)
          ? post.video_url
          : null;
      if (video) {
        mediaUrl = video;
        mediaType = "video";
        caption =
          (post.title?.trim() || post.body?.trim().slice(0, 200)) ?? null;
        authorId = post.author_id;
        break;
      }
      if (img) {
        mediaUrl = img;
        mediaType = "photo";
        caption =
          (post.title?.trim() || post.body?.trim().slice(0, 200)) ?? null;
        authorId = post.author_id;
        break;
      }
    }

    if (!mediaUrl) {
      const cover =
        (community.avatar_url as string | null)?.trim() ||
        (community.cover_image as string | null)?.trim() ||
        null;
      if (cover && /^https?:\/\//i.test(cover)) {
        mediaUrl = cover;
        mediaType = "photo";
        caption = `${community.name} — what's happening in the community`;
      }
    }

    if (!mediaUrl) {
      result.skipped_no_content += 1;
      continue;
    }

    const expiresAt = new Date(Date.now() + STORY_TTL_MS).toISOString();

    const { error: insertError } = await (admin as any)
      .from("community_stories")
      .insert({
        author_id: authorId,
        community_id: communityId,
        media_url: mediaUrl,
        media_type: mediaType,
        caption,
        thumbnail_url: mediaType === "photo" ? mediaUrl : null,
        privacy: "community",
        mentions: [],
        expires_at: expiresAt,
      });

    if (insertError) {
      result.errors += 1;
      continue;
    }
    result.created += 1;
  }

  return result;
}
