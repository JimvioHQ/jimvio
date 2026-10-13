/** Canonical hashtag token used by feed links and tag filters. */

const TAG_RE = /^[a-z0-9_]{2,48}$/;

export function normalizeHashtagQuery(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const tag = raw.trim().replace(/^#+/, "").toLowerCase();
  if (!TAG_RE.test(tag)) return null;
  return tag;
}

export function hashtagFeedHref(tag: string): string {
  const normalized = normalizeHashtagQuery(tag);
  if (!normalized) return "/communities";
  return `/communities?tag=${encodeURIComponent(normalized)}`;
}
