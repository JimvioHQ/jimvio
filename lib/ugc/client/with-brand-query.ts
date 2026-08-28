const STORAGE_KEY = "jimvio-ugc-brand-id";

export function withBrandQuery(url: string, brandId: string | null | undefined) {
  if (!brandId) return url;
  const hashIndex = url.indexOf("#");
  const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : "";
  const join = withoutHash.includes("?") ? "&" : "?";
  return `${withoutHash}${join}brandId=${encodeURIComponent(brandId)}${hash}`;
}

export function readStoredBrandId() {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeStoredBrandId(brandId: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, brandId);
  } catch {
    /* ignore */
  }
}
