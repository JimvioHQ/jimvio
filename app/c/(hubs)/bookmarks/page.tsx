"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, MessageSquare, Share2, Bookmark, X, ChevronRight, Loader2, Image as ImageIcon } from "lucide-react";
import { HubCard, HubBadge, HubLinkButton, HubSectionTitle, HubStatCard } from "@/components/community/hub/hub-ui";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/client";

type SavedPost = {
  id: string;
  created_at: string;
  community_posts: {
    id: string;
    title: string | null;
    body: string;
    like_count: number;
    comment_count: number;
    created_at: string;
    images: string[] | null;
    community_id: string;
    room_id: string;
    room: {
      id: string;
      name: string;
      room_type: string;
      community_id: string;
    } | null;
    profiles: {
      id: string;
      full_name: string | null;
      avatar_url: string | null;
      username: string | null;
    } | null;
  } | null;
};

export default function HubBookmarksPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SavedPost[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("community_saved_posts")
          .select(`
            id,
            created_at,
            community_posts (
              id, title, body, like_count, comment_count, created_at, images,
              community_id, room_id,
              room:community_rooms!community_rooms_id_fkey ( id, name, room_type, community_id ),
              profiles:author_id ( full_name, avatar_url, username )
            )
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (!cancelled) {
          if (error) throw error;
          setItems(data ?? []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = items.filter((item) => {
    const post = item.community_posts;
    if (!post) return false;
    const q = search.toLowerCase();
    return (post.title?.toLowerCase().includes(q) ?? false) ||
      post.body.toLowerCase().includes(q) ||
      (post.profiles?.full_name?.toLowerCase().includes(q) ?? false);
  });

  const removeBookmark = async (savedId: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const prev = items;
    setItems((p) => p.filter((b) => b.id !== savedId));

    const { error } = await supabase
      .from("community_saved_posts")
      .delete()
      .eq("id", savedId)
      .eq("user_id", user.id);

    if (error) {
      console.error("[Bookmarks] remove failed:", error);
      setItems(prev);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[var(--color-bg)]"
         style={{
           backgroundImage: `radial-gradient(circle at 50% -20%, var(--color-accent)/5, transparent 50%), radial-gradient(circle at 100% 100%, var(--color-social)/3, transparent 40%)`,
         }}>
    <div className="mx-auto max-w-[720px] space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black tracking-tight text-[var(--color-text-primary)]">
            <Bookmark className="h-5 w-5 text-[var(--color-accent)]" />
            Bookmarks
          </h1>
          <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
            Your saved posts across communities
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative animate-in animate-slide-in-down">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search bookmarks…"
          className="w-full rounded-xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur py-2.5 pl-10 pr-4 text-[13px] transition-colors focus:border-[var(--color-accent)]/40 focus:bg-[var(--color-surface)] focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-muted)]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-8 text-center animate-in animate-fade-in">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-accent)]/10">
            <Bookmark className="h-7 w-7 text-[var(--color-accent)]" />
          </div>
          <p className="text-[14px] font-bold text-[var(--color-text-primary)]">No saved posts yet</p>
          <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
            {search
              ? "No matches found. Try a different search."
              : "Save posts from communities to find them here later."}
          </p>
        </div>
      ) : (
        <div className="space-y-3 animate-in stagger-children">
          {filtered.map((saved) => {
            const post = saved.community_posts;
            if (!post) return null;

            const author = post.profiles;
            const room = post.room;
            const communityId = post.community_id;

            return (
              <div
                key={saved.id}
                className="relative group rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-4 hover:border-[var(--color-accent)]/30 hover:shadow-md transition-all duration-300 animate-in animate-fade-in-up"
              >
                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeBookmark(saved.id)}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-red-400"
                  aria-label="Remove bookmark"
                >
                  <X className="h-4 w-4" />
                </button>

                <a
                  href={`/c/${room?.community_id ?? communityId}/room/${room?.id ?? post.room_id}`}
                  className="block"
                >
                  <div className="flex items-start gap-3">
                    {/* Thumbnail */}
                    {post.images?.[0] && (
                      <div className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden">
                        <img
                          src={post.images[0]}
                          alt=""
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      {/* Author + meta */}
                      <div className="flex items-center gap-2">
                        <img
                          src={author?.avatar_url ?? ""}
                          alt={author?.full_name ?? ""}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                        <div>
                          <p className="truncate text-[13px] font-semibold text-[var(--color-text-primary)]">
                            {author?.full_name ?? author?.username ?? "Unknown"}
                          </p>
                          <p className="text-[11px] text-[var(--color-text-muted)]">
                            {room ? `in ${room.name}` : "Post"} ·{" "}
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>

                      {/* Title / Body preview */}
                      <h3 className="mt-2 text-[15px] font-bold group-hover:text-[var(--color-accent)] transition-colors">
                        {post.title ?? post.body.slice(0, 80) + (post.body.length > 80 ? "…" : "")}
                      </h3>

                      {post.body && !post.title && (
                        <p className="mt-1 line-clamp-2 text-[12px] text-[var(--color-text-secondary)]">{post.body}</p>
                      )}

                      {/* Stats */}
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-[var(--color-text-muted)]">
                        <span className="inline-flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {post.like_count}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {post.comment_count}
                        </span>
                        {post.images && post.images.length > 1 && (
                          <span className="inline-flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" />
                            {post.images.length} photos
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </a>
              </div>
            )}
          )}
          </div>
        )}
      </div>
    </div>
  );
}