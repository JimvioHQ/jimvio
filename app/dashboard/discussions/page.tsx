import React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDiscussionFeedForUser } from "@/services/db";
import { redirect } from "next/navigation";
import { MessageSquare, Heart, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { timeAgo } from "@/lib/utils";

export default async function DashboardDiscussionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const posts = await getDiscussionFeedForUser(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight">Discussions</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Recent posts from your communities. Open any post to view the thread and add comments.
        </p>
      </div>

      {posts.length === 0 ? (
        <Card className="rounded-2xl shadow-sm border-[var(--color-border)] overflow-hidden">
          <CardContent className="py-16 text-center">
            <MessageSquare className="h-12 w-12 text-[var(--color-text-muted)] mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">No discussions yet</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-6 max-w-sm mx-auto">
              Join communities to see their posts here. You can comment and reply from the discussion thread.
            </p>
            <Link href="/dashboard/communities" className="text-[var(--color-accent)] font-bold hover:underline">
              Discover communities
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post: {
            id: string;
            title: string | null;
            body: string;
            like_count: number;
            comment_count: number;
            created_at: string;
            community_id: string;
            communities: { id: string; name: string; slug: string }[] | { id: string; name: string; slug: string } | null;
            profiles: { full_name?: string; avatar_url?: string }[] | { full_name?: string; avatar_url?: string } | null;
          }) => {
            const community = Array.isArray(post.communities) ? post.communities[0] : post.communities;
            const slug = community?.slug ?? "";
            return (
              <Card key={post.id} className="rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-[var(--color-accent)]/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {(post.profiles as { avatar_url?: string })?.avatar_url ? (
                        <img src={(post.profiles as { avatar_url?: string }).avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-[var(--color-accent)]">
                          {(post.profiles as { full_name?: string })?.full_name?.[0] ?? "?"}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[var(--color-text-muted)]">
                        {(post.profiles as { full_name?: string })?.full_name ?? "Member"} · {community?.name ?? "Community"}
                      </p>
                      <h3 className="font-bold text-[var(--color-text-primary)] mt-0.5">
                        {post.title || "Untitled"}
                      </h3>
                      <p className="text-sm text-[var(--color-text-secondary)] mt-1 line-clamp-2">
                        {post.body}
                      </p>
                      <div className="flex items-center gap-4 mt-3">
                        <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                          <Heart className="h-3.5 w-3" /> {post.like_count ?? 0}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                          <MessageSquare className="h-3.5 w-3" /> {post.comment_count ?? 0}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">{timeAgo(post.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  {slug && (
                    <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                      <Link
                        href={`/communities/${slug}/post/${post.id}`}
                        className="text-sm font-bold text-[var(--color-accent)] hover:underline"
                      >
                        View discussion & reply →
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
