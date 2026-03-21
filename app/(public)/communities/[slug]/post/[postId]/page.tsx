import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getPostByIdWithComments } from "@/services/db";
import { getMembershipStatus } from "@/lib/actions/community";
import { timeAgo } from "@/lib/utils";
import { DiscussionThreadClient } from "./discussion-thread-client";

interface PageProps {
  params: Promise<{ slug: string; postId: string }>;
}

export default async function CommunityPostThreadPage({ params }: PageProps) {
  const { slug, postId } = await params;
  const postData = await getPostByIdWithComments(postId, slug);
  if (!postData) notFound();

  const community = postData.communities as { id: string; name: string; slug: string } | null;
  const membership = await getMembershipStatus(community?.id ?? "");

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
        <Link
          href={`/communities/${slug}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-accent)] mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {community?.name ?? "Community"}
        </Link>

        {/* Post */}
        <article className="bg-white/80 backdrop-blur-xl border border-[var(--color-border)] rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm mb-8">
          <div className="p-6 sm:p-8">
            <div className="flex items-start gap-3 sm:gap-4 mb-4">
              <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-[var(--color-border)] shrink-0">
                <AvatarImage src={(postData.profiles as { avatar_url?: string })?.avatar_url} />
                <AvatarFallback className="bg-[var(--color-accent-light)] text-[var(--color-accent)] font-semibold">
                  {(postData.profiles as { full_name?: string })?.full_name?.[0] ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[var(--color-text-primary)]">
                  {(postData.profiles as { full_name?: string })?.full_name ?? "Member"}
                </p>
                <p className="text-xs sm:text-sm text-[var(--color-text-muted)]">{timeAgo(postData.created_at)}</p>
              </div>
            </div>
            {postData.title && (
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] mb-3 leading-tight">
                {postData.title}
              </h1>
            )}
            <div className="text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap">
              {postData.body}
            </div>
            {Array.isArray(postData.images) && postData.images.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {postData.images.map((url: string, i: number) => (
                  <img key={i} src={url} alt="" className="rounded-xl max-h-64 object-cover border border-[var(--color-border)]" />
                ))}
              </div>
            )}
          </div>
        </article>

        {/* Comments */}
        <section>
          <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[var(--color-accent)]" />
            Comments {(postData.community_post_comments?.length ?? 0) > 0 && `(${postData.community_post_comments.length})`}
          </h2>
          <DiscussionThreadClient
            postId={postId}
            communitySlug={slug}
            initialComments={postData.community_post_comments ?? []}
            isMember={membership.isMember || membership.isOwner}
          />
        </section>
      </div>
    </div>
  );
}
