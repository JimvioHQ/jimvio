import { v2 as cloudinary } from "cloudinary";
import { isPrivateCloudinaryUrl } from "./files";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type ByteLoad =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; code: "not_private" | "unavailable" | "too_large" };

/**
 * Read a private Cloudinary object with the server credential.
 * Public, unsigned, and non-Cloudinary URLs are not fetched.
 * Redirects are refused. Reading stops above maxBytes so an oversized file
 * is never buffered or sent to a scanner.
 */
export async function loadScannableFileBytes(
  storedUrl: string,
  maxBytes: number,
  fetchImpl: FetchLike = fetch,
): Promise<ByteLoad> {
  if (!isPrivateCloudinaryUrl(storedUrl)) return { ok: false, code: "not_private" };
  const signed = signPrivateCloudinaryRead(storedUrl);
  if (!signed) return { ok: false, code: "unavailable" };
  return readBoundedHttpsBytes(signed, maxBytes, fetchImpl);
}

export function signPrivateCloudinaryRead(storedUrl: string): string | null {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloud || !apiKey || !apiSecret) return null;
  const asset = parseCloudinaryAsset(storedUrl);
  if (!asset) return null;
  if (asset.type === "upload") return null;
  cloudinary.config({ cloud_name: cloud, api_key: apiKey, api_secret: apiSecret, secure: true });
  const signed = cloudinary.url(asset.publicId, {
    secure: true,
    sign_url: true,
    resource_type: asset.resourceType,
    type: asset.type,
    format: asset.format,
    expires_at: Math.floor(Date.now() / 1000) + 120,
  });
  try {
    const url = new URL(signed);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    if (host !== "res.cloudinary.com" && !host.endsWith(".cloudinary.com")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function readBoundedHttpsBytes(
  signedUrl: string,
  maxBytes: number,
  fetchImpl: FetchLike,
): Promise<ByteLoad> {
  let parsed: URL;
  try {
    parsed = new URL(signedUrl);
  } catch {
    return { ok: false, code: "unavailable" };
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    return { ok: false, code: "unavailable" };
  }
  const host = parsed.hostname.toLowerCase();
  if (host !== "res.cloudinary.com" && !host.endsWith(".cloudinary.com")) {
    return { ok: false, code: "unavailable" };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetchImpl(parsed.toString(), {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
    });
    if (response.status >= 300 && response.status < 400) return { ok: false, code: "unavailable" };
    if (!response.ok) return { ok: false, code: "unavailable" };
    const declared = Number(response.headers.get("content-length") || "");
    if (Number.isFinite(declared) && declared > maxBytes) return { ok: false, code: "too_large" };
    if (!response.body) {
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength === 0) return { ok: false, code: "unavailable" };
      if (bytes.byteLength > maxBytes) return { ok: false, code: "too_large" };
      return { ok: true, bytes };
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const step = await reader.read();
      if (step.done) break;
      total += step.value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, code: "too_large" };
      }
      chunks.push(step.value);
    }
    if (total === 0) return { ok: false, code: "unavailable" };
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { ok: true, bytes };
  } catch {
    return { ok: false, code: "unavailable" };
  } finally {
    clearTimeout(timer);
  }
}

function parseCloudinaryAsset(raw: string): {
  publicId: string;
  format: string;
  type: "upload" | "private" | "authenticated";
  resourceType: "image" | "video" | "raw";
} | null {
  try {
    const pathname = new URL(raw).pathname;
    const match = pathname.match(/\/(image|video|raw)\/(upload|private|authenticated)\//);
    if (!match || match.index == null) return null;
    const resourceType = match[1] as "image" | "video" | "raw";
    const type = match[2] as "upload" | "private" | "authenticated";
    let id = pathname.slice(match.index + match[0].length).replace(/^v\d+\//, "");
    const format = id.includes(".") ? (id.split(".").pop() || "bin") : "bin";
    id = id.replace(/\.[^/.]+$/, "");
    if (!id || id.includes("..")) return null;
    return { publicId: id, format, type, resourceType };
  } catch {
    return null;
  }
}
