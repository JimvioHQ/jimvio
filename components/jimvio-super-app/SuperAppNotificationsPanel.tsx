"use client";

import { OS_NOTIFICATIONS_SCAFFOLD } from "@/lib/jimvio-os/config";
import Link from "next/link";

export function SuperAppNotificationsPanel() {
  return (
    <section aria-label="Global notifications" className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-bold text-[var(--color-text-primary)]">Notification center</p>
        <Link href="/dashboard/notifications" className="text-[10px] font-semibold text-[var(--color-accent)] hover:underline">
          View all
        </Link>
      </div>
      <ul className="max-h-[320px] space-y-1.5 overflow-y-auto">
        {OS_NOTIFICATIONS_SCAFFOLD.filter((n) => !n.archived).slice(0, 8).map((n) => (
          <li
            key={n.id}
            className={`rounded-xl border border-[var(--color-border)] px-3 py-2.5 ${!n.read ? "bg-[var(--color-accent)]/5" : ""}`}
          >
            <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">{n.title}</p>
            <p className="text-[11px] text-[var(--color-text-muted)]">{n.body}</p>
            <span className="mt-1 inline-block text-[9px] font-bold uppercase text-[var(--color-accent)]">{n.category}</span>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-[var(--color-text-muted)]">Unified notifications — links to existing inbox.</p>
    </section>
  );
}
