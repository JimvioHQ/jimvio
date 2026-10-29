import "server-only";
import exifr from "exifr";
import sharp from "sharp";
import type { CheckerResult, Finding } from "./types";
import type { FileType } from "./file-inspect";
import { dHashFromPixels, findMarkers, markerFindings } from "./media-inspect";
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
      exif = ((await exifr.parse(buf, { tiff: true, exif: true, gps: true, xmp: true, iptc: true, icc: false, mergeOutput: true })) ?? null) as Record<string, unknown> | null;
      sources.add("EXIF/XMP/IPTC");
    } catch {
      exif = null;
    }
  }
  const markers = findMarkers(buf, exif);
  if (markers.c2pa.present) sources.add("C2PA Content Credentials");
  const findings: Finding[] = markerFindings(markers);

  let dhash: string | null = null;
  if (type.kind === "image") {
    try {
      const img = sharp(buf, { limitInputPixels: 80_000_000, failOn: "none" });
      const meta = await img.metadata();
      if (meta.width && meta.height) metrics.push({ label: "Size", value: `${meta.width} × ${meta.height}` });
      const px = await sharp(buf, { limitInputPixels: 80_000_000, failOn: "none" }).greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
      dhash = dHashFromPixels(new Uint8Array(px));
      sources.add("Perceptual hash");
      const seen = await seenImage(dhash);
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
  return {
    dhash,
    result: {
      ...base,
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
