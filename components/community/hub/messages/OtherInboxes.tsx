"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Megaphone, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { HubAvatar } from "../hub-ui";
import { formatShortTime } from "./utils";

type Item = {
  id: string;
  source: "marketplace" | "campaign";
  name: string;
  avatarUrl: string | null;
  context: string;
  lastMessage: string;
  lastMessageAt: string | null;
  fromMe: boolean;
  href: string;
};

/** Marketplace and campaign chats in the same inbox, each labelled with where it's from. */
export function OtherInboxes({ search }: { search: string }) {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/messages/elsewhere", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (alive && Array.isArray(j?.data)) setItems(j.data as Item[]);
        })
        .catch(() => undefined);
    void load();
    const t = setInterval(load, 20_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  const q = search.trim().toLowerCase();
  const shown = q ? items.filter((i) => `${i.name} ${i.context} ${i.lastMessage}`.toLowerCase().includes(q)) : items;
  if (!shown.length) return null;
  return (
    <div className="border-t border-black/[0.05] pt-2">
      <p className="px-3 pb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Marketplace & campaign chats</p>
      {shown.map((i) => {
        const Icon = i.source === "marketplace" ? ShoppingBag : Megaphone;
        return (
          <Link key={i.id} href={i.href} className="flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-white/80">
            <div className="relative shrink-0">
              <HubAvatar name={i.name} src={i.avatarUrl} size={40} className="ring-2 ring-white" />
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 grid h-4.5 w-4.5 place-items-center rounded-full ring-2 ring-white",
                  i.source === "marketplace" ? "bg-sky-500" : "bg-[#FF5A1F]",
                )}
                style={{ width: 18, height: 18 }}
              >
                <Icon className="h-2.5 w-2.5 text-white" />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[13px] font-medium text-[var(--color-text-primary)]">{i.name}</span>
                <span className="shrink-0 text-[10px] tabular-nums text-[var(--color-text-muted)]/80">{i.lastMessageAt ? formatShortTime(i.lastMessageAt) : ""}</span>
              </div>
              <p className="truncate text-[10.5px] font-semibold text-[var(--color-accent,#fd5000)]">{i.context}</p>
              <p className="truncate text-[12px] text-[var(--color-text-muted)]">
                {i.fromMe ? "You: " : ""}
                {i.lastMessage}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
