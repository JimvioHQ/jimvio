import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const ALGO = "aes-256-gcm";
/** Jimvio Shopify secret v1 ciphertext prefix */
export const SHOPIFY_SECRET_PREFIX = "jvs1:";
const PLAIN_PREFIX = "plain:";

function resolveShopifyEncryptionKey(): Buffer | null {
  const raw =
    process.env.SHOPIFY_ENCRYPTION_KEY?.trim() ||
    process.env.APP_ENCRYPTION_KEY?.trim() ||
    process.env.LIVE_DESTINATION_ENCRYPTION_KEY?.trim() ||
    "";
  if (!raw) return null;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  return createHash("sha256").update(raw).digest();
}

export function isShopifyEncryptionConfigured(): boolean {
  return resolveShopifyEncryptionKey() != null;
}

/**
 * Encrypt a Shopify access token for at-rest storage.
 * When no encryption key is configured, stores with an explicit plain: prefix
 * so decrypt can still distinguish intentional plaintext from ciphertext.
 */
export function encryptShopifySecret(plaintext: string): string {
  const token = plaintext.trim();
  if (!token) throw new Error("Cannot encrypt empty Shopify token.");

  const key = resolveShopifyEncryptionKey();
  if (!key) {
    return PLAIN_PREFIX + token;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(token, "utf8")),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return (
    SHOPIFY_SECRET_PREFIX +
    Buffer.concat([iv, tag, encrypted]).toString("base64url")
  );
}

/**
 * Decrypt a stored Shopify secret. Supports:
 * - jvs1: AES-GCM ciphertext
 * - plain: intentional plaintext fallback
 * - legacy raw tokens (no prefix) for backward compatibility
 */
export function decryptShopifySecret(stored: string | null | undefined): string | null {
  if (stored == null) return null;
  const value = String(stored);
  if (!value) return null;

  if (value.startsWith(SHOPIFY_SECRET_PREFIX)) {
    const key = resolveShopifyEncryptionKey();
    if (!key) {
      throw new Error(
        "Shopify credentials are encrypted but SHOPIFY_ENCRYPTION_KEY (or APP_ENCRYPTION_KEY) is not configured."
      );
    }
    const buf = Buffer.from(value.slice(SHOPIFY_SECRET_PREFIX.length), "base64url");
    if (buf.length < 28) throw new Error("Invalid Shopify credential ciphertext.");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  }

  if (value.startsWith(PLAIN_PREFIX)) {
    return value.slice(PLAIN_PREFIX.length);
  }

  // Legacy plaintext rows written before encryption landed
  return value;
}

export function maskShopifySecret(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 4) return "********";
  return `${"*".repeat(Math.min(12, value.length - 4))}${value.slice(-4)}`;
}

/** Timing-safe string compare for OAuth cookies / HMAC digests. */
export function safeEqualString(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function oauthSigningKey(): string {
  return (
    process.env.SHOPIFY_CLIENT_SECRET?.trim() ||
    process.env.SHOPIFY_ENCRYPTION_KEY?.trim() ||
    process.env.APP_ENCRYPTION_KEY?.trim() ||
    process.env.SHOPIFY_CLIENT_ID?.trim() ||
    ""
  );
}

export type ShopifyOAuthStatePayload = {
  vendorId: string;
  userId: string;
  shop: string;
  nonce: string;
  exp: number;
};

/**
 * Create a signed, short-lived OAuth state (CSRF + replay window).
 * Format: base64url(json).base64url(hmac)
 */
export function createShopifyOAuthState(
  payload: Omit<ShopifyOAuthStatePayload, "nonce" | "exp"> & {
    ttlSeconds?: number;
  }
): string {
  const key = oauthSigningKey();
  if (!key) {
    throw new Error("Cannot sign Shopify OAuth state without a server secret.");
  }
  const full: ShopifyOAuthStatePayload = {
    vendorId: payload.vendorId,
    userId: payload.userId,
    shop: payload.shop,
    nonce: randomBytes(16).toString("hex"),
    exp: Date.now() + (payload.ttlSeconds ?? 600) * 1000,
  };
  const body = Buffer.from(JSON.stringify(full), "utf8").toString("base64url");
  const sig = createHmac("sha256", key).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function parseAndVerifyShopifyOAuthState(
  state: string
): { ok: true; payload: ShopifyOAuthStatePayload } | { ok: false; error: string } {
  const key = oauthSigningKey();
  if (!key) {
    return { ok: false, error: "OAuth signing key is not configured." };
  }
  const parts = state.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, error: "OAuth state format is invalid." };
  }
  const [body, sig] = parts;
  const expected = createHmac("sha256", key).update(body).digest("base64url");
  if (!safeEqualString(sig, expected)) {
    return { ok: false, error: "OAuth state signature is invalid." };
  }
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as ShopifyOAuthStatePayload;
    if (
      !payload?.vendorId ||
      !payload?.userId ||
      !payload?.shop ||
      !payload?.nonce ||
      typeof payload.exp !== "number"
    ) {
      return { ok: false, error: "OAuth state payload is incomplete." };
    }
    if (payload.exp < Date.now()) {
      return { ok: false, error: "OAuth state has expired. Start Connect again." };
    }
    return { ok: true, payload };
  } catch {
    return { ok: false, error: "OAuth state could not be parsed." };
  }
}
