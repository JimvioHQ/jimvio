import { timingSafeEqual } from "node:crypto";
import { API_V1_DOCS } from "@/lib/navigation/api-v1-docs";
import { hashApiKey, type ApiScope } from "./idempotency";

/** Scopes that a live /api/v1 route actually checks. */
export function issuableApiScopes(): ApiScope[] {
  const scopes = new Set<ApiScope>();
  for (const endpoint of API_V1_DOCS) {
    scopes.add(endpoint.scope as ApiScope);
  }
  return [...scopes];
}

export function parseRequestedScopes(input: unknown): { ok: true; scopes: ApiScope[] } | { ok: false; error: string } {
  if (!Array.isArray(input) || input.length === 0) {
    return { ok: false, error: "Select at least one supported API scope." };
  }
  const allowed = new Set(issuableApiScopes());
  const scopes: ApiScope[] = [];
  for (const value of input) {
    if (typeof value !== "string" || !allowed.has(value as ApiScope)) {
      return { ok: false, error: "One or more scopes are not used by a live API route." };
    }
    if (!scopes.includes(value as ApiScope)) scopes.push(value as ApiScope);
  }
  return { ok: true, scopes };
}

export function parseApiKeyName(input: unknown): { ok: true; name: string } | { ok: false; error: string } {
  if (typeof input !== "string") return { ok: false, error: "Enter a name for this key." };
  const name = input.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) {
    return { ok: false, error: "Key name must be 2 to 80 characters." };
  }
  return { ok: true, name };
}

/** Compare a stored SHA-256 hex digest with the hash of the presented key. */
export function apiKeyHashMatches(storedHash: string | null | undefined, rawKey: string): boolean {
  if (!storedHash) return false;
  const actual = Buffer.from(hashApiKey(rawKey));
  const stored = Buffer.from(storedHash);
  if (stored.length !== actual.length || stored.length === 0) return false;
  return timingSafeEqual(stored, actual);
}

export function apiKeyAuditMetadata(input: { keyId: string; prefix: string; scopes: readonly string[] }) {
  return {
    key_id: input.keyId,
    key_prefix: input.prefix,
    scopes: [...input.scopes],
  };
}
