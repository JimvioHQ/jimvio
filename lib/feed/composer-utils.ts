/** Composer text helpers — mentions, hashtags, drafts. */

const MENTION_RE = /(?:^|[\s])@([a-zA-Z0-9_.]{2,32})\b/g;
const HASHTAG_RE = /(?:^|[\s])#([a-zA-Z0-9_]{2,48})\b/g;

export function extractMentions(text: string): string[] {
  const seen = new Set<string>();
  for (const m of text.matchAll(MENTION_RE)) seen.add(m[1].toLowerCase());
  return Array.from(seen);
}

export function extractHashtags(text: string): string[] {
  const seen = new Set<string>();
  for (const m of text.matchAll(HASHTAG_RE)) seen.add(m[1].toLowerCase());
  return Array.from(seen);
}

export const COMPOSER_MAX_CHARS = 5000;

export function draftStorageKey(userId: string, communityId?: string | null) {
  return `jimvio:feed-draft:${userId}:${communityId ?? "global"}`;
}

export type LocalComposerDraft = {
  body: string;
  updatedAt: string;
  audience?: string;
  pollOptions?: string[];
  mode?: string;
};

export function saveLocalDraft(key: string, draft: LocalComposerDraft) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    /* ignore quota */
  }
}

export function loadLocalDraft(key: string): LocalComposerDraft | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as LocalComposerDraft;
  } catch {
    return null;
  }
}

export function clearLocalDraft(key: string) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Lightweight client image compression via canvas (EXIF stripped by redraw). */
export async function compressImageFile(
  file: File,
  opts?: { maxWidth?: number; quality?: number }
): Promise<File> {
  if (!file.type.startsWith("image/") || typeof window === "undefined") return file;
  const maxWidth = opts?.maxWidth ?? 1920;
  const quality = opts?.quality ?? 0.82;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / Math.max(bitmap.width, 1));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
