/**
 * Browser-only dismissal of the dashboard next-step note.
 * The value is the action id for one affiliate. It is not account data.
 */

import { AFFILIATE_NEXT_ACTION_IDS, type AffiliateNextActionId } from "./guidance";

const KEY_PREFIX = "jimvio.affiliate.dashboard-tip.";
const AFFILIATE_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTION_IDS = new Set<string>(AFFILIATE_NEXT_ACTION_IDS);

export type AffiliateTipStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export function affiliateDashboardTipKey(affiliateId: string | null | undefined): string | null {
  const id = (affiliateId ?? "").trim().toLowerCase();
  if (!AFFILIATE_ID.test(id)) return null;
  return `${KEY_PREFIX}${id}`;
}

export function readDismissedAffiliateTip(
  storage: AffiliateTipStorage,
  affiliateId: string | null | undefined,
): AffiliateNextActionId | null {
  const key = affiliateDashboardTipKey(affiliateId);
  if (!key) return null;
  try {
    const value = storage.getItem(key);
    return value && ACTION_IDS.has(value) ? (value as AffiliateNextActionId) : null;
  } catch {
    return null;
  }
}

export function writeDismissedAffiliateTip(
  storage: AffiliateTipStorage,
  affiliateId: string | null | undefined,
  actionId: string | null | undefined,
): void {
  const key = affiliateDashboardTipKey(affiliateId);
  if (!key || !actionId || !ACTION_IDS.has(actionId)) return;
  try {
    storage.setItem(key, actionId);
  } catch {
    // Private browsing can reject storage. The in-memory dismissal still applies.
  }
}

export function clearDismissedAffiliateTip(
  storage: AffiliateTipStorage,
  affiliateId: string | null | undefined,
): void {
  const key = affiliateDashboardTipKey(affiliateId);
  if (!key) return;
  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage failures. The caller also clears the in-memory flag.
  }
}
