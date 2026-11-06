/**
 * Share links for Trust Checker results.
 *
 * A scan stays private to the person who ran it. Pressing Share asks the
 * server for a signed, expiring token bound to that one scan id; only the
 * owner can obtain one. Anyone holding the link can then open a read-only
 * copy until it expires. Nothing is stored: the token is an HMAC, so no
 * migration is needed, and changing the secret revokes every link at once.
 *
 * Pure apart from node:crypto (secret and clock are passed in), so it is unit-tested directly.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { ScanReport } from "./types";

export const SHARE_TTL_MS = 30 * 24 * 60 * 60_000;
const VERSION = "v1";
const SIG_LEN = 32;

/** The signing key. Prefers a dedicated secret; otherwise derives a separate key from the Supabase server secret (never used directly). */
export function shareSecret(env: Record<string, string | undefined> = process.env): string | null {
  const own = env.TRUST_SHARE_SECRET?.trim();
  if (own) return own;
  const base = env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return base ? createHash("sha256").update(`jimvio-trust-share|${base}`).digest("base64url") : null;
}

const sign = (scanId: string, exp: number, secret: string) =>
  createHmac("sha256", secret).update(`trust-share:${VERSION}:${scanId.toLowerCase()}:${exp}`).digest("base64url").slice(0, SIG_LEN);

export function createShareToken(scanId: string, nowMs: number, secret: string, ttlMs = SHARE_TTL_MS): { token: string; expiresAt: string } {
  const exp = Math.floor((nowMs + ttlMs) / 1000);
  return { token: `${exp.toString(36)}.${sign(scanId, exp, secret)}`, expiresAt: new Date(exp * 1000).toISOString() };
}

export type ShareCheck = { ok: true; expiresAt: string } | { ok: false; reason: "invalid" | "expired" };

export function verifyShareToken(scanId: string, token: string | null | undefined, nowMs: number, secret: string): ShareCheck {
  const m = /^([0-9a-z]{1,10})\.([A-Za-z0-9_-]{32})$/.exec(token ?? "");
  if (!m) return { ok: false, reason: "invalid" };
  const exp = parseInt(m[1], 36);
  const want = Buffer.from(sign(scanId, exp, secret));
  const got = Buffer.from(m[2]);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return { ok: false, reason: "invalid" };
  // A genuine token never claims more than the TTL from issue; reject anything that does.
  if (exp * 1000 > nowMs + SHARE_TTL_MS + 60_000) return { ok: false, reason: "invalid" };
  if (exp * 1000 <= nowMs) return { ok: false, reason: "expired" };
  return { ok: true, expiresAt: new Date(exp * 1000).toISOString() };
}

/**
 * The copy a share-link recipient sees. Results stay intact so the shared
 * page matches the owner's; the precise photo location is coarsened to about
 * 10 km (and the page says so), because a recipient never needs a home address.
 */
export function publicReport(report: ScanReport): ScanReport {
  const r = structuredClone(report);
  for (const c of r.checkers) {
    const d = c.details as { kind?: string; gps?: { lat: number; lon: number } | null } | undefined;
    if (d?.kind === "media" && d.gps) {
      d.gps = { lat: Math.round(d.gps.lat * 10) / 10, lon: Math.round(d.gps.lon * 10) / 10 };
      c.limits = [...(c.limits ?? []), "Shared view: the photo's GPS location is rounded to about 10 km to protect the owner's privacy."];
    }
  }
  return r;
}
