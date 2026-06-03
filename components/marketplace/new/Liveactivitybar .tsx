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
  const [items,      setItems]      = useState<ActivityItem[]>([]);
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
        const item    = Array.isArray(order.order_items) ? order.order_items[0] : null;
        if (!profile || !item) continue;
        const p = profile as { full_name?: string; country?: string };
        built.push({
          id:          order.id,
          kind:        "purchase",
          actor:       `${p.full_name ?? "Someone"}${p.country ? ` from ${p.country}` : ""}`,
          description: `purchased ${(item as { product_name: string }).product_name}`,
        });
      }

      for (const vid of videos ?? []) {
        const profile = Array.isArray(vid.profiles) ? vid.profiles[0] : vid.profiles;
        const p = profile as { full_name?: string } | null;
        built.push({
          id:          vid.id,
          kind:        "video",
          actor:       p?.full_name ?? "A creator",
          description: `posted: ${vid.title}`,
        });
      }

      setItems(built);
      setViewersNow((count as number | null) ?? 0);
    }

    load();

    // Realtime: new paid orders
    const channel = supabase
      .channel("live-bar-orders")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: "payment_status=eq.paid" },
        (payload:any) => {
          const order = payload.new as Record<string, unknown>;
          setItems((prev) => [
            {
              id:          order.id as string,
              kind:        "purchase",
              actor:       "Someone",
              description: "placed a new order",
            },
            ...prev.slice(0, 4),
          ]);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="sticky bottom-0 z-40 mt-2">
      <div
        className="flex items-center gap-4 overflow-hidden rounded-2xl px-4 py-2.5 shadow-lg"
        style={{ background: "oklch(0.14 0.025 285)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Live badge */}
        <span
          className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white"
          style={{ background: "var(--color-accent)" }}
        >
          <Radio className="size-3.5" /> Live Now
        </span>

        {/* Viewer count */}
        <span className="hidden shrink-0 items-center gap-1.5 text-xs text-white/60 sm:flex">
          <span className="size-2 rounded-full bg-green-500" /> {viewersNow} people viewing now
        </span>

        {/* Scrolling items */}
        <div className="flex flex-1 items-center gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((a) => (
            <div key={a.id} className="flex shrink-0 items-center gap-2 text-xs text-white/80">
              {a.kind === "purchase" ? (
                <span className="size-6 rounded-full" style={{ background: "var(--color-accent)" }} />
              ) : a.kind === "campaign" ? (
                <Gift className="size-5" style={{ color: "var(--color-accent)" }} />
              ) : (
                <Package className="size-5" style={{ color: "var(--color-accent)" }} />
              )}
              <span>
                <b className="font-semibold text-white">{a.actor}</b>{" "}
                <span className="text-white/60">{a.description}</span>
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          className="flex shrink-0 items-center gap-1 rounded-full px-4 py-1.5 text-xs font-bold text-white"
          style={{ background: "var(--color-accent)" }}
        >
          View All Activity <ArrowRight className="size-3.5" />
        </button>
        <button className="grid size-7 shrink-0 place-items-center rounded-full bg-white/10">
          <ChevronRight className="size-4 text-white" />
        </button>
      </div>
    </div>
  );
}