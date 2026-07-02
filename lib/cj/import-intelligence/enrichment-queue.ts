import type { CJIntelligencePayload } from "./enrichment-types";
import { fetchCJIntelligence } from "./fetch-intelligence";
import { getCachedIntelligence } from "./enrichment-cache";

const MAX_CONCURRENT = 4;
const PREFETCH_BUFFER = 10;

function scheduleIdle(fn: () => void): void {
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(fn, { timeout: 2500 });
  } else {
    setTimeout(fn, 16);
  }
}

export type EnrichmentListener = (
  pid: string,
  data: CJIntelligencePayload | null
) => void;

export class IntelligenceEnrichmentQueue {
  private queue: string[] = [];
  private inFlight = new Set<string>();
  private scheduled = new Set<string>();
  private active = 0;
  private destroyed = false;
  private listener: EnrichmentListener;
  private idleHandle: number | null = null;

  constructor(listener: EnrichmentListener) {
    this.listener = listener;
  }

  destroy(): void {
    this.destroyed = true;
    this.queue = [];
    if (this.idleHandle !== null && typeof cancelIdleCallback !== "undefined") {
      cancelIdleCallback(this.idleHandle);
    }
  }

  /** Schedule visible + prefetch pids */
  scheduleVisible(pids: string[]): void {
    if (this.destroyed || pids.length === 0) return;

    for (const pid of pids) {
      if (this.scheduled.has(pid) || this.inFlight.has(pid)) continue;
      const cached = getCachedIntelligence(pid);
      if (cached) {
        this.scheduled.add(pid);
        scheduleIdle(() => this.listener(pid, cached));
        continue;
      }
      this.scheduled.add(pid);
      this.queue.push(pid);
    }

    this.pump();
  }

  get pendingCount(): number {
    return this.queue.length + this.inFlight.size;
  }

  private pump(): void {
    if (this.destroyed) return;

    scheduleIdle(() => {
      while (this.active < MAX_CONCURRENT && this.queue.length > 0) {
        const pid = this.queue.shift()!;
        if (this.inFlight.has(pid)) continue;

        this.inFlight.add(pid);
        this.active += 1;

        fetchCJIntelligence(pid)
          .then((data) => {
            if (!this.destroyed) {
              this.listener(pid, data);
              if (!data) this.scheduled.delete(pid);
            }
          })
          .catch(() => {
            if (!this.destroyed) {
              this.listener(pid, null);
              this.scheduled.delete(pid);
            }
          })
          .finally(() => {
            this.inFlight.delete(pid);
            this.active -= 1;
            this.pump();
          });
      }
    });
  }
}

export function getPrefetchPids(
  products: Array<{ pid: string }>,
  visibleStart: number,
  visibleEnd: number,
  buffer = PREFETCH_BUFFER
): string[] {
  const end = Math.min(products.length, visibleEnd + buffer);
  const start = Math.max(0, visibleStart);
  return products.slice(start, end).map((p) => p.pid);
}

export { PREFETCH_BUFFER };
