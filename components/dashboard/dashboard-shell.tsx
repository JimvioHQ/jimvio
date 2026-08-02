"use client";

import React, { useState, useEffect, Suspense } from "react";
import { usePathname } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { subscribePostgresChanges, unsubscribeRealtime } from "@/lib/supabase/realtime-subscribe";
import { cn } from "@/lib/utils";
import { CreatorOsFrame } from "@/components/jimvio-os";

interface UserProfile {
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

import { useUserStore } from "@/lib/store/use-user-store";

function isOwnerConsolePath(pathname: string | null): boolean {
  if (!pathname) return false;
  // Hub stays inside DashboardShell; per-community Owner Console is full-bleed.
  return /^\/dashboard\/communities\/[^/]+/.test(pathname);
}

function DashboardShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { fetchRoles } = useUserStore();
  const [user, setUser] = useState<UserProfile>({ email: "", full_name: null, avatar_url: null });
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const ownerConsole = isOwnerConsolePath(pathname);

  useEffect(() => {
    if (ownerConsole) return;

    async function loadUser() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name, avatar_url")
        .eq("id", authUser.id)
        .single();

      if (profile) {
        setUser({ email: profile.email, full_name: profile.full_name, avatar_url: profile.avatar_url });
      }
    }

    loadUser();
    fetchRoles();

    let cancelled = false;
    const supabase = createClient();

    async function refreshBadges() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser || cancelled) return;

      const [{ count: notifCount }, { count: msgCount }] = await Promise.all([
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", authUser.id)
          .eq("is_read", false),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", authUser.id)
          .eq("type", "message")
          .eq("is_read", false),
      ]);

      if (cancelled) return;
      setUnreadNotifications(notifCount ?? 0);
      setUnreadMessages(msgCount ?? 0);
    }

    let channel: Awaited<ReturnType<typeof subscribePostgresChanges>> = null;
    const channelPrefix = "shell-notifications";

    async function setupRealtime() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser || cancelled) return;

      channel = await subscribePostgresChanges(
        supabase,
        `${channelPrefix}-${authUser.id}`,
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${authUser.id}`,
        },
        () => { void refreshBadges(); },
        () => cancelled,
      );
    }

    refreshBadges();
    void setupRealtime();

    return () => {
      cancelled = true;
      unsubscribeRealtime(supabase, channel, channelPrefix);
    };
  }, [fetchRoles, ownerConsole]);

  if (ownerConsole) {
    return <>{children}</>;
  }

  return (
    <CreatorOsFrame
      user={{ name: user.full_name || user.email || "Account", avatarUrl: user.avatar_url, email: user.email }}
      unreadNotifications={unreadNotifications}
      unreadMessages={unreadMessages}
    >
      <div className="px-0 py-3 sm:px-6 sm:py-8 lg:p-10 max-w-[1400px] mx-auto">{children}</div>
    </CreatorOsFrame>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<DashboardLoadingSkeleton />}>
      <DashboardShellContent>{children}</DashboardShellContent>
    </Suspense>
  );
}


function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded",
        "bg-zinc-200 dark:bg-zinc-800",
        className
      )}
    >
      <span
        className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite_linear]
          bg-gradient-to-r
          from-transparent
          via-white/60 dark:via-white/5
          to-transparent"
      />
    </div>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-zinc-900",
        "border border-zinc-200 dark:border-zinc-800",
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── Dots ─────────────────────────────────────────────────────────────────────

function AnimatedDots() {
  return (
    <span className="flex gap-[3px] items-center">
      {[0, 200, 400].map((delay) => (
        <span
          key={delay}
          className="w-[3px] h-[3px] rounded-full bg-[#fd5000] animate-pulse"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function DashboardLoadingSkeleton() {
  return (
    <>
      {/* Keyframe injection */}
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(200%); }
        }
      `}</style>

      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-950 px-4 py-10 gap-10 animate-in fade-in duration-500">

        {/* ── Spinner + Label ── */}
        <div className="flex flex-col items-center gap-5">
          <div className="relative w-[72px] h-[72px]">
            <svg
              className="absolute inset-0 animate-spin"
              style={{ animationDuration: "1.1s" }}
              width="72" height="72" viewBox="0 0 72 72"
            >
              <circle
                cx="36" cy="36" r="30"
                fill="none"
                className="stroke-zinc-200 dark:stroke-zinc-800"
                strokeWidth="3"
              />
              <circle
                cx="36" cy="36" r="30"
                fill="none"
                stroke="#fd5000"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="60 130"
              />
            </svg>
            <div className="absolute inset-[10px] rounded-[14px] flex items-center justify-center
              bg-white dark:bg-zinc-900
              border border-zinc-200 dark:border-zinc-800">
              <LayoutDashboard className="h-5 w-5 text-[#fd5000]" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <p className="text-[11px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-[0.3em]">
              Loading Console
            </p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">
                Establishing parameters
              </span>
              <AnimatedDots />
            </div>
          </div>
        </div>

        {/* ── Skeleton layout ── */}
        <div className="w-full max-w-3xl flex flex-col gap-3">

          {/* Wallet */}
          <Card className="rounded-[24px] p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="w-[46px] h-[46px] rounded-[13px]" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-[9px] w-[90px]" />
                  <Skeleton className="h-[13px] w-[130px]" />
                </div>
              </div>
              <Skeleton className="w-[38px] h-[38px] rounded-[11px]" />
            </div>
            <div className="flex items-end justify-between">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-[9px] w-[110px]" />
                <Skeleton className="h-[40px] w-[180px] rounded-lg" />
              </div>
              <div className="flex flex-col gap-2 items-end">
                <Skeleton className="h-[28px] w-[130px] rounded-[10px]" />
                <Skeleton className="h-[10px] w-[100px]" />
              </div>
            </div>
          </Card>

          {/* Quick actions */}
          <div className="grid grid-cols-4 gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-[82px] rounded-[20px]" />
            ))}
          </div>

          {/* Chart + side cards */}
          <div className="grid grid-cols-[1fr_200px] gap-3">
            <Card className="rounded-[18px] p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-[16px] w-[150px]" />
                  <Skeleton className="h-[9px] w-[100px]" />
                </div>
                <Skeleton className="h-[26px] w-[80px] rounded-lg" />
              </div>
              {/* Bar chart skeleton */}
              <div className="flex items-end gap-2 h-[130px] pb-1">
                {[45, 65, 52, 88, 72, 95, 80].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-md animate-pulse bg-zinc-200 dark:bg-zinc-800"
                    style={{ height: `${h}%`, animationDelay: `${i * 80}ms` }}
                  />
                ))}
              </div>
            </Card>

            <div className="flex flex-col gap-3">
              <Skeleton className="h-[110px] rounded-[18px]" />
              <Skeleton className="h-[110px] rounded-[18px]" />
            </div>
          </div>

          {/* Role section */}
          <div className="grid grid-cols-2 gap-3">
            {[...Array(2)].map((_, i) => (
              <Card key={i} className="rounded-[18px] p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-[26px] h-[26px] rounded-lg" />
                  <Skeleton className="h-[10px] w-[100px]" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-[100px] rounded-[14px]" />
                  <Skeleton className="h-[100px] rounded-[14px]" />
                </div>
                <Skeleton className="h-[40px] rounded-[12px]" />
                <Skeleton className="h-[40px] rounded-[12px]" />
              </Card>
            ))}
          </div>

        </div>
      </div>
    </>
  );
}