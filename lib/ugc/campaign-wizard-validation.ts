/**
 * Single source of truth for UGC Create Campaign wizard step completion.
 *
 * A step is complete only when its required fields are valid.
 * Visited / autosaved / draft-id does not imply complete.
 *
 * Required vs optional follows the existing wizard UI + existing client/API
 * checks (not invented):
 *   Type         — campaign_type (always selected; default "ugc")
 *   Basics       — title (UI required). description optional
 *   Rewards      — total_budget (UI required) + rate/fixed (existing validateStep)
 *   Targeting    — at least one platform (existing validateStep). geo/limit optional
 *   Requirements — video campaigns require min/max duration with min <= max.
 *                  Image campaigns do not. Other brief fields are optional.
 *   Assets       — all optional (empty is valid)
 *   Review       — complete only when every prior step is complete
 */

import { contentFormatNeedsDuration, type ContentFormat } from "@/lib/ugc/campaign-brief";

export const CAMPAIGN_WIZARD_STEPS = [
  { id: "type", index: 0, label: "Type" },
  { id: "basics", index: 1, label: "Basics" },
  { id: "rewards", index: 2, label: "Rewards" },
  { id: "targeting", index: 3, label: "Targeting" },
  { id: "requirements", index: 4, label: "Requirements" },
  { id: "assets", index: 5, label: "Assets" },
  { id: "review", index: 6, label: "Review" },
] as const;

export type CampaignWizardStepId = (typeof CAMPAIGN_WIZARD_STEPS)[number]["id"];

export const CAMPAIGN_TYPES = ["ugc", "clipping", "music_clipping", "promotion"] as const;
export const CAMPAIGN_PLATFORMS = ["tiktok", "instagram", "youtube", "facebook"] as const;

export type CampaignWizardDraft = {
  title?: string | null;
  description?: string | null;
  campaign_type?: string | null;
  payment_model?: string | null;
  rate_per_1k_views?: number | null;
  fixed_rate?: number | null;
  total_budget?: number | null;
  max_payout_per_sub?: number | null;
  allowed_platforms?: string[] | null;
  min_duration?: number | null;
  max_duration?: number | null;
  required_hashtags?: string[] | null;
  required_mentions?: string[] | null;
  required_keywords?: string[] | null;
  requires_face?: boolean | null;
  media?: unknown[] | null;
  creator_limit?: number | null;
  content_format?: string | null;
  all_countries?: boolean | null;
  country_codes?: string[] | null;
};

export type CampaignWizardFieldError = {
  field: string;
  message: string;
  step?: CampaignWizardStepId;
};

export type CampaignWizardStepResult = {
  success: boolean;
  errors: CampaignWizardFieldError[];
};

function filled(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

/** Rejects "", NaN, Infinity, booleans, and non-numeric strings. Accepts numeric strings from JSON/DB. */
export function coerceFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function positive(value: unknown): boolean {
  const n = coerceFiniteNumber(value);
  return n != null && n > 0;
}

export function toCampaignWizardDraft(row: Record<string, unknown> | null | undefined): CampaignWizardDraft {
  if (!row) return {};
  const platforms = row.allowed_platforms;
  return {
    title: typeof row.title === "string" ? row.title : row.title == null ? null : String(row.title),
    description: typeof row.description === "string" ? row.description : null,
    campaign_type: typeof row.campaign_type === "string" ? row.campaign_type : null,
    payment_model: typeof row.payment_model === "string" ? row.payment_model : null,
    rate_per_1k_views: coerceFiniteNumber(row.rate_per_1k_views),
    fixed_rate: coerceFiniteNumber(row.fixed_rate),
    total_budget: coerceFiniteNumber(row.total_budget),
    max_payout_per_sub: coerceFiniteNumber(row.max_payout_per_sub),
    allowed_platforms: Array.isArray(platforms) ? platforms.map(String) : null,
    min_duration: coerceFiniteNumber(row.min_duration),
    max_duration: coerceFiniteNumber(row.max_duration),
    required_hashtags: Array.isArray(row.required_hashtags) ? row.required_hashtags.map(String) : null,
    required_mentions: Array.isArray(row.required_mentions) ? row.required_mentions.map(String) : null,
    required_keywords: Array.isArray(row.required_keywords) ? row.required_keywords.map(String) : null,
    requires_face: typeof row.requires_face === "boolean" ? row.requires_face : null,
    media: Array.isArray(row.media) ? row.media : null,
    creator_limit: coerceFiniteNumber(row.creator_limit),
    content_format: contentFormatFromRow(row),
    all_countries: allCountriesFromRow(row),
    country_codes: countryCodesFromRow(row),
  };
}

function contentFormatFromRow(row: Record<string, unknown>): string | null {
  if (typeof row.content_format === "string") return row.content_format;
  const join = row.join_config;
  if (!join || typeof join !== "object" || Array.isArray(join)) return null;
  const brief = (join as { brief?: { contentFormat?: unknown } }).brief;
  return typeof brief?.contentFormat === "string" ? brief.contentFormat : null;
}

function joinBrief(row: Record<string, unknown>): { allCountries?: unknown; countryCodes?: unknown } | null {
  const join = row.join_config;
  if (!join || typeof join !== "object" || Array.isArray(join)) return null;
  const brief = (join as { brief?: { allCountries?: unknown; countryCodes?: unknown } }).brief;
  return brief ?? null;
}

function allCountriesFromRow(row: Record<string, unknown>): boolean | null {
  if (typeof row.all_countries === "boolean") return row.all_countries;
  const flag = joinBrief(row)?.allCountries;
  return typeof flag === "boolean" ? flag : null;
}

function countryCodesFromRow(row: Record<string, unknown>): string[] | null {
  if (Array.isArray(row.country_codes)) return row.country_codes.map(String);
  const codes = joinBrief(row)?.countryCodes;
  return Array.isArray(codes) ? codes.map(String) : null;
}

function ownStepErrors(step: CampaignWizardStepId, draft: CampaignWizardDraft): CampaignWizardFieldError[] {
  const errors: CampaignWizardFieldError[] = [];
  const tag = (field: string, message: string): CampaignWizardFieldError => ({ field, message, step });

  if (step === "type") {
    if (!CAMPAIGN_TYPES.includes(draft.campaign_type as (typeof CAMPAIGN_TYPES)[number])) {
      errors.push(tag("campaign_type", "Select a campaign type."));
    }
    return errors;
  }

  if (step === "basics") {
    if (!filled(draft.title)) {
      errors.push(tag("title", "Campaign title is required."));
    }
    return errors;
  }

  if (step === "rewards") {
    if (!positive(draft.total_budget)) {
      errors.push(tag("total_budget", "Budget must be greater than 0."));
    }
    const model = draft.payment_model === "fixed_per_content" ? "fixed_per_content" : "per_views";
    if (model === "per_views" && !positive(draft.rate_per_1k_views)) {
      errors.push(tag("rate_per_1k_views", "Rate per 1K views must be greater than 0."));
    }
    if (model === "fixed_per_content" && !positive(draft.fixed_rate)) {
      errors.push(tag("fixed_rate", "Fixed rate must be greater than 0."));
    }
    if (draft.max_payout_per_sub != null && draft.max_payout_per_sub !== undefined) {
      const maxPay = coerceFiniteNumber(draft.max_payout_per_sub);
      if (maxPay != null && maxPay < 0) {
        errors.push(tag("max_payout_per_sub", "Max payout cannot be negative."));
      }
    }
    return errors;
  }

  if (step === "targeting") {
    const platforms = Array.isArray(draft.allowed_platforms)
      ? draft.allowed_platforms.filter((p) => CAMPAIGN_PLATFORMS.includes(p as (typeof CAMPAIGN_PLATFORMS)[number]))
      : [];
    if (platforms.length === 0) {
      errors.push(tag("allowed_platforms", "Select at least one platform."));
    }
    if (draft.all_countries === false && (draft.country_codes ?? []).length === 0) {
      errors.push(tag("country_codes", "Select at least one country or choose all countries."));
    }
    return errors;
  }

  if (step === "requirements") {
    const format = draft.content_format as ContentFormat | null | undefined;
    if (contentFormatNeedsDuration(format)) {
      const min = coerceFiniteNumber(draft.min_duration);
      const max = coerceFiniteNumber(draft.max_duration);
      if (min == null || min <= 0) {
        errors.push(tag("min_duration", "Minimum duration is required."));
      }
      if (max == null || max <= 0) {
        errors.push(tag("max_duration", "Maximum duration is required."));
      }
      if (min != null && max != null && min > 0 && max > 0 && min > max) {
        errors.push(tag("max_duration", "Maximum duration must be greater than or equal to minimum duration."));
      }
    }
    return errors;
  }

  if (step === "assets") {
    return errors;
  }

  return errors;
}

export function validateCampaignStep(
  step: CampaignWizardStepId | number,
  draft: CampaignWizardDraft,
): CampaignWizardStepResult {
  const id =
    typeof step === "number"
      ? CAMPAIGN_WIZARD_STEPS[step]?.id
      : step;
  if (!id) return { success: false, errors: [{ field: "step", message: "Unknown wizard step" }] };

  if (id === "review") {
    const errors: CampaignWizardFieldError[] = [];
    for (const s of CAMPAIGN_WIZARD_STEPS) {
      if (s.id === "review") continue;
      errors.push(...ownStepErrors(s.id, draft));
    }
    return { success: errors.length === 0, errors };
  }

  const errors = ownStepErrors(id, draft);
  return { success: errors.length === 0, errors };
}

/**
 * Step is complete only when its own required fields are valid AND every
 * earlier step is complete. Optional-only steps (Assets) therefore cannot
 * show complete until prior required steps are valid.
 */
export function isCampaignStepComplete(
  draft: CampaignWizardDraft,
  step: CampaignWizardStepId | number,
): boolean {
  const index = typeof step === "number" ? step : CAMPAIGN_WIZARD_STEPS.find((s) => s.id === step)?.index;
  if (index == null || index < 0 || index >= CAMPAIGN_WIZARD_STEPS.length) return false;

  for (let i = 0; i <= index; i++) {
    const id = CAMPAIGN_WIZARD_STEPS[i].id;
    if (id === "review") {
      return validateCampaignStep("review", draft).success;
    }
    if (!validateCampaignStep(id, draft).success) return false;
  }
  return true;
}

export function firstIncompleteCampaignStep(draft: CampaignWizardDraft): number {
  for (const s of CAMPAIGN_WIZARD_STEPS) {
    if (s.id === "review") continue;
    if (!validateCampaignStep(s.id, draft).success) return s.index;
  }
  return CAMPAIGN_WIZARD_STEPS.length - 1;
}

export function canOpenCampaignWizardStep(draft: CampaignWizardDraft, targetIndex: number): boolean {
  if (targetIndex <= 0) return true;
  if (targetIndex >= CAMPAIGN_WIZARD_STEPS.length) return false;
  return isCampaignStepComplete(draft, targetIndex - 1);
}

export function campaignWizardProgressPercent(draft: CampaignWizardDraft): number {
  const done = CAMPAIGN_WIZARD_STEPS.filter((s) => isCampaignStepComplete(draft, s.index)).length;
  return Math.round((done / CAMPAIGN_WIZARD_STEPS.length) * 100);
}

export function validateCampaignWizardReady(draft: CampaignWizardDraft): CampaignWizardStepResult {
  return validateCampaignStep("review", draft);
}

/** Authoritative check for funding / first-time activation. Accepts a DB row or wizard form. */
export function assertCampaignReadyForFunding(
  row: Record<string, unknown> | CampaignWizardDraft | null | undefined,
): CampaignWizardStepResult {
  return validateCampaignWizardReady(toCampaignWizardDraft(row as Record<string, unknown> | null | undefined));
}

export function campaignWizardErrorPayload(
  result: CampaignWizardStepResult,
  fallback = "Campaign is not ready for funding",
) {
  return {
    error: result.errors[0]?.message ?? fallback,
    missing: result.errors,
    complete: false as const,
  };
}

/**
 * Full wizard validation is required for readyForFunding and for the first
 * draft → active transition. Resume of an already-funded paused campaign does
 * not re-run wizard completeness (those campaigns already passed funding).
 */
export function campaignNeedsCompletenessGate(opts: {
  currentStatus?: string | null;
  nextStatus?: unknown;
  readyForFunding?: unknown;
}): boolean {
  if (opts.readyForFunding === true) return true;
  if (opts.nextStatus !== "active") return false;
  const current = opts.currentStatus ?? "draft";
  return current === "draft";
}

export function campaignWizardIncompleteSteps(draft: CampaignWizardDraft): Array<{
  id: CampaignWizardStepId;
  label: string;
  errors: CampaignWizardFieldError[];
}> {
  const incomplete: Array<{
    id: CampaignWizardStepId;
    label: string;
    errors: CampaignWizardFieldError[];
  }> = [];
  for (const s of CAMPAIGN_WIZARD_STEPS) {
    if (s.id === "review" || s.id === "assets") continue;
    const result = validateCampaignStep(s.id, draft);
    if (!result.success) incomplete.push({ id: s.id, label: s.label, errors: result.errors });
  }
  return incomplete;
}

export function parseCampaignWizardStepParam(raw: string | null | undefined): number | null {
  if (!raw?.trim()) return null;
  const asNum = Number(raw);
  if (Number.isInteger(asNum) && asNum >= 0 && asNum < CAMPAIGN_WIZARD_STEPS.length) return asNum;
  const byId = CAMPAIGN_WIZARD_STEPS.find((s) => s.id === raw.trim().toLowerCase() || s.label.toLowerCase() === raw.trim().toLowerCase());
  return byId ? byId.index : null;
}
