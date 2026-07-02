/**
 * Singleton playback engine for marketplace product-card videos.
 * Ensures only one video plays at a time with visibility-based selection
 * and 10-second rotation when multiple cards are visible.
 */

const VISIBILITY_THRESHOLD = 0.2;
const ROTATION_MS = 10_000;

export interface VideoCardCallbacks {
  hasVideo: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
}

interface VideoCardEntry extends VideoCardCallbacks {
  visibilityRatio: number;
  isHovered: boolean;
  isTouched: boolean;
}

type IdleCallbackHandle = number;

function scheduleIdle(fn: () => void): IdleCallbackHandle {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    return window.requestIdleCallback(fn, { timeout: 120 }) as IdleCallbackHandle;
  }
  return requestAnimationFrame(fn) as IdleCallbackHandle;
}

function cancelIdle(id: IdleCallbackHandle) {
  if (typeof window !== "undefined" && "cancelIdleCallback" in window) {
    window.cancelIdleCallback(id);
  } else {
    cancelAnimationFrame(id);
  }
}

export class VideoCommerceEngine {
  private static instance: VideoCommerceEngine | null = null;

  private cards = new Map<string, VideoCardEntry>();
  private activeId: string | null = null;
  private rotationTimer: ReturnType<typeof setInterval> | null = null;
  private cycleIndex = 0;
  private rotationIds: string[] = [];
  private pendingUpdate: IdleCallbackHandle | null = null;
  private isDesktop = false;
  private reducedMotion = false;

  static getInstance(): VideoCommerceEngine {
    if (!VideoCommerceEngine.instance) {
      VideoCommerceEngine.instance = new VideoCommerceEngine();
    }
    return VideoCommerceEngine.instance;
  }

  private constructor() {
    if (typeof window === "undefined") return;

    const hoverMq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");

    this.isDesktop = hoverMq.matches;
    this.reducedMotion = motionMq.matches;

    const onHoverChange = () => {
      this.isDesktop = hoverMq.matches;
      this.scheduleUpdate();
    };
    const onMotionChange = () => {
      this.reducedMotion = motionMq.matches;
      if (this.reducedMotion) this.setActive(null);
      else this.scheduleUpdate();
    };

    hoverMq.addEventListener("change", onHoverChange);
    motionMq.addEventListener("change", onMotionChange);
  }

  register(productId: string, callbacks: VideoCardCallbacks) {
    this.cards.set(productId, {
      ...callbacks,
      visibilityRatio: 0,
      isHovered: false,
      isTouched: false,
    });
  }

  unregister(productId: string) {
    if (this.activeId === productId) {
      this.setActive(null);
    }
    this.cards.delete(productId);
    this.rotationIds = this.rotationIds.filter((id) => id !== productId);
    this.scheduleUpdate();
  }

  updateVisibility(productId: string, ratio: number) {
    const entry = this.cards.get(productId);
    if (!entry) return;
    entry.visibilityRatio = ratio;
    this.scheduleUpdate();
  }

  setHovered(productId: string, hovered: boolean) {
    const entry = this.cards.get(productId);
    if (!entry) return;
    entry.isHovered = hovered;
    if (this.isDesktop) this.recomputeImmediate();
  }

  setTouched(productId: string, touched: boolean) {
    const entry = this.cards.get(productId);
    if (!entry) return;
    entry.isTouched = touched;
    if (!this.isDesktop) this.recomputeImmediate();
  }

  private recomputeImmediate() {
    if (this.pendingUpdate !== null) {
      cancelIdle(this.pendingUpdate);
      this.pendingUpdate = null;
    }
    this.recompute();
  }

  private scheduleUpdate() {
    if (this.pendingUpdate !== null) return;
    this.pendingUpdate = scheduleIdle(() => {
      this.pendingUpdate = null;
      this.recompute();
    });
  }

  private getVisibleVideoCards(): [string, VideoCardEntry][] {
    return [...this.cards.entries()]
      .filter(([, c]) => c.hasVideo && c.visibilityRatio >= VISIBILITY_THRESHOLD)
      .sort((a, b) => b[1].visibilityRatio - a[1].visibilityRatio);
  }

  private recompute() {
    if (this.reducedMotion) {
      this.clearRotation();
      this.setActive(null);
      return;
    }

    const hovered = [...this.cards.entries()].find(
      ([, c]) => c.isHovered && c.hasVideo && c.visibilityRatio > 0,
    );
    if (hovered && this.isDesktop) {
      this.clearRotation();
      this.setActive(hovered[0]);
      return;
    }

    const touched = [...this.cards.entries()].find(
      ([, c]) => c.isTouched && c.hasVideo && c.visibilityRatio > 0,
    );
    if (touched && !this.isDesktop) {
      this.clearRotation();
      this.setActive(touched[0]);
      return;
    }

    const visible = this.getVisibleVideoCards();

    if (visible.length === 0) {
      this.clearRotation();
      this.setActive(null);
      return;
    }

    if (visible.length === 1) {
      this.clearRotation();
      this.setActive(visible[0][0]);
      return;
    }

    const ids = visible.map(([id]) => id);
    const idsChanged =
      ids.length !== this.rotationIds.length ||
      ids.some((id, i) => id !== this.rotationIds[i]);

    if (idsChanged) {
      this.rotationIds = ids;
      this.cycleIndex = 0;
      this.setActive(ids[0]);
      this.startRotation(ids);
      return;
    }

    if (!this.activeId || !ids.includes(this.activeId)) {
      this.cycleIndex = 0;
      this.setActive(ids[0]);
      this.startRotation(ids);
    } else if (!this.rotationTimer) {
      this.startRotation(ids);
    }
  }

  private startRotation(ids: string[]) {
    this.clearRotation();
    this.rotationIds = ids;
    this.rotationTimer = setInterval(() => {
      if (this.rotationIds.length <= 1) return;
      this.cycleIndex = (this.cycleIndex + 1) % this.rotationIds.length;
      this.setActive(this.rotationIds[this.cycleIndex]);
    }, ROTATION_MS);
  }

  private clearRotation() {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
  }

  private setActive(id: string | null) {
    if (this.activeId === id) return;

    if (this.activeId) {
      this.cards.get(this.activeId)?.onDeactivate();
    }

    this.activeId = id;

    if (id) {
      this.cards.get(id)?.onActivate();
    }
  }

  /** Tear down timers — call on page unmount if needed. */
  destroy() {
    if (this.pendingUpdate !== null) {
      cancelIdle(this.pendingUpdate);
      this.pendingUpdate = null;
    }
    this.clearRotation();
    this.setActive(null);
    this.cards.clear();
    VideoCommerceEngine.instance = null;
  }
}
