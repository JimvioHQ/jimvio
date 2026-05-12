// components/workspace/sections/FeedSection.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Image as ImageIcon, Video, BarChart3, Smile, Send, MessageCircle, Heart, Repeat2, Share2, MoreHorizontal } from "lucide-react";
import { useWorkspace } from "@/components/community/workspace-context";

interface Post {
  id: string;
  author: { id: string; full_name: string | null; avatar_url: string | null; username: string | null };
  content: string;
  created_at: string;
  reactions_count: number;
  comments_count: number;
}

export function FeedSection() {
  const { communityId, communityName, currentUserId, view, isAdmin } = useWorkspace();
  const supabase = createClient();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [composer, setComposer] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from("community_posts")
        .select(`
          id, content, created_at, reactions_count, comments_count,
          author:profiles!community_posts_author_id_fkey(id, full_name, avatar_url, username)
        `)
        .eq("community_id", communityId)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!cancelled) {
        setPosts((data ?? []) as unknown as Post[]);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [communityId, supabase]);

  const adminView = view === "admin" && isAdmin;

  return (
    <div className="flex flex-col gap-4">
      {/* Composer */}
      <div className="bg-surface border border-border rounded-2xl p-4">
        <textarea
          value={composer}
          onChange={(e) => setComposer(e.target.value)}
          placeholder={`Share something with ${communityName}...`}
          rows={3}
          className="w-full bg-transparent text-[14px] text-text-primary placeholder:text-text-muted resize-none focus:outline-none"
        />
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-1">
            {[
              { icon: ImageIcon, label: "Photo" },
              { icon: Video, label: "Video" },
              { icon: BarChart3, label: "Poll" },
              { icon: Smile, label: "Mood" },
            ].map((b) => {
              const Icon = b.icon;
              return (
                <button
                  type="button"
                  key={b.label}
                  className="p-2 rounded-lg text-text-muted hover:bg-surface-secondary hover:text-[#fd5000] transition-colors"
                  aria-label={b.label}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
          <button
            type="button"
            disabled={!composer.trim()}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white px-4 py-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{ background: "linear-gradient(135deg, #fd5000, #ff7a30)" }}
          >
            <Send className="w-3.5 h-3.5" />
            Post
          </button>
        </div>
      </div>

      {/* Admin notice */}
      {adminView && (
        <div className="text-[11px] font-semibold text-[#fd5000] bg-[#fd5000]/10 border border-[#fd5000]/20 rounded-lg px-3 py-2">
          Admin view: you can pin, hide, or delete any post.
        </div>
      )}

      {/* Posts */}
      {loading ? (
        <FeedSkeleton />
      ) : posts.length === 0 ? (
        <FeedEmpty />
      ) : (
        posts.map((p) => <PostCard key={p.id} post={p} isAdmin={adminView} />)
      )}
    </div>
  );
}

function PostCard({ post, isAdmin }: { post: Post; isAdmin: boolean }) {
  const name = post.author.full_name ?? post.author.username ?? "Creator";
  return (
    <article className="bg-surface border border-border rounded-2xl p-4 hover:border-border-hover transition-colors">
      <header className="flex items-start gap-3 mb-3">
        {post.author.avatar_url ? (
          <img src={post.author.avatar_url} alt={name} className="w-10 h-10 rounded-full object-cover ring-1 ring-border" />
        ) : (
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: "#fd5000" }}>
            {name[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-text-primary truncate">{name}</p>
          {post.author.username && (
            <p className="text-[11px] text-text-muted truncate">@{post.author.username} · {timeAgo(post.created_at)}</p>
          )}
        </div>
        {isAdmin && (
          <button
            type="button"
            className="p-1.5 rounded-lg text-text-muted hover:bg-surface-secondary"
            aria-label="Post actions"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        )}
      </header>

      <p className="text-[14px] text-text-primary leading-relaxed whitespace-pre-wrap mb-3">
        {post.content}
      </p>

      <div className="flex items-center gap-1 -ml-2">
        {[
          { icon: Heart, count: post.reactions_count, label: "Reactions" },
          { icon: MessageCircle, count: post.comments_count, label: "Comments" },
          { icon: Repeat2, count: 0, label: "Repost" },
          { icon: Share2, count: null, label: "Share" },
        ].map((b) => {
          const Icon = b.icon;
          return (
            <button
              type="button"
              key={b.label}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-text-muted hover:bg-surface-secondary hover:text-[#fd5000] transition-colors"
            >
              <Icon className="w-3.5 h-3.5" />
              {b.count !== null && b.count > 0 && <span className="font-semibold">{b.count}</span>}
            </button>
          );
        })}
      </div>
    </article>
  );
}

function FeedSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-surface border border-border rounded-2xl p-4 animate-pulse">
          <div className="flex gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-surface-secondary" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-32 rounded bg-surface-secondary" />
              <div className="h-2 w-20 rounded bg-surface-secondary" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-surface-secondary" />
            <div className="h-3 w-4/5 rounded bg-surface-secondary" />
          </div>
        </div>
      ))}
    </>
  );
}

function FeedEmpty() {
  return (
    <div className="bg-surface border border-border rounded-2xl p-12 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#fd5000]/10 flex items-center justify-center mb-3">
        <MessageCircle className="w-6 h-6 text-[#fd5000]" />
      </div>
      <h3 className="text-[15px] font-bold text-text-primary mb-1">Be the first to post</h3>
      <p className="text-[12px] text-text-muted max-w-sm">
        No conversations yet. Share a win, ask a question, or drop a link to get the community going.
      </p>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}