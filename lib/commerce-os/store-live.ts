/**
 * Whether a Jimvio store row should resolve on the public storefront.
 * Matches loadPublishedStoreByHandle: status must be published.
 * published_theme may be empty and still render via defaultHomeSections,
 * but status=draft always 404s for anonymous visitors.
 */
export function isJimvioStorePubliclyLive(store: {
  status?: string | null;
}): boolean {
  return store.status === "published";
}

export function jimvioStoreLiveLabel(store: {
  status?: string | null;
}): "Online" | "Offline" {
  return isJimvioStorePubliclyLive(store) ? "Online" : "Offline";
}
