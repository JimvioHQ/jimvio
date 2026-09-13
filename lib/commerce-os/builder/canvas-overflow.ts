/**
 * Real DOM measurements for the builder Issues panel.
 * Only reports overflow / clipping that can be observed — no guesswork.
 */

export type CanvasIssueSeverity = "error" | "warn" | "info";

export type CanvasIssue = {
  id: string;
  severity: CanvasIssueSeverity;
  sectionName: string;
  breakpoint: string;
  explanation: string;
  fixHint: string;
  sectionId?: string;
};

const OVERFLOW_SLACK = 2;

function sectionNameFromEl(el: Element): { name: string; id?: string } {
  const id = el.getAttribute("data-section-id") || undefined;
  const type = el.getAttribute("data-section-type") || undefined;
  return {
    id,
    name: type ? type.replace(/_/g, " ") : "Canvas",
  };
}

function isVisible(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  if (el.getClientRects().length === 0) return false;
  return true;
}

export function detectCanvasOverflow(
  root: HTMLElement,
  breakpoint: string
): CanvasIssue[] {
  const issues: CanvasIssue[] = [];
  const rootWidth = root.clientWidth;
  if (rootWidth <= 0) return issues;

  if (root.scrollWidth > rootWidth + OVERFLOW_SLACK) {
    issues.push({
      id: "root-overflow-x",
      severity: "warn",
      sectionName: "Canvas",
      breakpoint,
      explanation: `The storefront is ${root.scrollWidth - rootWidth}px wider than the ${breakpoint} viewport.`,
      fixHint: "Shorten header navigation, reduce horizontal padding, or switch a wide section to a stacked layout.",
    });
  }

  const sections = root.querySelectorAll<HTMLElement>("[data-section-id]");
  sections.forEach((el) => {
    if (!isVisible(el)) return;
    if (el.scrollWidth > el.clientWidth + OVERFLOW_SLACK) {
      const meta = sectionNameFromEl(el);
      issues.push({
        id: `section-overflow-${meta.id || "unknown"}`,
        severity: "warn",
        sectionName: meta.name,
        breakpoint,
        sectionId: meta.id,
        explanation: `This section overflows the ${breakpoint} canvas.`,
        fixHint: "Open the section settings and reduce copy, columns, or media width.",
      });
    }
  });

  const controls = root.querySelectorAll<HTMLElement>("a, button");
  let oversizedButtons = 0;
  controls.forEach((el) => {
    if (!isVisible(el)) return;
    if (el.offsetWidth > rootWidth + OVERFLOW_SLACK) oversizedButtons += 1;
  });
  if (oversizedButtons > 0) {
    issues.push({
      id: "controls-wider-than-canvas",
      severity: "warn",
      sectionName: "Buttons",
      breakpoint,
      explanation: `${oversizedButtons} button${oversizedButtons === 1 ? "" : "s"} or link${oversizedButtons === 1 ? "" : "s"} exceed the selected viewport width.`,
      fixHint: "Use stacked full-width actions on mobile, or shorten the label.",
    });
  }

  const images = root.querySelectorAll<HTMLImageElement>("img");
  let missingImages = 0;
  images.forEach((img) => {
    if (!isVisible(img)) return;
    if (img.naturalWidth === 0 && img.complete && img.src) missingImages += 1;
  });
  if (missingImages > 0) {
    issues.push({
      id: "broken-images",
      severity: "info",
      sectionName: "Media",
      breakpoint,
      explanation: `${missingImages} image${missingImages === 1 ? "" : "s"} failed to load in this preview.`,
      fixHint: "Replace the image in section or brand settings.",
    });
  }

  const textNodes = root.querySelectorAll<HTMLElement>("h1, h2, p, a, button, span");
  let tinyType = 0;
  textNodes.forEach((el) => {
    if (!isVisible(el)) return;
    if (!el.textContent?.trim()) return;
    const size = Number.parseFloat(window.getComputedStyle(el).fontSize);
    if (Number.isFinite(size) && size > 0 && size < 11) tinyType += 1;
  });
  if (tinyType >= 3) {
    issues.push({
      id: "unreadable-type",
      severity: "info",
      sectionName: "Typography",
      breakpoint,
      explanation: "Several text nodes render below 11px and may be hard to read.",
      fixHint: "Increase theme type size or shorten labels that are being scaled down.",
    });
  }

  return issues;
}

/** Test helper — same overflow rule without requiring a live layout. */
export function hasHorizontalOverflow(
  scrollWidth: number,
  clientWidth: number
): boolean {
  return scrollWidth > clientWidth + OVERFLOW_SLACK;
}
