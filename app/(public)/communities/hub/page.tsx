import React, { Suspense } from "react";
import Link from "next/link";
import { getCachedUser } from "@/lib/supabase/server";
import { getJoinedCommunities, getCommunityBySlug, getCommunityPosts } from "@/services/db";
import { getMembershipStatus } from "@/lib/actions/community";
import { CommunityHubSidebar } from "@/components/community/community-hub-sidebar";
import { CreatePostForm } from "@/components/community/create-post-form";
import { PostCard } from "@/components/community/post-card";
import { MessageSquare, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageProps {
  searchParams: Promise<{ community?: string }>;
}

export default async function CommunityHubPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const slug = params.community;

  const { data: { user } } = await getCachedUser() ?? {};
  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="h-20 w-20 rounded-3xl bg-[var(--color-accent-light)] flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="h-10 w-10 text-[var(--color-accent)]" />
          </div>
          <h1 className="text-2xl font-black text-[var(--color-text-primary)] mb-2">Community Hub</h1>
          <p className="text-[var(--color-text-secondary)] mb-8">
            Sign in to see your communities and join the conversation.
          </p>
          <Link href={`/login?returnUrl=${encodeURIComponent("/communities/hub")}`}>
            <Button className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black h-12 px-8 rounded-2xl gap-2">
              <LogIn className="h-4 w-4" /> Sign In
            </Button>
          </Link>
          <p className="mt-6 text-sm text-[var(--color-text-muted)]">
            <Link href="/communities" className="font-bold text-[var(--color-accent)] hover:underline">
              Browse all communities
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const joined = await getJoinedCommunities(user.id);

  return (
    <div className="flex h-[calc(100vh-var(--navbar-height))] bg-[var(--color-bg)]">
      <Suspense fallback={<div className="w-[320px] border-r border-[var(--color-border)] bg-white animate-pulse" />}>
        <CommunityHubSidebar communities={joined} />
      </Suspense>

      <main className="flex-1 flex flex-col min-w-0 bg-[var(--color-surface-secondary)]">
        {slug ? (
          <HubFeed slug={slug} userId={user.id} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <MessageSquare className="h-16 w-16 text-[var(--color-text-muted)] mb-6 opacity-40" />
            <h2 className="text-xl font-black text-[var(--color-text-primary)] mb-2">Select a community</h2>
            <p className="text-[var(--color-text-muted)] max-w-sm mb-6">
              Choose a community from the list to view posts and join the discussion.
            </p>
            {joined.length === 0 ? (
              <Link href="/communities">
                <Button className="bg-[var(--color-accent)] text-white font-black rounded-2xl">
                  Discover communities
                </Button>
              </Link>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}

async function HubFeed({ slug, userId }: { slug: string; userId: string }) {
  const community = await getCommunityBySlug(slug);
  if (!community) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-[var(--color-text-muted)] font-bold">Community not found.</p>
      </div>
    );
  }

  const [posts, membership] = await Promise.all([
    getCommunityPosts(community.id, 30),
    getMembershipStatus(community.id),
  ]);

  const { isMember, isOwner } = membership;
  const hasAccess = isMember || isOwner || !community.is_private;

  let profile: { full_name?: string; avatar_url?: string } | null = null;
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", userId).single();
  profile = data ?? null;

  return (
    <>
      <div className="p-4 border-b border-[var(--color-border)] bg-white shrink-0">
        <h2 className="text-lg font-black text-[var(--color-text-primary)]">{community.name}</h2>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          {community.member_count ?? 0} members · {(community as any).post_count ?? 0} posts
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {(isMember || isOwner) && (
          <CreatePostForm communityId={community.id} user={profile} />
        )}

        {hasAccess ? (
          posts.length > 0 ? (
            <div className="space-y-4">
              {posts.map((post: any) => (
                <PostCard key={post.id} post={post} isMember={isMember || isOwner} communitySlug={community.slug} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-[var(--color-border)]">
              <MessageSquare className="h-12 w-12 text-[var(--color-text-muted)] mx-auto mb-4 opacity-30" />
              <h3 className="font-black text-[var(--color-text-primary)] mb-2">No posts yet</h3>
              <p className="text-sm text-[var(--color-text-muted)]">Be the first to start the conversation!</p>
              {(isMember || isOwner) && (
                <p className="text-xs text-[var(--color-accent)] font-bold mt-2">Use the box above to post.</p>
              )}
            </div>
          )
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-[var(--color-border)]">
            <p className="font-bold text-[var(--color-text-secondary)]">Join this community to see posts.</p>
            <Link href={`/communities/${community.slug}`} className="text-sm font-black text-[var(--color-accent)] hover:underline mt-2 inline-block">
              Open community page →
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
