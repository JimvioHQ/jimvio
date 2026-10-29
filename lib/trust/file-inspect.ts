/**
 * Reads an uploaded file without ever running it: real type from its first
 * bytes, archive contents without unpacking, risky PDF/Office features, and
 * a SHA-256 fingerprint. Pure functions, safe on any input.
 */
import { createHash } from "node:crypto";
import { unzipSync, strFromU8 } from "fflate";
import type { Finding } from "./types";

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
    const raw = buf.toString("latin1");
    if (/\/JavaScript|\/JS\b/.test(raw)) f.push({ tone: "bad", title: "PDF contains JavaScript", detail: "Normal ebooks and guides don't need code.", source: "PDF scan" });
    if (/\/Launch\b/.test(raw)) f.push({ tone: "bad", title: "PDF can launch programs", source: "PDF scan" });
    if (/\/EmbeddedFile\b/.test(raw)) f.push({ tone: "warn", title: "PDF carries embedded files", source: "PDF scan" });
    if (/\/OpenAction\b/.test(raw) && /\/URI\b/.test(raw)) f.push({ tone: "warn", title: "PDF opens a web link automatically", source: "PDF scan" });
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
    // Text drawn with simple string operators only; compressed streams are skipped.
    const raw = buf.subarray(0, 4_000_000).toString("latin1");
    const parts = [...raw.matchAll(/\(([^()\\]{3,200})\)\s*Tj/g)].map((m) => m[1]);
    return parts.length >= 20 ? parts.join(" ") : null;
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
