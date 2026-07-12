/**
 * Global CJ API rate limiter — serializes video lookups to ≤2 req/sec with backoff metrics.
 */

const MAX_VIDEO_REQUESTS_PER_SEC = 2;
const videoTimestamps: number[] = [];

let video429Count = 0;
let videoRequestCount = 0;
let videoWindowStart = Date.now();

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function recordCj429(): void {
  video429Count += 1;
}

export function getCjRateMetrics(): {
  requestsPerSec: number;
  rateLimit429Count: number;
} {
  const elapsed = Math.max(1, Date.now() - videoWindowStart) / 1000;
  return {
    requestsPerSec: Math.round((videoRequestCount / elapsed) * 10) / 10,
    rateLimit429Count: video429Count,
  };
}

export function resetCjRateMetricsWindow(): void {
  videoRequestCount = 0;
  videoWindowStart = Date.now();
}

/** Wait until a video API slot is available (max 2/sec). */
export async function waitForCjVideoSlot(): Promise<void> {
  const now = Date.now();
  while (videoTimestamps.length > 0 && now - videoTimestamps[0]! >= 1000) {
    videoTimestamps.shift();
  }

  if (videoTimestamps.length >= MAX_VIDEO_REQUESTS_PER_SEC) {
    const waitMs = 1000 - (now - videoTimestamps[0]!) + 15;
    await sleep(Math.max(waitMs, 50));
    return waitForCjVideoSlot();
  }

  videoTimestamps.push(Date.now());
  videoRequestCount += 1;
}
