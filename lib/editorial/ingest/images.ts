import { sniffImageMime } from "@/lib/editorial/images";
import { isSafeImageUrl } from "@/lib/editorial/validate";
import type { ImageRights } from "@/lib/editorial/ingest/types";

export const EDITORIAL_FALLBACK_IMAGE = "/editorial/desk-mark.png";

export function editorialFallbackImage(): ImageDecision {
  return {
    status: "fallback",
    url: EDITORIAL_FALLBACK_IMAGE,
    alt: "Jimvio Media editorial mark. This is not a photograph of the subject.",
    caption: "No licensed photograph was available. This mark is not a picture of the subject.",
    license: "owned",
    mime: "image/png",
    width: 1200,
    height: 675,
    note: "Editorial mark used because the source did not grant a photograph.",
  };
}

export type ImageDecision = {
  status: "rejected" | "verified" | "fallback";
  url: string;
  alt: string;
  caption: string;
  license: string;
  mime: string | null;
  width: number | null;
  height: number | null;
  note: string;
};

function u16(bytes: Uint8Array, offset: number): number {
  return bytes[offset] + (bytes[offset + 1] << 8);
}

function u32(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] * 16777216) + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3];
}

export function imageDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  const mime = sniffImageMime(bytes);
  if (mime === "image/png" && bytes.length >= 24) {
    return { width: u32(bytes, 16), height: u32(bytes, 20) };
  }
  if (mime === "image/gif" && bytes.length >= 10) {
    return { width: u16(bytes, 6), height: u16(bytes, 8) };
  }
  if (mime === "image/jpeg") {
    let index = 2;
    while (index + 8 < bytes.length) {
      if (bytes[index] !== 0xff) return null;
      const marker = bytes[index + 1];
      if (marker === 0xd8 || marker === 0xd9) {
        index += 2;
        continue;
      }
      const length = (bytes[index + 2] << 8) + bytes[index + 3];
      if (length < 2 || index + 2 + length > bytes.length) return null;
      if (marker >= 0xc0 && marker <= 0xc2) {
        return {
          height: (bytes[index + 5] << 8) + bytes[index + 6],
          width: (bytes[index + 7] << 8) + bytes[index + 8],
        };
      }
      index += 2 + length;
    }
  }
  return null;
}

function acceptableSize(width: number, height: number): boolean {
  return width >= 320 && height >= 200 && width <= 8000 && height <= 8000;
}

export function evaluateImage(input: {
  rights: ImageRights;
  url: string | null;
  bytes: Uint8Array | null;
  attribution: string | null;
  sourceName: string;
  license: string | null;
}): ImageDecision {
  const rejected = (note: string): ImageDecision => ({
    status: "rejected",
    url: "",
    alt: "",
    caption: "",
    license: "",
    mime: null,
    width: null,
    height: null,
    note,
  });
  if (input.rights === "none" || !input.url) return rejected("No granted image rights.");
  if (!isSafeImageUrl(input.url)) return rejected("The image address is not an allowed URL.");
  const attribution = (input.attribution ?? "").trim();
  if ((input.rights === "attributed" || input.rights === "licensed") && attribution.length < 2) {
    return rejected("Attribution is required before this image can be used.");
  }
  if (!input.bytes) return rejected("The image bytes were not available to check.");
  const mime = sniffImageMime(input.bytes);
  if (!mime) return rejected("The file is not a JPEG, PNG, WEBP, or GIF.");
  const size = imageDimensions(input.bytes);
  if (!size || !acceptableSize(size.width, size.height)) {
    return rejected("The image dimensions could not be verified.");
  }
  const license = (input.license ?? input.rights).slice(0, 160);
  const alt = `Image supplied by ${input.sourceName}. This is not labeled as a picture of a named event or person.`.slice(0, 180);
  const caption = `${attribution || input.sourceName}. License: ${license}.`.slice(0, 300);
  return {
    status: input.rights === "owned" ? "fallback" : "verified",
    url: input.url,
    alt,
    caption,
    license,
    mime,
    width: size.width,
    height: size.height,
    note: "Rights, format, and dimensions were checked.",
  };
}
