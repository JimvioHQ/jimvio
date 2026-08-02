"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  Bot,
  CheckCheck,
  CreditCard,
  Mail,
  MessageSquare,
  Package,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import type { ActivityNotification } from "@/lib/notifications/activity";
import { IdentityButton, IdentityCard, IdentityEmptyState, IdentityPill, IdentitySkeleton, cn } from "@/components/identity/identity-ui";

type TabId = "all" | "ugc" | "affiliate" | "marketplace" | "community" | "orders" | "messages" | "ai" | "payments" | "security";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "all", label: "All", icon: Bell },
  { id: "ugc", label: "UGC", icon: Video },
  { id: "affiliate", label: "Affiliate", icon: Sparkles },
  { id: "marketplace", label: "Marketplace", icon: ShoppingBag },
  { id: "community", label: "Community", icon: Users },
  { id: "orders", label: "Orders", icon: Package },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "ai", label: "AI", icon: Bot },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "security", label: "Security", icon: ShieldAlert },
];

/**
 * Tabs map to the DB `type` enum where a direct match exists (server-side
 * filter, efficient). Categories without a dedicated enum value (UGC,
 * Marketplace, AI, Security) are filtered client-side by keyword since the
 * shared `notifications` table doesn't tag every row that finely yet.
 */
const TYPE_FILTER: Partial<Record<TabId, string>> = {
  affiliate: "affiliate",
  community: "community",
  orders: "order",
  messages: "message",
  payments: "payment",
};

const KEYWORD_FILTER: Partial<Record<TabId, RegExp>> = {
  ugc: /\bugc\b|clip|content submission/i,
  marketplace: /marketplace|product|listing|storefront/i,
  ai: /\bai\b|insight|recommend|copilot/i,
  security: /security|password|2fa|two-factor|login|suspicious|device/i,
};

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  order: Package,
  payment: CreditCard,
  affiliate: Sparkles,
  influencer: Sparkles,
  community: Users,
  system: ShieldAlert,
  review: ShoppingBag,
  message: MessageSquare,
};

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

export function IdentityNotificationsClient() {
  const [tab, setTab] = useState<TabId>("all");
  const [items, setItems] = useState<ActivityNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async (activeTab: TabId) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "60" });
      const type = TYPE_FILTER[activeTab];
      if (type) params.set("type", type);

      const res = await fetch(`/api/notifications?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load notifications");

      let feedItems = (json.items ?? []) as ActivityNotification[];
      const keyword = KEYWORD_FILTER[activeTab];
      if (keyword) {
        feedItems = feedItems.filter(
          (n) => keyword.test(n.title) || keyword.test(n.message) || (n.category && keyword.test(n.category)),
        );
      }

      setItems(feedItems);
      setUnreadCount(json.unreadCount ?? 0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(tab);
  }, [tab, load]);

  const grouped = useMemo(() => {
    const map = new Map<string, ActivityNotification[]>();
    for (const item of items) {
      const day = item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, { month: "long", day: "numeric" }) : "Earlier";
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(item);
    }
    return Array.from(map.entries());
  }, [items]);

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read" }),
    }).catch(() => {});
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" });
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("All caught up");
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9388]">Jimvio Identity</p>
          <h1 className="font-[var(--font-identity-serif)] text-[26px] font-medium tracking-tight text-[#161512]">
            Notifications
          </h1>
        </div>
        {unreadCount > 0 && (
          <IdentityButton variant="outline" size="sm" onClick={markAllRead} loading={markingAll}>
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read ({unreadCount})
          </IdentityButton>
        )}
      </div>

      <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-medium transition-colors",
                active ? "bg-[#161512] text-white" : "bg-white text-[#59544B] hover:bg-black/[0.04]",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <IdentitySkeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <IdentityEmptyState icon={<Mail className="h-6 w-6" />} title="No notifications here" description="You're all caught up for this category." />
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, dayItems]) => (
            <div key={day}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#B9B3A6]">{day}</p>
              <div className="space-y-2">
                {dayItems.map((n) => {
                  const Icon = TYPE_ICON[n.type] ?? Bell;
                  return (
                    <IdentityCard
                      key={n.id}
                      interactive
                      onClick={() => !n.is_read && markRead(n.id)}
                      className={cn("flex cursor-pointer items-start gap-3 p-4", !n.is_read && "border-[#FFDCC7] bg-[#FFFAF7]")}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-[#59544B]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[13.5px] font-semibold text-[#1C1B19]">{n.title}</p>
                          <span className="shrink-0 text-[11px] text-[#B9B3A6]">{timeAgo(n.created_at)}</span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-relaxed text-[#7C766B]">{n.message}</p>
                      </div>
                      {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#FF5A1F]" />}
                    </IdentityCard>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
