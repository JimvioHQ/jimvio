/**
 * Affiliate promotion handoff into the existing Jimvio AI workspace.
 * Product facts used for generation are loaded on the server. This module
 * only decides when to offer the workspace and how to avoid a second automatic run.
 */

export const AFFILIATE_PROMOTION_ASSETS = [
  "tiktokCaption",
  "instagramCaption",
  "youtubeTitle",
  "facebookPost",
  "threadsPost",
  "xPost",
  "emailCopy",
  "blogIntro",
  "seoTitle",
  "hashtags",
  "hooks",
  "scripts",
] as const;

export type AffiliateWorkspaceHandoff = {
  id: string;
  productId: string;
  assetTypes: string[];
  platform: string | null;
  returnPath: string;
  autoGenerate: true;
  createdAt: number;
};

export type AffiliateAuthoritativeContext = {
  productId: string;
  slug: string;
  name: string;
  description: string;
  benefits: string[];
  productUrl: string;
  trackingUrl: string | null;
  commissionPercent: number;
  price: number;
  currency: string;
  estimatedEarning: number | null;
  imageUrls: string[];
  assetTypes: string[];
  platform: string | null;
};

export type AffiliateMemoryStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const HANDOFF_KEY = "jimvio_affiliate_ai_handoff_v1";
const AUTOSTART_KEY = "jimvio_affiliate_ai_autostart_v1";

export function shouldOfferAffiliateWorkspace(status: number, code?: string | null): boolean {
  if (status === 401 || code === "unauthorized") return false;
  return status >= 400;
}

/** Failed provider calls are never retried automatically. */
export function shouldAutoRetryAffiliateProvider(): boolean {
  return false;
}

export function affiliateWorkspaceRecoveryCopy(providerMessage: string): {
  title: string;
  detail: string;
  action: "Continue in Jimvio AI";
} {
  const detail = providerMessage.trim() || "Gemini couldn't finish these promotion assets.";
  return {
    title: "Jimvio AI can continue this promotion",
    detail,
    action: "Continue in Jimvio AI",
  };
}

export function beginAffiliateWorkspaceHandoff(input: {
  succeeded: boolean;
  productId: string;
  assetTypes?: string[];
  platform?: string | null;
  returnPath: string;
  now?: number;
  id?: string;
}): AffiliateWorkspaceHandoff | null {
  if (input.succeeded) return null;
  const productId = input.productId.trim();
  if (!productId) return null;
  const returnPath = input.returnPath.startsWith("/") && !input.returnPath.startsWith("//")
    ? input.returnPath.slice(0, 240)
    : "/affiliates/ai";
  const assetTypes = (input.assetTypes?.length ? input.assetTypes : [...AFFILIATE_PROMOTION_ASSETS])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 16);
  return {
    id: (input.id ?? `aff-${input.now ?? 0}`).slice(0, 80),
    productId: productId.slice(0, 80),
    assetTypes,
    platform: input.platform?.trim() ? input.platform.trim().slice(0, 40) : null,
    returnPath,
    autoGenerate: true,
    createdAt: input.now ?? 0,
  };
}

export function affiliateWorkspaceUserPrompt(input: {
  name: string;
  platform?: string | null;
}): string {
  const name = input.name.replace(/\s+/g, " ").trim().slice(0, 180) || "this product";
  const platform = input.platform?.trim()
    ? ` for ${input.platform.trim().slice(0, 40)}`
    : "";
  return `Create affiliate promotion assets${platform} for "${name}". Include captions, hashtags, hooks, and scripts. Use only the product facts attached to this task.`;
}

export function affiliateWorkspaceAddendum(context: AffiliateAuthoritativeContext): string {
  const lines = [
    "Authoritative Jimvio product facts for this promotion. Do not replace these prices, commissions, or links.",
    `Product ID: ${context.productId}`,
    `Product reference: ${context.slug}`,
    `Name: ${context.name}`,
    `Description: ${context.description || "n/a"}`,
    `Benefits: ${context.benefits.length ? context.benefits.join("; ") : "n/a"}`,
    `Product URL: ${context.productUrl}`,
    `Affiliate tracking link: ${context.trackingUrl ?? "not issued yet"}`,
    `Price: ${context.currency} ${context.price}`,
    `Commission: ${context.commissionPercent}%`,
    `Estimated earning: ${
      context.estimatedEarning == null ? "n/a" : `${context.currency} ${context.estimatedEarning}`
    }`,
    `Image URLs: ${context.imageUrls.length ? context.imageUrls.join(", ") : "n/a"}`,
    `Requested assets: ${context.assetTypes.join(", ") || "full promotion kit"}`,
    `Destination platform: ${context.platform ?? "all selected social and email formats"}`,
  ];
  return lines.join("\n").slice(0, 3500);
}

/**
 * Promotion handoff must reach Gemini. The general affiliate guide matches any
 * message that says "affiliate", which would replace the product task with a
 * canned help reply and never send the signed product facts.
 */
export function affiliatePromotionUsesLiveModel(input: {
  message: string;
  affiliateTask?: string | null;
}): boolean {
  if (input.affiliateTask?.trim()) return true;
  return /\baffiliate promotion assets\b/i.test(input.message);
}

export function decideAffiliateAutoStart(input: {
  handoff: { id: string; autoGenerate: boolean } | null;
  consumedIds: string[];
  contextReady: boolean;
  sending: boolean;
}): "start" | "manual" | "skip" {
  if (!input.handoff) return "skip";
  if (!input.contextReady || !input.handoff.autoGenerate) return "manual";
  if (input.sending || input.consumedIds.includes(input.handoff.id)) return "manual";
  return "start";
}

export function writeAffiliateHandoff(
  handoff: AffiliateWorkspaceHandoff,
  storage: AffiliateMemoryStorage,
): void {
  storage.setItem(HANDOFF_KEY, JSON.stringify(handoff));
}

export function readAffiliateHandoff(storage: AffiliateMemoryStorage): AffiliateWorkspaceHandoff | null {
  const raw = storage.getItem(HANDOFF_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AffiliateWorkspaceHandoff>;
    if (!parsed || parsed.autoGenerate !== true || typeof parsed.productId !== "string") return null;
    if (typeof parsed.id !== "string" || !parsed.id) return null;
    return {
      id: parsed.id,
      productId: parsed.productId,
      assetTypes: Array.isArray(parsed.assetTypes)
        ? parsed.assetTypes.filter((item): item is string => typeof item === "string").slice(0, 16)
        : [...AFFILIATE_PROMOTION_ASSETS],
      platform: typeof parsed.platform === "string" ? parsed.platform : null,
      returnPath: typeof parsed.returnPath === "string" ? parsed.returnPath : "/affiliates/ai",
      autoGenerate: true,
      createdAt: typeof parsed.createdAt === "number" ? parsed.createdAt : 0,
    };
  } catch {
    return null;
  }
}

export function readConsumedAffiliateAutoStarts(storage: AffiliateMemoryStorage): string[] {
  const raw = storage.getItem(AUTOSTART_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string").slice(-20);
  } catch {
    return [];
  }
}

export function consumeAffiliateAutoStart(id: string, storage: AffiliateMemoryStorage): string[] {
  const next = [...readConsumedAffiliateAutoStarts(storage).filter((item) => item !== id), id].slice(-20);
  storage.setItem(AUTOSTART_KEY, JSON.stringify(next));
  return next;
}

export function browserSessionStorage(): AffiliateMemoryStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}
