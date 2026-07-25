"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageSquare, Radio } from "lucide-react";
import { useWorkspace } from "@/components/community/workspace-context";

/**
 * Workspace Live section — links into Hub Live Studio (no duplicate media stack).
 * Discussion stays available before / during / after Live.
 */
export function LiveSection() {
  const { slug, communityName } = useWorkspace();
  const href = slug ? `/communities/${slug}/live` : "/communities/live";
  const discussionHref = slug ? `/communities/${slug}` : "/communities";
  const [liveNow, setLiveNow] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/c/live?slug=${encodeURIComponent(slug)}`);
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as {
          session?: { liveStatus?: string; liveSessionId?: string | null };
        };
        if (!cancelled) {
          setLiveNow(
            json.session?.liveStatus === "live" || Boolean(json.session?.liveSessionId)
          );
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

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
      {liveNow && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-red-600">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          Live now{communityName ? ` in ${communityName}` : ""}
        </p>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Link
          href={href}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white"
        >
          {liveNow ? "Join Live Studio" : "Open Live Studio"}
        </Link>
        <Link
          href={discussionHref}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2.5 text-sm font-semibold text-[var(--color-text-primary)]"
        >
          <MessageSquare className="h-4 w-4" />
          Discussion
        </Link>
      </div>
    </div>
  );
}
