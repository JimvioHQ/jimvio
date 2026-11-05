/**
 * The single authoritative verdict for Media Metadata & Provenance. Pure:
 * computed once by the scanner and stored with the report.
 *
 * Dimensions stay separate: how a file was made (creation method) is not
 * whether it is authentic; an AI-generated image can be an authentic AI
 * original, a camera photo can have unknown provenance, and a missing
 * marker never proves anything. Metadata is always a claim, never a fact.
 */
import type { MediaAssessment, MediaCheck, MediaCheckStatus, MediaDetails } from "./types";

export const MEDIA_MODEL = "media-provenance-v2 (Nov 2026)";

/** Values that describe an operating system, not a camera or an editor. */
const OS_SOFTWARE = /^(microsoft )?windows( \d+| xp| vista| phone)?\b|^android\b|^ios\b|^ipados\b|^macos\b|^mac os x\b|^linux\b|^chrome ?os\b/i;
const EDITORS = /photoshop|lightroom|gimp|affinity|snapseed|picsart|canva|facetune|pixelmator|capture one|darktable|luminar|premiere|final cut|davinci|resolve|capcut|imovie|after effects|vsco|inshot|kinemaster|clipchamp|paint\.net|photopea|fotor|befunky|krita|corel|paintshop|meitu|lensa|remini|faceapp/i;

export function softwareKind(sw: string | null | undefined): "none" | "os" | "editor" | "camera" | "ai" | "other" {
  if (!sw) return "none";
  const s = sw.trim();
  if (OS_SOFTWARE.test(s)) return "os";
  if (EDITORS.test(s)) return "editor";
  if (/firmware|^ver\.?\s?\d|^v\d+\.\d+|^[A-Z]{1,4}\d{2,}[A-Z0-9.\- ]*$|hdr\+|camera|^\d+\.\d+(\.\d+)?$/i.test(s)) return "camera";
  if (/openai|dall|midjourney|firefly|stable diffusion|comfyui|imagen|gemini|ideogram|leonardo|flux|runway|sora/i.test(s)) return "ai";
  return "other";
}

type Input = { details: MediaDetails; failed?: boolean };

export function assessMedia({ details: d, failed = false }: Input): MediaAssessment {
  const isVideo = d.mediaType === "video";
  const isAudio = d.mediaType === "audio";
  const Noun = isVideo ? "Video" : isAudio ? "Audio" : "Image";
  const noun = Noun.toLowerCase();
  const checks: MediaCheck[] = [];
  const add = (c: Omit<MediaCheck, "evidence"> & { evidence?: string[] }) => checks.push({ evidence: [], ...c });

  const decoded = isVideo ? d.width != null || d.durationSec != null : isAudio ? true : d.width != null;
  const camera = [d.make, d.model].filter(Boolean).join(" ").replace(/^(\w+)\s+\1\b/i, "$1") || null;
  const swKind = softwareKind(d.software);
  const c2 = d.c2pa;
  const aiDeclared = d.declaredAi.length > 0 || d.aiTools.length > 0 || Boolean(d.prompt) || c2.aiAction;
  const aiTool = d.aiTools[0] ?? (d.prompt ? "Stable Diffusion / ComfyUI" : null) ?? (c2.aiAction ? c2.generator : null);
  const editor = swKind === "editor" ? d.software : d.editingSoftware;
  const historyEdits = d.xmp?.historyActions?.filter((a) => /edit|modif|filter|paint|crop|retouch|composite|produced|derived/i.test(a)) ?? [];
  const dup = d.duplicate && d.duplicate.count > 0 ? d.duplicate : null;

  // 1 Integrity
  add({
    id: "integrity", name: "File Integrity & Format", source: "File signature · decoder",
    status: d.integrityIssue ? "DETECTED" : decoded ? "VERIFIED" : "FAILED", tone: d.integrityIssue ? "warn" : decoded ? "good" : "neutral",
    label: d.integrityIssue ? "Issue Found" : decoded ? "Passed" : "Could Not Decode",
    explanation: d.integrityIssue ?? (decoded ? `The file's own bytes identify it as ${d.format} and it decodes correctly. This covers the implemented structure checks only; it says nothing about where the ${noun} came from.` : `The ${noun} could not be decoded, so its structure could not be checked. This is a processing problem, not evidence of tampering.`),
  });
  // 2–4 Metadata blocks
  if (!isVideo && !isAudio) {
    add({
      id: "exif", name: "EXIF Metadata", source: "EXIF (TIFF/IFD)",
      status: d.exifPresent ? "DETECTED" : "NOT_FOUND", tone: "info", label: d.exifPresent ? `Present${d.exifFields ? ` (${d.exifFields} fields)` : ""}` : "Not Found",
      explanation: d.exifPresent ? "EXIF fields were read. EXIF can be copied, edited or forged." : "The file carries no EXIF block. Many apps and platforms strip it; that alone proves nothing.",
    });
    add({
      id: "iptc", name: "IPTC Metadata", source: "IPTC IIM / XMP-Iptc",
      status: d.iptc && Object.keys(d.iptc).length ? "DETECTED" : "NOT_FOUND", tone: "info",
      label: d.iptc && Object.keys(d.iptc).length ? "Present" : "Not Found",
      explanation: d.iptc && Object.keys(d.iptc).length ? `Fields: ${Object.entries(d.iptc).slice(0, 5).map(([k, v]) => `${k}: ${v}`).join(" · ")}` : "No IPTC creator, credit, source or rights fields.",
    });
    add({
      id: "xmp", name: "XMP Metadata", source: "XMP packet",
      status: d.xmp ? "DETECTED" : "NOT_FOUND", tone: "info", label: d.xmp ? "Present" : "Not Found",
      explanation: d.xmp ? [d.xmp.creatorTool ? `Creator tool: ${d.xmp.creatorTool}` : "", d.xmp.historyActions?.length ? `${d.xmp.historyActions.length} history step(s)` : "", d.xmp.digitalSourceType ? `Digital source: ${d.xmp.digitalSourceType}` : ""].filter(Boolean).join(" · ") || "An XMP packet is present." : "No XMP packet.",
    });
  } else {
    add({
      id: "exif", name: "Container Metadata", source: "MP4/MOV container",
      status: camera || d.software || d.capturedAt ? "DETECTED" : "NOT_FOUND", tone: "info", label: camera || d.software || d.capturedAt ? "Present" : "Not Found",
      explanation: camera || d.software || d.capturedAt ? "Device, encoder or date tags were read from the container. They can be edited." : "No device, encoder or date tags in the container.",
    });
  }
  // 5–6 C2PA
  add({
    id: "c2pa", name: "C2PA / Content Credentials", source: "JUMBF / C2PA manifest store",
    status: c2.present ? "DETECTED" : "NOT_FOUND", tone: c2.present ? "info" : "neutral", label: c2.present ? "Credentials Found" : "Not Found",
    explanation: c2.present ? `A Content Credentials manifest is embedded${c2.generator ? ` (claim generator: ${c2.generator})` : ""}${c2.aiAction ? "; it contains an AI-generation assertion" : ""}.` : "No Content Credentials manifest. Most media has none; this doesn't suggest manipulation.",
    evidence: c2.assertions ?? [],
  });
  add({
    id: "c2pa_sig", name: "C2PA Signature Validation", source: "C2PA trust validation",
    status: c2.present ? "UNAVAILABLE" : "NOT_APPLICABLE", tone: "neutral", label: c2.present ? "Not Validated" : "Not Applicable",
    explanation: c2.present ? "Cryptographic signature and certificate validation is not available yet, so the credential's claims are shown as unverified." : "There is no credential to validate.",
  });
  // 7 Origin
  const origin: MediaAssessment["provenance"] = c2.present ? "CREDENTIALS_PRESENT_UNVERIFIED" : aiDeclared || camera || d.iptc?.Source || d.iptc?.Credit ? "METADATA_INDICATED" : "ORIGIN_UNKNOWN";
  add({
    id: "origin", name: "Origin & Provenance", source: "C2PA · IPTC · EXIF",
    status: origin === "ORIGIN_UNKNOWN" ? "INCONCLUSIVE" : "DETECTED", tone: origin === "ORIGIN_UNKNOWN" ? "neutral" : "info",
    label: origin === "CREDENTIALS_PRESENT_UNVERIFIED" ? "Credentials Unverified" : origin === "METADATA_INDICATED" ? "Indicated by Metadata" : "Origin Unknown",
    explanation: origin === "CREDENTIALS_PRESENT_UNVERIFIED"
      ? "The file carries Content Credentials, but their signature was not validated, so the origin is not verified."
      : origin === "METADATA_INDICATED"
        ? `The file's metadata indicates ${aiDeclared ? "AI creation" : camera ? `a ${isVideo ? "recording device" : "camera"} (${camera})` : "a source or credit"}. Metadata is a claim, not proof.`
        : `Nothing in the file establishes where this ${noun} came from.`,
  });
  // 8–10 AI
  add({
    id: "ai", name: "AI-Generated Detection", source: "IPTC digital source type · C2PA assertions · PNG/XMP tags",
    status: aiDeclared ? "DETECTED" : "NOT_FOUND", tone: aiDeclared ? "ai" : "neutral",
    label: aiDeclared ? (c2.aiAction && !d.declaredAi.length && !d.aiTools.length ? "Unverified Credential Claim" : "Declared in Metadata") : "No AI Markers Found",
    explanation: aiDeclared
      ? c2.aiAction && !d.declaredAi.length && !d.aiTools.length
        ? "Unverified Content Credential claims AI generation."
        : `The file's own metadata declares generative AI${aiTool ? ` (${aiTool})` : ""}. A declaration is evidence of how the file says it was made, not independent proof.`
      : "No AI markers in the metadata. Markers are easy to remove, so this does not mean the file is human-made or camera-captured.",
    evidence: [...d.declaredAi, ...(c2.aiAction ? ["Unverified Content Credential claims AI generation."] : [])],
  });
  add({
    id: "ai_tool", name: "AI Tool Identification", source: "File metadata",
    status: aiTool ? "DETECTED" : aiDeclared ? "NOT_FOUND" : "NOT_APPLICABLE", tone: aiTool ? "ai" : "neutral",
    label: aiTool ? `${aiTool} (declared)` : aiDeclared ? "Not Named" : "Not Applicable",
    explanation: aiTool ? `The metadata names ${aiTool}. Shown as declared; Jimvio never guesses a tool from how the ${noun} looks.` : aiDeclared ? "AI use is declared, but no tool is named." : "No AI use is declared.",
  });
  add({
    id: "ai_model", name: "Model / Version", source: "C2PA claim generator · generation parameters",
    status: d.aiModel ? "DETECTED" : aiDeclared ? "NOT_AVAILABLE" : "NOT_APPLICABLE", tone: "info",
    label: d.aiModel ?? (aiDeclared ? "Not Available" : "Not Applicable"),
    explanation: d.aiModel ? `Model/version string found: ${d.aiModel}.` : aiDeclared ? "No model or version is stored in the file." : "No AI use is declared.",
  });
  // 11–13 Camera, date, GPS
  add({
    id: "camera", name: isVideo ? "Recording Device" : "Camera & Device Identification", source: isVideo ? "Container tags" : "EXIF Make/Model",
    status: camera ? "DETECTED" : aiDeclared ? "NOT_APPLICABLE" : "NOT_FOUND", tone: "info",
    label: camera ? "Declared in Metadata" : aiDeclared ? "Not Expected" : "Not Found",
    explanation: camera ? `Metadata names ${camera}${d.lens ? ` with ${d.lens}` : ""}. EXIF can be edited, so this is not proof of a genuine capture.` : aiDeclared ? "Camera data isn't expected for a generated file; its absence is not a problem." : `No ${isVideo ? "device" : "camera"} make or model in the metadata.${swKind === "os" ? ` “${d.software}” is an operating system, not a camera.` : ""}`,
  });
  add({
    id: "date", name: "Capture Date & Time", source: isVideo ? "Container creation time" : "EXIF DateTimeOriginal",
    status: d.capturedAt ? "DETECTED" : "NOT_FOUND", tone: "info", label: d.capturedAt ? "From Metadata" : "Not Found",
    explanation: d.capturedAt ? `The metadata records ${isVideo ? "a creation" : "a capture"} time. It can be edited and is never taken from the upload or file-system date.` : "No capture time in the metadata. Jimvio never substitutes the upload date.",
  });
  add({
    id: "gps", name: "GPS & Location Metadata", source: "EXIF GPS",
    status: d.gps ? "DETECTED" : "NOT_FOUND", tone: d.gps ? "warn" : "neutral", label: d.gps ? "Location Present" : "None",
    explanation: d.gps ? "The file reveals a location. Remove it before sharing if that matters to you." : "No location is stored in the file.",
  });
  // 14–16 Editing & manipulation
  add({
    id: "software", name: "Editing Software Detection", source: "EXIF Software · XMP CreatorTool",
    status: editor ? "DETECTED" : d.software ? "DETECTED" : "NOT_FOUND", tone: editor ? "warn" : "info",
    label: editor ? "Editor Recorded" : swKind === "os" ? "Operating System Recorded" : swKind === "camera" ? "Camera Firmware" : swKind === "ai" ? "AI Tool Recorded" : d.software ? "Software Recorded" : "None Recorded",
    explanation: editor
      ? `Saved with ${editor}. Editing is often harmless (cropping, colour) and is not proof of deceptive tampering.`
      : swKind === "os"
        ? `“${d.software}” is operating-system metadata. It is not a camera and not evidence of editing.`
        : d.software
          ? `Software recorded: ${d.software}.`
          : "No software is recorded. That doesn't mean the file was never edited.",
  });
  add({
    id: "manipulation", name: "Image Manipulation Detection", source: "XMP history · metadata consistency",
    status: historyEdits.length ? "DETECTED" : d.metadataConflicts?.length ? "INCONCLUSIVE" : "NOT_CHECKED", tone: historyEdits.length || d.metadataConflicts?.length ? "warn" : "neutral",
    label: historyEdits.length ? "Editing History Found" : d.metadataConflicts?.length ? "Inconsistent Metadata" : "Not Assessed",
    explanation: historyEdits.length
      ? `The file's edit history records ${historyEdits.length} step(s): ${historyEdits.slice(0, 3).join(", ")}.`
      : d.metadataConflicts?.length
        ? `Metadata fields disagree: ${d.metadataConflicts.join("; ")}.`
        : "Pixel-level manipulation analysis is not implemented yet, so no manipulation conclusion is made either way.",
    evidence: [...historyEdits, ...(d.metadataConflicts ?? [])],
  });
  add({
    id: "forensic", name: "Visual Forensic Analysis", source: "Forensic AI-image detector",
    status: "UNAVAILABLE", tone: "neutral", label: "Not Configured",
    explanation: "No forensic AI-image or deepfake detector is connected, so the pixels were not classified.",
  });
  // 17 Duplicates
  add({
    id: "duplicate", name: "Reverse Image / Duplicate Matching", source: "Jimvio fingerprint history (SHA-256, perceptual hash)",
    status: dup ? "DETECTED" : isVideo || isAudio ? (d.exactSeen ? "DETECTED" : "NOT_FOUND") : "NOT_FOUND", tone: dup || d.exactSeen ? "info" : "neutral",
    label: dup ? (dup.near ? "Near Duplicate on Jimvio" : "Exact Match on Jimvio") : d.exactSeen ? "Exact Match on Jimvio" : "No Jimvio Match",
    explanation: dup
      ? `${dup.near ? "A near-identical" : "This exact"} ${noun} was checked on Jimvio before${dup.firstSeenAt ? ` (first seen ${dup.firstSeenAt.slice(0, 10)})` : ""}. A match doesn't prove copying or infringement.`
      : d.exactSeen
        ? `This exact file has been checked ${d.exactSeen} time(s) on Jimvio.`
        : "Not seen in Jimvio's checks before. That is not the same as not found anywhere on the internet: no global image search is connected.",
  });
  // 18–19 Rights & source
  const rightsNotice = d.copyright ?? d.iptc?.["Copyright"] ?? d.xmp?.rights ?? null;
  const rights: MediaAssessment["rights"] = d.iptc?.["Usage terms"] || d.xmp?.license ? "LICENSE_DECLARED_UNVERIFIED" : rightsNotice ? "COPYRIGHT_NOTICE_FOUND" : aiDeclared ? "HUMAN_REVIEW_REQUIRED" : "RIGHTS_UNCLEAR";
  add({
    id: "copyright", name: "Copyright & Usage Rights", source: "EXIF Copyright · IPTC · XMP rights",
    status: rights === "RIGHTS_UNCLEAR" ? "NOT_FOUND" : "DETECTED", tone: rights === "HUMAN_REVIEW_REQUIRED" ? "warn" : "info",
    label: rights === "LICENSE_DECLARED_UNVERIFIED" ? "License Declared" : rights === "COPYRIGHT_NOTICE_FOUND" ? "Notice Found" : rights === "HUMAN_REVIEW_REQUIRED" ? "Check Tool Terms" : "Rights Unclear",
    explanation: rights === "LICENSE_DECLARED_UNVERIFIED"
      ? `The metadata declares terms: ${d.iptc?.["Usage terms"] ?? d.xmp?.license}. Not verified.`
      : rightsNotice
        ? `“${rightsNotice}” (metadata, unverified).`
        : aiDeclared
          ? `AI-generated content is not automatically free to use commercially. Check ${aiTool ? `${aiTool}'s` : "the tool's"} current terms.`
          : "No rights information in the metadata.",
  });
  add({
    id: "source", name: "Source Verification", source: "IPTC Source/Credit · global image search",
    status: d.iptc?.Source || d.iptc?.Credit ? "DETECTED" : "UNAVAILABLE", tone: "info",
    label: d.iptc?.Source || d.iptc?.Credit ? "Source Declared" : "No Global Search",
    explanation: d.iptc?.Source || d.iptc?.Credit ? `Declared source: ${[d.iptc?.Source, d.iptc?.Credit].filter(Boolean).join(" · ")} (unverified).` : "No source is declared, and no global reverse-image search provider is connected.",
  });
  // 20 Quality
  if (!isAudio) {
    const q = d.quality;
    add({
      id: "quality", name: "Technical Quality Analysis", source: "Decoder statistics",
      status: q ? "VERIFIED" : decoded ? "NOT_CHECKED" : "FAILED", tone: "info",
      label: q ? `${d.width && d.height ? `${((d.width * d.height) / 1e6).toFixed(1)} MP` : "Measured"}${q.sharpness != null ? ` · ${q.sharpness >= 2 ? "Sharp" : q.sharpness >= 0.8 ? "Moderate" : "Soft"}` : ""}` : "Not Measured",
      explanation: q ? [d.width && d.height ? `${d.width}×${d.height}` : "", q.bitDepth ? `${q.bitDepth}-bit` : "", q.hasAlpha ? "alpha channel" : "", q.frames && q.frames > 1 ? `${q.frames} frames (animated)` : "", q.compression ? q.compression : "", q.entropy != null ? `entropy ${q.entropy.toFixed(1)}` : ""].filter(Boolean).join(" · ") + ". Quality says nothing about authenticity." : "Technical quality was not measured.",
    });
  }
  // 21–23 Video
  if (isVideo) {
    add({ id: "frames", name: "Video Frame Analysis", source: "—", status: "NOT_CHECKED", tone: "neutral", label: "Metadata Only", explanation: "Frames were not sampled; only container metadata was analysed. No claim is made about the video's visual content." });
    add({ id: "audio", name: "Audio Metadata Analysis", source: "Container", status: d.audioCodec ? "DETECTED" : "NOT_FOUND", tone: "info", label: d.audioCodec ? d.audioCodec : "No Audio Track", explanation: d.audioCodec ? `Audio track: ${d.audioCodec}. Voice-clone detection is not available.` : "No audio track found." });
    add({ id: "video_prov", name: "Video Provenance", source: "C2PA", status: c2.present ? "DETECTED" : "NOT_FOUND", tone: "info", label: c2.present ? "Credentials Unverified" : "Not Found", explanation: c2.present ? "The video carries Content Credentials; the signature was not validated." : "No Content Credentials in the video." });
  }

  // ── Dimensions ──────────────────────────────────────────────────────────
  const creation: MediaAssessment["creation"] = aiDeclared ? "AI_GENERATION_INDICATED_BY_METADATA" : "NO_AI_MARKERS_FOUND";
  const creationMethod: MediaAssessment["creationMethod"] = aiDeclared ? (d.declaredAi.some((x) => /edit/i.test(x)) ? "AI_EDITED" : "AI_GENERATED") : editor || historyEdits.length ? "EDITED" : camera ? "CAMERA_INDICATED" : "UNKNOWN";
  const manipulation: MediaAssessment["manipulation"] = historyEdits.length ? "EDITING_HISTORY_FOUND" : editor ? "EDITING_SOFTWARE_RECORDED" : d.metadataConflicts?.length ? "INCONCLUSIVE" : "NOT_ASSESSED";
  const integrity: MediaAssessment["integrity"] = d.integrityIssue ? "ISSUE" : decoded ? "PASSED" : "FAILED";

  const verdict: MediaAssessment["verdict"] = failed
    ? "SCAN_FAILED"
    : integrity === "ISSUE"
      ? "INTEGRITY_ISSUE"
      : integrity === "FAILED" && !aiDeclared && !c2.present
        ? "SCAN_FAILED"
        : aiDeclared
          ? "AI_GENERATED_DECLARED"
          : editor || historyEdits.length
            ? "EDITED_RECORDED"
            : c2.present
              ? "CREDENTIALS_UNVERIFIED"
              : dup
                ? "PREVIOUSLY_SEEN"
                : camera
                  ? "CAMERA_ORIGIN_INDICATED"
                  : "ORIGIN_UNKNOWN";

  // Provenance-confidence score: only from provenance evidence, never a penalty for AI or missing EXIF.
  const evidence: [string, number][] = [];
  if (integrity === "PASSED") evidence.push(["File integrity passed", 15]);
  if (c2.present) evidence.push(["Content Credentials present (unverified)", 20]);
  if (aiDeclared && d.declaredAi.length && (d.aiTools.length || c2.aiAction)) evidence.push(["Independent metadata sources agree on the creation method", 25]);
  else if (aiDeclared) evidence.push(["Creation method declared in metadata", 15]);
  if (camera && d.exifFields && d.exifFields >= 12 && (d.fNumber || d.exposureTime || d.iso)) evidence.push(["Rich, consistent camera metadata", 20]);
  if (d.iptc?.Source || d.iptc?.Credit) evidence.push(["Declared source/credit", 10]);
  if (d.metadataConflicts?.length) evidence.push(["Metadata fields disagree", -25]);
  if (historyEdits.length || editor) evidence.push(["Editing recorded", -5]);
  const hasProvenance = c2.present || aiDeclared || Boolean(camera && d.exifFields && d.exifFields >= 12);
  const raw = 30 + evidence.reduce((s, [, v]) => s + v, 0);
  const scoreState: MediaAssessment["scoreState"] = verdict === "SCAN_FAILED" ? "NOT_SCORED" : hasProvenance ? "SCORED" : "NOT_SCORED";
  const score = scoreState === "SCORED" ? Math.max(0, Math.min(c2.present ? 85 : 79, raw)) : null; // unvalidated evidence caps the score
  const DONE: MediaCheckStatus[] = ["VERIFIED", "DETECTED", "NOT_FOUND"];
  const applicable = checks.filter((k) => k.status !== "NOT_APPLICABLE");
  const coverage = applicable.length ? Math.round((applicable.filter((k) => DONE.includes(k.status)).length / applicable.length) * 100) : 0;
  const confidence: MediaAssessment["confidence"] = c2.present && d.declaredAi.length ? "MEDIUM" : hasProvenance ? (coverage >= 70 ? "MEDIUM" : "LOW") : "LOW";

  const found = checks
    .filter((k) => k.status === "DETECTED" || k.status === "VERIFIED")
    .filter((k) => !["exif", "iptc", "xmp", "quality"].includes(k.id) || k.tone !== "info" || checks.length < 8)
    .map((k) => `${k.name}: ${k.explanation}`)
    .slice(0, 5);
  const couldNotVerify = checks.filter((k) => ["UNAVAILABLE", "NOT_CHECKED", "FAILED", "INCONCLUSIVE"].includes(k.status)).map((k) => `${k.name}: ${k.explanation}`).slice(0, 5);
  const actions = [
    ...(aiDeclared ? [`Label it as AI-generated when you publish it, and check ${aiTool ?? "the tool"}'s terms before commercial use.`] : []),
    ...(verdict === "ORIGIN_UNKNOWN" || verdict === "CAMERA_ORIGIN_INDICATED" ? [`If origin matters, ask the creator for the original file, RAW file or project file.`] : []),
    ...(verdict === "EDITED_RECORDED" ? ["Ask for the unedited original if you need to rely on what it shows."] : []),
    ...(d.gps ? ["Remove location data before sharing it publicly."] : []),
    ...(verdict === "SCAN_FAILED" ? ["Try the check again with the original file."] : []),
    ...(verdict === "INTEGRITY_ISSUE" ? ["Don't open the file with untrusted apps; ask the sender for a fresh copy."] : []),
  ];
  return {
    model: MEDIA_MODEL, verdict, creationMethod, creation, provenance: origin, manipulation, rights, integrity, scoreState, score,
    scoreBasis: evidence.map(([k, v]) => `${v > 0 ? "+" : ""}${v} ${k}`),
    coverage, confidence, checks, found, couldNotVerify, actions: actions.length ? actions : ["Keep the original file if you may need to prove where it came from."],
  };
}
