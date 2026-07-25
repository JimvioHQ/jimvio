"use client";

import Link from "next/link";
import { Radio } from "lucide-react";

/**
 * Owner Console Live — Coming soon.
 * Member-facing Live at /communities/live is the real product.
 */
export default function OwnerConsoleLivePage() {
  return (
    <div className="space-y-5">
      <header>
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">
          <Radio className="h-3.5 w-3.5" aria-hidden />
          Live
        </p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
          Live
        </h1>
        <p className="mt-1 max-w-xl text-[13px] text-[var(--color-text-muted)]">
          Owner Live studio controls are coming soon. Host and join sessions from
          the member Live experience today.
        </p>
      </header>

      <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-12 text-center">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
          Coming soon
        </p>
        <p className="mx-auto mt-2 max-w-md text-[13px] text-[var(--color-text-muted)]">
          Start or join a live session from your community Live page. Screen share,
          host controls, and recording are available there.
        </p>
        <Link
          href="/communities/live"
          className="mt-4 inline-flex text-[12px] font-semibold text-[var(--color-accent)] hover:underline"
        >
          Open Live
        </Link>
      </div>
    </div>
  );
}
