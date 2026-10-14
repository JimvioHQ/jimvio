const VISIBILITY = new Set(["public", "private", "invite_only", "hidden"]);

export function requireAdminReason(reason: string): { ok: true; reason: string } | { ok: false; error: string } {
  const text = reason.replace(/\s+/g, " ").trim();
  if (text.length < 8) return { ok: false, error: "Enter a reason of at least 8 characters." };
  return { ok: true, reason: text };
}

export function communityVisibilityPatch(visibility: string): { ok: true; visibility: string; isPrivate: boolean } | { ok: false; error: string } {
  const value = visibility.trim().toLowerCase();
  if (!VISIBILITY.has(value)) return { ok: false, error: "That visibility is not supported." };
  return { ok: true, visibility: value, isPrivate: value !== "public" };
}

export function canEndListedLive(status: string | null | undefined): boolean {
  return (status ?? "").toLowerCase() === "live";
}
