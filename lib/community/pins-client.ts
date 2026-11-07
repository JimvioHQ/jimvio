"use client";

/**
 * One shared GET /api/c/pins per page view: the hub sidebar and the feed's
 * Pinned rail both need it, and each used to fetch it separately.
 */
type PinsPayload = { pins?: unknown[] } | null;

let inflight: Promise<PinsPayload> | null = null;
let last: { at: number; value: PinsPayload } | null = null;
const TTL_MS = 15_000;

export function fetchPinsShared(force = false): Promise<PinsPayload> {
  if (!force && last && Date.now() - last.at < TTL_MS) return Promise.resolve(last.value);
  if (inflight) return inflight;
  inflight = fetch("/api/c/pins", { cache: "no-store" })
    .then(async (res) => (res.ok ? ((await res.json()) as PinsPayload) : null))
    .catch(() => null)
    .then((value) => {
      last = { at: Date.now(), value };
      inflight = null;
      return value;
    });
  return inflight;
}

/** Call after pin / unpin so the next read is fresh. */
export function invalidatePinsShared() {
  last = null;
}
