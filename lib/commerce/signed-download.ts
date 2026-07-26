import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_TTL_SECONDS = 10 * 60; // 10 minutes

function signingSecret(): string {
  const secret =
    process.env.DOWNLOAD_SIGNING_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;
  if (!secret) {
    throw new Error("Download signing secret is not configured");
  }
  return secret;
}

export type DownloadTokenPayload = {
  accessId: string;
  userId: string;
  productId: string;
  exp: number;
};

function encodePayload(payload: DownloadTokenPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function signBody(body: string): string {
  return createHmac("sha256", signingSecret()).update(body).digest("base64url");
}

export function createSignedDownloadToken(input: {
  accessId: string;
  userId: string;
  productId: string;
  ttlSeconds?: number;
}): { token: string; expiresAt: string; expiresIn: number } {
  const ttl = input.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const body = encodePayload({
    accessId: input.accessId,
    userId: input.userId,
    productId: input.productId,
    exp,
  });
  const token = `${body}.${signBody(body)}`;
  return {
    token,
    expiresAt: new Date(exp * 1000).toISOString(),
    expiresIn: ttl,
  };
}

export function verifySignedDownloadToken(token: string): DownloadTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;

  const expected = signBody(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as DownloadTokenPayload;
    if (!parsed?.accessId || !parsed?.userId || !parsed?.productId || !parsed?.exp) return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}
