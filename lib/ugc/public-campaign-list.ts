function publicOwner(value: unknown): { avatar_url: string | null; full_name: string | null } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  return {
    avatar_url: typeof source.avatar_url === "string" ? source.avatar_url : null,
    full_name: typeof source.full_name === "string" ? source.full_name : null,
  };
}

function publicMedia(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    const media = { ...(item as Record<string, unknown>) };
    delete media.uploaded_by;
    delete media.user_id;
    delete media.owner_id;
    delete media.created_by;
    return media;
  });
}

/**
 * Public campaign directory payload.
 * brand_id stays because similar-campaign ranking compares it in the browser.
 * Operator ids and activation notes do not.
 */
export function toPublicCampaignListItem<T extends Record<string, unknown>>(row: T): T {
  const next = { ...row } as Record<string, unknown>;
  delete next.admin_activated_by;
  delete next.admin_activation_reason;
  if (next.vendor && typeof next.vendor === "object" && !Array.isArray(next.vendor)) {
    const vendor = { ...(next.vendor as Record<string, unknown>) };
    if ("owner" in vendor) vendor.owner = publicOwner(vendor.owner);
    next.vendor = vendor;
  }
  if ("media" in next) next.media = publicMedia(next.media);
  return next as T;
}
