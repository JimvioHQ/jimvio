/**
 * Controlled Jimvio house personas for editorial community programming.
 * These are not independent users. Public UI must not label them as bots/seeds.
 * Owner Console can distinguish via app_metadata / profile settings.
 */

import { WORLD_PERSONA_EXTRAS } from "./editorial-world-personas";

export type EditorialPersonaSpec = {
  /** Local-part after editorial+ ; email becomes editorial+{key}@jimvio.com */
  key: string;
  fullName: string;
  username: string;
  bio: string;
  /** Curated Unsplash portrait — topic-neutral professional look */
  avatarUrl: string;
  /** Categories this persona prefers when posting */
  affinities: string[];
};

export const EDITORIAL_PERSONA_EMAIL_DOMAIN = "jimvio.com";
export const EDITORIAL_PERSONA_EMAIL_PREFIX = "editorial+";

export function editorialPersonaEmail(key: string): string {
  return `${EDITORIAL_PERSONA_EMAIL_PREFIX}${key}@${EDITORIAL_PERSONA_EMAIL_DOMAIN}`;
}

export function isEditorialPersonaEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return new RegExp(
    `^${EDITORIAL_PERSONA_EMAIL_PREFIX}[a-z0-9]+@${EDITORIAL_PERSONA_EMAIL_DOMAIN}$`,
    "i"
  ).test(email.trim());
}

/**
 * Small, production-safe roster. Names read as people without implying
 * real-world individuals participated.
 */
export const EDITORIAL_PERSONAS: EditorialPersonaSpec[] = [
  {
    key: "amina",
    fullName: "Amina K.",
    username: "amina_k",
    bio: "Jimvio house contributor — careers, creators, and community craft.",
    avatarUrl:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&h=256&q=80",
    affinities: ["Creator", "Education", "Business", "Marketing", "Startups"],
  },
  {
    key: "jordan",
    fullName: "Jordan M.",
    username: "jordan_m",
    bio: "Jimvio house contributor — software, AI, and builder workflows.",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80",
    affinities: ["Technology", "Programming", "AI", "Tech", "Gaming"],
  },
  {
    key: "grace",
    fullName: "Grace N.",
    username: "grace_n",
    bio: "Jimvio house contributor — faith, culture, and African creator scenes.",
    avatarUrl:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=256&h=256&q=80",
    affinities: ["Faith", "Music", "Entertainment", "Creator", "Travel"],
  },
  {
    key: "sam",
    fullName: "Sam O.",
    username: "sam_o",
    bio: "Jimvio house contributor — sports, business ops, and marketplace sellers.",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80",
    affinities: ["Sports", "Business", "Ecommerce", "Fitness", "Finance"],
  },
  {
    key: "maya",
    fullName: "Maya R.",
    username: "maya_r",
    bio: "Jimvio house contributor — design, photography, and brand storytelling.",
    avatarUrl:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&h=256&q=80",
    affinities: ["Design", "Photography", "Marketing", "Fashion", "Creator"],
  },
  {
    key: "eli",
    fullName: "Eli T.",
    username: "eli_t",
    bio: "Jimvio house contributor — finance literacy, productivity, and remote work.",
    avatarUrl:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&h=256&q=80",
    affinities: ["Finance", "Trading", "Education", "Health", "Other"],
  },
];

/** Full editorial persona roster used by the world seeder. */
export const ALL_EDITORIAL_PERSONAS: EditorialPersonaSpec[] = [
  ...EDITORIAL_PERSONAS,
  ...WORLD_PERSONA_EXTRAS,
];

export function pickPersonaForCategory(
  category: string,
  salt: string
): EditorialPersonaSpec {
  const matches = ALL_EDITORIAL_PERSONAS.filter((p) =>
    p.affinities.some((a) => a.toLowerCase() === category.toLowerCase())
  );
  const pool = matches.length ? matches : ALL_EDITORIAL_PERSONAS;
  let hash = 0;
  for (let i = 0; i < salt.length; i++) hash = (hash * 31 + salt.charCodeAt(i)) >>> 0;
  return pool[hash % pool.length]!;
}
