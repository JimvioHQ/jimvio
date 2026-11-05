/**
 * Reads an uploaded file without ever running it: real type from its first
 * bytes, archive contents without unpacking, risky PDF/Office features, and
 * a SHA-256 fingerprint. Pure functions, safe on any input.
 */
import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
import { unzipSync, strFromU8 } from "fflate";
import type { Finding } from "./types";
import { inspectPdf } from "./pdf-structure";

export type FileKind = "image" | "video" | "audio" | "pdf" | "archive" | "office" | "ebook" | "executable" | "text" | "unknown";

export type FileType = { kind: FileKind; mime: string; label: string };

const startsWith = (b: Buffer, hex: string, offset = 0) => b.subarray(offset, offset + hex.length / 2).toString("hex") === hex;

export function sniffType(buf: Buffer, name = ""): FileType {
  const ascii = (o: number, l: number) => buf.subarray(o, o + l).toString("latin1");
  if (startsWith(buf, "89504e470d0a1a0a")) return { kind: "image", mime: "image/png", label: "PNG image" };
  if (startsWith(buf, "ffd8ff")) return { kind: "image", mime: "image/jpeg", label: "JPEG image" };
  if (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a") return { kind: "image", mime: "image/gif", label: "GIF image" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return { kind: "image", mime: "image/webp", label: "WebP image" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WAVE") return { kind: "audio", mime: "audio/wav", label: "WAV audio" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "AVI ") return { kind: "video", mime: "video/x-msvideo", label: "AVI video" };
  if (ascii(4, 4) === "ftyp") {
    const brand = ascii(8, 4);
    if (/heic|heix|mif1|msf1|avif/.test(brand)) return { kind: "image", mime: brand === "avif" ? "image/avif" : "image/heic", label: "HEIC/AVIF image" };
    if (/M4A |M4B /.test(brand)) return { kind: "audio", mime: "audio/mp4", label: "M4A audio" };
    if (brand === "qt  ") return { kind: "video", mime: "video/quicktime", label: "MOV video" };
    return { kind: "video", mime: "video/mp4", label: "MP4 video" };
  }
  if (startsWith(buf, "1a45dfa3")) return { kind: "video", mime: "video/webm", label: "WebM/MKV video" };
  if (ascii(0, 3) === "ID3" || startsWith(buf, "fffb") || startsWith(buf, "fff3") || startsWith(buf, "fff2")) {
    return { kind: "audio", mime: "audio/mpeg", label: "MP3 audio" };
  }
  if (ascii(0, 4) === "OggS") return { kind: "audio", mime: "audio/ogg", label: "OGG audio" };
  if (ascii(0, 4) === "fLaC") return { kind: "audio", mime: "audio/flac", label: "FLAC audio" };
  if (ascii(0, 5) === "%PDF-") return { kind: "pdf", mime: "application/pdf", label: "PDF document" };
  if (ascii(0, 2) === "MZ") return { kind: "executable", mime: "application/x-msdownload", label: "Windows program" };
  if (startsWith(buf, "7f454c46")) return { kind: "executable", mime: "application/x-executable", label: "Linux program" };
  if (/^(feedface|feedfacf|cefaedfe|cffaedfe|cafebabe)$/.test(buf.subarray(0, 4).toString("hex"))) {
    return { kind: "executable", mime: "application/x-mach-binary", label: "Mac program" };
  }
  if (ascii(0, 4) === "PK\u0003\u0004") {
    const lower = name.toLowerCase();
    const names = zipNames(buf);
    if (names.includes("META-INF/MANIFEST.MF") && names.some((n) => n.endsWith(".class"))) return { kind: "executable", mime: "application/java-archive", label: "Java program" };
    if (names.includes("AndroidManifest.xml") || lower.endsWith(".apk")) return { kind: "executable", mime: "application/vnd.android.package-archive", label: "Android app" };
    if (names.some((n) => n.startsWith("word/"))) return { kind: "office", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", label: "Word document" };
    if (names.some((n) => n.startsWith("xl/"))) return { kind: "office", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", label: "Excel workbook" };
    if (names.some((n) => n.startsWith("ppt/"))) return { kind: "office", mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", label: "PowerPoint deck" };
    if (names.includes("mimetype") && ascii(30, 60).includes("epub")) return { kind: "ebook", mime: "application/epub+zip", label: "EPUB ebook" };
    return { kind: "archive", mime: "application/zip", label: "ZIP archive" };
  }
  if (startsWith(buf, "d0cf11e0a1b11ae1")) return { kind: "office", mime: "application/x-ole-storage", label: "Older Office document" };
  if (ascii(0, 2) === "#!") return { kind: "executable", mime: "text/x-script", label: "Script" };
  const sample = buf.subarray(0, 4096);
  const printable = [...sample].filter((c) => c === 9 || c === 10 || c === 13 || (c >= 32 && c < 127) || c >= 128).length;
  if (sample.length > 0 && printable / sample.length > 0.95) return { kind: "text", mime: "text/plain", label: "Text file" };
  return { kind: "unknown", mime: "application/octet-stream", label: "Unknown file type" };
}

export function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

type ZipEntry = { name: string; size: number; originalSize: number };

/** Archive entry list without decompressing anything (safe against zip bombs). */
export function zipEntries(buf: Buffer): ZipEntry[] {
  const out: ZipEntry[] = [];
  try {
    unzipSync(new Uint8Array(buf), {
      filter: (f) => {
        if (out.length < 5000) out.push({ name: f.name, size: f.size, originalSize: f.originalSize });
        return false;
      },
    });
  } catch {
    /* corrupt archive: return what was read */
  }
  return out;
}

function zipNames(buf: Buffer): string[] {
  return zipEntries(buf).map((e) => e.name);
}

/** Decompresses one small entry (≤ 2 MB) — used for document text. */
export function zipText(buf: Buffer, entry: string, maxBytes = 2_000_000): string | null {
  try {
    const files = unzipSync(new Uint8Array(buf), { filter: (f) => f.name === entry && f.originalSize <= maxBytes });
    const data = files[entry];
    return data ? strFromU8(data) : null;
  } catch {
    return null;
  }
}

const EXEC_EXT = /\.(exe|scr|msi|bat|cmd|com|pif|vbs|vbe|js|jse|wsf|ps1|hta|jar|apk|dll|sh|app|dmg|pkg|lnk|iso|img)$/i;
const DOC_EXT = /\.(pdf|docx?|xlsx?|pptx?|jpe?g|png|gif|mp4|mov|mp3|txt|zip)$/i;

const EXT_KIND: Record<string, FileKind[]> = {
  jpg: ["image"], jpeg: ["image"], png: ["image"], gif: ["image"], webp: ["image"], heic: ["image"], avif: ["image"],
  mp4: ["video"], mov: ["video"], webm: ["video"], mkv: ["video"], avi: ["video"],
  mp3: ["audio"], wav: ["audio"], m4a: ["audio"], ogg: ["audio"], flac: ["audio"],
  pdf: ["pdf"], zip: ["archive"], docx: ["office"], xlsx: ["office"], pptx: ["office"], doc: ["office"], xls: ["office"], ppt: ["office"],
  epub: ["ebook", "archive"], txt: ["text"], md: ["text"], csv: ["text"], html: ["text"], json: ["text"],
};

/** Safety findings for any file. Never executes or opens embedded content. */
export function fileSafety(buf: Buffer, name: string, type: FileType): Finding[] {
  const f: Finding[] = [];
  const src = "File inspection";
  const ext = name.toLowerCase().split(".").pop() ?? "";
  const expected = EXT_KIND[ext];
  if (type.kind === "executable") {
    f.push({ tone: "bad", title: `This is a program (${type.label})`, detail: "Running it can install software or take control of a device. Jimvio never runs uploaded files.", source: src });
  } else if (expected && !expected.includes(type.kind) && type.kind !== "unknown") {
    f.push({ tone: "bad", title: `Name says .${ext} but the file is really a ${type.label}`, detail: "A disguised file type is a classic malware trick.", source: "File signature" });
  } else if (expected) {
    f.push({ tone: "good", title: `File type matches its name (${type.label})`, source: "File signature" });
  }
  if (/\.[a-z0-9]{2,4}\.(exe|scr|js|vbs|bat|cmd|com|lnk)$/i.test(name)) {
    f.push({ tone: "bad", title: "Double file extension", detail: `“${name}” hides a program behind a document-looking name.`, source: src });
  }

  if (type.kind === "archive" || type.kind === "office" || type.kind === "ebook") {
    const entries = zipEntries(buf);
    const total = entries.reduce((s, e) => s + e.originalSize, 0);
    const packed = entries.reduce((s, e) => s + e.size, 0);
    if (packed > 0 && total / packed > 200 && total > 200_000_000) {
      f.push({ tone: "bad", title: "Possible zip bomb", detail: `Unpacks to ${(total / 1e9).toFixed(1)} GB from a small file.`, source: "Archive scan" });
    }
    const exe = entries.filter((e) => EXEC_EXT.test(e.name));
    if (exe.length) {
      f.push({ tone: "bad", title: `Contains ${exe.length} program or script file${exe.length > 1 ? "s" : ""}`, detail: exe.slice(0, 5).map((e) => e.name).join(", "), source: "Archive scan" });
    }
    const disguised = entries.filter((e) => /\.[a-z0-9]{2,4}\.(exe|scr|js|vbs|bat|cmd|lnk)$/i.test(e.name) || (DOC_EXT.test(e.name.replace(/\.(exe|scr)$/i, "")) && /\.(exe|scr)$/i.test(e.name)));
    if (disguised.length) f.push({ tone: "bad", title: "Disguised files inside", detail: disguised.slice(0, 3).map((e) => e.name).join(", "), source: "Archive scan" });
    if (entries.some((e) => /vbaProject\.bin$/i.test(e.name))) {
      f.push({ tone: "bad", title: "Contains macros", detail: "Office macros can run code when the file is opened.", source: "Archive scan" });
    }
    if (entries.some((e) => /\.(zip|rar|7z)$/i.test(e.name))) f.push({ tone: "info", title: "Archive inside an archive", source: "Archive scan" });
    if (type.kind === "archive" && entries.length) {
      f.push({ tone: "info", title: `${entries.length} file${entries.length === 1 ? "" : "s"} inside`, detail: entries.slice(0, 6).map((e) => e.name).join(", "), source: "Archive scan" });
    }
  }
  if (type.kind === "office" && type.mime === "application/x-ole-storage") {
    const raw = buf.toString("latin1");
    if (/VBA|_VBA_PROJECT|Macros/.test(raw)) f.push({ tone: "bad", title: "Older Office file with macros", source: "File inspection" });
  }
  if (type.kind === "pdf") {
    // Real action dictionaries only (raw compressed bytes can contain "/JS" by chance).
    const s = inspectPdf(buf).security;
    if (s.javascript) f.push({ tone: "bad", title: "PDF contains JavaScript", detail: "Normal ebooks and guides don't need code.", source: "PDF scan" });
    if (s.launch) f.push({ tone: "bad", title: "PDF can launch programs", source: "PDF scan" });
    if (s.embeddedFiles) f.push({ tone: "warn", title: "PDF carries embedded files", source: "PDF scan" });
    if (s.openActionKind === "Open web link") f.push({ tone: "warn", title: "PDF opens a web link automatically", source: "PDF scan" });
  }
  return f;
}

/** Plain text from a document, for originality and claim checks. Best effort. */
export function extractText(buf: Buffer, type: FileType): string | null {
  if (type.kind === "text") return buf.subarray(0, 2_000_000).toString("utf8");
  if (type.kind === "office" && type.label === "Word document") {
    const xml = zipText(buf, "word/document.xml");
    return xml ? xml.replace(/<w:p[^>]*>/g, "\n").replace(/<[^>]+>/g, "").replace(/\s+\n/g, "\n") : null;
  }
  if (type.kind === "pdf") {
    const text = pdfText(buf);
    return text && text.split(/\s+/).length >= 20 ? text : null;
  }
  return null;
}

export function pdfInfo(buf: Buffer): { pages: number | null; producer: string | null; creator: string | null } {
  const raw = buf.toString("latin1");
  const pages = (raw.match(/\/Type\s*\/Page\b/g) ?? []).length || null;
  const producer = /\/Producer\s*\(([^)]{1,120})\)/.exec(raw)?.[1] ?? null;
  const creator = /\/Creator\s*\(([^)]{1,120})\)/.exec(raw)?.[1] ?? null;
  return { pages, producer, creator };
}

/** Decodes a PDF literal "(…)" or hex "<…>" string, including UTF-16BE. */
export function pdfString(raw: string, trim = true): string {
  let bytes: number[];
  if (raw.startsWith("<")) {
    const hex = raw.slice(1, -1).replace(/[^0-9a-f]/gi, "");
    bytes = [];
    for (let i = 0; i + 1 < hex.length; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16));
  } else {
    const body = raw.slice(1, -1);
    bytes = [];
    for (let i = 0; i < body.length; i++) {
      const c = body[i];
      if (c !== "\\") { bytes.push(body.charCodeAt(i) & 0xff); continue; }
      const nx = body[++i];
      if (nx === undefined) break;
      if (/[0-7]/.test(nx)) {
        let oct = nx;
        while (oct.length < 3 && /[0-7]/.test(body[i + 1] ?? "")) oct += body[++i];
        bytes.push(parseInt(oct, 8) & 0xff);
      } else if (nx === "n") bytes.push(10);
      else if (nx === "r") bytes.push(13);
      else if (nx === "t") bytes.push(9);
      else if (nx === "\n" || nx === "\r") continue;
      else bytes.push(nx.charCodeAt(0) & 0xff);
    }
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    let out = "";
    for (let i = 2; i + 1 < bytes.length; i += 2) out += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
    const u = out.replace(/\0/g, "");
    return trim ? u.trim() : u;
  }
  const l = Buffer.from(bytes).toString("latin1").replace(/\0/g, "");
  return trim ? l.trim() : l;
}

/** PDF date "D:20240315093000+02'00'" to ISO, or null. */
export function pdfDate(v: string | null): string | null {
  const m = v ? /(?:D:)?(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?/.exec(v) : null;
  if (!m) return null;
  const [y, mo = "01", d = "01", h = "00", mi = "00", se = "00"] = m.slice(1).map((x) => x ?? undefined) as string[];
  const iso = `${y}-${mo ?? "01"}-${d ?? "01"}T${h ?? "00"}:${mi ?? "00"}:${se ?? "00"}Z`;
  const t = Date.parse(iso);
  return Number.isFinite(t) && Number(y) >= 1990 && Number(y) <= 2100 ? new Date(t).toISOString() : null;
}

// Values some tools write when the author left a field empty.
const PLACEHOLDER = /^(anonymous|unspecified|unknown|untitled|none|n\/?a|author|user|admin|owner|microsoft word - .*)$/i;

export type PdfMeta = {
  pages: number | null;
  producer: string | null;
  creator: string | null;
  title: string | null;
  author: string | null;
  subject: string | null;
  createdAt: string | null;
  modifiedAt: string | null;
};

/** The PDF's Info dictionary, falling back to XMP (dc:title, dc:creator). */
export function pdfMeta(buf: Buffer): PdfMeta {
  const raw = buf.toString("latin1");
  const STR = "(\\((?:\\\\.|[^\\\\)]){0,400}\\)|<[0-9A-Fa-f\\s]{2,800}>)";
  const field = (key: string): string | null => {
    let m = new RegExp(`/${key}\\s*${STR}`).exec(raw);
    if (!m) {
      // Indirect value: "/Title 13 0 R" -> "13 0 obj (…) endobj".
      const ref = new RegExp(`/${key}\\s+(\\d+)\\s+(\\d+)\\s+R\\b`).exec(raw);
      if (ref) m = new RegExp(`(?:^|[\\r\\n\\s])${ref[1]}\\s+${ref[2]}\\s+obj\\s*${STR}`).exec(raw);
    }
    const v = m ? pdfString(m[1]) : "";
    return v && /[\p{L}\p{N}]/u.test(v) && !PLACEHOLDER.test(v) ? v.slice(0, 200) : null;
  };
  const xmp = /<x:xmpmeta[\s\S]{0,200000}?<\/x:xmpmeta>/i.exec(raw)?.[0] ?? "";
  const xmpTag = (tag: string) => {
    const block = new RegExp(`<${tag}>([\\s\\S]{0,2000}?)</${tag}>`, "i").exec(xmp)?.[1] ?? "";
    const li = /<rdf:li[^>]*>([^<]{1,200})<\/rdf:li>/i.exec(block)?.[1] ?? (block.includes("<") ? "" : block);
    return li.trim() ? Buffer.from(li.trim(), "latin1").toString("utf8") : null;
  };
  const xmpDate = (tag: string) => new RegExp(`<${tag}>([^<]{4,40})</${tag}>|${tag}="([^"]{4,40})"`, "i").exec(xmp);
  const createdX = xmpDate("xmp:CreateDate");
  const modX = xmpDate("xmp:ModifyDate");
  const iso = (v: string | undefined) => (v && Number.isFinite(Date.parse(v)) ? new Date(Date.parse(v)).toISOString() : null);
  return {
    pages: (raw.match(/\/Type\s*\/Page\b/g) ?? []).length || null,
    producer: field("Producer"),
    creator: field("Creator"),
    title: field("Title") ?? xmpTag("dc:title"),
    author: field("Author") ?? xmpTag("dc:creator"),
    subject: field("Subject") ?? xmpTag("dc:description"),
    createdAt: pdfDate(field("CreationDate")) ?? iso(createdX?.[1] ?? createdX?.[2]),
    modifiedAt: pdfDate(field("ModDate")) ?? iso(modX?.[1] ?? modX?.[2]),
  };
}

/** ASCII85 (PDF /ASCII85Decode) to bytes, or null if malformed. */
export function ascii85(input: string): Buffer | null {
  const src = input.replace(/^\s*<~/, "").replace(/~>[\s\S]*$/, "").replace(/\s+/g, "");
  const out: number[] = [];
  let group: number[] = [];
  for (const ch of src) {
    if (ch === "z" && group.length === 0) { out.push(0, 0, 0, 0); continue; }
    const c = ch.charCodeAt(0) - 33;
    if (c < 0 || c > 84) return null;
    group.push(c);
    if (group.length === 5) {
      const v = group.reduce((a, d) => a * 85 + d, 0);
      out.push((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255);
      group = [];
    }
  }
  if (group.length) {
    const n = group.length;
    while (group.length < 5) group.push(84);
    const v = group.reduce((a, d) => a * 85 + d, 0);
    out.push(...[(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255].slice(0, n - 1));
  }
  return Buffer.from(out);
}

/** Text shown by a PDF's content streams (inflates FlateDecode; never runs anything). */
export function pdfText(buf: Buffer, maxChars = 400_000): string | null {
  const raw = buf.toString("latin1");
  const chunks: string[] = [];
  let total = 0;
  const take = (content: string) => {
    for (const m of content.matchAll(/(\((?:\\.|[^\\)]){1,400}\)|<[0-9A-Fa-f\s]{2,800}>)\s*(?:Tj|'|")|\[((?:\s*(?:\((?:\\.|[^\\)]){0,400}\)|<[0-9A-Fa-f\s]{0,800}>|-?[\d.]+))*)\s*\]\s*TJ/g)) {
      let piece = "";
      if (m[1]) piece = pdfString(m[1], false);
      else if (m[2]) {
        for (const part of m[2].matchAll(/(\((?:\\.|[^\\)]){0,400}\)|<[0-9A-Fa-f\s]{0,800}>)|(-?[\d.]+)/g)) {
          if (part[1]) piece += pdfString(part[1], false);
          else if (Number(part[2]) < -200) piece += " ";
        }
      }
      if (piece) {
        chunks.push(piece);
        total += piece.length + 1;
        if (total > maxChars) return true;
      }
    }
    return false;
  };
  const re = /<<([^]{0,600}?)>>\s*stream\r?\n/g;
  let m: RegExpExecArray | null;
  let streams = 0;
  while ((m = re.exec(raw)) && streams < 400) {
    const start = m.index + m[0].length;
    const end = raw.indexOf("endstream", start);
    if (end < 0) break;
    streams++;
    const dict = m[1];
    if (/\/Subtype\s*\/Image|\/Type\s*\/XObject|\/Length1|\/FontFile/.test(dict)) continue;
    let body = buf.subarray(start, end);
    if (/\/ASCII85Decode|\/A85\b/.test(dict)) {
      const decoded = ascii85(body.toString("latin1"));
      if (!decoded) continue;
      body = decoded;
    }
    if (/\/FlateDecode/.test(dict)) {
      try {
        body = inflateSync(body, { maxOutputLength: 4_000_000 });
      } catch {
        continue;
      }
    } else if (/\/Filter/.test(dict) && !/\/ASCII85Decode|\/A85\b/.test(dict)) continue;
    if (take(body.toString("latin1"))) break;
    re.lastIndex = end;
  }
  const text = chunks.join(" ").replace(/\s+/g, " ").trim();
  if (!text) return null;
  const letters = (text.match(/[A-Za-z\u00C0-\u024F]/g) ?? []).length;
  return letters / text.length > 0.5 ? text : null;
}
