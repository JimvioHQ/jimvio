"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Loader2, Radio, Sparkles, Users } from "lucide-react";
import { FeedSidebarCard, FeedSidebarSkeleton } from "@/components/feed/FeedSidebarCard";
import { timeAgo } from "@/lib/utils";
import { isTechnicalFeedBody } from "@/lib/community/message-signaling";

type ActivityItem = {
  id: string;
  title: string;
  message?: string | null;
  type?: string | null;
  category?: string | null;
  action_url?: string | null;
  created_at?: string | null;
};

const MAX_ITEMS = 5;

function activityIcon(item: ActivityItem) {
  const blob = `${item.type ?? ""} ${item.category ?? ""} ${item.title}`.toLowerCase();
  if (blob.includes("live")) return Radio;
  if (blob.includes("member") || blob.includes("join")) return Users;
  if (blob.includes("project") || blob.includes("campaign")) return Sparkles;
  return Bell;
}

/** Compact activity timeline — real notifications feed (no mocks). */
export function ActivityFeedCard() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`/api/notifications?limit=${MAX_ITEMS}`, {
          cache: "no-store",
        });
        if (res.status === 401) {
          if (!cancelled) {
            setItems([]);
            setError(false);
          }
          return;
        }
        if (!res.ok) {
          if (!cancelled) {
            setItems([]);
            setError(true);
          }
          return;
        }
        const data = (await res.json()) as { items?: ActivityItem[] };
        const raw = Array.isArray(data.items) ? data.items : [];
        const seen = new Set<string>();
        const filtered: ActivityItem[] = [];
        for (const item of raw) {
          if (!item.id || seen.has(item.id)) continue;
          if (isTechnicalFeedBody(item.message) || isTechnicalFeedBody(item.title)) continue;
          if (!item.title?.trim()) continue;
          seen.add(item.id);
          filtered.push(item);
          if (filtered.length >= MAX_ITEMS) break;
        }
        if (!cancelled) setItems(filtered);
      } catch {
        if (!cancelled) {
          setItems([]);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <FeedSidebarCard
      title="Activity Feed"
      titleAccent="orange"
      viewAllHref="/communities/notifications"
    >
      {loading ? (
        <FeedSidebarSkeleton rows={3} />
      ) : error ? (
        <p className="py-1 text-[11px] text-[var(--color-text-muted,#6b7280)]">
          Couldn&apos;t load activity right now.
        </p>
      ) : items.length === 0 ? (
        <p className="py-1 text-[11px] text-[var(--color-text-muted,#6b7280)]">
          No recent activity
        </p>
      ) : (
        <ul className="divide-y divide-[var(--color-border,#e5e7eb)]/60">
          {items.map((item) => {
            const Icon = activityIcon(item);
            const live = `${item.type ?? ""} ${item.category ?? ""} ${item.title}`
              .toLowerCase()
              .includes("live");
            const body = (
              <>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-secondary,#f3f4f6)]">
                  <Icon className="h-3.5 w-3.5 text-[var(--color-text-muted,#6b7280)]" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11.5px] font-semibold leading-snug text-[var(--color-text-primary,#111827)]">
                    {item.title}
                  </p>
                  {item.message ? (
                    <p className="mt-0.5 truncate text-[10.5px] text-[var(--color-text-muted,#6b7280)]">
                      {item.message}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5 pt-0.5">
                  <span className="text-[10px] tabular-nums text-[var(--color-text-muted,#9ca3af)]">
                    {item.created_at ? timeAgo(item.created_at) : ""}
                  </span>
                  {live ? (
                    <span className="rounded bg-red-600 px-1 py-px text-[8px] font-bold uppercase tracking-wide text-white">
                      Live
                    </span>
                  ) : null}
                </div>
              </>
            );

            return (
              <li key={item.id} className="py-2 first:pt-0 last:pb-0">
                {item.action_url ? (
                  <Link
                    href={item.action_url}
                    className="flex items-start gap-2 rounded-lg transition-colors hover:bg-[var(--color-surface-secondary,#f9fafb)]/80"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="flex items-start gap-2">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </FeedSidebarCard>
  );
}
