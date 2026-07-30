import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractHashtags } from "@/lib/feed/composer-utils";

export const dynamic = "force-dynamic";

export type TrendingCommunityTopic = {
  topic: string;
  post_count: number;
  community_count: number;
  growth_pct: number;
  active_users: number;
  live_discussions: number;
};

function normalizeTopic(value: string): string {
  return value.trim().toLowerCase().replace(/^#/, "");
}

function extractTopicsFromAttachments(attachments: unknown): string[] {
  if (!attachments || typeof attachments !== "object" || Array.isArray(attachments)) {
    return [];
  }
  const hashtags = (attachments as Record<string, unknown>).hashtags;
  if (!Array.isArray(hashtags)) return [];
  return hashtags
    .filter((tag): tag is string => typeof tag === "string" && tag.trim().length >= 2)
    .map(normalizeTopic);
}

async function fetchTopicsViaFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  limit: number
): Promise<TrendingCommunityTopic[]> {
  const since14 = new Date(Date.now() - 14 * 86400000).toISOString();
  const since7 = new Date(Date.now() - 7 * 86400000).toISOString();

  const { data: posts } = await supabase
    .from("community_posts")
    .select("id, community_id, author_id, body, attachments, comment_count, created_at, published_at")
    .eq("is_published", true)
    .gte("created_at", since14)
    .limit(3000);

  type Acc = {
    posts: Set<string>;
    communities: Set<string>;
    authors: Set<string>;
    liveDiscussions: Set<string>;
    recent: Set<string>;
    prior: Set<string>;
  };

  const byTopic = new Map<string, Acc>();

  for (const post of posts ?? []) {
    const ts = post.published_at ?? post.created_at ?? new Date().toISOString();
    const attachmentTags = extractTopicsFromAttachments(post.attachments);
    const bodyTags = attachmentTags.length === 0 ? extractHashtags(post.body ?? "") : [];
    const topics = attachmentTags.length > 0 ? attachmentTags : bodyTags.map(normalizeTopic);
    if (topics.length === 0) continue;

    for (const topic of topics) {
      if (topic.length < 2) continue;
      let acc = byTopic.get(topic);
      if (!acc) {
        acc = {
          posts: new Set(),
          communities: new Set(),
          authors: new Set(),
          liveDiscussions: new Set(),
          recent: new Set(),
          prior: new Set(),
        };
        byTopic.set(topic, acc);
      }
      acc.posts.add(post.id);
      acc.communities.add(post.community_id);
      acc.authors.add(post.author_id);
      if ((post.comment_count ?? 0) > 0) acc.liveDiscussions.add(post.id);
      if (ts >= since7) acc.recent.add(post.id);
      else acc.prior.add(post.id);
    }
  }

  return Array.from(byTopic.entries())
    .filter(([, acc]) => acc.posts.size >= 2)
    .map(([topic, acc]) => {
      const recentCount = acc.recent.size;
      const priorCount = acc.prior.size;
      let growth_pct = 0;
      if (priorCount === 0 && recentCount > 0) growth_pct = 100;
      else if (priorCount > 0) {
        growth_pct = Math.round(((recentCount - priorCount) / priorCount) * 1000) / 10;
      }

      return {
        topic,
        post_count: acc.posts.size,
        community_count: acc.communities.size,
        growth_pct,
        active_users: acc.authors.size,
        live_discussions: acc.liveDiscussions.size,
      } satisfies TrendingCommunityTopic;
    })
    .sort((a, b) => {
      const recentDiff =
        (byTopic.get(b.topic)?.recent.size ?? 0) - (byTopic.get(a.topic)?.recent.size ?? 0);
      if (recentDiff !== 0) return recentDiff;
      return b.post_count - a.post_count || a.topic.localeCompare(b.topic);
    })
    .slice(0, limit);
}

/** GET — trending community topics from RPC with TS fallback. */
export async function GET(req: NextRequest) {
  const limit = Math.min(
    Math.max(Number(req.nextUrl.searchParams.get("limit") ?? 12) || 12, 1),
    50
  );

  const supabase = await createClient();
  const rpc = await (supabase as any).rpc("get_trending_community_topics", {
    p_limit: limit,
  });

  if (!rpc.error && Array.isArray(rpc.data)) {
    return NextResponse.json({
      topics: (rpc.data as TrendingCommunityTopic[]).map((row) => ({
        topic: row.topic,
        post_count: Number(row.post_count ?? 0) || 0,
        community_count: Number(row.community_count ?? 0) || 0,
        growth_pct: Number(row.growth_pct ?? 0) || 0,
        active_users: Number(row.active_users ?? 0) || 0,
        live_discussions: Number(row.live_discussions ?? 0) || 0,
      })),
      source: "rpc",
    });
  }

  try {
    const topics = await fetchTopicsViaFallback(supabase, limit);
    return NextResponse.json({ topics, source: "fallback" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load topics" },
      { status: 500 }
    );
  }
}
