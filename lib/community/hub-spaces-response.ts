export type SpacesLoadResult =
  | {
      ok: true;
      spaces: unknown[];
      nextOffset: number | null;
      total: number;
    }
  | { ok: false; error: string };

/** Interpret /api/c/spaces so a failure cannot be shown as an empty catalog. */
export function interpretSpacesResponse(
  status: number,
  body: {
    error?: unknown;
    spaces?: unknown;
    nextOffset?: unknown;
    total?: unknown;
  } | null
): SpacesLoadResult {
  if (status === 401) return { ok: false, error: "Sign in to view Spaces." };
  if (status < 200 || status >= 300) {
    const message = body && typeof body.error === "string" ? body.error.trim() : "";
    return { ok: false, error: message || "Could not load Spaces" };
  }
  const spaces = Array.isArray(body?.spaces) ? body.spaces : [];
  const nextOffset =
    typeof body?.nextOffset === "number" && Number.isFinite(body.nextOffset)
      ? body.nextOffset
      : null;
  const total =
    typeof body?.total === "number" && Number.isFinite(body.total) ? body.total : spaces.length;
  return { ok: true, spaces, nextOffset, total };
}
