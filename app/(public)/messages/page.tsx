import React from "react";
import Link from "next/link";
import { MessageSquare, Search, Users, ChevronRight, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCachedUser } from "@/lib/supabase/server";
import { getJoinedCommunities } from "@/services/db";
import { formatNumber } from "@/lib/utils";

export default async function MessagesPage() {
  const { data: { user } } = await getCachedUser() ?? {};
  const joined = user ? await getJoinedCommunities(user.id) : [];

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pt-[var(--navbar-height)] pb-10">
      <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 h-[calc(100vh-var(--navbar-height)-3rem)]">
        <div className="bg-white border border-[var(--color-border)] rounded-3xl shadow-xl h-full flex overflow-hidden">

          {/* Sidebar: Communities = Chats (WhatsApp-style) */}
          <div className="w-full md:w-[350px] border-r border-[var(--color-border)] flex flex-col">
            <div className="p-6 border-b border-[var(--color-border)]">
              <h1 className="text-xl font-black text-[var(--color-text-primary)] mb-4">Messages</h1>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">
                Your community chats — tap to open and discuss.
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
                <input
                  placeholder="Search communities..."
                  className="w-full h-11 pl-10 pr-4 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {!user ? (
                <div className="text-center py-12 px-6">
                  <MessageSquare className="h-12 w-12 text-[var(--color-text-muted)] mx-auto mb-4 opacity-50" />
                  <p className="font-bold text-[var(--color-text-secondary)] mb-2">Sign in to see your chats</p>
                  <p className="text-sm text-[var(--color-text-muted)] mb-6">Join communities and they’ll appear here.</p>
                  <Link href={`/login?returnUrl=${encodeURIComponent("/messages")}`}>
                    <Button className="bg-[var(--color-accent)] text-white font-black rounded-xl gap-2">
                      <LogIn className="h-4 w-4" /> Sign In
                    </Button>
                  </Link>
                </div>
              ) : joined.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <Users className="h-12 w-12 text-[var(--color-text-muted)] mx-auto mb-4 opacity-50" />
                  <p className="font-bold text-[var(--color-text-secondary)] mb-2">No community chats yet</p>
                  <p className="text-sm text-[var(--color-text-muted)] mb-6">Join communities to chat with members.</p>
                  <Link href="/communities">
                    <Button className="bg-[var(--color-accent)] text-white font-black rounded-xl">
                      Browse communities
                    </Button>
                  </Link>
                </div>
              ) : (
                <ul className="space-y-0.5">
                  {joined.map((c: any) => (
                    <li key={c.id}>
                      <Link
                        href={`/communities/hub?community=${encodeURIComponent(c.slug)}`}
                        className="flex items-center gap-3 p-4 rounded-xl hover:bg-[var(--color-surface-secondary)] transition-colors group"
                      >
                        <div className="h-12 w-12 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center shrink-0 overflow-hidden">
                          {c.avatar_url ? (
                            <img src={c.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Users className="h-6 w-6 text-[var(--color-accent)]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-[var(--color-text-primary)] truncate group-hover:text-[var(--color-accent)]">{c.name}</p>
                          <p className="text-[11px] text-[var(--color-text-muted)]">
                            {formatNumber(c.member_count ?? 0)} members · {formatNumber(c.post_count ?? 0)} posts
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Main: Prompt to select or info */}
          <div className="flex-1 flex flex-col bg-[var(--color-surface-secondary)] min-w-0 hidden md:flex">
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className="h-24 w-24 bg-white rounded-3xl shadow-lg border border-[var(--color-border)] flex items-center justify-center mb-8">
                <MessageSquare className="h-10 w-10 text-[var(--color-accent)]" />
              </div>
              <h2 className="text-2xl font-black text-[var(--color-text-primary)] mb-4">Community Chats</h2>
              <p className="text-[var(--color-text-secondary)] max-w-md mx-auto mb-8 leading-relaxed font-medium">
                Select a community from the list to view discussions and post. Everything works here — join, post, comment, and like.
              </p>
              <Link href="/communities">
                <Button variant="outline" className="font-black h-12 px-8 rounded-xl border-2">
                  Discover communities
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
