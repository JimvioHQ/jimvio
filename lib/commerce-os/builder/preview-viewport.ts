/**
 * True preview viewport widths for the Store Builder canvas.
 * Mobile/tablet use fixed CSS pixels — not browser viewport breakpoints.
 *
 * Desktop/laptop frames are realistic device widths and are fit-scaled
 * into the stage. Never shrink the frame to the leftover editor column
 * (that makes Tailwind desktop chrome overflow inside a narrow box).
 */

export type PreviewDevice = "desktop" | "laptop" | "tablet" | "mobile" | "custom";
export type MobilePreviewWidth = 320 | 360 | 375 | 390 | 414 | 430;

export const MOBILE_PREVIEW_WIDTHS: MobilePreviewWidth[] = [
  320, 360, 375, 390, 414, 430,
];

export const PREVIEW_DEVICE_LABELS: Record<PreviewDevice, string> = {
  desktop: "Desktop",
  laptop: "Laptop",
  tablet: "Tablet",
  mobile: "Mobile",
  custom: "Custom",
};

export const DESKTOP_FRAME_WIDTH = 1440;
export const LAPTOP_FRAME_WIDTH = 1280;
export const TABLET_FRAME_WIDTH = 768;

export function previewFrameWidth(
  device: PreviewDevice,
  opts: { mobileWidth?: MobilePreviewWidth; customWidth?: number } = {}
): number {
  if (device === "mobile") return opts.mobileWidth ?? 390;
  if (device === "tablet") return TABLET_FRAME_WIDTH;
  if (device === "laptop") return LAPTOP_FRAME_WIDTH;
  if (device === "custom") {
    const w = opts.customWidth ?? 1100;
    return Math.min(1920, Math.max(320, Math.round(w)));
  }
  return DESKTOP_FRAME_WIDTH;
}

/**
 * When previewDevice is set (builder canvas), components must not rely on
 * Tailwind sm/md/lg viewport breakpoints — use these explicit modes instead.
 */
export function previewIsCompact(device?: PreviewDevice | null): boolean {
  return device === "mobile" || device === "tablet";
}

export function previewShowDesktopNav(device?: PreviewDevice | null): boolean {
  if (!device) return false;
  return device === "desktop" || device === "laptop" || device === "custom";
}

export function previewShowMobileNav(device?: PreviewDevice | null): boolean {
  if (!device) return false;
  return device === "mobile" || device === "tablet";
}

/**
 * Compact product grids: 2 on mobile, 3 on tablet, merchant columns on desktop
 * (default 5). Desktop columns are applied via CSS/inline style — Tailwind
 * arbitrary `repeat(var(--x),…)` classes drop the comma and never compile.
 */
export function previewProductGridClass(device?: PreviewDevice | null): string {
  if (device === "mobile") return "mt-5 grid grid-cols-2 gap-2.5";
  if (device === "tablet") return "mt-5 grid grid-cols-3 gap-3";
  if (device === "desktop" || device === "laptop" || device === "custom") {
    return "mt-6 grid gap-3";
  }
  return "mt-5 grid grid-cols-2 gap-2.5 md:gap-3";
}

export function previewProductGridStyle(
  device?: PreviewDevice | null
): { gridTemplateColumns: string } | undefined {
  if (device === "desktop" || device === "laptop" || device === "custom") {
    return {
      gridTemplateColumns: "repeat(var(--store-grid-cols, 5), minmax(0, 1fr))",
    };
  }
  if (device === "tablet") {
    return { gridTemplateColumns: "repeat(3, minmax(0, 1fr))" };
  }
  if (device === "mobile") {
    return { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" };
  }
  return undefined;
}

export type ZoomMode = "fit" | 50 | 75 | 100 | 125;

export function fitPreviewZoom(stageWidth: number, frameWidth: number): number {
  if (stageWidth <= 0 || frameWidth <= 0) return 100;
  const raw = Math.floor((stageWidth / frameWidth) * 100);
  return Math.min(100, Math.max(40, raw));
}

export function resolvePreviewZoom(
  mode: ZoomMode,
  stageWidth: number,
  frameWidth: number
): number {
  if (mode === "fit") return fitPreviewZoom(stageWidth, frameWidth);
  if (mode === 125 && frameWidth * 1.25 > stageWidth + 8) {
    return fitPreviewZoom(stageWidth, frameWidth);
  }
  return mode;
}

export function availableZoomModes(
  stageWidth: number,
  frameWidth: number
): ZoomMode[] {
  const modes: ZoomMode[] = ["fit", 50, 75, 100];
  if (frameWidth * 1.25 <= stageWidth) modes.push(125);
  return modes;
}

export function scaledPreviewBox(
  frameWidth: number,
  contentHeight: number,
  zoomPercent: number
): { width: number; height: number; scale: number } {
  const scale = zoomPercent / 100;
  return {
    width: Math.round(frameWidth * scale),
    height: Math.round(Math.max(contentHeight, 1) * scale),
    scale,
  };
}
