import {
  readScopedBrandId,
  writeScopedBrandId,
} from "@/lib/ugc/client/tenant-storage";

export function withBrandQuery(url: string, brandId: string | null | undefined) {
  if (!brandId) return url;
  const hashIndex = url.indexOf("#");
  const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : "";
  const join = withoutHash.includes("?") ? "&" : "?";
  return `${withoutHash}${join}brandId=${encodeURIComponent(brandId)}${hash}`;
}

/** @deprecated Prefer readScopedBrandId(userId) — unscoped key leaks across accounts. */
export function readStoredBrandId() {
  return null;
}

/** @deprecated Prefer writeScopedBrandId(userId, brandId). */
export function writeStoredBrandId(_brandId: string) {
  /* no-op: callers must pass userId via writeScopedBrandId */
}

export function readBrandIdForUser(userId: string | null | undefined) {
  if (!userId) return null;
  return readScopedBrandId(userId);
}

export function writeBrandIdForUser(userId: string | null | undefined, brandId: string) {
  if (!userId || !brandId) return;
  writeScopedBrandId(userId, brandId);
}
