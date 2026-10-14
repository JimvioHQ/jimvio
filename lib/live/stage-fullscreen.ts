/**
 * Browser Fullscreen API for the Live stage.
 * A rejected or missing API returns "fallback" so the UI can use in-page focus
 * without claiming device fullscreen.
 */

export type FullscreenAttempt = "entered" | "exited" | "fallback";

export type FullscreenTarget = {
  requestFullscreen?: () => Promise<void>;
  webkitRequestFullscreen?: () => void;
};

export type FullscreenDocumentLike = {
  fullscreenElement: unknown;
  webkitFullscreenElement?: unknown;
  exitFullscreen?: () => Promise<void>;
};

export async function enterElementFullscreen(
  element: FullscreenTarget | null,
  doc: FullscreenDocumentLike | null,
): Promise<FullscreenAttempt> {
  if (!doc || !element) return "fallback";
  if (element.requestFullscreen) {
    try {
      await element.requestFullscreen();
      return "entered";
    } catch {
      return "fallback";
    }
  }
  if (element.webkitRequestFullscreen) {
    try {
      element.webkitRequestFullscreen();
    } catch {
      return "fallback";
    }
    if (doc.fullscreenElement || doc.webkitFullscreenElement) return "entered";
    return "fallback";
  }
  return "fallback";
}

export async function exitDocumentFullscreen(
  doc: FullscreenDocumentLike | null,
): Promise<FullscreenAttempt> {
  if (!doc?.fullscreenElement && !doc?.webkitFullscreenElement) return "fallback";
  try {
    await doc.exitFullscreen?.();
    return "exited";
  } catch {
    return "fallback";
  }
}
