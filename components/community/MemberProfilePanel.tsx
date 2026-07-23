"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type MemberProfileData = {
  user_id: string;
  role: string;
  joined_at: string | null;
  profile: {
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
    bio?: string | null;
  };
  points: { total_points: number; level: number; streak_days: number } | null;
  recent_posts: {
    id: string;
    title: string | null;
    body: string;
    created_at: string;
    like_count: number;
    comment_count: number;
  }[];
};

function roleLabel(role: string) {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  if (role === "moderator") return "Moderator";
  return "Member";
}

function excerpt(body: string, max = 140) {
  const t = body.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trimEnd()}…`;
}

export function MemberProfilePanel({
  slug,
  member,
  communityName,
  currentUserId,
  onMessage,
}: {
  slug: string;
  member: MemberProfileData;
  communityName?: string;
  currentUserId?: string | null;
  onMessage?: () => void;
}) {
  const name = member.profile.full_name || member.profile.username || "Member";
  const isSelf = !!currentUserId && currentUserId === member.user_id;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
        <Link
          href={`/communities/${slug}/members`}
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to members
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
            {member.profile.avatar_url?.trim() ? (
              <Image
                src={member.profile.avatar_url}
                alt=""
                width={80}
                height={80}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-black text-[var(--color-accent)]">
                {name[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-black text-[var(--color-text-primary)]">{name}</h1>
            {member.profile.username && (
              <p className="text-sm text-[var(--color-text-muted)]">@{member.profile.username}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-sm bg-[var(--color-surface-secondary)] px-2 py-0.5 text-[10px] font-black uppercase text-[var(--color-text-secondary)]">
                {roleLabel(member.role)}
              </span>
              {member.points && (
                <span className="rounded-sm bg-[var(--color-accent-light)] px-2 py-0.5 text-[10px] font-black uppercase text-[var(--color-accent)]">
                  Lvl {member.points.level}
                </span>
              )}
            </div>
            {member.joined_at && (
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                Joined {new Date(member.joined_at).toLocaleDateString()}
                {communityName ? ` · ${communityName}` : ""}
              </p>
            )}
            {member.points && (
              <p className="mt-1 text-xs font-bold text-[var(--color-text-secondary)]">
                {member.points.total_points.toLocaleString()} pts
                {member.points.streak_days > 0
                  ? ` · ${member.points.streak_days}-day streak`
                  : ""}
              </p>
            )}
            {member.profile.bio?.trim() && (
              <p className="mt-3 text-sm text-[var(--color-text-secondary)]">{member.profile.bio}</p>
            )}
          </div>
          {!isSelf && onMessage && (
            <Button
              type="button"
              variant="outline"
              className="rounded-sm border-[var(--color-border)] font-bold"
              onClick={onMessage}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Message
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        <section>
          <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-[var(--color-text-muted)]">
            Knowledge contributions
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            <li className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <p className="text-[11px] font-bold uppercase text-[var(--color-text-muted)]">
                Creator XP
              </p>
              <p className="mt-1 text-lg font-black text-[var(--color-text-primary)]">
                {(member.points?.total_points ?? 0).toLocaleString()}
              </p>
            </li>
            <li className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <p className="text-[11px] font-bold uppercase text-[var(--color-text-muted)]">
                Level
              </p>
              <p className="mt-1 text-lg font-black text-[var(--color-accent)]">
                {member.points?.level ?? 1}
              </p>
            </li>
            <li className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:col-span-2">
              <p className="text-[11px] font-bold uppercase text-[var(--color-text-muted)]">
                Helpfulness
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Posts, answers, and knowledge shared in this community fuel your
                contribution score.
              </p>
            </li>
          </ul>
        </section>

        <section>
        <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-[var(--color-text-muted)]">
          Recent posts
        </h2>
        {member.recent_posts.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">No posts yet.</p>
        ) : (
          <ul className="space-y-3">
            {member.recent_posts.map((post) => (
              <li
                key={post.id}
                className={cn(
                  "rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-none"
                )}
              >
                {post.title && (
                  <p className="mb-1 font-bold text-[var(--color-text-primary)]">{post.title}</p>
                )}
                <p className="text-sm text-[var(--color-text-secondary)]">{excerpt(post.body)}</p>
                <p className="mt-2 text-[10px] text-[var(--color-text-muted)]">
                  {new Date(post.created_at).toLocaleDateString()} · {post.like_count} likes ·{" "}
                  {post.comment_count} comments
                </p>
              </li>
            ))}
          </ul>
        )}
        </section>
      </div>
    </div>
  );
}
