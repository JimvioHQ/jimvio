import type { UGCCampaign, UGCCampaignMedia } from "@/types/ugc";
import { countryDisplayName, normalizeCountryCode } from "@/lib/geo/buyer-country";

export const CONTENT_FORMATS = ["vertical_video", "horizontal_video", "image", "other"] as const;
export type ContentFormat = (typeof CONTENT_FORMATS)[number];

export const CAMPAIGN_PLATFORM_OPTIONS = ["tiktok", "instagram", "youtube", "facebook"] as const;
export type CampaignPlatformOption = (typeof CAMPAIGN_PLATFORM_OPTIONS)[number];

const VIDEO_FORMATS = new Set<ContentFormat>(["vertical_video", "horizontal_video"]);

export type BriefLink = {
  id: string;
  title: string;
  url: string;
  note: string;
  kind: "video" | "image" | "file" | "link";
  fileType: string;
};

export type CountryPolicy = {
  /** No country list was saved. Existing campaigns stay open everywhere. */
  mode: "all" | "restricted";
  codes: string[];
  /** Free-text values that could not be mapped to an ISO code. */
  legacyLabels: string[];
};

export type CountryDecision = "allowed" | "blocked" | "unknown";

export type CampaignBrief = {
  contentFormat: ContentFormat | null;
  deliverableCount: number | null;
  deliverableLabel: string;
  keyRequirements: string[];
  productVisibility: string;
  captionNotes: string;
  language: string;
  restrictions: string;
  submissionInstructions: string;
  references: BriefLink[];
  resources: BriefLink[];
  assets: BriefLink[];
};

export function contentFormatNeedsDuration(format: string | null | undefined): boolean {
  if (!format) return true;
  return VIDEO_FORMATS.has(format as ContentFormat);
}

export function contentFormatLabel(format: ContentFormat | null): string | null {
  switch (format) {
    case "vertical_video":
      return "Vertical video (9:16)";
    case "horizontal_video":
      return "Horizontal video (16:9)";
    case "image":
      return "Image / photo";
    case "other":
      return "Other";
    default:
      return null;
  }
}

export function isSafeHttpUrl(raw: string): boolean {
  return safeHttpUrl(raw) != null;
}

export function safeHttpUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 2000) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  if (!parsed.hostname || parsed.username || parsed.password) return null;
  return parsed.toString();
}

function supportedRegionCodes(): string[] {
  try {
    // TypeScript's Intl key union in this repo omits "region". Some engines reject it too.
    const list = Intl.supportedValuesOf as (key: string) => string[];
    const regions = list("region");
    if (regions.length > 0) return regions;
  } catch {
    // Fall through to the ISO alpha-2 scan below.
  }
  const codes: string[] = [];
  for (let first = 65; first <= 90; first++) {
    for (let second = 65; second <= 90; second++) {
      codes.push(String.fromCharCode(first, second));
    }
  }
  return codes;
}

export function listIsoCountries(locale = "en"): { code: string; name: string }[] {
  const names = new Intl.DisplayNames([locale], { type: "region" });
  const regions = supportedRegionCodes();
  const rows: { code: string; name: string }[] = [];
  for (const code of regions) {
    if (!/^[A-Za-z]{2}$/.test(code)) continue;
    const upper = code.toUpperCase();
    const name = names.of(upper);
    if (!name || name.toUpperCase() === upper) continue;
    rows.push({ code: upper, name });
  }
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}

export function flagEmoji(code: string): string {
  const upper = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return "";
  return String.fromCodePoint(...[...upper].map((char) => 127397 + char.charCodeAt(0)));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown, max = 500): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function asLines(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => asString(item, 240)).filter(Boolean).slice(0, 20);
  }
  return asString(value, 2000)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function linkKind(url: string, hinted?: string): BriefLink["kind"] {
  if (hinted === "video" || hinted === "image" || hinted === "file" || hinted === "link") return hinted;
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return "video";
  if (/\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(url)) return "image";
  if (/\.(pdf|docx?|pptx?|zip|txt)(\?|$)/i.test(url)) return "file";
  return "link";
}

function readLinks(value: unknown): BriefLink[] {
  if (!Array.isArray(value)) return [];
  const links: BriefLink[] = [];
  for (const item of value) {
    const row = asRecord(item);
    if (!row) continue;
    const url = safeHttpUrl(asString(row.url, 2000));
    if (!url) continue;
    const title = asString(row.title, 120) || "Untitled";
    links.push({
      id: asString(row.id, 80) || `${links.length + 1}`,
      title,
      url,
      note: asString(row.note, 280),
      kind: linkKind(url, asString(row.kind, 20)),
      fileType: asString(row.fileType, 40),
    });
    if (links.length >= 24) break;
  }
  return links;
}

function uniqueCodes(values: unknown[]): { codes: string[]; legacyLabels: string[] } {
  const codes: string[] = [];
  const legacyLabels: string[] = [];
  for (const value of values) {
    const raw = asString(value, 80);
    if (!raw) continue;
    const code = normalizeCountryCode(raw);
    if (code) {
      if (!codes.includes(code)) codes.push(code);
    } else if (!legacyLabels.some((label) => label.toLowerCase() === raw.toLowerCase())) {
      legacyLabels.push(raw);
    }
  }
  return { codes, legacyLabels };
}

export function countryPolicyFromJoinConfig(joinConfig: unknown): CountryPolicy {
  const config = asRecord(joinConfig);
  const brief = asRecord(config?.brief);
  const explicitAll = brief?.allCountries;
  const fromBrief = Array.isArray(brief?.countryCodes) ? brief.countryCodes : [];
  const fromLegacy = Array.isArray(config?.countries) ? config.countries : [];
  const parsed = uniqueCodes([...fromBrief, ...fromLegacy]);

  if (explicitAll === true) return { mode: "all", codes: [], legacyLabels: [] };
  if ((parsed.codes.length > 0 || parsed.legacyLabels.length > 0) && explicitAll !== true) {
    return { mode: "restricted", codes: parsed.codes, legacyLabels: parsed.legacyLabels };
  }
  return { mode: "all", codes: [], legacyLabels: [] };
}

export function creatorCountryDecision(
  policy: CountryPolicy,
  profileCountry: string | null | undefined,
): CountryDecision {
  if (policy.mode === "all") return "allowed";
  const raw = profileCountry?.trim() ?? "";
  if (!raw) return "unknown";
  const code = normalizeCountryCode(raw);
  if (code && policy.codes.includes(code)) return "allowed";
  if (policy.legacyLabels.some((label) => label.toLowerCase() === raw.toLowerCase())) return "allowed";
  if (code && policy.legacyLabels.some((label) => normalizeCountryCode(label) === code)) return "allowed";
  if (!code) return "unknown";
  return "blocked";
}

export function countryChipLabel(codeOrLabel: string, locale = "en"): string {
  const code = normalizeCountryCode(codeOrLabel);
  if (!code) return codeOrLabel;
  return countryDisplayName(code, locale);
}

function readFormat(value: unknown): ContentFormat | null {
  return CONTENT_FORMATS.includes(value as ContentFormat) ? (value as ContentFormat) : null;
}

export function readCampaignBrief(campaign: Pick<UGCCampaign, "join_config" | "media"> & Partial<UGCCampaign>): CampaignBrief {
  const config = asRecord(campaign.join_config);
  const brief = asRecord(config?.brief);
  const references = readLinks(brief?.references);
  const resources = readLinks(brief?.resources);
  const assets = readLinks(brief?.assets);
  const referenceUrls = new Set(references.map((item) => item.url));
  const resourceUrls = new Set(resources.map((item) => item.url));
  const assetUrls = new Set(assets.map((item) => item.url));

  for (const media of campaign.media ?? []) {
    const url = safeHttpUrl(media.url);
    if (!url) continue;
    if (media.usage === "example" && !referenceUrls.has(url) && !resourceUrls.has(url)) {
      references.push({
        id: media.id,
        title: "Example",
        url,
        note: "",
        kind: media.type === "video" ? "video" : media.type === "image" ? "image" : "file",
        fileType: media.type,
      });
      referenceUrls.add(url);
    }
    if (media.usage === "ad_creative" && !assetUrls.has(url)) {
      assets.push({
        id: media.id,
        title: media.type === "video" ? "Video asset" : "Brand asset",
        url,
        note: "",
        kind: media.type === "video" ? "video" : media.type === "image" ? "image" : "file",
        fileType: media.type.toUpperCase(),
      });
      assetUrls.add(url);
    }
  }

  const countRaw = brief?.deliverableCount;
  const deliverableCount =
    typeof countRaw === "number" && Number.isFinite(countRaw) && countRaw > 0
      ? Math.min(99, Math.floor(countRaw))
      : null;

  return {
    contentFormat: readFormat(brief?.contentFormat),
    deliverableCount,
    deliverableLabel: asString(brief?.deliverableLabel, 160),
    keyRequirements: asLines(brief?.keyRequirements),
    productVisibility: asString(brief?.productVisibility, 400),
    captionNotes: asString(brief?.captionNotes, 400),
    language: asString(brief?.language ?? (Array.isArray(config?.languages) ? (config.languages as unknown[]).join(", ") : ""), 80),
    restrictions: asString(brief?.restrictions, 800),
    submissionInstructions: asString(brief?.submissionInstructions, 800),
    references,
    resources,
    assets,
  };
}

export type BriefDraftInput = {
  contentFormat?: string | null;
  deliverableCount?: number | null;
  deliverableLabel?: string | null;
  keyRequirements?: string[] | string | null;
  productVisibility?: string | null;
  captionNotes?: string | null;
  language?: string | null;
  restrictions?: string | null;
  submissionInstructions?: string | null;
  allCountries?: boolean | null;
  countryCodes?: string[] | null;
  references?: unknown;
  resources?: unknown;
  assets?: unknown;
};

/** Keeps non-brief join settings and replaces the brief with validated values. */
export function mergeJoinConfigBrief(
  existing: unknown,
  draft: BriefDraftInput,
  legacyCountries?: string[] | null,
): Record<string, unknown> {
  const base = { ...(asRecord(existing) ?? {}) };
  const allCountries = draft.allCountries === true;
  const parsed = uniqueCodes([
    ...(Array.isArray(draft.countryCodes) ? draft.countryCodes : []),
    ...(allCountries ? [] : legacyCountries ?? []),
  ]);
  const countryCodes = allCountries ? [] : parsed.codes;
  base.countries = allCountries ? [] : [...countryCodes, ...parsed.legacyLabels];
  if (draft.language?.trim()) base.languages = [draft.language.trim().slice(0, 80)];
  base.brief = {
    contentFormat: readFormat(draft.contentFormat),
    deliverableCount:
      typeof draft.deliverableCount === "number" && draft.deliverableCount > 0
        ? Math.min(99, Math.floor(draft.deliverableCount))
        : null,
    deliverableLabel: asString(draft.deliverableLabel, 160),
    keyRequirements: asLines(draft.keyRequirements),
    productVisibility: asString(draft.productVisibility, 400),
    captionNotes: asString(draft.captionNotes, 400),
    language: asString(draft.language, 80),
    restrictions: asString(draft.restrictions, 800),
    submissionInstructions: asString(draft.submissionInstructions, 800),
    allCountries,
    countryCodes,
    references: readLinks(draft.references),
    resources: readLinks(draft.resources),
    assets: readLinks(draft.assets),
  };
  return base;
}

/** Re-validates a client join_config. Empty country selections stay open instead of blocking everyone. */
export function sanitizeStoredJoinConfig(input: unknown): Record<string, unknown> {
  const raw = asRecord(input) ?? {};
  const brief = asRecord(raw.brief);
  const countryCodes = Array.isArray(brief?.countryCodes)
    ? (brief.countryCodes as unknown[])
    : Array.isArray(raw.countries)
      ? (raw.countries as unknown[])
      : [];
  return mergeJoinConfigBrief(raw, {
    contentFormat: typeof brief?.contentFormat === "string" ? brief.contentFormat : null,
    deliverableCount: typeof brief?.deliverableCount === "number" ? brief.deliverableCount : null,
    deliverableLabel: typeof brief?.deliverableLabel === "string" ? brief.deliverableLabel : "",
    keyRequirements: (brief?.keyRequirements as string[] | string | undefined) ?? [],
    productVisibility: typeof brief?.productVisibility === "string" ? brief.productVisibility : "",
    captionNotes: typeof brief?.captionNotes === "string" ? brief.captionNotes : "",
    language: typeof brief?.language === "string" ? brief.language : "",
    restrictions: typeof brief?.restrictions === "string" ? brief.restrictions : "",
    submissionInstructions:
      typeof brief?.submissionInstructions === "string" ? brief.submissionInstructions : "",
    allCountries: brief?.allCountries === true || countryCodes.length === 0,
    countryCodes: countryCodes.filter((item): item is string => typeof item === "string"),
    references: brief?.references,
    resources: brief?.resources,
    assets: brief?.assets,
  });
}

export type StoredMedia = {
  type: "image" | "video" | "file";
  url: string;
  usage: "banner" | "example" | "ad_creative";
  thumbnail_url: string | null;
};

export function sanitizeCampaignMedia(input: unknown): StoredMedia[] {
  if (!Array.isArray(input)) return [];
  const rows: StoredMedia[] = [];
  const seen = new Set<string>();
  for (const item of input) {
    const row = asRecord(item);
    if (!row) continue;
    const url = safeHttpUrl(asString(row.url, 2000));
    const usage = row.usage === "banner" || row.usage === "ad_creative" ? row.usage : row.usage === "example" ? "example" : null;
    if (!url || !usage) continue;
    const type: StoredMedia["type"] =
      row.type === "video" || row.type === "file" ? row.type : "image";
    const key = `${usage}:${url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      type,
      url,
      usage,
      thumbnail_url: safeHttpUrl(asString(row.thumbnail_url, 2000)),
    });
    if (rows.length >= 30) break;
  }
  return rows;
}

export function displayPlatforms(platforms: string[] | null | undefined): string[] {
  const hidden = new Set(["x", "twitter"]);
  const out: string[] = [];
  for (const platform of platforms ?? []) {
    const key = platform.toLowerCase();
    if (hidden.has(key) || out.includes(key)) continue;
    out.push(key);
  }
  return out;
}

export function platformLabel(platform: string): string {
  const labels: Record<string, string> = {
    tiktok: "TikTok",
    instagram: "Instagram",
    youtube: "YouTube",
    facebook: "Facebook",
  };
  return labels[platform.toLowerCase()] ?? platform;
}

export function fileTypeLabel(link: BriefLink): string {
  if (link.fileType) return link.fileType.toUpperCase();
  if (link.kind === "video") return "VIDEO";
  if (link.kind === "image") return "IMAGE";
  if (/\.pdf(\?|$)/i.test(link.url)) return "PDF";
  if (link.kind === "file") return "FILE";
  return "LINK";
}

export function budgetRemaining(campaign: Pick<UGCCampaign, "total_budget" | "spent_budget">): {
  known: boolean;
  remaining: number | null;
  spent: number | null;
  total: number | null;
} {
  const total = Number(campaign.total_budget);
  const spent = Number(campaign.spent_budget);
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(spent) || spent < 0) {
    return { known: false, remaining: null, spent: null, total: Number.isFinite(total) ? total : null };
  }
  return { known: true, remaining: Math.max(0, total - spent), spent, total };
}

export function mediaFromBrief(banner: StoredMedia[], brief: CampaignBrief): StoredMedia[] {
  const rows = [...banner];
  const push = (link: BriefLink, usage: StoredMedia["usage"]) => {
    rows.push({
      type: link.kind === "video" ? "video" : link.kind === "image" ? "image" : "file",
      url: link.url,
      usage,
      thumbnail_url: null,
    });
  };
  brief.references.forEach((link) => push(link, "example"));
  brief.assets.forEach((link) => push(link, "ad_creative"));
  brief.resources.forEach((link) => push(link, "example"));
  return sanitizeCampaignMedia(rows);
}

export function isDirectMedia(link: BriefLink): boolean {
  return link.kind === "image" || link.kind === "video";
}

export type { UGCCampaignMedia };
