/**
 * Props-based responsive / design QA hints for the builder.
 * No DOM measurement — deterministic suggestions from theme + sections.
 */

import { contrastWarning, type ThemeSection, type ThemeSettings } from "../themes/registry";
import { resolveVideoEmbedUrl } from "../storefront/video-embed";

export type ResponsiveHint = {
  id: string;
  severity: "info" | "warn";
  breakpoint: "all" | "mobile" | "tablet" | "desktop";
  sectionId?: string;
  sectionType?: string;
  message: string;
  suggestion: string;
  fix?: {
    sectionId: string;
    propsPatch?: Record<string, unknown>;
    settingsPatch?: Partial<ThemeSettings>;
  };
};

export function detectBuilderHints(input: {
  settings: ThemeSettings;
  sections: ThemeSection[];
}): ResponsiveHint[] {
  const hints: ResponsiveHint[] = [];
  const { settings, sections } = input;

  const contrast = contrastWarning(settings.backgroundColor, settings.textColor);
  if (contrast) {
    hints.push({
      id: "contrast-bg-text",
      severity: "warn",
      breakpoint: "all",
      message: contrast,
      suggestion: "Increase contrast between background and text colors.",
    });
  }

  const btnContrast = contrastWarning(
    settings.buttonColor || settings.primaryColor,
    settings.buttonTextColor || "#FFFFFF"
  );
  if (btnContrast) {
    hints.push({
      id: "contrast-button",
      severity: "warn",
      breakpoint: "all",
      message: "Button colors may be hard to read.",
      suggestion: "Adjust button background or button text color.",
    });
  }

  if ((settings.productGridColumns || 3) > 3) {
    hints.push({
      id: "grid-cols-mobile",
      severity: "info",
      breakpoint: "mobile",
      message: "Product grid uses 4 columns on desktop.",
      suggestion: "Mobile automatically collapses to 1–2 columns.",
    });
  }

  for (const section of sections) {
    if (!section.enabled) continue;
    const props = section.props || {};

    if (section.type === "announcement") {
      const text = typeof props.text === "string" ? props.text : "";
      if (text.length > 90) {
        hints.push({
          id: `announce-long-${section.id}`,
          severity: "warn",
          breakpoint: "mobile",
          sectionId: section.id,
          sectionType: section.type,
          message: "Announcement text is long and may wrap heavily on mobile.",
          suggestion: "Shorten to under ~80 characters.",
          fix: {
            sectionId: section.id,
            propsPatch: { text: text.slice(0, 80).trim() },
          },
        });
      }
    }

    if (section.type === "hero") {
      const headline = typeof props.headline === "string" ? props.headline : "";
      if (headline.length > 72) {
        hints.push({
          id: `hero-headline-${section.id}`,
          severity: "warn",
          breakpoint: "mobile",
          sectionId: section.id,
          sectionType: section.type,
          message: "Hero heading may overflow on small screens.",
          suggestion: "Shorten the headline for clearer mobile hierarchy.",
          fix: {
            sectionId: section.id,
            propsPatch: { headline: headline.slice(0, 64).trim() },
          },
        });
      }
      if (props.layout === "split" && !props.imageUrl) {
        hints.push({
          id: `hero-split-${section.id}`,
          severity: "info",
          breakpoint: "desktop",
          sectionId: section.id,
          sectionType: section.type,
          message: "Split hero works best with an image.",
          suggestion: "Upload a hero image or switch layout to left/center.",
        });
      }
      if (props.hideOnMobile === true) {
        hints.push({
          id: `hero-hide-m-${section.id}`,
          severity: "info",
          breakpoint: "mobile",
          sectionId: section.id,
          sectionType: section.type,
          message: "Hero is hidden on mobile.",
          suggestion: "Confirm this is intentional for your storefront.",
        });
      }
    }

    if (section.type === "video") {
      const url = typeof props.url === "string" ? props.url : "";
      const resolved = resolveVideoEmbedUrl(url);
      if (!resolved.ok) {
        hints.push({
          id: `video-${section.id}`,
          severity: "warn",
          breakpoint: "all",
          sectionId: section.id,
          sectionType: section.type,
          message: resolved.error,
          suggestion: "Paste a YouTube or Vimeo https link.",
        });
      }
    }

    const limit = Number(props.limit);
    if (
      ["featured_products", "best_sellers", "new_arrivals", "collections"].includes(
        section.type
      ) &&
      Number.isFinite(limit) &&
      limit > 12
    ) {
      hints.push({
        id: `products-limit-${section.id}`,
        severity: "info",
        breakpoint: "mobile",
        sectionId: section.id,
        sectionType: section.type,
        message: "Large product grids can feel long on mobile.",
        suggestion: "Consider limiting to 6–8 products on homepage sections.",
        fix: {
          sectionId: section.id,
          propsPatch: { limit: 8 },
        },
      });
    }
  }

  return hints;
}
