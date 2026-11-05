/**
 * Provenance and AI-generation markers inside image, video and audio files.
 * Reads metadata only; it never claims a file is human-made because markers
 * are missing (they are easy to strip).
 */
import type { Finding } from "./types";

export type MediaMarkers = {
  c2pa: { present: boolean; generator: string | null; aiAction: boolean };
  declaredAi: string[];
  toolHits: string[];
  software: string | null;
  camera: string | null;
  capturedAt: string | null;
  hasGps: boolean;
  sdParameters: boolean;
  /** Generation prompt stored in the file by the AI tool itself, if any. */
  prompt: string | null;
};

const EDITORS = /photoshop|lightroom|gimp|affinity|snapseed|picsart|canva|facetune|pixelmator|capture one|darktable|luminar|premiere|final cut|davinci|resolve|capcut|imovie|after effects|vsco|inshot|kinemaster|clipchamp/i;

/** Editing software named in metadata (not camera firmware). */
export function editingSoftware(software: string | null): string | null {
  return software && EDITORS.test(software) ? software.slice(0, 80) : null;
}

const AI_TOOLS: [RegExp, string][] = [
  [/midjourney/i, "Midjourney"],
  [/dall[·\- ]?e/i, "DALL·E"],
  [/openai|chatgpt|sora\b/i, "OpenAI"],
  [/stable[ _-]?diffusion|automatic1111|comfyui/i, "Stable Diffusion"],
  [/adobe firefly|firefly/i, "Adobe Firefly"],
  [/imagen|gemini|synthid/i, "Google Imagen/Gemini"],
  [/leonardo\.?ai/i, "Leonardo.Ai"],
  [/ideogram/i, "Ideogram"],
  [/\bflux\.?1|black forest labs/i, "FLUX"],
  [/runway(ml)?/i, "Runway"],
  [/pika(labs)?\b/i, "Pika"],
  [/\bkling\b/i, "Kling"],
  [/\bsuno\b/i, "Suno"],
  [/\budio\b/i, "Udio"],
  [/elevenlabs/i, "ElevenLabs"],
  [/heygen|synthesia/i, "AI avatar video"],
  [/bing image creator|microsoft designer/i, "Microsoft Designer"],
];

function latin(buf: Buffer): string {
  // Metadata lives at the start (and sometimes the end) of media files.
  const head = buf.subarray(0, 3_000_000).toString("latin1");
  const tail = buf.length > 3_000_000 ? buf.subarray(buf.length - 1_000_000).toString("latin1") : "";
  return head + tail;
}

/** PNG tEXt/iTXt chunks (Stable Diffusion & ComfyUI write prompts here). */
export function pngTextChunks(buf: Buffer): Record<string, string> {
  const out: Record<string, string> = {};
  if (buf.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") return out;
  let off = 8;
  while (off + 8 <= buf.length && Object.keys(out).length < 40) {
    const len = buf.readUInt32BE(off);
    const type = buf.subarray(off + 4, off + 8).toString("latin1");
    if (off + 12 + len > buf.length) break;
    if (type === "tEXt" || type === "iTXt") {
      const data = buf.subarray(off + 8, off + 8 + len);
      const nul = data.indexOf(0);
      if (nul > 0) {
        const key = data.subarray(0, nul).toString("latin1");
        let value = data.subarray(nul + 1).toString(type === "iTXt" ? "utf8" : "latin1");
        if (type === "iTXt") value = value.replace(/^[\0-\x1f]+/, "");
        out[key] = value.slice(0, 2000);
      }
    }
    if (type === "IEND") break;
    off += 12 + len;
  }
  return out;
}

export function findMarkers(buf: Buffer, exif: Record<string, unknown> | null): MediaMarkers {
  const text = latin(buf);
  const png = pngTextChunks(buf);
  const c2paPresent = /c2pa/.test(text) && /jumb|jumd|urn:uuid|c2pa\.claim|c2pa\.manifest/i.test(text);
  const generator = /claim_generator[^\x20-\x7e]{0,4}([\x20-\x7e]{3,80})/.exec(text)?.[1]?.trim() ?? null;
  const aiAction = /trainedAlgorithmicMedia|c2pa\.ai_generat|compositeWithTrainedAlgorithmicMedia|algorithmicMedia/i.test(text);

  const declaredAi: string[] = [];
  if (/digitalsourcetype[^<>]{0,120}trainedalgorithmicmedia|trainedAlgorithmicMedia/i.test(text)) {
    declaredAi.push("IPTC says the image was made by a trained AI model");
  }
  if (/compositeWithTrainedAlgorithmicMedia/i.test(text)) declaredAi.push("IPTC says AI was used to edit the image");
  const sdParameters = Boolean(png.parameters || png.prompt || png.workflow);
  if (sdParameters) declaredAi.push("The file stores an AI generation prompt (Stable Diffusion/ComfyUI)");

  const software =
    (exif?.Software as string | undefined) ??
    (exif?.CreatorTool as string | undefined) ??
    png.Software ??
    /<xmp:CreatorTool>([^<]{1,80})</i.exec(text)?.[1] ??
    null;
  // Only metadata regions are searched, never raw pixel or audio data.
  const xmp = /<x:xmpmeta[\s\S]{0,200000}?<\/x:xmpmeta>/i.exec(text)?.[0] ?? "";
  const strings = (b: Buffer) => (b.toString("latin1").match(/[\x20-\x7e]{6,}/g) ?? []).join(" ");
  const edges = buf.length > 0 ? strings(buf.subarray(0, 65_536)) + " " + strings(buf.subarray(Math.max(0, buf.length - 65_536))) : "";
  const metaBlob = [software, generator, png.Software, png.Comment, png.Description, (exif?.ImageDescription as string | undefined) ?? "", xmp, edges]
    .filter(Boolean)
    .join(" ");
  const toolHits = [...new Set(AI_TOOLS.filter(([re]) => re.test(metaBlob)).map(([, name]) => name))];

  const make = exif?.Make as string | undefined;
  const model = exif?.Model as string | undefined;
  const camera = make || model ? [make, model].filter(Boolean).join(" ") : null;
  const captured = exif?.DateTimeOriginal ?? exif?.CreateDate ?? null;
  return {
    c2pa: { present: c2paPresent, generator, aiAction },
    declaredAi,
    toolHits,
    software: software ? String(software).slice(0, 80) : null,
    camera,
    capturedAt: captured instanceof Date ? captured.toISOString() : captured ? String(captured) : null,
    hasGps: exif?.latitude != null || exif?.GPSLatitude != null,
    sdParameters,
    prompt: png.parameters ? png.parameters.split(/\n\s*Negative prompt:/i)[0].trim().slice(0, 400) || null : null,
  };
}

export function markerFindings(m: MediaMarkers): Finding[] {
  const f: Finding[] = [];
  if (m.c2pa.present) {
    f.push({
      tone: m.c2pa.aiAction ? "warn" : "info",
      title: m.c2pa.aiAction ? "Content Credentials say AI was used" : "Content Credentials (C2PA) found",
      detail: `${m.c2pa.generator ? `Made with ${m.c2pa.generator}. ` : ""}Jimvio detected the credentials but did not validate their signature.`,
      source: "C2PA metadata",
    });
  }
  for (const d of m.declaredAi) f.push({ tone: "warn", title: d, source: "File metadata" });
  if (m.toolHits.length) f.push({ tone: "warn", title: `AI tool named in metadata: ${m.toolHits.join(", ")}`, source: "File metadata" });
  if (m.camera) {
    f.push({ tone: "info", title: `Camera details present: ${m.camera}`, detail: m.capturedAt ? `Captured ${m.capturedAt}. Camera data can be copied or faked.` : "Camera data can be copied or faked.", source: "EXIF" });
  }
  if (m.software && !m.toolHits.length) f.push({ tone: "info", title: `Saved with ${m.software}`, source: "File metadata" });
  if (m.hasGps) f.push({ tone: "info", title: "Contains GPS location", detail: "Remove it before sharing if you don't want your location public.", source: "EXIF" });
  if (!m.c2pa.present && !m.declaredAi.length && !m.toolHits.length) {
    f.push({ tone: "info", title: "No AI or provenance markers found", detail: "Markers are easy to remove, so this doesn't prove the file is human-made.", source: "File metadata" });
  }
  return f;
}

/** 64-bit difference hash from a 9×8 greyscale thumbnail (hex). */
export function dHashFromPixels(px: Uint8Array): string {
  let bits = "";
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += px[y * 9 + x] > px[y * 9 + x + 1] ? "1" : "0";
  return BigInt(`0b${bits}`).toString(16).padStart(16, "0");
}

export function hamming(a: string, b: string): number {
  let x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let c = 0;
  while (x) {
    c += Number(x & BigInt(1));
    x >>= BigInt(1);
  }
  return c;
}

/** Fields from the XMP packet (creator tool, edit history, AI source type, rights). */
export function xmpFields(buf: Buffer): { creatorTool: string | null; historyActions: string[]; digitalSourceType: string | null; createDate: string | null; modifyDate: string | null; rights: string | null; license: string | null } | null {
  const text = latin(buf);
  const xmpRaw = /<x:xmpmeta[\s\S]{0,400000}?<\/x:xmpmeta>/i.exec(text)?.[0];
  if (!xmpRaw) return null;
  const xmp = Buffer.from(xmpRaw, "latin1").toString("utf8");
  const tag = (name: string) => {
    const m = new RegExp(`<${name}>\\s*(?:<rdf:(?:Alt|Seq|Bag)>\\s*<rdf:li[^>]*>)?([^<]{1,300})<`, "i").exec(xmp) ?? new RegExp(`${name}="([^"]{1,300})"`, "i").exec(xmp);
    return m?.[1]?.trim() || null;
  };
  const actions = [...xmp.matchAll(/stEvt:action(?:="([^"]{1,60})"|>([^<]{1,60})<)/gi)].map((m) => (m[1] ?? m[2]).trim());
  const agents = [...xmp.matchAll(/stEvt:softwareAgent(?:="([^"]{1,80})"|>([^<]{1,80})<)/gi)].map((m) => (m[1] ?? m[2]).trim());
  const historyActions = actions.map((a, i) => (agents[i] ? `${a} (${agents[i]})` : a)).slice(0, 30);
  const dst = tag("Iptc4xmpExt:DigitalSourceType") ?? tag("photoshop:DigitalSourceType");
  return {
    creatorTool: tag("xmp:CreatorTool"),
    historyActions,
    digitalSourceType: dst ? dst.replace(/^.*\//, "") : null,
    createDate: tag("xmp:CreateDate"),
    modifyDate: tag("xmp:ModifyDate"),
    rights: tag("dc:rights"),
    license: tag("xmpRights:UsageTerms") ?? tag("xmpRights:WebStatement") ?? tag("plus:LicensorURL"),
  };
}

/** Assertion labels inside an embedded C2PA manifest store (labels only; nothing is validated here). */
export function c2paAssertions(buf: Buffer): string[] {
  const text = latin(buf);
  const labels = new Set<string>();
  for (const m of text.matchAll(/\b(c2pa\.[a-z_.]{3,40}|stds\.[a-z_.-]{3,40}|cawg\.[a-z_.]{3,40})/g)) {
    const l = m[1].replace(/\.+$/, "");
    if (!/^c2pa\.(claim|signature|assertions|manifest|ingredient\.v\d)$/.test(l)) labels.add(l);
    if (labels.size >= 20) break;
  }
  return [...labels];
}

/** Model/version strings stored by generators (PNG parameters, C2PA claim generator). */
export function aiModelString(buf: Buffer, generator: string | null): string | null {
  const png = pngTextChunks(buf);
  const p = png.parameters ?? "";
  const model = /(?:^|,\s*)Model:\s*([^,\n]{1,80})/i.exec(p)?.[1]?.trim();
  if (model) return model;
  if (generator && /gpt|dall|firefly|imagen|sora|midjourney|\bv\d/i.test(generator)) return generator.slice(0, 80);
  return null;
}
