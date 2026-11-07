/**
 * Jimvio Identity 2.0 — section IDs and legacy tab compatibility.
 * Old ?tab= values resolve to the new continuous-page sections.
 */

export const IDENTITY_V2_SECTIONS = [
  {
    id: "overview",
    label: "Overview",
    title: "Overview & Professional Summary",
    description: "Professional biography, industry focus, and public profile highlights.",
  },
  {
    id: "experience",
    label: "Experience & Impact",
    title: "Experience & Impact",
    description: "Roles, responsibilities, and measurable professional impact.",
  },
  {
    id: "education",
    label: "Education & Credentials",
    title: "Education & Credentials",
    description: "Academic history, certifications, and professional credentials.",
  },
  {
    id: "skills",
    label: "Skills & Expertise",
    title: "Skills & Expertise",
    description: "Technical, creative, and industry-specific capabilities.",
  },
  {
    id: "portfolio",
    label: "Portfolio & Work",
    title: "Portfolio & Work",
    description: "Projects, campaigns, creative work, and case studies.",
  },
  {
    id: "business",
    label: "Business & Creator",
    title: "Business & Creator Presence",
    description: "Businesses, brands, UGC, affiliate, marketplace, and community presence.",
  },
  {
    id: "services",
    label: "Services & Contact",
    title: "Services & Contact",
    description: "Services offered, collaboration interests, and booking options.",
  },
] as const;

export type IdentityV2SectionId = (typeof IDENTITY_V2_SECTIONS)[number]["id"];

/** Map legacy Identity 1.x tab query values → Identity 2.0 section ids. */
export const LEGACY_TAB_TO_SECTION: Record<string, IdentityV2SectionId> = {
  overview: "overview",
  portfolio: "portfolio",
  ugc: "business",
  affiliate: "business",
  marketplace: "business",
  community: "business",
  analytics: "business",
  achievements: "overview",
  "media-kit": "portfolio",
  resume: "experience",
  reviews: "overview",
  bookings: "services",
  settings: "overview",
  experience: "experience",
  education: "education",
  skills: "skills",
  business: "business",
  services: "services",
};

export function resolveIdentitySection(tab: string | null | undefined): IdentityV2SectionId {
  if (!tab) return "overview";
  return LEGACY_TAB_TO_SECTION[tab] ?? "overview";
}

export const PUBLIC_SOCIAL_ORDER = [
  "youtube",
  "x",
  "linkedin",
  "instagram",
  "facebook",
  "tiktok",
  "website",
] as const;
