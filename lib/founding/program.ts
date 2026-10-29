/**
 * N-7: Founding Creators program — single source of truth for its rules.
 * The page, the badge and the payment finalizer all read from here.
 */
export const FOUNDING_SEATS = 100;
export const FOUNDING_FEE_RATE = 10; // % on community memberships
export const FOUNDING_FEE_MONTHS = 12;

export type FoundingSeat = {
  user_id: string;
  seat_number: number;
  qualified_by: "community" | "creator_profile" | "store";
  fee_rate: number | string;
  fee_until: string;
  joined_at: string;
};

/** Platform fee for a community payment, applying the founding rate while it lasts. */
export function communityFeeRate(
  standardRate: number,
  seat: Pick<FoundingSeat, "fee_rate" | "fee_until"> | null | undefined,
  now: Date = new Date(),
): number {
  if (!seat) return standardRate;
  if (new Date(seat.fee_until).getTime() <= now.getTime()) return standardRate;
  const founding = Number(seat.fee_rate);
  return Number.isFinite(founding) ? Math.min(standardRate, founding) : standardRate;
}

export function seatLabel(n: number): string {
  return `Founding Creator #${String(n).padStart(3, "0")}`;
}

export type ContributionId =
  | "community"
  | "creator"
  | "store"
  | "ugc"
  | "affiliate"
  | "referrals"
  | "content"
  | "feedback"
  | "other";

/** Ways someone can help Jimvio grow — any of them can earn a seat. */
export const CONTRIBUTIONS: readonly { id: ContributionId; label: string; detail: string; href: string | null }[] = [
  { id: "community", label: "Run a community", detail: "You host a community and keep members active.", href: "/communities/create" },
  { id: "creator", label: "Create content", detail: "You post, go live or publish courses on Jimvio.", href: "/create/post" },
  { id: "store", label: "Sell in your store", detail: "You sell physical or digital products.", href: "/seller/products" },
  { id: "ugc", label: "UGC & clipping", detail: "You make videos or clips for brand campaigns.", href: "/ugc" },
  { id: "affiliate", label: "Promote as an affiliate", detail: "You share products and bring buyers.", href: "/affiliates" },
  { id: "referrals", label: "Bring people to Jimvio", detail: "You invite creators, sellers or brands to join.", href: null },
  { id: "content", label: "Teach about Jimvio", detail: "You make guides, tutorials or videos about Jimvio.", href: null },
  { id: "feedback", label: "Test and give feedback", detail: "You report bugs and help shape new features.", href: "/help" },
  { id: "other", label: "Something else", detail: "Tell us how you help Jimvio grow.", href: null },
];

export const NOTE_MIN = 20;
export const NOTE_MAX = 1000;
export const MAX_LINKS = 5;

export const APPLY_ERRORS: Record<string, string> = {
  not_signed_in: "Sign in to apply.",
  account_inactive: "This account can't apply.",
  already_founder: "You already hold a founding seat.",
  program_full: "All 100 founding seats have been given.",
  note_too_short: `Tell us a little more — at least ${NOTE_MIN} characters.`,
  reapply_later: "You can apply again 14 days after your last decision.",
};

/** Validate and clean an application before it reaches the database. */
export function cleanApplication(input: { contributions?: unknown; note?: unknown; links?: unknown }):
  | { ok: true; contributions: ContributionId[]; note: string; links: string[] }
  | { ok: false; error: string } {
  const valid = new Set(CONTRIBUTIONS.map((c) => c.id));
  const contributions = Array.isArray(input.contributions)
    ? [...new Set(input.contributions.filter((c): c is ContributionId => typeof c === "string" && valid.has(c as ContributionId)))]
    : [];
  if (contributions.length === 0) return { ok: false, error: "Choose at least one way you help Jimvio." };
  const note = typeof input.note === "string" ? input.note.trim() : "";
  if (note.length < NOTE_MIN) return { ok: false, error: APPLY_ERRORS.note_too_short };
  if (note.length > NOTE_MAX) return { ok: false, error: `Keep it under ${NOTE_MAX} characters.` };
  const links = (Array.isArray(input.links) ? input.links : [])
    .filter((l): l is string => typeof l === "string")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, MAX_LINKS);
  for (const l of links) {
    try {
      const u = new URL(l);
      if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("bad");
    } catch {
      return { ok: false, error: `This link doesn't look right: ${l}` };
    }
  }
  return { ok: true, contributions, note, links };
}
