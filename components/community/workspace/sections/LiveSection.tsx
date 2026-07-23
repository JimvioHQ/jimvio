"use client";

import Link from "next/link";
import { Radio } from "lucide-react";
import { useWorkspace } from "@/components/community/workspace-context";

/**
 * Workspace Live section — links into Hub Live Studio (no duplicate media stack).
 */
export function LiveSection() {
  const { slug } = useWorkspace();
  const href = slug ? `/communities/${slug}/live` : "/communities/live";

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-accent)]/10">
        <Radio className="h-7 w-7 text-[var(--color-accent)]" />
      </div>
      <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
        Live Collaboration Suite
      </h2>
      <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
        Teach, share screens, whiteboard, collaborate on notes, sell, and capture
        knowledge — powered by Live Studio + the message engine. No separate chat.
      </p>
      <Link
        href={href}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white"
      >
        Open Live Studio
      </Link>
    </div>
  );
}
