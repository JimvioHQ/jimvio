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
  logo?: string | null;
  headerNavCount?: number;
  pages?: Array<{ handle: string; published?: boolean }>;
  seo?: Record<string, unknown>;
  products?: Array<{ images?: unknown }>;
}): ResponsiveHint[] {
  const hints: ResponsiveHint[] = [];
  const { settings, sections } = input;

  if (!input.logo && !settings.logoUrl) {
    hints.push({
      id: "missing-logo",
      severity: "info",
      breakpoint: "all",
      message: "No store logo configured.",
      suggestion: "Upload a logo in Media/Settings so the header uses merchant branding.",
    });
  }

  if (!settings.faviconUrl) {
    hints.push({
      id: "missing-favicon",
      severity: "info",
      breakpoint: "all",
      message: "No favicon configured.",
      suggestion: "Add a favicon for browser tabs and bookmarks.",
    });
  }

  if ((input.headerNavCount ?? 0) === 0) {
    hints.push({
      id: "missing-nav",
      severity: "warn",
      breakpoint: "all",
      message: "Header navigation is empty.",
      suggestion: "Add menu links under Navigation.",
    });
  }

  const hasFooter = sections.some((s) => s.type === "footer" && s.enabled);
  if (!hasFooter) {
    hints.push({
      id: "missing-footer",
      severity: "warn",
      breakpoint: "all",
      message: "Footer section is disabled or missing.",
      suggestion: "Enable the footer section for store policies and links.",
    });
  }

  const legalHandles = ["privacy", "terms", "refund-policy", "shipping-policy"];
  const pageHandles = new Set((input.pages || []).map((p) => p.handle));
  for (const h of legalHandles) {
    if (!pageHandles.has(h)) {
      hints.push({
        id: `missing-page-${h}`,
        severity: "info",
        breakpoint: "all",
        message: `Missing legal page: ${h}.`,
        suggestion: "Create it from Policies templates (templates are not legal advice).",
      });
    }
  }

  const seoTitle =
    typeof input.seo?.title === "string" ? input.seo.title.trim() : "";
  const seoDesc =
    typeof input.seo?.description === "string"
      ? input.seo.description.trim()
      : "";
  if (!seoTitle) {
    hints.push({
      id: "missing-seo-title",
      severity: "warn",
      breakpoint: "all",
      message: "SEO title is empty.",
      suggestion: "Add a store SEO title for search and social previews.",
    });
  }
  if (!seoDesc) {
    hints.push({
      id: "missing-seo-description",
      severity: "info",
      breakpoint: "all",
      message: "SEO description is empty.",
      suggestion: "Add a meta description under SEO.",
    });
  }

  const products = input.products || [];
  if (products.length && products.every((p) => !p.images || (Array.isArray(p.images) && !p.images.length))) {
    hints.push({
      id: "missing-product-images",
      severity: "warn",
      breakpoint: "all",
      message: "Published products are missing images.",
      suggestion: "Add product images in the catalog for better merchandising.",
    });
  }

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
