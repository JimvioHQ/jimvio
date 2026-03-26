/**
 * PawaPay optional HTTP message signatures (RFC 9421) for financial POSTs.
 * When enabled in the dashboard, requests without valid Signature headers return HTTP_SIGNATURE_ERROR (401).
 * @see https://docs.pawapay.io/v2/docs/signatures
 * @see https://github.com/pawaPay/signatures-node-example
 */

import { createHash, createPrivateKey, createSign } from "crypto";
import { httpbis } from "http-message-signatures";

/** Explicitly use Bearer-only POSTs (no RFC 9421 headers). Use when the dashboard does not require signed requests. */
function isHttpSigningExplicitlyDisabled(): boolean {
  const v = process.env.PAWAPAY_HTTP_SIGNING_DISABLED?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function isPlaceholderKeyId(id: string): boolean {
  const s = id.trim().toLowerCase();
  if (!s) return true;
  if (s === "your_dashboard_key_id") return true;
  if (s.startsWith("your_")) return true;
  if (s === "changeme" || s === "example" || s === "placeholder") return true;
  return false;
}

/** Reject .env leftovers that look like a real PEM */
function looksLikeValidPrivateKeyPem(pem: string): boolean {
  const p = pem.replace(/\\n/g, "\n");
  return /BEGIN (?:EC |RSA |OPENSSH )?PRIVATE KEY/.test(p);
}

/**
 * True only when both key id and PEM look real — ignores placeholders so we fall back to unsigned POSTs.
 * If PawaPay still returns HTTP 401 HTTP_SIGNATURE_ERROR, disable signed requests in the dashboard or add real keys.
 */
export function isPawaPayHttpSigningConfigured(): boolean {
  if (isHttpSigningExplicitlyDisabled()) return false;

  const keyId = process.env.PAWAPAY_HTTP_SIGNING_KEY_ID?.trim() ?? "";
  const pem = process.env.PAWAPAY_HTTP_SIGNING_PRIVATE_KEY?.trim() ?? "";
  if (!keyId || !pem) return false;
  if (isPlaceholderKeyId(keyId)) return false;
  if (!looksLikeValidPrivateKeyPem(pem)) return false;
  return true;
}

/** PEM with literal \n from .env → real newlines */
function loadPrivateKeyPem(): string {
  const raw = process.env.PAWAPAY_HTTP_SIGNING_PRIVATE_KEY?.trim();
  if (!raw) throw new Error("PAWAPAY_HTTP_SIGNING_PRIVATE_KEY is not set");
  return raw.replace(/\\n/g, "\n");
}

export function sha512ContentDigest(body: string): string {
  const b64 = createHash("sha512").update(body, "utf8").digest("base64");
  return `sha-512=:${b64}:`;
}

function buildSigner(privateKeyPem: string, algorithm: string, keyId: string) {
  const privateKey = createPrivateKey(privateKeyPem);
  return {
    id: keyId,
    alg: algorithm,
    async sign(data: Buffer) {
      return createSign("SHA256").update(data).sign(privateKey);
    },
  };
}

/**
 * Returns headers for a signed POST (Authorization + Content-* + Signature + Signature-Input).
 * Use the same `body` string for fetch() as was used to compute Content-Digest.
 */
export async function buildSignedPawaPayPostHeaders(
  fullUrl: string,
  bodyUtf8: string,
  bearerToken: string
): Promise<Record<string, string>> {
  const keyId = process.env.PAWAPAY_HTTP_SIGNING_KEY_ID?.trim();
  if (!keyId) throw new Error("PAWAPAY_HTTP_SIGNING_KEY_ID is not set");

  const algorithm =
    process.env.PAWAPAY_HTTP_SIGNING_ALG?.trim() || "ecdsa-p256-sha256";

  const privateKeyPem = loadPrivateKeyPem();
  const key = buildSigner(privateKeyPem, algorithm, keyId);

  const signatureDate = new Date().toISOString();
  const contentDigest = sha512ContentDigest(bodyUtf8);
  const contentLength = String(Buffer.byteLength(bodyUtf8, "utf8"));

  const headers: Record<string, string> = {
    Authorization: `Bearer ${bearerToken}`,
    "Content-Type": "application/json; charset=UTF-8",
    Accept: "application/json",
    "Accept-Signature": "rsa-pss-sha512,ecdsa-p256-sha256,rsa-v1_5-sha256,ecdsa-p384-sha384",
    "Accept-Digest": "sha-256,sha-512",
    "Signature-Date": signatureDate,
    "Content-Digest": contentDigest,
    "Content-Length": contentLength,
  };

  const signed = await httpbis.signMessage(
    {
      key,
      name: "sig-pp",
      fields: [
        "@method",
        "@authority",
        "@path",
        "signature-date",
        "content-digest",
        "content-type",
        "content-length",
      ],
    },
    {
      method: "POST",
      url: fullUrl,
      headers,
    }
  );

  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(signed.headers)) {
    out[k] = Array.isArray(v) ? v.join(", ") : String(v);
  }
  return out;
}

/** Unsigned POST headers (when dashboard does not require signatures). */
export function getPawaPayUnsignedPostHeaders(apiToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/**
 * Signed headers if `PAWAPAY_HTTP_SIGNING_*` is set; otherwise unsigned Bearer-only headers.
 */
export async function getPawaPayPostHeaders(
  fullUrl: string,
  bodyUtf8: string,
  apiToken: string
): Promise<Record<string, string>> {
  if (!isPawaPayHttpSigningConfigured()) {
    return getPawaPayUnsignedPostHeaders(apiToken);
  }
  try {
    return await buildSignedPawaPayPostHeaders(fullUrl, bodyUtf8, apiToken);
  } catch (e) {
    throw new Error(
      `PawaPay HTTP signing failed: ${e instanceof Error ? e.message : String(e)}. Check PAWAPAY_HTTP_SIGNING_PRIVATE_KEY (PEM) and PAWAPAY_HTTP_SIGNING_KEY_ID (must match the public key in the dashboard).`
    );
  }
}
