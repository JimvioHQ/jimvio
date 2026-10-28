import { sniffImageMime } from "@/lib/editorial/images";
import { isEditorialMarkUrl } from "@/lib/editorial/image-display";
import { meaningfulCaption } from "@/lib/editorial/caption";
import { canonicalUrl } from "@/lib/editorial/ingest/feed";
import { fetchImage } from "@/lib/editorial/ingest/fetch";
import type { ExtractedPage } from "@/lib/editorial/ingest/page";
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
  if (mime === "image/webp") return webpDimensions(bytes);
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

function webpDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 30) return null;
  const tag = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
  if (tag === "VP8X") {
    return {
      width: 1 + bytes[24] + bytes[25] * 256 + bytes[26] * 65536,
      height: 1 + bytes[27] + bytes[28] * 256 + bytes[29] * 65536,
    };
  }
  if (tag === "VP8 " && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
    return {
      width: (bytes[26] + bytes[27] * 256) & 0x3fff,
      height: (bytes[28] + bytes[29] * 256) & 0x3fff,
    };
  }
  if (tag === "VP8L" && bytes[20] === 0x2f) {
    const bits = bytes[21] + bytes[22] * 256 + bytes[23] * 65536 + bytes[24] * 16777216;
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
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

const OFFICIAL_HOSTS = new Set(["nasa.gov", "nist.gov", "noaa.gov", "loc.gov"]);
const DECORATIVE_PATH = /favicon|apple-touch|sprite|logo|insignia|avatar|emoji|gravatar|spacer|pixel|badge|topic-card|\/plugins\//i;

export function registrableHost(hostname: string): string {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  const parts = host.split(".").filter(Boolean);
  return parts.length >= 2 ? parts.slice(-2).join(".") : host;
}

export function officialImageAllowed(pageUrl: string, imageUrl: string): boolean {
  const page = canonicalUrl(pageUrl);
  const image = canonicalUrl(imageUrl);
  if (!page || !image) return false;
  let pageHost = "";
  let imageHost = "";
  let path = "";
  try {
    pageHost = registrableHost(new URL(page).hostname);
    const parsed = new URL(image);
    imageHost = registrableHost(parsed.hostname);
    path = parsed.pathname;
  } catch {
    return false;
  }
  if (!OFFICIAL_HOSTS.has(pageHost) || pageHost !== imageHost) return false;
  if (DECORATIVE_PATH.test(path)) return false;
  return true;
}

function institutionReleased(text: string, publisher: string): boolean {
  const value = text.toLowerCase();
  if (publisher === "NASA") return /\bnasa\b/.test(value);
  if (publisher === "NIST") return /\bnist\b/.test(value);
  if (publisher === "NOAA") return /\bnoaa\b/.test(value);
  if (publisher === "the Library of Congress") return /library of congress/.test(value);
  return false;
}

function publisherLabel(pageUrl: string): string {
  try {
    const host = registrableHost(new URL(pageUrl).hostname);
    if (host === "nasa.gov") return "NASA";
    if (host === "nist.gov") return "NIST";
    if (host === "noaa.gov") return "NOAA";
    if (host === "loc.gov") return "the Library of Congress";
  } catch {
    return "the publishing institution";
  }
  return "the publishing institution";
}

function officialAlt(caption: string, publisher: string): string {
  const withoutCredit = caption.replace(/\s*credit:\s*[^.]+\.?/i, "").replace(/\s+/g, " ").trim();
  const base = withoutCredit || `Photograph published by ${publisher} with this announcement.`;
  return base.slice(0, 180);
}

export function evaluateOfficialAsset(input: {
  pageUrl: string;
  imageUrl: string;
  bytes: Uint8Array | null;
  alt: string;
  caption: string;
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
  if (!officialImageAllowed(input.pageUrl, input.imageUrl) || isEditorialMarkUrl(input.imageUrl)) {
    return rejected("The image is not an official asset on the source site.");
  }
  if (!isSafeImageUrl(input.imageUrl)) return rejected("The image address is not an allowed URL.");
  if (!input.bytes || input.bytes.length < 10) return rejected("The image bytes were not available to check.");
  if (input.bytes[0] === 0x3c) return rejected("The response was not an image.");
  const mime = sniffImageMime(input.bytes);
  if (!mime || mime === "image/gif") return rejected("The file is not a JPEG, PNG, or WEBP of a usable size.");
  const size = imageDimensions(input.bytes);
  if (!size || size.width < 640 || size.height < 360 || size.width > 8000 || size.height > 8000) {
    return rejected("The image is smaller than the editorial minimum.");
  }
  const publisher = publisherLabel(input.pageUrl);
  if (!institutionReleased(`${input.caption} ${input.alt}`, publisher)) {
    return rejected("The image credit does not show that the institution released it.");
  }
  const caption = meaningfulCaption(input.caption) ?? "";
  const alt = officialAlt(caption || input.alt, publisher).slice(0, 180);
  return {
    status: "verified",
    url: canonicalUrl(input.imageUrl) ?? "",
    alt,
    caption,
    license: "US government work",
    mime,
    width: size.width,
    height: size.height,
    note: `Verified ${publisher} asset on the source page. Not a Jimvio photograph.`,
  };
}

export async function selectOfficialImage(page: ExtractedPage, fetchImpl: typeof fetch = fetch): Promise<ImageDecision> {
  const ranked = [...page.images].sort((left, right) => {
    const leftScore = (left.caption ? 2 : 0) + (left.url.includes("?") ? 0 : 1);
    const rightScore = (right.caption ? 2 : 0) + (right.url.includes("?") ? 0 : 1);
    return rightScore - leftScore;
  });
  let last = "No official image was available.";
  for (const candidate of ranked.slice(0, 3)) {
    if (!officialImageAllowed(page.url, candidate.url)) continue;
    const bytes = await fetchImage(candidate.url, fetchImpl);
    const decision = evaluateOfficialAsset({
      pageUrl: page.url,
      imageUrl: candidate.url,
      bytes,
      alt: candidate.alt,
      caption: candidate.caption || page.captions[0] || "",
    });
    if (decision.status === "verified") return decision;
    last = decision.note;
  }
  return {
    status: "rejected",
    url: "",
    alt: "",
    caption: "",
    license: "",
    mime: null,
    width: null,
    height: null,
    note: last,
  };
}
