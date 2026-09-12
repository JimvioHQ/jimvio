/**
 * True preview viewport widths for the Store Builder canvas.
 * Mobile/tablet use fixed CSS pixels — not browser viewport breakpoints.
 */

export type PreviewDevice = "desktop" | "tablet" | "mobile";
export type MobilePreviewWidth = 320 | 375 | 390 | 430;

export const MOBILE_PREVIEW_WIDTHS: MobilePreviewWidth[] = [320, 375, 390, 430];

export function previewFrameWidth(
  device: PreviewDevice,
  mobileWidth: MobilePreviewWidth = 390
): number | "100%" {
  if (device === "mobile") return mobileWidth;
  if (device === "tablet") return 768;
  return "100%";
}

/**
 * When previewDevice is set (builder canvas), components must not rely on
 * Tailwind sm/md/lg viewport breakpoints — use these explicit modes instead.
 */
export function previewIsCompact(device?: PreviewDevice | null): boolean {
  return device === "mobile" || device === "tablet";
}

export function previewShowDesktopNav(device?: PreviewDevice | null): boolean {
  if (!device) return false; // caller uses Tailwind
  return device === "desktop";
}

export function previewShowMobileNav(device?: PreviewDevice | null): boolean {
  if (!device) return false;
  return device === "mobile" || device === "tablet";
}

export function previewProductGridClass(device?: PreviewDevice | null): string {
  if (device === "mobile") return "mt-6 grid grid-cols-2 gap-2.5";
  if (device === "tablet") return "mt-7 grid grid-cols-2 gap-4 md:grid-cols-3";
  if (device === "desktop") {
    return "mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:[grid-template-columns:repeat(var(--store-grid-cols,3),minmax(0,1fr))]";
  }
  return "mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:[grid-template-columns:repeat(var(--store-grid-cols,3),minmax(0,1fr))]";
}
