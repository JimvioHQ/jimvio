import { getAdminDB, getDB } from "./base";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
export type UGCFeedSort = "latest" | "trending" | "top";

export interface UGCPostMedia {
  url: string;
  type: "image" | "video";
  public_id?: string;
  thumbnail?: string;
}

// ─────────────────────────────────────────────────────────────
// FEED
// ─────────────────────────────────────────────────────────────

export async function getUGCFeed(opts: {
  sort?: UGCFeedSort;
  limit?: number;
  offset?: number;
  hashtag?: string;
  productId?: string;
}) {
  const { sort = "latest", limit = 20, offset = 0, hashtag, productId } = opts;
  const db = await getDB();

  let query = db
    .from("ugc_posts")
    .select(`
      id, caption, media, post_type, like_count, comment_count,
      share_count, view_count, is_featured, created_at,
      profiles:user_id ( id, username, full_name, avatar_url, is_verified ),
      ugc_post_product_tags (
        products ( id, name, slug, price, currency, images )
      ),
      ugc_post_hashtags (
        ugc_hashtags ( id, tag )
      )
    `)
    .eq("is_published", true)
    .eq("moderation_status", "approved");

  if (hashtag) {
    // Filter by hashtag via RPC or subquery — use join approach
    const hashtagRes = await db
      .from("ugc_hashtags")
      .select("id")
      .eq("tag", hashtag.toLowerCase())
      .maybeSingle();
    if (!hashtagRes.data) return { data: [], count: 0 };
    const { data: postIds } = await db
      .from("ugc_post_hashtags")
      .select("post_id")
      .eq("hashtag_id", hashtagRes.data.id);
    const ids = (postIds ?? []).map((r: { post_id: string }) => r.post_id);
    if (!ids.length) return { data: [], count: 0 };
    query = query.in("id", ids);
  }

  if (productId) {
    const { data: postIds } = await db
      .from("ugc_post_product_tags")
      .select("post_id")
      .eq("product_id", productId);
    const ids = (postIds ?? []).map((r: { post_id: string }) => r.post_id);
    if (!ids.length) return { data: [], count: 0 };
    query = query.in("id", ids);
  }

  if (sort === "trending") {
    // Trending = weighted score: views*0.1 + likes*2 + comments*3 in last 7 days
    query = query
      .gte("created_at", new Date(Date.now() - 7 * 86400_000).toISOString())
      .order("like_count", { ascending: false })
      .order("comment_count", { ascending: false });
  } else if (sort === "top") {
    query = query.order("like_count", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

// ─────────────────────────────────────────────────────────────
// SINGLE POST
// ─────────────────────────────────────────────────────────────
export async function getUGCPost(id: string) {
  const db = await getDB();
  const { data, error } = await db
    .from("ugc_posts")
    .select(`
      id, caption, media, post_type, like_count, comment_count,
      share_count, view_count, is_featured, created_at, updated_at,
      profiles:user_id ( id, username, full_name, avatar_url, is_verified ),
      ugc_post_product_tags (
        products ( id, name, slug, price, currency, images, rating )
      ),
      ugc_post_hashtags (
        ugc_hashtags ( id, tag )
      )
    `)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────
// CREATE POST
// ─────────────────────────────────────────────────────────────
export async function createUGCPost(opts: {
  userId: string;
  caption?: string;
  media?: UGCPostMedia[];
  postType?: string;
  productIds?: string[];
  hashtags?: string[];
}) {
  const { userId, caption, media = [], postType = "post", productIds = [], hashtags = [] } = opts;
  const db = await getDB();

  // 1. Insert post
  const { data: post, error } = await db
    .from("ugc_posts")
    .insert({
      user_id: userId,
      caption: caption?.trim() || null,
      media,
      post_type: postType,
    })
    .select()
    .single();
  if (error) throw error;

  // 2. Tag products
  if (productIds.length > 0) {
    await db.from("ugc_post_product_tags").insert(
      productIds.map((pid) => ({ post_id: post.id, product_id: pid }))
    );
  }

  // 3. Upsert + link hashtags
  if (hashtags.length > 0) {
    const normalised = [...new Set(hashtags.map((h) => h.replace(/^#/, "").toLowerCase().trim()))].filter(Boolean);
    for (const tag of normalised) {
      const { data: existing } = await db
        .from("ugc_hashtags")
        .select("id")
        .eq("tag", tag)
        .maybeSingle();

      let hashtagId: string;
      if (existing) {
        hashtagId = existing.id;
      } else {
        const { data: newTag } = await db
          .from("ugc_hashtags")
          .insert({ tag })
          .select("id")
          .single();
        hashtagId = newTag!.id;
      }
      await db.from("ugc_post_hashtags").upsert({ post_id: post.id, hashtag_id: hashtagId }, { onConflict: 'post_id,hashtag_id' });
    }
  }

  return post;
}

// ─────────────────────────────────────────────────────────────
// UPDATE / DELETE POST
// ─────────────────────────────────────────────────────────────
export async function updateUGCPost(id: string, userId: string, patch: {
  caption?: string;
  postType?: string;
}) {
  const db = await getDB();
  const { data, error } = await db
    .from("ugc_posts")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteUGCPost(id: string, userId: string) {
  const db = await getDB();
  const { error } = await db
    .from("ugc_posts")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────
// LIKES
// ─────────────────────────────────────────────────────────────
export async function toggleUGCLike(postId: string, userId: string): Promise<{ liked: boolean }> {
  const db = await getDB();
  const { data: existing } = await db
    .from("ugc_post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await db.from("ugc_post_likes").delete().eq("id", existing.id);
    return { liked: false };
  } else {
    await db.from("ugc_post_likes").insert({ post_id: postId, user_id: userId });
    return { liked: true };
  }
}

export async function getUGCLikeStatus(postId: string, userId: string): Promise<boolean> {
  const db = await getDB();
  const { data } = await db
    .from("ugc_post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

// ─────────────────────────────────────────────────────────────
// COMMENTS
// ─────────────────────────────────────────────────────────────
export async function getUGCComments(postId: string, limit = 30, offset = 0) {
  const db = await getDB();
  const { data, error } = await db
    .from("ugc_post_comments")
    .select(`
      id, body, like_count, created_at, parent_id,
      profiles:user_id ( id, username, full_name, avatar_url )
    `)
    .eq("post_id", postId)
    .eq("is_deleted", false)
    .is("parent_id", null)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return data ?? [];
}

export async function addUGCComment(postId: string, userId: string, body: string, parentId?: string) {
  const db = await getDB();
  const { data, error } = await db
    .from("ugc_post_comments")
    .insert({ post_id: postId, user_id: userId, body: body.trim(), parent_id: parentId ?? null })
    .select(`
      id, body, like_count, created_at, parent_id,
      profiles:user_id ( id, username, full_name, avatar_url )
    `)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteUGCComment(commentId: string, userId: string) {
  const db = await getDB();
  await db
    .from("ugc_post_comments")
    .update({ is_deleted: true })
    .eq("id", commentId)
    .eq("user_id", userId);
}

// ─────────────────────────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────────────────────────
export async function reportContent(opts: {
  reporterId: string;
  reason: string;
  details?: string;
  postId?: string;
  clipId?: string;
  commentId?: string;
}) {
  const db = await getDB();
  const { data, error } = await db
    .from("ugc_reports")
    .insert({
      reporter_id: opts.reporterId,
      reason: opts.reason,
      details: opts.details ?? null,
      post_id: opts.postId ?? null,
      clip_id: opts.clipId ?? null,
      comment_id: opts.commentId ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  // Increment reported_count on post
  if (opts.postId) {
    await db.rpc("increment_ugc_report_count", { post_id: opts.postId });
  }
  return data;
}

// ─────────────────────────────────────────────────────────────
// HASHTAG DISCOVERY
// ─────────────────────────────────────────────────────────────
export async function getTrendingHashtags(limit = 20) {
  const db = await getDB();
  const { data } = await db
    .from("ugc_hashtags")
    .select("id, tag, post_count")
    .order("post_count", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getUserUGCPosts(userId: string, limit = 20, offset = 0) {
  const db = await getDB();
  const { data, error } = await db
    .from("ugc_posts")
    .select(`
      id, caption, media, post_type, like_count, comment_count,
      share_count, view_count, created_at,
      ugc_post_product_tags ( products ( id, name, slug, images ) ),
      ugc_post_hashtags ( ugc_hashtags ( tag ) )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return data ?? [];
}
