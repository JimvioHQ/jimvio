import type { ImportSettings } from "./types";
import { DEFAULT_AUTO_PUBLISH_RULES } from "./publish-rules";

const STORAGE_KEY = "jimvio:cj-import-settings";

export const DEFAULT_IMPORT_SETTINGS: ImportSettings = {
  autoPublish: false,
  importVideos: true,
  importDescriptionImages: true,
  importHtmlDescription: true,
  importVariants: true,
  importSpecifications: true,
  importReviews: false,
  importSeoMetadata: true,
  uploadImagesToCloudinary: true,
  uploadVideosToCloudinary: true,
  defaultImportMode: "draft",
  publishVisibility: "public",
  autoPublishRules: DEFAULT_AUTO_PUBLISH_RULES,
};

export function loadImportSettings(): ImportSettings {
  if (typeof window === "undefined") return DEFAULT_IMPORT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_IMPORT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_IMPORT_SETTINGS,
      ...parsed,
      autoPublishRules: {
        ...DEFAULT_AUTO_PUBLISH_RULES,
        ...parsed.autoPublishRules,
      },
    };
  } catch {
    return DEFAULT_IMPORT_SETTINGS;
  }
}

export function saveImportSettings(settings: ImportSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore quota errors
  }
}
