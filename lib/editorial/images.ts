/** Stay under the platform request-body limit so a large file returns JSON instead of an empty failure. */
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export function sniffImageMime(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | "image/gif" | null {
  if (bytes.length > MAX_IMAGE_BYTES) return null;
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (
    bytes.length > 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  const gif = String.fromCharCode(...bytes.slice(0, 6));
  if (gif === "GIF87a" || gif === "GIF89a") return "image/gif";
  return null;
}

export function imageExtension(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

export { MAX_IMAGE_BYTES };
