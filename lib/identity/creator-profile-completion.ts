/**
 * Shared creator-profile completion rules for Identity save and UGC.
 *
 * Source of truth is the /identity/edit Profile tab: fields that are presented
 * as core identity (not labeled optional) and that signup does not fill.
 * Availability has a default. Availability note and media kit are optional.
 * Verification/KYC is intentionally excluded.
 */

export const CREATOR_PROFILE_REQUIRED_FIELDS = [
  { id: "fullName", label: "Full name" },
  { id: "headline", label: "Headline" },
  { id: "bio", label: "Bio" },
] as const;

export type CreatorProfileFieldInput = {
  fullName?: string | null;
  headline?: string | null;
  bio?: string | null;
};

export type CreatorProfileMissingField = {
  id: string;
  label: string;
};

export type CreatorProfileCompletion = {
  complete: boolean;
  missing: CreatorProfileMissingField[];
};

function filled(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

/** Pure completion check — same rules on the edit form, save API, and UGC. */
export function evaluateCreatorProfileCompletion(
  input: CreatorProfileFieldInput,
): CreatorProfileCompletion {
  const missing: CreatorProfileMissingField[] = [];
  if (!filled(input.fullName)) missing.push({ id: "fullName", label: "Full name" });
  if (!filled(input.headline)) missing.push({ id: "headline", label: "Headline" });
  if (!filled(input.bio)) missing.push({ id: "bio", label: "Bio" });
  return { complete: missing.length === 0, missing };
}

/**
 * UGC-ready = Identity fields complete AND the existing influencers join-key exists.
 * An influencers row alone is not enough.
 */
export function isCreatorWorkspaceReady(
  completion: CreatorProfileCompletion,
  influencer: { id?: string | null } | null | undefined,
): boolean {
  return completion.complete && Boolean(influencer?.id);
}
