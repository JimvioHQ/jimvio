/**
 * Authenticated buyer order search for Command+K.
 * Uses existing client Supabase + RLS — no schema/API changes.
 */

import { createClient } from "@/lib/supabase/client";
import type {
  CommandResult,
  CommandSearchInput,
  CommandSearchOutput,
  CommandSearchProvider,
} from "../types";

function formatOrderDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export const ordersSearchProvider: CommandSearchProvider = {
  id: "orders",
  async search(input: CommandSearchInput): Promise<CommandSearchOutput> {
    const query = input.query.trim();
    if (query.length < 2) return { groups: [], flat: [] };

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { groups: [], flat: [] };

      const term = query.replace(/[%_,.()]/g, "").slice(0, 64);
      if (!term) return { groups: [], flat: [] };

      let q = supabase
        .from("orders")
        .select("id, order_number, status, payment_status, created_at, total_amount, currency")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(Math.min(input.limit ?? 8, 12));

      const uuidLike =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(term);
      if (uuidLike) {
        q = q.eq("id", term);
      } else {
        q = q.ilike("order_number", `%${term}%`);
      }

      const { data, error } = await q;

      if (error || input.signal?.aborted) return { groups: [], flat: [] };

      const items: CommandResult[] = (data ?? []).map((row: {
        id: string;
        order_number: string | null;
        status: string | null;
        payment_status: string | null;
        created_at: string | null;
        total_amount?: number | string | null;
        currency?: string | null;
      }) => {
        const number = row.order_number ? `#${row.order_number}` : `Order ${row.id.slice(0, 8)}`;
        const date = formatOrderDate(row.created_at);
        const status = row.status ?? row.payment_status ?? "order";
        return {
          id: `order-${row.id}`,
          kind: "order" as const,
          title: number,
          subtitle: [status, date].filter(Boolean).join(" · "),
          href: `/orders/${row.id}`,
          icon: "receipt",
          section: "search" as const,
          score: 82,
          badge: status,
        };
      });

      return {
        groups: items.length ? [{ id: "orders", label: "Orders", items }] : [],
        flat: items,
      };
    } catch {
      return { groups: [], flat: [] };
    }
  },
};
