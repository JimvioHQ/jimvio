"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Clapperboard,
  DollarSign,
  Loader2,
  MessageSquare,
  Radio,
  ShoppingBag,
  Users,
} from "lucide-react";
import { HubCard, HubLinkButton } from "@/components/community/hub/hub-ui";
import { cn } from "@/lib/utils";

type Notif = {
  id: string;
  title: string;
  message?: string | null;
  category?: string | null;
  type?: string | null;
  action_url?: string | null;
  is_read?: boolean | null;
  created_at?: string | null;
};

const FILTERS = [
  { id: "all", label: "All", icon: Bell },
  { id: "community", label: "Community", icon: Users },
  { id: "message", label: "Messages", icon: MessageSquare },
  { id: "live", label: "Live", icon: Radio },
  { id: "affiliate", label: "Affiliate", icon: DollarSign },
  { id: "ugc", label: "UGC", icon: Clapperboard },
  { id: "marketplace", label: "Marketplace", icon: ShoppingBag },
] as const;

function categoryOf(n: Notif): string {
  const raw = `${n.category ?? ""} ${n.type ?? ""}`.toLowerCase();
  if (raw.includes("live")) return "live";
  if (raw.includes("message") || raw.includes("inbox") || raw.includes("dm")) return "message";
  if (raw.includes("affiliate") || raw.includes("commission")) return "affiliate";
  if (raw.includes("ugc") || raw.includes("campaign") || raw.includes("submission")) return "ugc";
  if (raw.includes("order") || raw.includes("market") || raw.includes("product")) return "marketplace";
  if (raw.includes("community") || raw.includes("space") || raw.includes("post")) return "community";
  return "community";
}

export default function CommunityNotificationsPage() {
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=40", { cache: "no-store" });
      if (!res.ok) {
        setItems([]);
        return;
      }
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((n) => categoryOf(n) === filter);
  }, [items, filter]);

  const markAll = async () => {
    await fetch("/api/notifications/mark-all-read", { method: "POST" }).catch(() => null);
    await load();
  };

  return (
    <div className="min-h-full bg-[var(--color-bg,#f4f4f5)]">
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-4 sm:px-6 lg:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-black tracking-tight">
              <Bell className="h-5 w-5 text-[#fd5000]" />
              Notifications
            </h1>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              Community, Affiliate, UGC, Marketplace, Messages, and Live — one inbox.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void markAll()}
              className="h-9 rounded-xl border border-[var(--color-border)] bg-white px-3 text-[12px] font-semibold"
            >
              Mark all read
            </button>
            <HubLinkButton href="/dashboard/notifications" variant="secondary">
              Full inbox
            </HubLinkButton>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold",
                filter === id
                  ? "bg-[#111827] text-white"
                  : "border border-[var(--color-border)] bg-white text-[var(--color-text-muted)]"
              )}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : filtered.length === 0 ? (
          <HubCard className="py-12 text-center">
            <Bell className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
            <p className="text-[14px] font-bold">You&apos;re all caught up</p>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              New community activity will land here.
            </p>
          </HubCard>
        ) : (
          <div className="space-y-2">
            {filtered.map((n) => (
              <Link
                key={n.id}
                href={n.action_url || "/communities"}
                className={cn(
                  "block rounded-2xl border border-[var(--color-border)] bg-white p-4 transition hover:border-[#fd5000]/30",
                  !n.is_read && "bg-[#FFF8F5]"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-bold text-[#111827]">{n.title}</p>
                    {n.message ? (
                      <p className="mt-1 line-clamp-2 text-[12.5px] text-[var(--color-text-muted)]">
                        {n.message}
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 rounded-md bg-[#FFF0E8] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#fd5000]">
                    {categoryOf(n)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
