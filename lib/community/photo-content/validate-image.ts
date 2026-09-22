/**
 * Download + validate licensed images before Cloudinary upload.
 * Uses sharp when available; falls back to magic-byte checks for serverless.
 */

export type ValidatedImage = {
  buffer: Buffer;
  contentType: string;
  width: number;
  height: number;
  bytes: number;
  sourceUrl: string;
};

const MIN_WIDTH = 640;
const MIN_HEIGHT = 480;
const MAX_BYTES = 12 * 1024 * 1024;
const MIN_BYTES = 8 * 1024;

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
]);

function sniffContentType(buffer: Buffer, headerType: string | null): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (headerType && IMAGE_TYPES.has(headerType.split(";")[0]!.trim().toLowerCase())) {
    return headerType.split(";")[0]!.trim().toLowerCase();
  }
  return null;
}

/** Minimal JPEG SOF dimension parse (no native deps). */
function jpegDimensions(buffer: Buffer): { width: number; height: number } | null {
  let i = 2;
  while (i < buffer.length - 9) {
    if (buffer[i] !== 0xff) break;
    const marker = buffer[i + 1]!;
    const size = (buffer[i + 2]! << 8) + buffer[i + 3]!;
    // SOF0 / SOF2
    if (marker === 0xc0 || marker === 0xc2) {
      const height = (buffer[i + 5]! << 8) + buffer[i + 6]!;
      const width = (buffer[i + 7]! << 8) + buffer[i + 8]!;
      return { width, height };
    }
    i += 2 + size;
  }
  return null;
}

function pngDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 24) return null;
  if (buffer.toString("ascii", 12, 16) !== "IHDR") return null;
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

function liteDimensions(
  buffer: Buffer,
  contentType: string
): { width: number; height: number } | null {
  if (contentType === "image/jpeg" || contentType === "image/jpg") {
    return jpegDimensions(buffer);
  }
  if (contentType === "image/png") return pngDimensions(buffer);
  return null;
}

async function sharpMetadata(
  buffer: Buffer
): Promise<{ width?: number; height?: number } | null> {
  try {
    const sharp = (await import("sharp")).default;
    return await sharp(buffer, { failOn: "error" }).metadata();
  } catch {
    return null;
  }
}

export async function downloadAndValidateImage(sourceUrl: string): Promise<ValidatedImage> {
  const res = await fetch(sourceUrl, {
    redirect: "follow",
    headers: {
      "User-Agent": "JimvioEditorialPhotoSeeder/1.0 (+https://www.jimvio.com)",
      Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
    },
  });
  if (!res.ok) {
    throw new Error(`download failed HTTP ${res.status}`);
  }

  const headerType = res.headers.get("content-type");
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.byteLength < MIN_BYTES) {
    throw new Error(`image too small (${buffer.byteLength} bytes)`);
  }
  if (buffer.byteLength > MAX_BYTES) {
    throw new Error(`image too large (${buffer.byteLength} bytes)`);
  }

  const head = buffer.slice(0, 64).toString("utf8").toLowerCase();
  if (head.includes("<!doctype") || head.includes("<html") || head.includes("<body")) {
    throw new Error("response looks like HTML, not an image");
  }

  const contentType = sniffContentType(buffer, headerType);
  if (!contentType || !IMAGE_TYPES.has(contentType)) {
    throw new Error(`unsupported content type: ${headerType ?? "unknown"}`);
  }

  const meta = await sharpMetadata(buffer);
  let width = meta?.width ?? 0;
  let height = meta?.height ?? 0;
  if (!width || !height) {
    const lite = liteDimensions(buffer, contentType);
    width = lite?.width ?? 0;
    height = lite?.height ?? 0;
  }

  // WebP without sharp: accept when magic bytes + size look healthy.
  if ((!width || !height) && contentType === "image/webp" && buffer.byteLength >= 40_000) {
    width = Math.max(width, MIN_WIDTH);
    height = Math.max(height, MIN_HEIGHT);
  }

  if (width < MIN_WIDTH || height < MIN_HEIGHT) {
    throw new Error(`dimensions too small (${width}x${height})`);
  }

  return {
    buffer,
    contentType,
    width,
    height,
    bytes: buffer.byteLength,
    sourceUrl,
  };
}
