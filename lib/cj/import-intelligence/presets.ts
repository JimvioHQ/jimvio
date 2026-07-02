import type { IntelligenceFilters } from "./types";
import { DEFAULT_INTELLIGENCE_FILTERS } from "./filters";

export interface SourcingPreset {
  id: string;
  label: string;
  emoji: string;
  filters: Partial<IntelligenceFilters>;
  builtIn?: boolean;
}

const PRESETS_STORAGE = "jimvio:cj-custom-presets";
const ACTIVE_PRESETS_STORAGE = "jimvio:cj-active-presets";

export const BUILT_IN_PRESETS: SourcingPreset[] = [
  {
    id: "rwanda-winners",
    label: "Rwanda Winners",
    emoji: "🔥",
    builtIn: true,
    filters: {
      highProfitMargin: true,
      fastShipping: true,
      verifiedSupplier: true,
      minHealthScore: 75,
    },
  },
  {
    id: "usa-winners",
    label: "USA Winners",
    emoji: "🔥",
    builtIn: true,
    filters: {
      usWarehouse: true,
      highProfitMargin: true,
      fastShipping: true,
      minHealthScore: 70,
    },
  },
  {
    id: "tiktok-viral",
    label: "TikTok Viral",
    emoji: "🔥",
    builtIn: true,
    filters: {
      hasVideo: true,
      trending: true,
      highProfitMargin: true,
    },
  },
  {
    id: "high-margin",
    label: "High Margin",
    emoji: "🔥",
    builtIn: true,
    filters: {
      highProfitMargin: true,
      minProfitPercent: 45,
      minRoi: 80,
    },
  },
  {
    id: "fast-shipping",
    label: "Fast Shipping",
    emoji: "🔥",
    builtIn: true,
    filters: {
      fastShipping: true,
      maxDeliveryDays: 7,
      usWarehouse: true,
    },
  },
  {
    id: "video-products",
    label: "Video Products",
    emoji: "🔥",
    builtIn: true,
    filters: {
      hasVideo: true,
      highQualityImages: true,
    },
  },
  {
    id: "low-competition",
    label: "Low Competition",
    emoji: "🔥",
    builtIn: true,
    filters: {
      minReviewCount: 0,
      trending: false,
      minHealthScore: 65,
    },
  },
];

export function loadCustomPresets(): SourcingPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE);
    return raw ? (JSON.parse(raw) as SourcingPreset[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomPreset(preset: SourcingPreset): void {
  const custom = loadCustomPresets().filter((p) => p.id !== preset.id);
  custom.push({ ...preset, builtIn: false });
  localStorage.setItem(PRESETS_STORAGE, JSON.stringify(custom));
}

export function loadActivePresetIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ACTIVE_PRESETS_STORAGE);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveActivePresetIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_PRESETS_STORAGE, JSON.stringify(ids));
}

export function getAllPresets(): SourcingPreset[] {
  return [...BUILT_IN_PRESETS, ...loadCustomPresets()];
}

export function applyPresets(
  activeIds: string[],
  base: IntelligenceFilters = DEFAULT_INTELLIGENCE_FILTERS
): IntelligenceFilters {
  if (activeIds.length === 0) return { ...base };

  const presets = getAllPresets().filter((p) => activeIds.includes(p.id));
  const merged = { ...DEFAULT_INTELLIGENCE_FILTERS };

  for (const preset of presets) {
    Object.assign(merged, preset.filters);
  }

  return merged;
}

export function togglePreset(
  presetId: string,
  activeIds: string[]
): { activeIds: string[]; filters: IntelligenceFilters } {
  const next = activeIds.includes(presetId)
    ? activeIds.filter((id) => id !== presetId)
    : [...activeIds, presetId];
  saveActivePresetIds(next);
  return { activeIds: next, filters: applyPresets(next) };
}
