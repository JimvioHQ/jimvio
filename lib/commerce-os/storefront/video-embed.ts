/**
 * Normalize merchant video URLs into safe iframe embed URLs.
 * Supports YouTube + Vimeo watch/share links; rejects non-https.
 */

export type VideoEmbedResult =
  | { ok: true; embedUrl: string; provider: "youtube" | "vimeo" | "direct" }
  | { ok: false; error: string };

export function resolveVideoEmbedUrl(raw: string | null | undefined): VideoEmbedResult {
  const value = (raw || "").trim();
  if (!value) return { ok: false, error: "Add a video URL." };
  if (!/^https:\/\//i.test(value)) {
    return { ok: false, error: "Video URL must start with https://" };
  }

  try {
    const u = new URL(value);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();

    // YouTube
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      if (!id) return { ok: false, error: "Invalid YouTube link." };
      return {
        ok: true,
        provider: "youtube",
        embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(id)}`,
      };
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      const id =
        u.searchParams.get("v") ||
        (u.pathname.startsWith("/embed/")
          ? u.pathname.slice("/embed/".length).split("/")[0]
          : u.pathname.startsWith("/shorts/")
            ? u.pathname.slice("/shorts/".length).split("/")[0]
            : null);
      if (!id) return { ok: false, error: "Invalid YouTube link." };
      return {
        ok: true,
        provider: "youtube",
        embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(id)}`,
      };
    }

    // Vimeo
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const parts = u.pathname.split("/").filter(Boolean);
      const id = host === "player.vimeo.com" ? parts[1] : parts[0];
      if (!id || !/^\d+$/.test(id)) {
        return { ok: false, error: "Invalid Vimeo link." };
      }
      return {
        ok: true,
        provider: "vimeo",
        embedUrl: `https://player.vimeo.com/video/${id}`,
      };
    }

    // Already an embeddable https URL (generic)
    if (u.pathname.includes("/embed") || u.pathname.endsWith(".mp4")) {
      return { ok: true, provider: "direct", embedUrl: value };
    }

    return {
      ok: false,
      error: "Use a YouTube, Vimeo, or direct https embed URL.",
    };
  } catch {
    return { ok: false, error: "Invalid video URL." };
  }
}
