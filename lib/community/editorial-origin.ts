/**
 * Internal provenance for Jimvio-managed community programming.
 *
 * Stored on existing JSONB columns (`communities.settings`, post `attachments`,
 * message `metadata`). Never shown to members as seed/demo/bot labels.
 */

export const JIMVIO_EDITORIAL_AUTHOR_EMAIL = "admin@jimvio.com";

export type JimvioContentOrigin = "editorial" | "promotion";

export type JimvioCommunityProvenance = {
  origin: "editorial";
  managed: true;
};

export type JimvioPostProvenance = {
  origin: JimvioContentOrigin;
  key: string;
  href?: string;
};

const SETTINGS_CONFIG_KEYS = new Set([
  "branding",
  "privacy",
  "discovery",
  "onboarding",
  "groupDefaults",
  "channelDefaults",
  "notifications",
  "live",
  "commerce",
  "ai",
  "integrations",
  "security",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function readJimvioBlock(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  if (isRecord(value.jimvio)) return value.jimvio;
  return null;
}

export function readCommunityEditorialOrigin(
  settings: unknown
): "editorial" | null {
  const block = readJimvioBlock(settings);
  if (block?.origin === "editorial") return "editorial";
  return null;
}

export function communityEditorialSettings(
  existing: unknown = {}
): Record<string, unknown> {
  const base = isRecord(existing) ? { ...existing } : {};
  base.jimvio = {
    origin: "editorial",
    managed: true,
  } satisfies JimvioCommunityProvenance;
  return base;
}

/** Keep unknown settings keys (including jimvio provenance) when Owner Console saves. */
export function mergeCommunitySettingsPreservingProvenance(
  existingRaw: unknown,
  nextConfig: Record<string, unknown>
): Record<string, unknown> {
  const extras: Record<string, unknown> = {};
  if (isRecord(existingRaw)) {
    for (const [key, value] of Object.entries(existingRaw)) {
      if (!SETTINGS_CONFIG_KEYS.has(key)) extras[key] = value;
    }
  }
  return { ...nextConfig, ...extras };
}

export function editorialPostAttachments(input: {
  key: string;
  origin: JimvioContentOrigin;
  href?: string;
  extra?: Record<string, unknown>;
}): Record<string, unknown> {
  const jimvio: JimvioPostProvenance = {
    origin: input.origin,
    key: input.key,
  };
  if (input.href) jimvio.href = input.href;
  return {
    ...(input.extra ?? {}),
    jimvio,
  };
}

export function readPostEditorialMeta(attachments: unknown): {
  origin: JimvioContentOrigin | null;
  key: string | null;
  href: string | null;
} {
  const block = readJimvioBlock(attachments);
  const origin =
    block?.origin === "promotion" || block?.origin === "editorial"
      ? block.origin
      : null;
  return {
    origin,
    key: typeof block?.key === "string" ? block.key : null,
    href: typeof block?.href === "string" ? block.href : null,
  };
}

/** Member-facing label for Jimvio promotions only. Never "seed", "demo", or "bot". */
export function jimvioPromotionLabel(attachments: unknown): string | null {
  return readPostEditorialMeta(attachments).origin === "promotion"
    ? "From Jimvio"
    : null;
}

export function editorialMessageMetadata(input: {
  key: string;
  origin?: JimvioContentOrigin;
}): Record<string, unknown> {
  return {
    jimvio: {
      origin: input.origin ?? "editorial",
      key: input.key,
    },
  };
}

export function readMessageEditorialKey(metadata: unknown): string | null {
  const block = readJimvioBlock(metadata);
  return typeof block?.key === "string" ? block.key : null;
}
