import React from "react";
import Link from "next/link";
import { MessageSquare, Search, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCachedUser } from "@/lib/supabase/server";

export default async function MessagesPage() {
  const { data: { user } } = await getCachedUser() ?? {};

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pt-[var(--navbar-height)] pb-10">
      <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 h-[calc(100vh-var(--navbar-height)-3rem)]">
        <div className="bg-white dark:bg-surface border border-[var(--color-border)] rounded-sm shadow-none h-full flex overflow-hidden">

          <div className="w-full md:w-[350px] border-r border-[var(--color-border)] flex flex-col">
            <div className="p-6 border-b border-[var(--color-border)]">
              <h1 className="text-xl font-black text-[var(--color-text-primary)] mb-4">Messages</h1>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">
                Direct messages and vendor conversations will appear here.
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
                <input
                  placeholder="Search messages..."
                  className="w-full h-11 pl-10 pr-4 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-sm text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {!user ? (
                <div className="text-center py-12 px-6">
                  <MessageSquare className="h-12 w-12 text-[var(--color-text-muted)] mx-auto mb-4 opacity-50" />
                  <p className="font-bold text-[var(--color-text-secondary)] mb-2">Sign in to see your messages</p>
                  <p className="text-sm text-[var(--color-text-muted)] mb-6">Your inbox will show here once you start conversations.</p>
                  <Link href={`/login?returnUrl=${encodeURIComponent("/messages")}`}>
                    <Button className="bg-[var(--color-accent)] text-white font-black rounded-sm gap-2">
                      <LogIn className="h-4 w-4" /> Sign In
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-12 px-6">
                  <MessageSquare className="h-12 w-12 text-[var(--color-text-muted)] mx-auto mb-4 opacity-50" />
                  <p className="font-bold text-[var(--color-text-secondary)] mb-2">No messages yet</p>
                  <p className="text-sm text-[var(--color-text-muted)] mb-6">When vendors or buyers message you, threads will show up here.</p>
                  <Link href="/marketplace">
                    <Button className="bg-[var(--color-accent)] text-white font-black rounded-sm">
                      Browse marketplace
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col bg-[var(--color-surface-secondary)] min-w-0 hidden md:flex">
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className="h-24 w-24 bg-white dark:bg-surface rounded-sm shadow-none border border-[var(--color-border)] flex items-center justify-center mb-8">
                <MessageSquare className="h-10 w-10 text-[var(--color-accent)]" />
              </div>
              <h2 className="text-2xl font-black text-[var(--color-text-primary)] mb-4">Your inbox</h2>
              <p className="text-[var(--color-text-secondary)] max-w-md mx-auto mb-8 leading-relaxed font-medium">
                Select a conversation from the list when you have messages, or browse the marketplace to connect with sellers.
              </p>
              <Link href="/marketplace">
                <Button variant="outline" className="font-black h-12 px-8 rounded-sm border-2">
                  Go to marketplace
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

