/**
 * Download + validate licensed images before Cloudinary upload.
 */
import sharp from "sharp";

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

  // Reject HTML error pages saved as "images"
  const head = buffer.slice(0, 64).toString("utf8").toLowerCase();
  if (head.includes("<!doctype") || head.includes("<html") || head.includes("<body")) {
    throw new Error("response looks like HTML, not an image");
  }

  const contentType = sniffContentType(buffer, headerType);
  if (!contentType || !IMAGE_TYPES.has(contentType)) {
    throw new Error(`unsupported content type: ${headerType ?? "unknown"}`);
  }

  let meta: sharp.Metadata;
  try {
    meta = await sharp(buffer, { failOn: "error" }).metadata();
  } catch {
    throw new Error("image decode failed (corrupt)");
  }

  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
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
