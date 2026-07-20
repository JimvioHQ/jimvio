import { createClient } from "@/lib/supabase/server";

const MAX_RECENT_POSTS = 8;
const BODY_TRUNCATE_LENGTH = 220;

export type CommunityAiContextPost = {
  title: string | null;
  body: string;
  author: string;
};

export type CommunityAiContext = {
  communityId: string;
  name: string;
  description: string | null;
  memberCount: number;
  recentPosts: CommunityAiContextPost[];
};

/**
 * Loads a light-weight snapshot of a community for AI prompting: name,
 * description, and a handful of recent post titles/bodies (truncated).
 * Intentionally cheap — no deep joins, no analytics.
 */
export async function loadCommunityAiContext(
  communityId: string
): Promise<CommunityAiContext | null> {
  const supabase = await createClient();

  const [communityRes, postsRes] = await Promise.all([
    supabase
      .from("communities")
      .select("name, description, tagline, member_count")
      .eq("id", communityId)
      .maybeSingle(),
    supabase
      .from("community_posts")
      .select(
        "title, body, profiles!community_posts_author_id_fkey(full_name, username)"
      )
      .eq("community_id", communityId)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(MAX_RECENT_POSTS),
  ]);

  const community = communityRes.data;
  if (!community) return null;

  const recentPosts: CommunityAiContextPost[] = (postsRes.data ?? []).map((post) => {
    const profile = post.profiles as { full_name: string | null; username: string | null } | null;
    return {
      title: post.title ?? null,
      body: (post.body ?? "").replace(/\s+/g, " ").trim().slice(0, BODY_TRUNCATE_LENGTH),
      author: profile?.full_name ?? profile?.username ?? "Member",
    };
  });

  return {
    communityId,
    name: community.name,
    description: community.description ?? community.tagline ?? null,
    memberCount: community.member_count ?? 0,
    recentPosts,
  };
}

/** Flattens a context snapshot into a compact prompt-ready string. */
export function formatCommunityAiContext(context: CommunityAiContext): string {
  const lines: string[] = [
    `Community: ${context.name}`,
    ...(context.description ? [`Description: ${context.description}`] : []),
    `Members: ${context.memberCount}`,
  ];

  if (context.recentPosts.length > 0) {
    lines.push("Recent posts:");
    context.recentPosts.forEach((post, i) => {
      const title = post.title ? `"${post.title}" — ` : "";
      lines.push(`${i + 1}. ${title}${post.body} (by ${post.author})`);
    });
  } else {
    lines.push("No recent posts yet.");
  }

  return lines.join("\n");
}
