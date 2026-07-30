/**
 * Singleton coordinator for community feed videos.
 * Ensures only one video plays at a time via IntersectionObserver visibility.
 */

const VISIBILITY_THRESHOLD = 0.45;
const NEAR_MARGIN = "200px 0px";

export type FeedVideoCallbacks = {
  onActivate: () => void;
  onDeactivate: () => void;
  onNear?: (near: boolean) => void;
};

type FeedVideoEntry = FeedVideoCallbacks & {
  visibilityRatio: number;
  isNear: boolean;
  isHovered: boolean;
  isTouched: boolean;
  userUnlockedAudio: boolean;
};

type IdleHandle = number;

function scheduleIdle(fn: () => void): IdleHandle {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    return window.requestIdleCallback(fn, { timeout: 80 }) as IdleHandle;
  }
  return requestAnimationFrame(fn) as IdleHandle;
}

function cancelIdle(id: IdleHandle) {
  if (typeof window !== "undefined" && "cancelIdleCallback" in window) {
    window.cancelIdleCallback(id);
  } else {
    cancelAnimationFrame(id);
  }
}

export class CommunityFeedVideoEngine {
  private static instance: CommunityFeedVideoEngine | null = null;

  private videos = new Map<string, FeedVideoEntry>();
  private activeId: string | null = null;
  private pendingUpdate: IdleHandle | null = null;
  private isDesktop = false;
  private reducedMotion = false;

  static getInstance(): CommunityFeedVideoEngine {
    if (!CommunityFeedVideoEngine.instance) {
      CommunityFeedVideoEngine.instance = new CommunityFeedVideoEngine();
    }
    return CommunityFeedVideoEngine.instance;
  }

  /** Test helper */
  static resetInstance() {
    CommunityFeedVideoEngine.instance = null;
  }

  private constructor() {
    if (typeof window === "undefined") return;

    const hoverMq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.isDesktop = hoverMq.matches;
    this.reducedMotion = motionMq.matches;

    hoverMq.addEventListener("change", () => {
      this.isDesktop = hoverMq.matches;
      this.scheduleUpdate();
    });
    motionMq.addEventListener("change", () => {
      this.reducedMotion = motionMq.matches;
      if (this.reducedMotion) this.setActive(null);
      else this.scheduleUpdate();
    });
  }

  get desktop() {
    return this.isDesktop;
  }

  get prefersReducedMotion() {
    return this.reducedMotion;
  }

  getActiveId() {
    return this.activeId;
  }

  register(id: string, callbacks: FeedVideoCallbacks) {
    this.videos.set(id, {
      ...callbacks,
      visibilityRatio: 0,
      isNear: false,
      isHovered: false,
      isTouched: false,
      userUnlockedAudio: false,
    });
  }

  unregister(id: string) {
    if (this.activeId === id) this.setActive(null);
    this.videos.delete(id);
    this.scheduleUpdate();
  }

  updateVisibility(id: string, ratio: number) {
    const entry = this.videos.get(id);
    if (!entry) return;
    entry.visibilityRatio = ratio;
    this.scheduleUpdate();
  }

  updateNear(id: string, near: boolean) {
    const entry = this.videos.get(id);
    if (!entry) return;
    if (entry.isNear === near) return;
    entry.isNear = near;
    entry.onNear?.(near);
  }

  setHovered(id: string, hovered: boolean) {
    const entry = this.videos.get(id);
    if (!entry) return;
    entry.isHovered = hovered;
    if (this.isDesktop) this.recomputeImmediate();
  }

  setTouched(id: string, touched: boolean) {
    const entry = this.videos.get(id);
    if (!entry) return;
    entry.isTouched = touched;
    if (!this.isDesktop) this.recomputeImmediate();
  }

  unlockAudio(id: string) {
    const entry = this.videos.get(id);
    if (!entry) return;
    entry.userUnlockedAudio = true;
    this.setActive(id);
  }

  hasUnlockedAudio(id: string) {
    return Boolean(this.videos.get(id)?.userUnlockedAudio);
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

  private recompute() {
    if (this.reducedMotion) {
      this.setActive(null);
      return;
    }

    const hovered = [...this.videos.entries()].find(
      ([, v]) => v.isHovered && v.visibilityRatio > 0
    );
    if (hovered && this.isDesktop) {
      this.setActive(hovered[0]);
      return;
    }

    const touched = [...this.videos.entries()].find(
      ([, v]) => v.isTouched && v.visibilityRatio > 0
    );
    if (touched && !this.isDesktop) {
      this.setActive(touched[0]);
      return;
    }

    const visible = [...this.videos.entries()]
      .filter(([, v]) => v.visibilityRatio >= VISIBILITY_THRESHOLD)
      .sort((a, b) => b[1].visibilityRatio - a[1].visibilityRatio);

    if (visible.length === 0) {
      this.setActive(null);
      return;
    }

    this.setActive(visible[0][0]);
  }

  private setActive(id: string | null) {
    if (this.activeId === id) return;
    if (this.activeId) {
      this.videos.get(this.activeId)?.onDeactivate();
    }
    this.activeId = id;
    if (id) {
      this.videos.get(id)?.onActivate();
    }
  }
}

export const FEED_VIDEO_VISIBILITY_THRESHOLDS = [0, 0.25, 0.45, 0.6, 0.75, 1];
export const FEED_VIDEO_NEAR_MARGIN = NEAR_MARGIN;
export const FEED_VIDEO_VISIBILITY_THRESHOLD = VISIBILITY_THRESHOLD;
