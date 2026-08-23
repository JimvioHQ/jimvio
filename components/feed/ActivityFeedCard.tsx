"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Loader2 } from "lucide-react";
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
        const res = await fetch("/api/notifications?limit=5", {
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
        if (!cancelled) {
          setItems(
            raw.filter(
              (item) => !isTechnicalFeedBody(item.message) && !isTechnicalFeedBody(item.title),
            ),
          );
        }
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
    <section className="rounded-xl border border-gray-200 bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="h-3.5 w-0.5 rounded-full bg-[#FF5A1F]" aria-hidden />
          <h3 className="text-[12px] font-bold text-gray-900">Activity Feed</h3>
        </div>
        <Link
          href="/communities/notifications"
          className="text-[11px] font-medium text-[#FF5A1F] hover:underline"
        >
          View all
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" aria-hidden />
        </div>
      ) : error ? (
        <p className="py-2 text-[11px] text-gray-500">Couldn’t load activity right now.</p>
      ) : items.length === 0 ? (
        <p className="py-2 text-[11px] text-gray-500">No recent community activity yet.</p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {items.map((item) => {
            const live =
              `${item.type ?? ""} ${item.category ?? ""} ${item.title}`.toLowerCase().includes(
                "live",
              );
            const body = (
              <>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <Bell className="h-3 w-3 text-gray-500" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11.5px] font-semibold leading-snug text-gray-900">
                    {item.title}
                  </p>
                  {item.message ? (
                    <p className="mt-0.5 truncate text-[10.5px] text-gray-500">{item.message}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5 pt-0.5">
                  <span className="text-[10px] tabular-nums text-gray-400">
                    {item.created_at ? timeAgo(item.created_at) : ""}
                  </span>
                  {live ? (
                    <span className="rounded bg-[#FF5A1F] px-1 py-px text-[8px] font-bold uppercase tracking-wide text-white">
                      Live
                    </span>
                  ) : null}
                </div>
              </>
            );

            return (
              <li key={item.id} className="py-1.5 first:pt-0 last:pb-0">
                {item.action_url ? (
                  <Link
                    href={item.action_url}
                    className="flex items-start gap-2 transition-colors hover:bg-gray-50/80"
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
    </section>
  );
}
