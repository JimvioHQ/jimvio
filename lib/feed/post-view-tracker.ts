/**
 * Hub/community feed view tracking.
 *
 * Policy:
 * - Count only after a post is ≥50% visible for ≥MIN_DWELL_MS
 * - Client session Set prevents remount double-fires
 * - Server RPC dedupes once per user/session per UTC day
 * - Batched flush so scrolling does not fire one request per card
 * - Never accepts client-submitted totals
 */

import { getPostViewSessionId } from "@/lib/feed/view-session";

export const POST_VIEW_MIN_DWELL_MS = 800;
export const POST_VIEW_THRESHOLD = 0.5;
const FLUSH_MS = 1200;

type PendingView = { watchMs: number };
type RecordedListener = (postId: string, viewCount: number | null, recorded: boolean) => void;

const clientSeen = new Set<string>();
const pending = new Map<string, PendingView>();
const listeners = new Set<RecordedListener>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;

export function hasClientSeenPostView(postId: string): boolean {
  return clientSeen.has(postId);
}

export function markClientSeenPostView(postId: string): void {
  clientSeen.add(postId);
}

export function subscribePostViewRecorded(listener: RecordedListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(postId: string, viewCount: number | null, recorded: boolean) {
  for (const listener of listeners) {
    try {
      listener(postId, viewCount, recorded);
    } catch {
      /* ignore listener errors */
    }
  }
}

async function flushPending(): Promise<void> {
  if (flushing) return;
  flushTimer = null;
  if (!pending.size) return;
  flushing = true;
  const batch = [...pending.entries()];
  pending.clear();
  const sessionId = getPostViewSessionId();

  try {
    await Promise.all(
      batch.map(async ([postId, { watchMs }]) => {
        try {
          const res = await fetch(`/api/posts/${postId}/view`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: sessionId || undefined,
              watchMs,
              source: "feed",
            }),
            keepalive: true,
            cache: "no-store",
          });
          const data = (await res.json().catch(() => ({}))) as {
            recorded?: boolean;
            view_count?: number | null;
          };
          const count =
            typeof data.view_count === "number" && Number.isFinite(data.view_count)
              ? Math.max(0, Math.floor(data.view_count))
              : null;
          notify(postId, count, Boolean(data.recorded));
        } catch {
          // Soft-fail: do not unblock scrolling; leave clientSeen so we don't hammer.
        }
      }),
    );
  } finally {
    flushing = false;
  }
}

/** Queue a qualifying view for batched server recording. */
export function queuePostView(postId: string, watchMs = POST_VIEW_MIN_DWELL_MS): void {
  if (!postId || clientSeen.has(postId)) return;
  clientSeen.add(postId);
  pending.set(postId, { watchMs: Math.max(0, Math.floor(watchMs)) });
  if (flushTimer == null) {
    flushTimer = setTimeout(() => {
      void flushPending();
    }, FLUSH_MS);
  }
}

/** Flush immediately (e.g. pagehide / visibility hidden). */
export function flushPostViewsNow(): void {
  if (flushTimer != null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  void flushPending();
}

/** Test helper — reset in-memory tracker state. */
export function __resetPostViewTrackerForTests(): void {
  clientSeen.clear();
  pending.clear();
  if (flushTimer != null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  flushing = false;
}
