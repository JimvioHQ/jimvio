/**
 * Shared creator-profile completion rules for Identity save and UGC.
 *
 * UGC “ready” gate still requires fullName + headline + bio.
 * Profile strength % uses a broader weighted set for the Identity editor UI.
 */

export const CREATOR_PROFILE_REQUIRED_FIELDS = [
  { id: "fullName", label: "Full name" },
  { id: "username", label: "Username" },
  { id: "categories", label: "What you create" },
  { id: "headline", label: "Headline" },
  { id: "bio", label: "Bio" },
  { id: "country", label: "Country" },
  { id: "social", label: "A verified social account" },
] as const;

export type CreatorProfileFieldInput = {
  fullName?: string | null;
  username?: string | null;
  categories?: string[] | null;
  /** Verified social accounts (not counting a plain website). */
  socialCount?: number | null;
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
  /** One line telling the person exactly what to add. */
  hint?: string;
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

const HINTS: Record<string, string> = {
  fullName: "Add the name brands will see.",
  username: "Pick a username for your public link (jimvio.com/u/you).",
  categories: "Choose what you create, like Music, Technology or Comedy.",
  headline: "Write one line about what you do.",
  bio: "Tell brands about you and your audience.",
  country: "Jimvio detects your country automatically. Turn off any VPN and reload the page.",
  social: "Add and verify one account you post on, like TikTok, Instagram or YouTube.",
};

function missingItem(id: (typeof CREATOR_PROFILE_REQUIRED_FIELDS)[number]["id"]): CreatorProfileMissingField {
  const label = CREATOR_PROFILE_REQUIRED_FIELDS.find((f) => f.id === id)?.label ?? id;
  return { id, label, hint: HINTS[id] };
}

/**
 * Basic identity check (name, headline, bio). Used only to keep the legacy
 * influencer join-key in sync; it does not make a creator profile complete.
 */
export function evaluateBasicIdentity(input: CreatorProfileFieldInput): CreatorProfileCompletion {
  const missing: CreatorProfileMissingField[] = [];
  if (!filled(input.fullName)) missing.push(missingItem("fullName"));
  if (!filled(input.headline)) missing.push(missingItem("headline"));
  if (!filled(input.bio)) missing.push(missingItem("bio"));
  return { complete: missing.length === 0, missing };
}

/**
 * One profile for everyone. It becomes a complete creator profile when the
 * creator fields are filled: name, username, what you create, headline, bio,
 * country and at least one social account. Same rules on the edit form, the
 * save API and every UGC gate.
 */
export function evaluateCreatorProfileCompletion(
  input: CreatorProfileFieldInput,
): CreatorProfileCompletion {
  const missing: CreatorProfileMissingField[] = [];
  if (!filled(input.fullName)) missing.push(missingItem("fullName"));
  if (!filled(input.username)) missing.push(missingItem("username"));
  if (!(Array.isArray(input.categories) && input.categories.some((c) => filled(c)))) {
    missing.push(missingItem("categories"));
  }
  if (!filled(input.headline)) missing.push(missingItem("headline"));
  if (!filled(input.bio)) missing.push(missingItem("bio"));
  if (!filled(input.country)) missing.push(missingItem("country"));
  if (!(Number(input.socialCount ?? 0) > 0)) missing.push(missingItem("social"));
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
