import "server-only";
import exifr from "exifr";
import sharp from "sharp";
import type { CheckerResult, Finding, MediaDetails } from "./types";
import type { FileType } from "./file-inspect";
import { aiModelString, c2paAssertions, dHashFromPixels, editingSoftware, findMarkers, markerFindings, xmpFields } from "./media-inspect";
import { assessMedia, softwareKind } from "./media-assessment";
import { sha256 } from "./file-inspect";
import { seenFile } from "./fingerprints";
import { readVideoMeta } from "./video-meta";
import { seenImage } from "./fingerprints";

const EXT_FOR: Record<string, RegExp> = { image: /\.(jpe?g|png|gif|webp|heic|heif|avif|tiff?|bmp)$/i, video: /\.(mp4|m4v|mov|webm|mkv|avi)$/i, audio: /\.(mp3|wav|m4a|aac|ogg|flac)$/i };

const MEDIA_SUMMARY: Record<NonNullable<MediaDetails["assessment"]>["verdict"], string> = {
  AI_GENERATED_DECLARED: "The file's own metadata declares it was made with generative AI.",
  CREDENTIALS_UNVERIFIED: "Content Credentials are present but their signature was not validated.",
  CAMERA_ORIGIN_INDICATED: "Camera metadata is present; it supports but doesn't prove a camera capture.",
  EDITED_RECORDED: "Editing is recorded in the metadata.",
  PREVIOUSLY_SEEN: "This media was checked on Jimvio before.",
  ORIGIN_UNKNOWN: "No camera data, credentials or AI markers: origin can't be determined from the file.",
  INTEGRITY_ISSUE: "The file's real type doesn't match how it is presented.",
  SCAN_FAILED: "The file could not be analysed because of a technical problem.",
};

export type MediaInput = { buf: Buffer; name: string; type: FileType; origin: "upload" | "url" };

/** Checker 4: provenance, AI markers and duplicates for real media bytes. */
export async function checkMedia(input: MediaInput | null, reasonWhenMissing: string): Promise<{ result: CheckerResult; dhash: string | null }> {
  const base: CheckerResult = { id: "media", status: "not_applicable", summary: reasonWhenMissing, findings: [], metrics: [], sources: [], limits: [], nextSteps: [] };
  if (!input) return { result: base, dhash: null };
  const { buf, type } = input;
  const sources = new Set<string>(["File metadata"]);
  const limits: string[] = [];
  const metrics: CheckerResult["metrics"] = [{ label: "Type", value: type.label }];

  let exif: Record<string, unknown> | null = null;
  let exifFields = 0;
  let iptc: Record<string, string> | null = null;
  if (type.kind === "image") {
    try {
      exif = ((await exifr.parse(buf, { tiff: true, exif: true, gps: true, xmp: true, iptc: true, icc: true, mergeOutput: true })) ?? null) as Record<string, unknown> | null;
      sources.add("EXIF/XMP/IPTC");
    } catch {
      exif = null;
    }
    try {
      const tiffOnly = (await exifr.parse(buf, { tiff: true, ifd0: {}, exif: true, gps: true, xmp: false, iptc: false, icc: false, jfif: false, ihdr: false })) as Record<string, unknown> | undefined;
      exifFields = tiffOnly ? Object.keys(tiffOnly).length : 0;
    } catch {
      exifFields = 0;
    }
    try {
      const raw = (await exifr.parse(buf, { tiff: false, exif: false, gps: false, xmp: false, icc: false, jfif: false, ihdr: false, iptc: true })) as Record<string, unknown> | undefined;
      if (raw) {
        const pick: [string, string][] = [["Byline", "Creator"], ["Credit", "Credit"], ["Source", "Source"], ["CopyrightNotice", "Copyright"], ["Caption", "Caption"], ["ObjectName", "Title"], ["Keywords", "Keywords"], ["DateCreated", "Date created"], ["SpecialInstructions", "Usage terms"]];
        const out: Record<string, string> = {};
        for (const [k, label] of pick) {
          const v = raw[k];
          const str = Array.isArray(v) ? v.join(", ") : v instanceof Date ? v.toISOString().slice(0, 10) : typeof v === "string" || typeof v === "number" ? String(v) : "";
          if (str.trim()) out[label] = str.trim().slice(0, 160);
        }
        iptc = Object.keys(out).length ? out : null;
      }
    } catch {
      iptc = null;
    }
  }
  const xmp = type.kind === "image" || type.kind === "video" ? xmpFields(buf) : null;
  const markers = findMarkers(buf, exif);
  if (markers.c2pa.present) sources.add("C2PA Content Credentials");
  const findings: Finding[] = markerFindings(markers);

  let dhash: string | null = null;
  let width: number | null = null;
  let height: number | null = null;
  let colorSpace: string | null = null;
  let quality: MediaDetails["quality"] = null;
  let decodeError: string | null = null;
  let duplicate: MediaDetails["duplicate"] = null;
  const video = type.kind === "video" ? readVideoMeta(buf) : null;
  if (type.kind === "image") {
    try {
      const img = sharp(buf, { limitInputPixels: 80_000_000, failOn: "none" });
      const meta = await img.metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;
      colorSpace = meta.space ? String(meta.space) : null;
      try {
        const st = await sharp(buf, { limitInputPixels: 80_000_000, failOn: "none" }).stats();
        const depthBits: Record<string, number> = { uchar: 8, char: 8, ushort: 16, short: 16, uint: 32, int: 32, float: 32, double: 64 };
        quality = {
          bitDepth: meta.depth ? (depthBits[meta.depth] ?? null) : null,
          hasAlpha: Boolean(meta.hasAlpha),
          frames: meta.pages ?? null,
          compression: meta.format === "jpeg" ? `JPEG${meta.chromaSubsampling ? ` ${meta.chromaSubsampling}` : ""}${meta.isProgressive ? ", progressive" : ""}` : meta.format === "png" ? "PNG (lossless)" : meta.format ? meta.format.toUpperCase() : null,
          sharpness: Number.isFinite(st.sharpness) ? Math.round(st.sharpness * 100) / 100 : null,
          entropy: Number.isFinite(st.entropy) ? Math.round(st.entropy * 100) / 100 : null,
          orientation: meta.orientation ?? null,
          density: meta.density ?? null,
        };
      } catch {
        quality = null;
      }
      if (meta.width && meta.height) metrics.push({ label: "Size", value: `${meta.width} × ${meta.height}` });
      const px = await sharp(buf, { limitInputPixels: 80_000_000, failOn: "none" }).greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
      dhash = dHashFromPixels(new Uint8Array(px));
      sources.add("Perceptual hash");
      const seen = await seenImage(dhash);
      duplicate = { count: seen.count, near: Boolean(seen.near), firstSeenAt: seen.firstSeenAt ?? null };
      if (seen.count > 0) {
        findings.push({
          tone: "info",
          title: seen.near ? "A near-identical image was checked on Jimvio before" : "This exact image was checked on Jimvio before",
          detail: `First seen ${seen.firstSeenAt ? new Date(seen.firstSeenAt).toLocaleDateString("en-GB") : "earlier"}. A match doesn't prove copying.`,
          source: "Jimvio fingerprint history",
        });
      } else {
        findings.push({ tone: "info", title: "Not seen in Jimvio's checks before", detail: "Jimvio compares against images checked here, not the whole internet.", source: "Jimvio fingerprint history" });
      }
    } catch (e) {
      decodeError = e instanceof Error ? e.message.slice(0, 120) : "decode error";
      limits.push("The image could not be decoded for a visual fingerprint.");
    }
  } else {
    limits.push("Frame-by-frame video and voice analysis is not available yet; only metadata was read.");
  }
  if (video) sources.add("MP4/MOV container metadata");
  if (markers.camera) metrics.push({ label: "Camera", value: markers.camera });
  if (markers.software) metrics.push({ label: "Software", value: markers.software });
  metrics.push({ label: "Content Credentials", value: markers.c2pa.present ? "Found (not validated)" : "None" });

  limits.push("Missing AI markers or credentials don't prove a file is human-made.", "Jimvio does not have a global copyright database; duplicate checks cover files seen on Jimvio.");
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 80) : null);
  const lat = num(exif?.latitude);
  const lon = num(exif?.longitude);
  const software = markers.software ?? video?.software ?? null;
  const details: MediaDetails = {
    kind: "media",
    mediaType: type.kind === "video" ? "video" : type.kind === "audio" ? "audio" : "image",
    fileName: input.name.split("/").pop()?.slice(0, 120) || "media",
    size: buf.length,
    format: type.label,
    mime: type.mime,
    width: width ?? video?.width ?? null,
    height: height ?? video?.height ?? null,
    durationSec: video?.durationSec ?? null,
    frameRate: video?.frameRate ?? null,
    videoCodec: video?.videoCodec ?? null,
    audioCodec: video?.audioCodec ?? null,
    bitrate: video?.bitrate ?? null,
    colorSpace,
    iccProfile: text(exif?.ProfileDescription),
    exifPresent: Boolean(exif && Object.keys(exif).length > 0),
    make: text(exif?.Make) ?? video?.make ?? null,
    model: text(exif?.Model) ?? video?.model ?? null,
    lens: text(exif?.LensModel) ?? text(exif?.Lens),
    fNumber: num(exif?.FNumber),
    exposureTime: num(exif?.ExposureTime),
    iso: num(exif?.ISO),
    focalLength: num(exif?.FocalLength),
    capturedAt: markers.capturedAt ?? video?.createdAt ?? null,
    gps: lat != null && lon != null ? { lat, lon } : (video?.gps ?? null),
    software,
    editingSoftware: editingSoftware(software),
    c2pa: markers.c2pa,
    declaredAi: markers.declaredAi,
    aiTools: markers.toolHits,
    prompt: markers.prompt,
    copyright: text(exif?.Copyright) ?? text(exif?.rights),
    artist: text(exif?.Artist) ?? text(exif?.creator),
    duplicate,
    exifFields,
    iptc,
    xmp,
    aiModel: aiModelString(buf, markers.c2pa.generator),
    quality,
    integrityIssue: null,
    metadataConflicts: [],
    exactSeen: 0,
    digitizedAt: exif?.CreateDate instanceof Date ? (exif.CreateDate as Date).toISOString() : null,
    modifiedAt: exif?.ModifyDate instanceof Date ? (exif.ModifyDate as Date).toISOString() : xmp?.modifyDate ?? null,
    flash: text(exif?.Flash),
    whiteBalance: text(exif?.WhiteBalance),
  };
  details.c2pa = { ...markers.c2pa, assertions: markers.c2pa.present ? c2paAssertions(buf) : [] };
  // Capture time comes only from capture fields, never the file-system or upload date.
  const original = exif?.DateTimeOriginal;
  // exifr builds Dates from EXIF's zone-less clock in the server's local time; keep the clock as written.
  const naive = (v: unknown) => (v instanceof Date && Number.isFinite(v.getTime()) ? new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate(), v.getHours(), v.getMinutes(), v.getSeconds())).toISOString() : null);
  details.capturedAt = naive(original) ?? (typeof original === "string" ? original : null) ?? (video?.createdAt ?? null);
  details.digitizedAt = naive(exif?.CreateDate);
  details.modifiedAt = naive(exif?.ModifyDate) ?? details.modifiedAt;
  if (type.kind === "image") details.exifPresent = exifFields > 0;
  // An operating-system name is not editing software.
  if (softwareKind(details.software) === "os") details.editingSoftware = null;
  const extOk = EXT_FOR[details.mediaType]?.test(input.name) ?? true;
  if (input.origin === "upload" && !extOk && /\.[a-z0-9]{2,5}$/i.test(input.name)) details.integrityIssue = `The name ends in .${input.name.split(".").pop()} but the file is really a ${type.label}.`;
  if (decodeError && details.mediaType === "image") details.integrityIssue = null;
  const conflicts: string[] = [];
  if (details.make && (details.aiTools.length || details.declaredAi.length)) conflicts.push(`camera metadata (${details.make}) alongside an AI-generation declaration`);
  if (original instanceof Date && exif?.ModifyDate instanceof Date && (exif.ModifyDate as Date).getTime() < original.getTime() - 86_400_000) conflicts.push("modified date is earlier than the capture date");
  details.metadataConflicts = conflicts;
  if (details.mediaType !== "image") {
    const seen = await seenFile(sha256(buf)).catch(() => ({ count: 0, firstSeenAt: null, near: false }));
    details.exactSeen = seen.count;
  }
  const assessment = assessMedia({ details });
  details.assessment = assessment;
  const finalStatus: CheckerResult["status"] = assessment.verdict === "INTEGRITY_ISSUE" ? "suspicious" : assessment.verdict === "AI_GENERATED_DECLARED" || assessment.verdict === "EDITED_RECORDED" || assessment.verdict === "PREVIOUSLY_SEEN" ? "evidence_found" : "inconclusive";
  return {
    dhash,
    result: {
      ...base,
      details,
      status: finalStatus,
      summary: MEDIA_SUMMARY[assessment.verdict],
      findings,
      metrics,
      sources: [...sources],
      limits,
      nextSteps: assessment.actions,
    },
  };
}
