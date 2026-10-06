/**
 * Runtime screen-share capability for Live.
 * Prefer feature detection over UA guessing. Call getDisplayMedia only from
 * a user gesture — never from useEffect/timeouts.
 */

export type ScreenShareCapabilityKind =
  | "supported"
  | "unsupported"
  | "permission_required"
  | "temporarily_unavailable"
  | "insecure_context"
  | "unknown";

export type ScreenShareCapability = {
  kind: ScreenShareCapabilityKind;
  /** True when the Share control should remain enabled and attempt capture on tap. */
  canAttempt: boolean;
  /** getDisplayMedia exists as a function. */
  hasDisplayMedia: boolean;
  secureContext: boolean;
  /** Short user-facing explanation when canAttempt is false. */
  reason: string | null;
  /** @deprecated Prefer kind / canAttempt */
  supported: boolean;
};

export type ScreenShareStartErrorCode =
  | "unsupported"
  | "permission_denied"
  | "aborted"
  | "not_found"
  | "not_readable"
  | "invalid_state"
  | "overconstrained"
  | "insecure"
  | "unknown";

export type ScreenShareStartError = {
  code: ScreenShareStartErrorCode;
  message: string;
  technical: string;
};

function isTouchLikeDevice(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      navigator.maxTouchPoints > 0 ||
      window.matchMedia("(pointer: coarse)").matches
    );
  } catch {
    return false;
  }
}

export function detectScreenShareCapability(): ScreenShareCapability {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      kind: "unknown",
      canAttempt: false,
      hasDisplayMedia: false,
      secureContext: false,
      reason: "Screen sharing is unavailable.",
      supported: false,
    };
  }

  const secureContext = Boolean(window.isSecureContext);
  const hasDisplayMedia =
    typeof navigator.mediaDevices?.getDisplayMedia === "function";

  if (!secureContext) {
    return {
      kind: "insecure_context",
      canAttempt: false,
      hasDisplayMedia,
      secureContext: false,
      reason: "Screen sharing requires a secure (HTTPS) connection.",
      supported: false,
    };
  }

  if (!navigator.mediaDevices || !hasDisplayMedia) {
    return {
      kind: "unsupported",
      canAttempt: false,
      hasDisplayMedia: false,
      secureContext: true,
      reason:
        "Screen sharing isn't supported by this browser. Update your browser or use a supported browser/device.",
      supported: false,
    };
  }

  // API is present — attempt on user tap. Permission and OS limits are resolved
  // only when getDisplayMedia runs (must stay in the user-activation chain).
  return {
    kind: "supported",
    canAttempt: true,
    hasDisplayMedia: true,
    secureContext: true,
    reason: null,
    supported: true,
  };
}

/** Minimal constraints first — mobile WebKit often rejects desktop hints. */
export function buildScreenShareConstraints(options?: {
  target?: "entire_screen" | "window" | "browser_tab";
  quality?: "standard" | "high";
  preferHints?: boolean;
}): DisplayMediaStreamOptions {
  const touch = isTouchLikeDevice();
  const preferHints = options?.preferHints ?? !touch;

  if (!preferHints) {
    // Mobile / coarse pointer: bare video (+ audio try). No displaySurface /
    // preferCurrentTab / monitorTypeSurfaces — those overconstrain Safari/Chrome Android.
    return {
      video: true,
      audio: true,
    } as DisplayMediaStreamOptions;
  }

  const surface =
    options?.target === "browser_tab"
      ? "browser"
      : options?.target === "window"
        ? "window"
        : "monitor";
  const high = options?.quality !== "standard";

  return {
    video: {
      displaySurface: surface,
      width: { ideal: high ? 1920 : 1280 },
      height: { ideal: high ? 1080 : 720 },
      frameRate: { ideal: high ? 30 : 24 },
    } as MediaTrackConstraints,
    audio: true,
    preferCurrentTab: false,
    selfBrowserSurface: "exclude",
    ...(options?.target === "browser_tab"
      ? { monitorTypeSurfaces: "exclude" }
      : {}),
  } as DisplayMediaStreamOptions;
}

export function classifyScreenShareError(err: unknown): ScreenShareStartError {
  const name = err instanceof DOMException ? err.name : "";
  const raw = err instanceof Error ? err.message : String(err ?? "unknown");

  if (name === "NotAllowedError") {
    // User cancel vs permission — AbortError is cancel; NotAllowedError is deny
    // (or Permissions-Policy). Keep copy clear.
    return {
      code: "permission_denied",
      message: "Screen sharing permission was denied.",
      technical: `${name}: ${raw}`,
    };
  }
  if (name === "AbortError") {
    return {
      code: "aborted",
      message: "Screen sharing was cancelled.",
      technical: `${name}: ${raw}`,
    };
  }
  if (name === "NotFoundError") {
    return {
      code: "not_found",
      message: "No screen source is available.",
      technical: `${name}: ${raw}`,
    };
  }
  if (name === "NotReadableError") {
    return {
      code: "not_readable",
      message: "Screen sharing couldn't start. Please try again.",
      technical: `${name}: ${raw}`,
    };
  }
  if (name === "InvalidStateError") {
    return {
      code: "invalid_state",
      message: "Screen sharing couldn't start. Please try again.",
      technical: `${name}: ${raw}`,
    };
  }
  if (name === "OverconstrainedError" || name === "ConstraintError") {
    return {
      code: "overconstrained",
      message: "Screen sharing couldn't start with the selected options. Please try again.",
      technical: `${name}: ${raw}`,
    };
  }
  if (name === "NotSupportedError" || name === "TypeError") {
    return {
      code: "unsupported",
      message:
        "Screen sharing isn't supported by this browser. Update your browser or use a supported browser/device.",
      technical: `${name}: ${raw}`,
    };
  }
  if (/secure|https|insecure/i.test(raw)) {
    return {
      code: "insecure",
      message: "Screen sharing requires a secure (HTTPS) connection.",
      technical: raw,
    };
  }
  return {
    code: "unknown",
    message: "Screen sharing couldn't start.",
    technical: raw,
  };
}

/** True when HTMLMediaElement.setSinkId is available for output selection. */
export function canSelectAudioOutput(): boolean {
  if (typeof HTMLMediaElement === "undefined") return false;
  return typeof HTMLMediaElement.prototype.setSinkId === "function";
}
