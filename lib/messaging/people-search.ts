/**
 * Pure helpers for "New message" people search (no I/O, unit-tested).
 * Only public profile fields ever leave the server — never email or phone.
 */

export type PersonHit = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean | null;
};

export const PEOPLE_SEARCH_MIN = 2;
export const PEOPLE_SEARCH_MAX_LEN = 60;
export const PEOPLE_SEARCH_LIMIT = 12;

/** Trim, collapse whitespace, drop a leading "@", cap length. Returns null when too short to search. */
export function normalizePeopleQuery(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const q = raw.replace(/\s+/g, " ").trim().replace(/^@+/, "").slice(0, PEOPLE_SEARCH_MAX_LEN).trim();
  return q.length >= PEOPLE_SEARCH_MIN ? q : null;
}

/** Escape LIKE wildcards so user input is matched literally. */
export function escapeLike(q: string): string {
  return q.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function score(p: PersonHit, q: string): number {
  const needle = q.toLowerCase();
  const user = (p.username ?? "").toLowerCase();
  const name = (p.full_name ?? "").toLowerCase();
  if (user === needle || name === needle) return 0;
  if (user.startsWith(needle) || name.startsWith(needle)) return 1;
  if (name.split(" ").some((w) => w.startsWith(needle))) return 2;
  return 3;
}

/** Merge name + username matches: dedupe, exclude the viewer, best matches first, verified as tiebreak. */
export function rankPeople(rows: PersonHit[], q: string, selfId: string, limit = PEOPLE_SEARCH_LIMIT): PersonHit[] {
  const seen = new Map<string, PersonHit>();
  for (const r of rows) if (r && r.id && r.id !== selfId && !seen.has(r.id)) seen.set(r.id, r);
  return [...seen.values()]
    .sort(
      (a, b) =>
        score(a, q) - score(b, q) ||
        Number(!!b.is_verified) - Number(!!a.is_verified) ||
        (a.full_name ?? a.username ?? "").localeCompare(b.full_name ?? b.username ?? "")
    )
    .slice(0, limit)
    // Explicit allow-list: nothing else (email, phone, …) can leave the server.
    .map((p) => ({
      id: p.id,
      full_name: p.full_name ?? null,
      username: p.username ?? null,
      avatar_url: p.avatar_url ?? null,
      bio: p.bio ? p.bio.slice(0, 120) : null,
      is_verified: p.is_verified ?? null,
    }));
}
