/**
 * Browser storage for UGC Brand Workspace — always scoped by authenticated user
 * (and brand where relevant). Prevents User B from restoring User A's draft on
 * a shared browser profile.
 */

const DRAFT_PREFIX = "jimvio-campaign-center-draft-v2:";
const STEP_PREFIX = "jimvio-campaign-center-step-v2:";
const BRAND_PREFIX = "jimvio-ugc-brand-id-v2:";
/** Legacy unscoped keys — cleared on every tenant hydrate / sign-out. */
const LEGACY_KEYS = [
  "jimvio-campaign-center-draft-v1",
  "jimvio-campaign-center-step-v1",
  "jimvio-ugc-brand-id",
] as const;

export function ugcDraftStorageKey(userId: string, brandId: string): string {
  return `${DRAFT_PREFIX}${userId}:${brandId}`;
}

export function ugcStepStorageKey(userId: string, brandId: string): string {
  return `${STEP_PREFIX}${userId}:${brandId}`;
}

export function ugcBrandStorageKey(userId: string): string {
  return `${BRAND_PREFIX}${userId}`;
}

export function clearLegacyUgcTenantKeys(): void {
  if (typeof window === "undefined") return;
  try {
    for (const key of LEGACY_KEYS) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

/** Remove all Jimvio UGC tenant keys for any user (logout / account switch). */
export function clearAllUgcTenantClientState(): void {
  if (typeof window === "undefined") return;
  try {
    clearLegacyUgcTenantKeys();
    const drop = (store: Storage) => {
      const keys: string[] = [];
      for (let i = 0; i < store.length; i++) {
        const k = store.key(i);
        if (!k) continue;
        if (
          k.startsWith(DRAFT_PREFIX) ||
          k.startsWith(STEP_PREFIX) ||
          k.startsWith(BRAND_PREFIX)
        ) {
          keys.push(k);
        }
      }
      for (const k of keys) store.removeItem(k);
    };
    drop(localStorage);
    drop(sessionStorage);
  } catch {
    /* ignore */
  }
}

export function readScopedDraft(userId: string, brandId: string): string | null {
  if (!userId || !brandId || typeof window === "undefined") return null;
  try {
    clearLegacyUgcTenantKeys();
    return localStorage.getItem(ugcDraftStorageKey(userId, brandId));
  } catch {
    return null;
  }
}

export function writeScopedDraft(userId: string, brandId: string, value: string): void {
  if (!userId || !brandId || typeof window === "undefined") return;
  try {
    localStorage.setItem(ugcDraftStorageKey(userId, brandId), value);
  } catch {
    /* ignore */
  }
}

export function removeScopedDraft(userId: string, brandId: string): void {
  if (!userId || !brandId || typeof window === "undefined") return;
  try {
    localStorage.removeItem(ugcDraftStorageKey(userId, brandId));
    sessionStorage.removeItem(ugcStepStorageKey(userId, brandId));
  } catch {
    /* ignore */
  }
}

export function readScopedStep(userId: string, brandId: string): string | null {
  if (!userId || !brandId || typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(ugcStepStorageKey(userId, brandId));
  } catch {
    return null;
  }
}

export function writeScopedStep(userId: string, brandId: string, step: number): void {
  if (!userId || !brandId || typeof window === "undefined") return;
  try {
    sessionStorage.setItem(ugcStepStorageKey(userId, brandId), String(step));
  } catch {
    /* ignore */
  }
}

export function readScopedBrandId(userId: string): string | null {
  if (!userId || typeof window === "undefined") return null;
  try {
    clearLegacyUgcTenantKeys();
    return sessionStorage.getItem(ugcBrandStorageKey(userId));
  } catch {
    return null;
  }
}

export function writeScopedBrandId(userId: string, brandId: string): void {
  if (!userId || !brandId || typeof window === "undefined") return;
  try {
    sessionStorage.setItem(ugcBrandStorageKey(userId), brandId);
  } catch {
    /* ignore */
  }
}
