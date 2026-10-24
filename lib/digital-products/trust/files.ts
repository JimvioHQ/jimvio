/**
 * Upload checks that do not execute file contents.
 * A passed structural check is not a malware-clean result.
 */

export const DEFAULT_MAX_FILE_BYTES = 50 * 1024 * 1024;
export const ABSOLUTE_MAX_FILE_BYTES = 500 * 1024 * 1024;
export const MAX_ARCHIVE_ENTRIES = 200;
export const MAX_ARCHIVE_UNCOMPRESSED_BYTES = 1024 * 1024 * 1024;

export const DISALLOWED_EXTENSIONS = new Set([
  "exe", "dll", "scr", "bat", "cmd", "com", "msi", "ps1", "vbs", "js", "jse",
  "wsf", "hta", "apk", "dmg", "pkg", "app", "deb", "rpm", "sh", "bash", "command",
]);

export const ALLOWED_EXTENSIONS = new Set([
  "pdf", "epub", "zip", "png", "jpg", "jpeg", "webp", "gif", "mp3", "mp4", "wav",
  "txt", "csv", "md", "docx", "xlsx", "pptx", "mp4",
]);

const MIME_BY_EXT: Record<string, string[]> = {
  pdf: ["application/pdf"],
  epub: ["application/epub+zip", "application/zip"],
  zip: ["application/zip", "application/x-zip-compressed"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  webp: ["image/webp"],
  gif: ["image/gif"],
  mp3: ["audio/mpeg", "audio/mp3"],
  mp4: ["video/mp4"],
  wav: ["audio/wav", "audio/x-wav"],
  txt: ["text/plain"],
  csv: ["text/csv", "text/plain", "application/vnd.ms-excel"],
  md: ["text/plain", "text/markdown"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/zip"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/zip"],
  pptx: ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/zip"],
};

export type FileCheck = { ok: true } | { ok: false; reasons: string[] };

export function extensionOf(fileName: string | null | undefined): string {
  const base = String(fileName || "").split(/[/\\]/).pop() || "";
  if (!base || base.includes("..")) return "";
  const parts = base.toLowerCase().split(".");
  if (parts.length < 2) return "";
  return parts[parts.length - 1] || "";
}

/** Storage name is generated. The original filename is never used as a path. */
export function safeStorageName(originalName: string, id: string): string {
  const ext = extensionOf(originalName);
  const safeExt = ext && ALLOWED_EXTENSIONS.has(ext) && !DISALLOWED_EXTENSIONS.has(ext) ? `.${ext}` : "";
  const stem = id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "file";
  return `${stem}${safeExt}`;
}

export function configuredMaxFileBytes(raw: string | undefined): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MAX_FILE_BYTES;
  return Math.min(Math.floor(parsed), ABSOLUTE_MAX_FILE_BYTES);
}

export function validateDeclaredFile(input: {
  fileName: string | null;
  mime: string | null;
  sizeBytes: number | null;
  maxBytes: number;
}): FileCheck {
  const reasons: string[] = [];
  const name = String(input.fileName || "");
  if (!name.trim()) reasons.push("A file name is required.");
  if (name.includes("..") || name.includes("/") || name.includes("\\") || name.includes("\0")) {
    reasons.push("The file name is not safe to store.");
  }
  const ext = extensionOf(name);
  if (!ext) reasons.push("The file needs a supported extension.");
  if (ext && DISALLOWED_EXTENSIONS.has(ext)) {
    reasons.push(`“.${ext}” files are not accepted for digital delivery.`);
  }
  if (ext && !DISALLOWED_EXTENSIONS.has(ext) && !ALLOWED_EXTENSIONS.has(ext)) {
    reasons.push(`“.${ext}” is not a supported delivery format.`);
  }
  if (input.sizeBytes == null || !Number.isFinite(input.sizeBytes)) {
    reasons.push("File size was not provided.");
  } else if (input.sizeBytes <= 0) {
    reasons.push("The file is empty.");
  } else if (input.sizeBytes > input.maxBytes) {
    reasons.push("The file exceeds the configured size limit.");
  }
  const mime = String(input.mime || "").toLowerCase().split(";")[0].trim();
  if (ext && ALLOWED_EXTENSIONS.has(ext)) {
    const allowed = MIME_BY_EXT[ext];
    if (!mime) reasons.push("A MIME type is required.");
    else if (allowed && !allowed.includes(mime)) {
      reasons.push("The MIME type does not match the file extension.");
    }
  }
  return reasons.length ? { ok: false, reasons } : { ok: true };
}

function startsWith(bytes: Uint8Array, sig: number[]): boolean {
  if (bytes.length < sig.length) return false;
  return sig.every((b, i) => bytes[i] === b);
}

export function validateMagicBytes(bytes: Uint8Array, extension: string): FileCheck {
  if (bytes.length < 4) return { ok: false, reasons: ["The file is too small to identify."] };
  if (bytes[0] === 0x4d && bytes[1] === 0x5a) {
    return { ok: false, reasons: ["Executable content is not allowed."] };
  }
  const ext = extension.toLowerCase();
  const zipExt = ext === "zip" || ext === "docx" || ext === "xlsx" || ext === "pptx" || ext === "epub";
  if (zipExt && !startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) && !startsWith(bytes, [0x50, 0x4b, 0x05, 0x06])) {
    return { ok: false, reasons: ["The file does not match a ZIP-based signature."] };
  }
  if (ext === "pdf" && !startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) {
    return { ok: false, reasons: ["The file does not match a PDF signature."] };
  }
  if (ext === "png" && !startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) {
    return { ok: false, reasons: ["The file does not match a PNG signature."] };
  }
  if ((ext === "jpg" || ext === "jpeg") && !startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return { ok: false, reasons: ["The file does not match a JPEG signature."] };
  }
  return { ok: true };
}

function readU16(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readU32(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] +
    bytes[offset + 1] * 256 +
    bytes[offset + 2] * 65536 +
    bytes[offset + 3] * 16777216
  );
}

/** Reads ZIP names and sizes only. It does not extract or run entries. */
export function inspectZip(bytes: Uint8Array): FileCheck & { encrypted: boolean } {
  const reasons: string[] = [];
  let offset = 0;
  let entries = 0;
  let uncompressed = 0;
  let encrypted = false;

  while (offset + 30 <= bytes.length && entries < MAX_ARCHIVE_ENTRIES + 1) {
    if (!(bytes[offset] === 0x50 && bytes[offset + 1] === 0x4b && bytes[offset + 2] === 0x03 && bytes[offset + 3] === 0x04)) {
      break;
    }
    const flags = readU16(bytes, offset + 6);
    const compressed = readU32(bytes, offset + 18);
    const declaredUncompressed = readU32(bytes, offset + 22);
    const nameLen = readU16(bytes, offset + 26);
    const extraLen = readU16(bytes, offset + 28);
    if (nameLen > 1024) {
      reasons.push("An archive entry name is not valid.");
      break;
    }
    const nameStart = offset + 30;
    const nameEnd = nameStart + nameLen;
    if (nameEnd > bytes.length) {
      reasons.push("The archive is truncated.");
      break;
    }
    const name = new TextDecoder().decode(bytes.subarray(nameStart, nameEnd));
    if (name.includes("..") || name.startsWith("/") || name.startsWith("\\") || name.includes("\\")) {
      reasons.push("The archive contains an unsafe path.");
    }
    const entryExt = extensionOf(name);
    if (entryExt && DISALLOWED_EXTENSIONS.has(entryExt)) {
      reasons.push("The archive contains a disallowed executable entry.");
    }
    if (flags & 0x1) encrypted = true;
    uncompressed += declaredUncompressed;
    entries += 1;
    const dataLen = flags & 0x8 ? 0 : compressed;
    offset = nameEnd + extraLen + dataLen;
    if (offset < 0 || offset > bytes.length + 1) {
      reasons.push("The archive layout is not valid.");
      break;
    }
  }

  if (entries === 0) reasons.push("The archive has no readable entries.");
  if (entries > MAX_ARCHIVE_ENTRIES) reasons.push("The archive has too many entries.");
  if (uncompressed > MAX_ARCHIVE_UNCOMPRESSED_BYTES) {
    reasons.push("The archive declares an unsafe uncompressed size.");
  }
  if (encrypted) reasons.push("Encrypted archives cannot be scanned and do not pass verification.");
  return reasons.length
    ? { ok: false, reasons, encrypted }
    : { ok: true, encrypted };
}

export function isPrivateCloudinaryUrl(raw: string | null | undefined): boolean {
  if (!raw) return false;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (host !== "res.cloudinary.com" && !host.endsWith(".cloudinary.com")) return false;
    return url.pathname.includes("/private/") || url.pathname.includes("/authenticated/");
  } catch {
    return false;
  }
}

export function isHttpsUrl(raw: string | null | undefined): boolean {
  if (!raw) return false;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}
