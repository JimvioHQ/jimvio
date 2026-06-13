"use client";

import { useEffect, useState } from "react";
import { Radio, Gift, Package, ArrowRight, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ActivityItem = {
  id: string;
  kind: "purchase" | "video" | "campaign" | "shipment";
  actor: string;
  description: string;
};

export function LiveActivityBar() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [viewersNow, setViewersNow] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const [{ data: orders }, { data: videos }, { count }] = await Promise.all([
        supabase
          .from("orders")
          .select(`
            id,
            profiles!orders_buyer_id_fkey ( full_name, country ),
            order_items ( product_name )
          `)
          .eq("payment_status", "paid")
          .order("created_at", { ascending: false })
          .limit(4),

        supabase
          .from("short_videos")
          .select("id, title, profiles!user_id ( full_name )")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(2),

        supabase
          .from("product_views")
          .select("id", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString()),
      ]);

      const built: ActivityItem[] = [];

      for (const order of orders ?? []) {
        const profile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;
        const item = Array.isArray(order.order_items) ? order.order_items[0] : null;
        if (!profile || !item) continue;
        const p = profile as { full_name?: string; country?: string };
        built.push({
          id: order.id,
          kind: "purchase",
          actor: `${p.full_name ?? "Someone"}${p.country ? ` from ${p.country}` : ""}`,
          description: `purchased ${(item as { product_name: string }).product_name}`,
        });
      }

      for (const vid of videos ?? []) {
        const profile = Array.isArray(vid.profiles) ? vid.profiles[0] : vid.profiles;
        const p = profile as { full_name?: string } | null;
        built.push({
          id: vid.id,
          kind: "video",
          actor: p?.full_name ?? "A creator",
          description: `posted: ${vid.title}`,
        });
      }

      setItems(built);
      setViewersNow((count as number | null) ?? 0);
    }

    load();

    const channel = supabase
      .channel("live-bar-orders")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: "payment_status=eq.paid" },
        (payload: { new: Record<string, unknown> }) => {
          const order = payload.new;
          setItems((prev) => [
            {
              id: order.id as string,
              kind: "purchase",
              actor: "Someone",
              description: "placed a new order",
            },
            ...prev.slice(0, 4),
          ]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="sticky bottom-0 z-40 mt-2">
      <div
        className="flex items-center gap-4 overflow-hidden rounded-xl px-4 py-2.5"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        {/* Live badge */}
        <span
          className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white"
          style={{ background: "var(--color-accent)" }}
        >
          <Radio className="size-3.5" /> Live Now
        </span>

        {/* Viewer count */}
        <span
          className="hidden shrink-0 items-center gap-1.5 text-xs sm:flex"
          style={{ color: "var(--color-text-muted)" }}
        >
          <span
            className="size-2 rounded-full"
            style={{ background: "var(--color-success)" }}
          />
          {viewersNow} people viewing now
        </span>

        {/* Scrolling items */}
        <div className="flex flex-1 items-center gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((a) => (
            <div
              key={a.id}
              className="flex shrink-0 items-center gap-2 text-xs"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {a.kind === "purchase" ? (
                <span
                  className="size-6 shrink-0 rounded-full ring-2 ring-white dark:ring-[var(--color-surface)]"
                  style={{ background: "var(--color-accent)" }}
                />
              ) : a.kind === "campaign" ? (
                <Gift className="size-5 shrink-0" style={{ color: "var(--color-accent)" }} />
              ) : (
                <Package className="size-5 shrink-0" style={{ color: "var(--color-accent)" }} />
              )}
              <span>
                <b className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {a.actor}
                </b>{" "}
                <span style={{ color: "var(--color-text-muted)" }}>{a.description}</span>
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          type="button"
          className="flex shrink-0 items-center gap-1 rounded-full px-4 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--color-accent)" }}
        >
          View All Activity <ArrowRight className="size-3.5" />
        </button>
        <button
          type="button"
          className="grid size-7 shrink-0 place-items-center rounded-full transition-colors hover:opacity-80"
          style={{
            background: "var(--color-surface-secondary)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-secondary)",
          }}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
