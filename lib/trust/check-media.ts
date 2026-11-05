import "server-only";
import exifr from "exifr";
import sharp from "sharp";
import type { CheckerResult, Finding, MediaDetails } from "./types";
import type { FileType } from "./file-inspect";
import { dHashFromPixels, editingSoftware, findMarkers, markerFindings } from "./media-inspect";
import { readVideoMeta } from "./video-meta";
import { seenImage } from "./fingerprints";

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
  if (type.kind === "image") {
    try {
      exif = ((await exifr.parse(buf, { tiff: true, exif: true, gps: true, xmp: true, iptc: true, icc: true, mergeOutput: true })) ?? null) as Record<string, unknown> | null;
      sources.add("EXIF/XMP/IPTC");
    } catch {
      exif = null;
    }
  }
  const markers = findMarkers(buf, exif);
  if (markers.c2pa.present) sources.add("C2PA Content Credentials");
  const findings: Finding[] = markerFindings(markers);

  let dhash: string | null = null;
  let width: number | null = null;
  let height: number | null = null;
  let colorSpace: string | null = null;
  let duplicate: MediaDetails["duplicate"] = null;
  const video = type.kind === "video" ? readVideoMeta(buf) : null;
  if (type.kind === "image") {
    try {
      const img = sharp(buf, { limitInputPixels: 80_000_000, failOn: "none" });
      const meta = await img.metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;
      colorSpace = meta.space ? String(meta.space) : null;
      if (meta.width && meta.height) metrics.push({ label: "Size", value: `${meta.width} × ${meta.height}` });
      const px = await sharp(buf, { limitInputPixels: 80_000_000, failOn: "none" }).greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
      dhash = dHashFromPixels(new Uint8Array(px));
      sources.add("Perceptual hash");
      const seen = await seenImage(dhash);
      duplicate = { count: seen.count, near: Boolean(seen.near), firstSeenAt: seen.firstSeenAt ?? null };
      if (seen.count > 0) {
        findings.push({
          tone: "warn",
          title: seen.near ? "A near-identical image was checked on Jimvio before" : "This exact image was checked on Jimvio before",
          detail: `First seen ${seen.firstSeenAt ? new Date(seen.firstSeenAt).toLocaleDateString("en-GB") : "earlier"}. It may be reused content.`,
          source: "Jimvio fingerprint history",
        });
      } else {
        findings.push({ tone: "info", title: "Not seen in Jimvio's checks before", detail: "Jimvio compares against images checked here, not the whole internet.", source: "Jimvio fingerprint history" });
      }
    } catch {
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
  const aiEvidence = markers.declaredAi.length > 0 || markers.toolHits.length > 0 || markers.c2pa.aiAction;
  const dup = findings.some((f) => f.source === "Jimvio fingerprint history" && f.tone === "warn");
  const status: CheckerResult["status"] = aiEvidence || dup ? "evidence_found" : "inconclusive";
  const summary = aiEvidence
    ? "The file itself says AI was used to make or edit it."
    : dup
      ? "This media was seen on Jimvio before — it may be reused."
      : "No AI, provenance or duplicate evidence found. That isn't proof it's original or human-made.";
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
  };
  return {
    dhash,
    result: {
      ...base,
      details,
      status,
      summary,
      findings,
      metrics,
      sources: [...sources],
      limits,
      nextSteps: aiEvidence
        ? ["Check whether AI content is allowed where you plan to use it.", "Label AI content clearly when you publish it."]
        : ["Ask the creator for the original file or project file if originality matters."],
    },
  };
}
