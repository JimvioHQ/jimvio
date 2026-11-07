/**
 * Professional identity types for Jimvio Identity 2.1.
 * Stored in jip_identity.industries[0] for compatibility with existing profile saves.
 * Legacy content-category values remain displayable until the user picks a new type.
 */

export const IDENTITY_TYPES = [
  "Creator",
  "Entrepreneur",
  "Brand / Company",
  "Business Owner",
  "Freelancer / Consultant",
  "Professional",
  "Investor",
  "Seller / Vendor",
  "Community Builder",
  "Educator / Coach",
  "Student",
  "Other",
] as const;

export type IdentityType = (typeof IDENTITY_TYPES)[number];

const IDENTITY_TYPE_SET = new Set<string>(IDENTITY_TYPES);

/** True when the value is one of the canonical Identity 2.1 types. */
export function isCanonicalIdentityType(value: string | null | undefined): value is IdentityType {
  if (!value) return false;
  return IDENTITY_TYPE_SET.has(value.trim());
}

/**
 * Resolve the public-facing identity label from stored industries / specialties.
 * Preserves legacy free-text categories (e.g. "Investing services") until changed.
 */
export function resolvePrimaryIdentityLabel(
  industries: string[] | null | undefined,
  specialties?: string[] | null,
): string | null {
  const primary = industries?.[0]?.trim() || specialties?.[0]?.trim() || null;
  return primary || null;
}

/** Creator program badge is only for users who identify as Creator (or legacy creator categories). */
export function shouldShowCreatorProgramBadge(
  primaryIdentity: string | null | undefined,
  opts?: { isInfluencer?: boolean; xp?: number },
): boolean {
  const label = (primaryIdentity ?? "").trim().toLowerCase();
  const identifiesAsCreator =
    label === "creator" ||
    label.includes("creator") ||
    label.includes("ugc") ||
    label.includes("content creator");
  if (identifiesAsCreator) return true;
  // Earned creator participation without an updated identity label.
  if (opts?.isInfluencer && (opts.xp ?? 0) >= 1000) return true;
  return false;
}
