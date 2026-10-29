import { accessPricingFromRow } from "@/lib/community/access-pricing";
/**
 * Map communities row ↔ Owner Settings model.
 */

import { readCommunityEditorialOrigin } from "@/lib/community/editorial-origin";
import { defaultSettingsConfig } from "./constants";
import type {
  CommunitySettingsConfig,
  OwnerCommunitySettings,
  VisibilityMode,
} from "./types";

export type CommunitySettingsRow = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  long_description: string | null;
  category: string | null;
  language: string | null;
  timezone: string | null;
  region: string | null;
  avatar_url: string | null;
  cover_image: string | null;
  banner_url: string | null;
  accent_color: string | null;
  visibility_mode: string | null;
  is_private: boolean | null;
  is_featured: boolean | null;
  is_active: boolean | null;
  is_free: boolean | null;
  currency: string | null;
  monthly_price: number | null;
  yearly_price: number | null;
  lifetime_price: number | null;
  weekly_price?: number | null;
  quarterly_price?: number | null;
  compare_at_price?: number | null;
  billing_type?: string | null;
  billing_interval?: string | null;
  affiliate_commission_rate?: number | null;
  trial_days: number | null;
  tags: string[] | null;
  settings: unknown;
  archived_at: string | null;
  updated_at: string | null;
  created_at?: string | null;
};

export const COMMUNITY_SETTINGS_SELECT = [
  "id",
  "name",
  "slug",
  "tagline",
  "description",
  "long_description",
  "category",
  "language",
  "timezone",
  "region",
  "avatar_url",
  "cover_image",
  "banner_url",
  "accent_color",
  "visibility_mode",
  "is_private",
  "is_featured",
  "is_active",
  "is_free",
  "currency",
  "monthly_price",
  "yearly_price",
  "lifetime_price",
  "weekly_price",
  "quarterly_price",
  "compare_at_price",
  "billing_type",
  "billing_interval",
  "affiliate_commission_rate",
  "trial_days",
  "tags",
  "settings",
  "archived_at",
  "updated_at",
  "created_at",
].join(", ");

function isObject(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function mergeSection<T extends Record<string, unknown>>(
  base: T,
  patch: unknown
): T {
  if (!isObject(patch)) return base;
  return { ...base, ...patch } as T;
}

export function mergeSettingsConfig(
  raw: unknown,
  overrides?: Partial<{
    [K in keyof CommunitySettingsConfig]: Partial<CommunitySettingsConfig[K]>;
  }>
): CommunitySettingsConfig {
  const defaults = defaultSettingsConfig();
  const src = isObject(raw) ? raw : {};
  const merged: CommunitySettingsConfig = {
    branding: mergeSection(defaults.branding, src.branding),
    privacy: mergeSection(defaults.privacy, src.privacy),
    discovery: mergeSection(defaults.discovery, src.discovery),
    onboarding: mergeSection(defaults.onboarding, src.onboarding),
    groupDefaults: mergeSection(defaults.groupDefaults, src.groupDefaults),
    channelDefaults: mergeSection(
      defaults.channelDefaults,
      src.channelDefaults
    ),
    notifications: mergeSection(defaults.notifications, src.notifications),
    live: mergeSection(defaults.live, src.live),
    commerce: mergeSection(defaults.commerce, src.commerce),
    ai: mergeSection(defaults.ai, src.ai),
    integrations: mergeSection(defaults.integrations, src.integrations),
    security: mergeSection(defaults.security, src.security),
  };

  if (overrides) {
    for (const key of Object.keys(overrides) as (keyof CommunitySettingsConfig)[]) {
      const patch = overrides[key];
      if (patch) {
        merged[key] = { ...merged[key], ...patch } as never;
      }
    }
  }

  return merged;
}

export function asCommunitySettingsRow(row: unknown): CommunitySettingsRow {
  return row as CommunitySettingsRow;
}

export function mapCommunitySettings(
  row: CommunitySettingsRow
): OwnerCommunitySettings {
  const config = mergeSettingsConfig(row.settings);
  const visibility = (row.visibility_mode ||
    (row.is_private ? "private" : "public")) as VisibilityMode;

  // Keep discovery.featured / privacy.visibility in sync with columns
  config.discovery.featured = Boolean(row.is_featured);
  config.privacy.visibility = visibility;
  if (row.accent_color) config.branding.accentColor = row.accent_color;
  if (row.banner_url) config.branding.bannerUrl = row.banner_url;
  if (Array.isArray(row.tags) && row.tags.length) {
    config.discovery.tags = row.tags;
  }
  if (row.currency) config.commerce.currency = row.currency;

  return {
    communityId: row.id,
    name: row.name,
    slug: row.slug,
    tagline: row.tagline,
    description: row.description,
    longDescription: row.long_description,
    category: row.category,
    language: row.language ?? "en",
    timezone: row.timezone ?? "UTC",
    region: row.region,
    avatarUrl: row.avatar_url,
    coverImage: row.cover_image,
    bannerUrl: row.banner_url,
    accentColor: row.accent_color ?? config.branding.accentColor,
    visibilityMode: visibility,
    isPrivate: Boolean(row.is_private),
    isFeatured: Boolean(row.is_featured),
    isActive: row.is_active !== false,
    isFree: row.is_free !== false,
    currency: row.currency,
    monthlyPrice: row.monthly_price,
    yearlyPrice: row.yearly_price,
    lifetimePrice: row.lifetime_price,
    accessPricing: accessPricingFromRow(row),
    trialDays: row.trial_days,
    tags: Array.isArray(row.tags) ? row.tags : [],
    archivedAt: row.archived_at,
    config,
    updatedAt: row.updated_at,
    createdAt: row.created_at ?? null,
    editorialOrigin: readCommunityEditorialOrigin(row.settings),
  };
}
