/**
 * Shared creator-profile completion rules for Identity save and UGC.
 *
 * UGC “ready” gate still requires fullName + headline + bio.
 * Profile strength % uses a broader weighted set for the Identity editor UI.
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
  avatarUrl?: string | null;
  coverImage?: string | null;
  country?: string | null;
  city?: string | null;
  website?: string | null;
  languages?: string[] | null;
  skills?: string[] | null;
  identityVerified?: boolean | null;
};

export type CreatorProfileMissingField = {
  id: string;
  label: string;
};

export type CreatorProfileCompletion = {
  complete: boolean;
  missing: CreatorProfileMissingField[];
};

export type ProfileStrength = {
  percent: number;
  completed: number;
  total: number;
  nextHint: string | null;
};

const STRENGTH_FIELDS: Array<{
  id: string;
  label: string;
  weight: number;
  filled: (input: CreatorProfileFieldInput) => boolean;
}> = [
  { id: "avatarUrl", label: "profile photo", weight: 1, filled: (i) => Boolean(i.avatarUrl?.trim()) },
  { id: "fullName", label: "full name", weight: 1, filled: (i) => Boolean(i.fullName?.trim()) },
  { id: "headline", label: "headline", weight: 1, filled: (i) => Boolean(i.headline?.trim()) },
  { id: "bio", label: "bio", weight: 1, filled: (i) => Boolean(i.bio?.trim()) },
  { id: "country", label: "country", weight: 1, filled: (i) => Boolean(i.country?.trim()) },
  { id: "city", label: "city", weight: 1, filled: (i) => Boolean(i.city?.trim()) },
  { id: "website", label: "website", weight: 1, filled: (i) => Boolean(i.website?.trim()) },
  {
    id: "languages",
    label: "languages",
    weight: 1,
    filled: (i) => Array.isArray(i.languages) && i.languages.length > 0,
  },
  {
    id: "skills",
    label: "skills",
    weight: 1,
    filled: (i) => Array.isArray(i.skills) && i.skills.length > 0,
  },
  {
    id: "identityVerified",
    label: "identity verification",
    weight: 1,
    filled: (i) => Boolean(i.identityVerified),
  },
];

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

/** Weighted profile strength for Identity UI (0–100). */
export function evaluateProfileStrength(input: CreatorProfileFieldInput): ProfileStrength {
  const total = STRENGTH_FIELDS.reduce((sum, f) => sum + f.weight, 0);
  let completed = 0;
  let nextHint: string | null = null;
  for (const field of STRENGTH_FIELDS) {
    if (field.filled(input)) {
      completed += field.weight;
    } else if (!nextHint) {
      nextHint = `Complete your ${field.label} to strengthen your profile.`;
    }
  }
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { percent, completed, total, nextHint: percent >= 100 ? null : nextHint };
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
