"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MessageSquare, Users, ChevronRight, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface CommunityHubSidebarProps {
  communities: Array<{
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    avatar_url?: string | null;
    category?: string | null;
    member_count?: number | null;
    post_count?: number | null;
  }>;
}

export function CommunityHubSidebar({ communities }: CommunityHubSidebarProps) {
  const searchParams = useSearchParams();
  const selectedSlug = searchParams.get("community");

  return (
    <aside className="w-full md:w-[320px] shrink-0 border-r border-[var(--color-border)] bg-white flex flex-col">
      <div className="p-4 border-b border-[var(--color-border)]">
        <h1 className="text-lg font-black text-[var(--color-text-primary)] flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-[var(--color-accent)]" />
          Communities
        </h1>
        <p className="text-xs text-[var(--color-text-muted)] mt-1 font-medium">
          Your groups and discussions
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {communities.length === 0 ? (
          <div className="text-center py-8 px-4">
            <Users className="h-10 w-10 text-[var(--color-text-muted)] mx-auto mb-3 opacity-50" />
            <p className="text-sm font-bold text-[var(--color-text-secondary)] mb-2">No communities yet</p>
            <p className="text-xs text-[var(--color-text-muted)] mb-4">Join communities to see them here.</p>
            <Link
              href="/communities"
              className="inline-flex items-center gap-2 text-sm font-black text-[var(--color-accent)] hover:underline"
            >
              <Sparkles className="h-4 w-4" /> Discover
            </Link>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {communities.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/communities/hub?community=${encodeURIComponent(c.slug)}`}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl transition-colors",
                    selectedSlug === c.slug
                      ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]"
                      : "hover:bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]"
                  )}
                >
                  <div className="h-11 w-11 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {c.avatar_url ? (
                      <img src={c.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-lg">👥</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-sm truncate">{c.name}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] font-medium">
                      {c.member_count ?? 0} members · {c.post_count ?? 0} posts
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 pt-4 border-t border-[var(--color-border)] space-y-0.5">
          <Link
            href="/dashboard/community/posts"
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--color-surface-secondary)] transition-colors text-[var(--color-text-secondary)]"
          >
            <div className="h-11 w-11 rounded-xl bg-[var(--color-accent-light)] flex items-center justify-center shrink-0">
              <MessageSquare className="h-5 w-5 text-[var(--color-accent)]" />
            </div>
            <div className="flex-1">
              <p className="font-black text-sm text-[var(--color-text-primary)]">My Posts</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">View and edit your posts</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0" />
          </Link>
          <Link
            href="/communities"
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--color-surface-secondary)] transition-colors text-[var(--color-text-secondary)]"
          >
            <div className="h-11 w-11 rounded-xl bg-[var(--color-accent-light)] flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-[var(--color-accent)]" />
            </div>
            <div className="flex-1">
              <p className="font-black text-sm text-[var(--color-text-primary)]">Discover</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">Browse all communities</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
