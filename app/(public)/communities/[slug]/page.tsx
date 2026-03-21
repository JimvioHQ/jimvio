import React from "react";
import Link from "next/link";
import {
  Users, Lock, Globe, Star, MessageSquare, Calendar, CheckCircle2,
  ArrowRight, Shield, Crown, Sparkles, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getCommunityBySlug, getCommunityPosts, getCommunityMembers } from "@/services/db";
import { getMembershipStatus } from "@/lib/actions/community";
import { getCachedUser } from "@/lib/supabase/server";
import { formatCurrency, formatNumber, timeAgo, cn } from "@/lib/utils";
import { notFound } from "next/navigation";
import { JoinCommunityButton } from "@/components/community/join-button";
import { CreatePostForm } from "@/components/community/create-post-form";
import { PostCard } from "@/components/community/post-card";

export const metadata = { title: "Community" };

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CommunityDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const community = await getCommunityBySlug(slug);
  if (!community) notFound();

  const [posts, members, membership, userResult] = await Promise.all([
    getCommunityPosts(community.id, 20),
    getCommunityMembers(community.id, 12),
    getMembershipStatus(community.id),
    getCachedUser(),
  ]);

  const owner = (community as any).profiles;
  const { isMember, isOwner } = membership;
  let profile: { full_name?: string; avatar_url?: string } | null = null;
  if (userResult?.data?.user) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", userResult.data.user.id).single();
    profile = data ?? { full_name: userResult.data.user.user_metadata?.full_name, avatar_url: userResult.data.user.user_metadata?.avatar_url };
  }
  const hasAccess = isMember || isOwner || !community.is_private;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">

      {/* ── HERO ── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-ink-darker via-[#1a0f08] to-[#2d1810]" />
        {community.cover_image && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url(${community.cover_image})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-darker/80 via-ink-darker/30 to-transparent" />
        <div className="absolute -right-40 -top-40 w-[400px] h-[400px] bg-[var(--color-accent)] opacity-10 blur-[150px] rounded-full" />

        <div className="relative z-10 max-w-[1280px] mx-auto px-6 py-16 md:py-24">
          <div className="flex flex-col lg:flex-row gap-10 items-start">
            {/* Left: Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-6">
                <Link href="/communities" className="text-[10px] font-black capitalize tracking-[0.2em] text-white/40 hover:text-[var(--color-accent)] transition-colors">
                  Communities
                </Link>
                <div className="h-1 w-1 rounded-full bg-white/20" />
                <span className="text-[10px] font-black capitalize tracking-[0.2em] text-white/60">{community.category || "Community"}</span>
              </div>

              <div className="flex items-start gap-6 mb-8">
                <div className="h-20 w-20 md:h-24 md:w-24 rounded-3xl bg-gradient-to-br from-[var(--color-accent)] to-amber-600 flex items-center justify-center text-4xl shrink-0 shadow-2xl shadow-[var(--color-accent)]/20 overflow-hidden border-2 border-white/10">
                  {community.avatar_url ? (
                    <img src={community.avatar_url} alt={community.name} className="w-full h-full object-cover" />
                  ) : "🚀"}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    {community.is_private ? (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-orange-500/20 backdrop-blur text-orange-400 text-[10px] font-black rounded-full capitalize tracking-wider">
                        <Lock className="h-3 w-3" /> Private
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 backdrop-blur text-emerald-400 text-[10px] font-black rounded-full capitalize tracking-wider">
                        <Globe className="h-3 w-3" /> Public
                      </span>
                    )}
                    {community.is_featured && (
                      <span className="flex items-center gap-1 px-3 py-1 bg-amber-500/20 backdrop-blur text-amber-400 text-[10px] font-black rounded-full capitalize tracking-wider">
                        <Crown className="h-3 w-3" /> Featured
                      </span>
                    )}
                  </div>
                  <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight mb-4">
                    {community.name}
                  </h1>
                  <div className="flex flex-wrap items-center gap-6 text-sm text-white/40 font-medium">
                    <span className="flex items-center gap-2"><Users className="h-4 w-4 text-[var(--color-accent)]" /> {formatNumber(community.member_count || 0)} members</span>
                    <span className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-[var(--color-accent)]" /> {formatNumber(community.post_count || 0)} posts</span>
                    <span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-[var(--color-accent)]" /> {new Date(community.created_at).getFullYear()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Access Card */}
            <div className="w-full lg:w-80 shrink-0">
              <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                <p className="text-white/40 text-[10px] font-black capitalize tracking-[0.25em] mb-4">Access Pass</p>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-4xl font-black text-white">
                    {community.monthly_price ? formatCurrency(community.monthly_price) : "FREE"}
                  </span>
                  {community.monthly_price && <span className="text-white/30 font-bold text-sm">/mo</span>}
                </div>

                {community.yearly_price && (
                  <div className="bg-white/5 rounded-2xl p-3 mb-4 border border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/50 font-bold">Yearly plan</span>
                      <span className="text-sm font-black text-white">{formatCurrency(community.yearly_price)}<span className="text-white/30 text-xs">/yr</span></span>
                    </div>
                  </div>
                )}

                <JoinCommunityButton
                  communityId={community.id}
                  isMember={isMember}
                  isOwner={isOwner}
                  price={community.monthly_price}
                  className="w-full h-14 text-base"
                />

                <p className="text-center text-[10px] text-white/30 font-bold mt-4 capitalize tracking-wider">
                  Cancel subscription anytime
                </p>

                <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
                  {[
                    "Full access to all posts",
                    "Join exclusive discussions",
                    "Direct messaging with members",
                    "Weekly live events & workshops",
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs text-white/50 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="max-w-[1280px] mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,340px] gap-12">

          {/* ── Main Feed ── */}
          <div className="space-y-8">
            {/* About */}
            <div className="bg-white/80 backdrop-blur-xl border border-[var(--color-border)] rounded-3xl p-8">
              <h2 className="text-xl font-black text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[var(--color-accent)]" /> About
              </h2>
              <p className="text-[var(--color-text-secondary)] leading-relaxed">
                {community.description || community.long_description || "Welcome to our community!"}
              </p>
              {community.long_description && community.description !== community.long_description && (
                <p className="text-[var(--color-text-secondary)] leading-relaxed mt-4">{community.long_description}</p>
              )}

              {community.tags && community.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-6">
                  {community.tags.map((tag: string) => (
                    <span key={tag} className="px-3 py-1 bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] text-[11px] font-bold rounded-full border border-[var(--color-border)]">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Post Form */}
            {(isMember || isOwner) && (
              <CreatePostForm communityId={community.id} user={profile} />
            )}

            {/* Posts */}
            <div>
              <h2 className="text-lg font-black text-[var(--color-text-primary)] mb-6 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-[var(--color-accent)]" /> Recent Posts
              </h2>

              {hasAccess ? (
                posts.length > 0 ? (
                  <div className="space-y-6">
                    {posts.map((post: any) => (
                      <PostCard key={post.id} post={post} isMember={isMember || isOwner} communitySlug={slug} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-white/80 backdrop-blur-xl border border-[var(--color-border)] rounded-3xl">
                    <MessageSquare className="h-12 w-12 text-[var(--color-text-muted)] mx-auto mb-4 opacity-30" />
                    <h3 className="text-lg font-black text-[var(--color-text-primary)] mb-2">No posts yet</h3>
                    <p className="text-sm text-[var(--color-text-muted)]">Be the first to start a discussion!</p>
                  </div>
                )
              ) : (
                <div className="text-center py-16 bg-white/80 backdrop-blur-xl border border-[var(--color-border)] rounded-3xl relative overflow-hidden">
                  <div className="absolute inset-0 backdrop-blur-sm bg-white/50 z-10" />
                  <div className="relative z-20">
                    <Lock className="h-12 w-12 text-[var(--color-accent)] mx-auto mb-4" />
                    <h3 className="text-lg font-black text-[var(--color-text-primary)] mb-2">Members Only Content</h3>
                    <p className="text-sm text-[var(--color-text-muted)] mb-6 max-w-sm mx-auto">Join this community to access exclusive posts, discussions, and resources.</p>
                    <JoinCommunityButton
                      communityId={community.id}
                      isMember={isMember}
                      isOwner={isOwner}
                      price={community.monthly_price}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Sidebar ── */}
          <aside className="space-y-6">
            {/* Owner Card */}
            <div className="bg-white/80 backdrop-blur-xl border border-[var(--color-border)] rounded-3xl p-6 shadow-sm">
              <p className="text-[10px] text-[var(--color-text-muted)] font-black capitalize tracking-[0.2em] mb-4">Community Leader</p>
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="h-14 w-14 border-2 border-[var(--color-accent)]/20 ring-2 ring-[var(--color-accent)]/10 shadow-lg">
                  <AvatarImage src={owner?.avatar_url || ""} />
                  <AvatarFallback className="bg-[var(--color-accent)] text-white font-black text-lg">{owner?.full_name?.[0] || "C"}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-black text-[var(--color-text-primary)]">{owner?.full_name || "Creator"}</h4>
                  <p className="text-[11px] text-[var(--color-text-muted)] font-medium">{owner?.email || "Community Leader"}</p>
                </div>
              </div>
              <Button variant="outline" className="w-full font-bold rounded-xl border-2 border-[var(--color-border)]">
                View Profile
              </Button>
            </div>

            {/* Members */}
            <div className="bg-white/80 backdrop-blur-xl border border-[var(--color-border)] rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] text-[var(--color-text-muted)] font-black capitalize tracking-[0.2em]">Members</p>
                <span className="text-xs font-black text-[var(--color-accent)]">{formatNumber(community.member_count || 0)}</span>
              </div>

              {members.length > 0 ? (
                <div className="space-y-3">
                  {members.slice(0, 8).map((m: any) => (
                    <div key={m.id} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border border-[var(--color-border)]">
                        <AvatarImage src={m.profiles?.avatar_url || ""} />
                        <AvatarFallback className="text-[10px] font-black bg-[var(--color-accent-light)] text-[var(--color-accent)]">
                          {m.profiles?.full_name?.[0] || "M"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">{m.profiles?.full_name || "Member"}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">{m.role === "admin" ? "Admin" : "Member"} · {timeAgo(m.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--color-text-muted)] text-center py-4">No members yet</p>
              )}
            </div>

            {/* Rules */}
            <div className="bg-[var(--color-accent-light)] border border-[var(--color-accent-subtle)] rounded-3xl p-6">
              <h4 className="font-black text-sm text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <Shield className="h-4 w-4 text-[var(--color-accent)]" /> Community Rules
              </h4>
              <div className="space-y-2.5">
                {["Be respectful to all members", "No spam or self-promotion", "Stay on topic", "Support fellow creators"].map((rule, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs text-[var(--color-text-secondary)] font-medium">
                    <div className="h-5 w-5 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white text-[9px] font-black shrink-0">
                      {i + 1}
                    </div>
                    {rule}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
