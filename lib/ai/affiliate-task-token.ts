import { createHmac, timingSafeEqual } from "node:crypto";
import type { AffiliateAuthoritativeContext } from "@/lib/ai/affiliate-workspace";
import { affiliateWorkspaceAddendum } from "@/lib/ai/affiliate-workspace";

const MAX_AGE_MS = 30 * 60 * 1000;

type TaskPayload = {
  v: 1;
  exp: number;
  productId: string;
  name: string;
  addendum: string;
};

function signingSecret(): string | null {
  const value = (process.env.CRON_SECRET || process.env.SUPABASE_SECRET_KEY || "").trim();
  return value.length >= 16 ? value : null;
}

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function signAffiliatePromotionTask(
  context: AffiliateAuthoritativeContext,
  now = Date.now(),
): string | null {
  const secret = signingSecret();
  if (!secret) return null;
  const payload: TaskPayload = {
    v: 1,
    exp: now + MAX_AGE_MS,
    productId: context.productId,
    name: context.name.slice(0, 180),
    addendum: affiliateWorkspaceAddendum(context),
  };
  const body = encode(JSON.stringify(payload));
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyAffiliatePromotionTask(
  token: string | null | undefined,
  now = Date.now(),
): { productId: string; name: string; addendum: string } | null {
  const secret = signingSecret();
  if (!secret || !token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(decode(body)) as Partial<TaskPayload>;
    if (payload.v !== 1 || typeof payload.exp !== "number" || payload.exp < now) return null;
    if (typeof payload.productId !== "string" || typeof payload.addendum !== "string") return null;
    if (typeof payload.name !== "string" || !payload.name.trim()) return null;
    return {
      productId: payload.productId,
      name: payload.name,
      addendum: payload.addendum.slice(0, 3500),
    };
  } catch {
    return null;
  }
}
