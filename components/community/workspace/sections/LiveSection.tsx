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
  const { slug, communityName, spacesWithRooms } = useWorkspace();
  const href = slug ? `/communities/${slug}/live` : "/communities/live";
  const discussionHref = slug ? `/communities/${slug}` : "/communities";
  const [liveNow, setLiveNow] = useState(false);
  const [sessionHref, setSessionHref] = useState(href);
  const [historyCount, setHistoryCount] = useState(0);

  const liveSpace = spacesWithRooms?.find(
    (s) => s.space_type === "live" || s.space_type === "voice"
  );

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/c/live?slug=${encodeURIComponent(slug)}`);
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as {
          session?: {
            liveStatus?: string;
            liveSessionId?: string | null;
            endedSessionId?: string | null;
            href?: string;
          };
          upcomingSessions?: unknown[];
        };
        if (cancelled) return;
        const live =
          json.session?.liveStatus === "live" || Boolean(json.session?.liveSessionId);
        setLiveNow(live);
        if (json.session?.liveSessionId) {
          setSessionHref(`/communities/live/${json.session.liveSessionId}`);
        } else if (json.session?.href) {
          setSessionHref(json.session.href);
        } else {
          setSessionHref(href);
        }
        setHistoryCount(json.session?.endedSessionId ? 1 : 0);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, href]);

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
          {liveSpace ? ` · ${liveSpace.name}` : ""}
        </p>
      )}
      {!liveNow && historyCount > 0 && (
        <p className="mt-3 text-[12px] text-[var(--color-text-muted)]">
          Recent replay available in Live Studio
        </p>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Link
          href={sessionHref}
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
