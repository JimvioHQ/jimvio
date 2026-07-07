"use client";

import Link from "next/link";
import {
  MessageSquare,
  ShoppingBag,
  Percent,
  Video,
  Users,
  Receipt,
} from "lucide-react";
import type { CommandCenterActivity } from "@/lib/creator-command-center/types";

const KIND_ICONS = {
  order: Receipt,
  sale: ShoppingBag,
  affiliate: Percent,
  ugc: Video,
  community: Users,
  message: MessageSquare,
};

export function CommandCenterLiveActivity({ items }: { items: CommandCenterActivity[] }) {
  if (!items.length) {
    return (
      <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">
        Live activity will appear here as you sell, grow, and engage.
      </p>
    );
  }

  return (
    <ul className="space-y-2" aria-label="Live creator activity">
      {items.map((item) => {
        const Icon = KIND_ICONS[item.kind];
        const row = (
          <div className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 transition-[transform,background-color] duration-200 hover:scale-[1.01] hover:bg-[var(--color-surface-secondary)]">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--color-surface-secondary)] text-[var(--color-accent)]">
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-semibold text-[var(--color-text-primary)]">
                {item.title}
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-[var(--color-text-muted)]">
                {item.subtitle}
              </span>
            </span>
            <span className="shrink-0 text-right">
              {item.amount && (
                <span className="block text-[11px] font-bold text-emerald-600">{item.amount}</span>
              )}
              <span className="block text-[10px] text-[var(--color-text-muted)]">{item.time}</span>
            </span>
          </div>
        );

        return (
          <li key={item.id}>
            {item.href ? <Link href={item.href}>{row}</Link> : row}
          </li>
        );
      })}
    </ul>
  );
}
