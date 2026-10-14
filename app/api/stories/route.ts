import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { rateLimit } from "@/lib/ops/rate-limit";
import { rotateStoryAuthors, storyRotationBucket } from "@/lib/feed/story-rotation";

export const dynamic = "force-dynamic";

const MEDIA_TYPES = new Set(["photo", "video"]);
const PRIVACY = new Set(["public", "followers", "community", "close_friends"]);
const STORY_TTL_MS = 48 * 60 * 60 * 1000;

type ProfileRow = {
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
};

type StoryRow = {
  id: string;
  author_id: string;
  community_id: string | null;
  media_url: string;
  media_type: string;
  caption: string | null;
  thumbnail_url: string | null;
  privacy: string;
  mentions: unknown;
  view_count: number;
  unique_view_count: number;
  reply_count: number;
  expires_at: string;
  created_at: string;
  profiles: ProfileRow | ProfileRow[] | null;
};

function profileOf(row: StoryRow): ProfileRow | null {
  const p = row.profiles;
  if (!p) return null;
  return Array.isArray(p) ? p[0] ?? null : p;
}

/** GET — active stories (expires_at > now), grouped by author.
 * Guests receive public stories only; authenticated users keep full visibility. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nowIso = new Date().toISOString();
  // Guests: service-role read of public stories only (app-enforced privacy).
  // Authenticated: user-scoped client so RLS + membership rules apply.
  const reader = user ? (supabase as any) : (createServiceRoleClient() as any);
  const selectCols = user
    ? "id, author_id, community_id, media_url, media_type, caption, thumbnail_url, privacy, mentions, view_count, unique_view_count, reply_count, expires_at, created_at, profiles!community_stories_author_id_fkey(full_name, avatar_url, username)"
    : "id, author_id, community_id, media_url, media_type, caption, thumbnail_url, privacy, expires_at, created_at, profiles!community_stories_author_id_fkey(full_name, avatar_url, username)";

  let query = reader
    .from("community_stories")
    .select(selectCols)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(user ? 120 : 40);

  if (!user) {
    query = query.eq("privacy", "public");
  }

  const { data, error } = await query;

  if (error) {
    // Soft-fail when migration not applied yet
    if (/relation|does not exist|community_stories/i.test(error.message)) {
      return NextResponse.json(
        {
          groups: [],
          current_user_id: user?.id ?? null,
        },
        user
          ? undefined
          : {
              headers: {
                "Cache-Control": "public, s-maxage=20, stale-while-revalidate=60",
              },
            }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = (data ?? []) as StoryRow[];
  // Guest feed is newest-first for fast cutoff; restore chronological within groups later.
  if (!user) {
    rows.reverse();
  }
  const storyIds = rows.map((r) => r.id);

  const viewedSet = new Set<string>();
  if (user && storyIds.length > 0) {
    const { data: views } = await (supabase as any)
      .from("community_story_views")
      .select("story_id")
      .eq("user_id", user.id)
      .in("story_id", storyIds);
    for (const v of views ?? []) {
      if (v?.story_id) viewedSet.add(v.story_id as string);
    }
  }

  type Group = {
    author_id: string;
    author: {
      full_name: string | null;
      avatar_url: string | null;
      username: string | null;
    };
    has_unseen: boolean;
    stories: Array<{
      id: string;
      author_id: string;
      community_id: string | null;
      media_url: string;
      media_type: string;
      caption: string | null;
      thumbnail_url: string | null;
      privacy: string;
      mentions: unknown;
      view_count: number;
      unique_view_count: number;
      reply_count: number;
      expires_at: string;
      created_at: string;
      viewed: boolean;
    }>;
  };

  const byAuthor = new Map<string, Group>();
  const order: string[] = [];

  for (const row of rows) {
    const viewed = viewedSet.has(row.id);
    const story = {
      id: row.id,
      author_id: row.author_id,
      community_id: row.community_id,
      media_url: row.media_url,
      media_type: row.media_type,
      caption: row.caption,
      thumbnail_url: row.thumbnail_url,
      privacy: row.privacy,
      mentions: row.mentions ?? [],
      view_count: row.view_count ?? 0,
      unique_view_count: row.unique_view_count ?? 0,
      reply_count: row.reply_count ?? 0,
      expires_at: row.expires_at,
      created_at: row.created_at,
      viewed,
    };

    let group = byAuthor.get(row.author_id);
    if (!group) {
      const profile = profileOf(row);
      group = {
        author_id: row.author_id,
        author: {
          full_name: profile?.full_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
          username: profile?.username ?? null,
        },
        has_unseen: false,
        stories: [],
      };
      byAuthor.set(row.author_id, group);
      order.push(row.author_id);
    }
    group.stories.push(story);
    if (!viewed && (!user || row.author_id !== user.id)) group.has_unseen = true;
  }

  // Own stories first, then unseen, then rest (by most recent story)
  const ranked = order
    .map((id) => byAuthor.get(id)!)
    .sort((a, b) => {
      const aUnseen = a.has_unseen ? 0 : 1;
      const bUnseen = b.has_unseen ? 0 : 1;
      if (aUnseen !== bUnseen) return aUnseen - bUnseen;
      const aLatest = a.stories[a.stories.length - 1]?.created_at ?? "";
      const bLatest = b.stories[b.stories.length - 1]?.created_at ?? "";
      return bLatest.localeCompare(aLatest);
    });
  const groups = rotateStoryAuthors(ranked, storyRotationBucket(), user?.id ?? null);

  return NextResponse.json(
    {
      groups,
      current_user_id: user?.id ?? null,
    },
    user
      ? undefined
      : {
          headers: {
            "Cache-Control": "public, s-maxage=20, stale-while-revalidate=60",
          },
        }
  );
}

/** POST — create story; expires_at = now + 48h */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = rateLimit(`stories-write:${user.id}`, 20, 60_000);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many stories — try again shortly" },
      { status: 429 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    media_url?: string;
    media_type?: string;
    caption?: string | null;
    community_id?: string | null;
    privacy?: string;
    mentions?: unknown;
    thumbnail_url?: string | null;
  };

  const mediaUrl = typeof body.media_url === "string" ? body.media_url.trim() : "";
  if (!mediaUrl || !/^https?:\/\//i.test(mediaUrl)) {
    return NextResponse.json({ error: "media_url required" }, { status: 400 });
  }

  const mediaType = body.media_type ?? "photo";
  if (!MEDIA_TYPES.has(mediaType)) {
    return NextResponse.json({ error: "media_type must be photo or video" }, { status: 400 });
  }

  const privacy = body.privacy ?? "followers";
  if (!PRIVACY.has(privacy)) {
    return NextResponse.json({ error: "invalid privacy" }, { status: 400 });
  }

  if (privacy === "community" && !body.community_id) {
    return NextResponse.json(
      { error: "community_id required for community privacy" },
      { status: 400 }
    );
  }

  if (body.community_id) {
    const { data: membership } = await supabase
      .from("community_memberships")
      .select("id")
      .eq("community_id", body.community_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    if (!membership) {
      return NextResponse.json({ error: "Not a community member" }, { status: 403 });
    }
  }

  const expiresAt = new Date(Date.now() + STORY_TTL_MS).toISOString();
  const caption =
    typeof body.caption === "string" ? body.caption.trim().slice(0, 500) || null : null;
  const thumbnailUrl =
    typeof body.thumbnail_url === "string" && /^https?:\/\//i.test(body.thumbnail_url)
      ? body.thumbnail_url.trim()
      : null;
  const mentions = Array.isArray(body.mentions) ? body.mentions : [];

  const { data, error } = await (supabase as any)
    .from("community_stories")
    .insert({
      author_id: user.id,
      community_id: body.community_id ?? null,
      media_url: mediaUrl,
      media_type: mediaType,
      caption,
      thumbnail_url: thumbnailUrl,
      privacy,
      mentions,
      expires_at: expiresAt,
    })
    .select(
      "id, author_id, community_id, media_url, media_type, caption, thumbnail_url, privacy, mentions, view_count, unique_view_count, reply_count, expires_at, created_at"
    )
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ story: data });
}
