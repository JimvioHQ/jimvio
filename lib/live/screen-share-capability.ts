/**
 * Browser capability detection for Live screen share.
 * Never claims support without getDisplayMedia in a secure context.
 */

export type ScreenShareCapability = {
  supported: boolean;
  /** User-facing reason when unsupported; null when supported. */
  reason: string | null;
  /** getDisplayMedia exists (may still fail at call time on some mobile OS). */
  hasDisplayMedia: boolean;
  secureContext: boolean;
};

export function detectScreenShareCapability(): ScreenShareCapability {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      supported: false,
      reason: "Screen sharing is unavailable.",
      hasDisplayMedia: false,
      secureContext: false,
    };
  }

  const secureContext = Boolean(window.isSecureContext);
  const hasDisplayMedia = typeof navigator.mediaDevices?.getDisplayMedia === "function";

  if (!secureContext) {
    return {
      supported: false,
      reason: "Screen sharing requires a secure (HTTPS) connection.",
      hasDisplayMedia,
      secureContext,
    };
  }

  if (!navigator.mediaDevices || !hasDisplayMedia) {
    return {
      supported: false,
      reason: "Screen sharing is not supported on this browser or device.",
      hasDisplayMedia: false,
      secureContext,
    };
  }

  return {
    supported: true,
    reason: null,
    hasDisplayMedia: true,
    secureContext: true,
  };
}

/** True when HTMLMediaElement.setSinkId is available for output selection. */
export function canSelectAudioOutput(): boolean {
  if (typeof HTMLMediaElement === "undefined") return false;
  return typeof HTMLMediaElement.prototype.setSinkId === "function";
}
