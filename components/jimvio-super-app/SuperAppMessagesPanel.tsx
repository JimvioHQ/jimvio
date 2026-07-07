"use client";

import Link from "next/link";
import type { JimvioSuperAppData } from "@/lib/jimvio-super-app/types";
import { cn } from "@/lib/utils";

const KIND_LABELS: Record<string, string> = {
  customer: "Customer",
  creator: "Creator",
  community: "Community",
  brand: "Brand",
  affiliate: "Affiliate",
  support: "Support",
};

export function SuperAppMessagesPanel({ data }: { data: JimvioSuperAppData }) {
  return (
    <section aria-label="Global messages" className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-bold text-[var(--color-text-primary)]">Messaging center</p>
        <Link href="/dashboard/messages" className="text-[10px] font-semibold text-[var(--color-accent)] hover:underline">
          Open inbox
        </Link>
      </div>

      <ul className="max-h-[360px] space-y-1.5 overflow-y-auto">
        {data.messageChannels.map((ch) => (
          <li key={ch.id}>
            <Link
              href={ch.href ?? "/dashboard/messages"}
              className={cn(
                "block rounded-xl border border-[var(--color-border)] px-3 py-2.5 transition-[transform,border-color] hover:scale-[1.01] hover:border-[var(--color-accent)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40",
                ch.unread && "bg-[var(--color-accent)]/5",
              )}
              style={{ willChange: "transform" }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-[var(--color-text-primary)]">{ch.name}</p>
                  <p className="truncate text-[11px] text-[var(--color-text-muted)]">{ch.preview}</p>
                  <span className="mt-1 inline-block text-[9px] font-bold uppercase text-[var(--color-accent)]">
                    {KIND_LABELS[ch.kind] ?? ch.kind}
                  </span>
                </div>
                <span className="shrink-0 text-[9px] text-[var(--color-text-muted)]">{ch.time}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <p className="text-[10px] text-[var(--color-text-muted)]">
        One inbox for customers, creators, communities, brands, affiliates, and support — UI scaffold.
      </p>
    </section>
  );
}
