/**
 * Singleton engine for marketplace product-card image previews.
 * Ensures only one image slideshow runs at a time.
 */

const SLIDE_INTERVAL_MS = 1000;

const preloadedUrls = new Set<string>();

export interface ImagePreviewCallbacks {
  onStart: () => void;
  onStop: () => void;
}

export class ImagePreviewEngine {
  private static instance: ImagePreviewEngine | null = null;

  private cards = new Map<string, ImagePreviewCallbacks>();
  private activeId: string | null = null;

  static getInstance(): ImagePreviewEngine {
    if (!ImagePreviewEngine.instance) {
      ImagePreviewEngine.instance = new ImagePreviewEngine();
    }
    return ImagePreviewEngine.instance;
  }

  register(productId: string, callbacks: ImagePreviewCallbacks) {
    this.cards.set(productId, callbacks);
  }

  unregister(productId: string) {
    if (this.activeId === productId) {
      this.stopActive();
    }
    this.cards.delete(productId);
  }

  requestStart(productId: string) {
    if (!this.cards.has(productId)) return;
    if (this.activeId === productId) return;

    if (this.activeId) {
      this.cards.get(this.activeId)?.onStop();
    }

    this.activeId = productId;
    this.cards.get(productId)?.onStart();
  }

  requestStop(productId: string) {
    if (this.activeId !== productId) return;
    this.stopActive();
  }

  private stopActive() {
    if (!this.activeId) return;
    this.cards.get(this.activeId)?.onStop();
    this.activeId = null;
  }

  /** @internal Used by card components to schedule slide ticks. */
  static slideIntervalMs = SLIDE_INTERVAL_MS;
}

/** Preload images once — cached URLs are skipped on subsequent hovers. */
export function preloadPreviewImages(urls: string[]) {
  if (typeof window === "undefined") return;
  for (const src of urls) {
    if (!src || preloadedUrls.has(src)) continue;
    preloadedUrls.add(src);
    const img = new window.Image();
    img.decoding = "async";
    img.src = src;
  }
}
