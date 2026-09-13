export type StorefrontNavItem = { label: string; href: string };

function labelKey(label: string) {
  return label.trim().toLowerCase();
}

function hasLabel(items: StorefrontNavItem[], re: RegExp) {
  return items.some((item) => re.test(item.label));
}

function hrefPath(href: string) {
  const trimmed = href.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      return new URL(trimmed).pathname;
    } catch {
      return trimmed.split("?")[0] || "";
    }
  }
  return trimmed.split("?")[0] || "";
}

/**
 * Header links: merchant-saved items first, then real collections / sale / about.
 * Never invent Categories or Deals without published data.
 */
export function mergeStorefrontHeaderNav(opts: {
  saved?: StorefrontNavItem[] | null;
  collections?: Array<{ title: string; handle: string }>;
  hasSaleProducts: boolean;
  hasAbout: boolean;
}): StorefrontNavItem[] {
  const saved = (opts.saved || []).filter(
    (item) => item.label.trim() && item.href.trim()
  );
  const items: StorefrontNavItem[] = saved.length
    ? saved.map((item) => ({
        label: item.label.trim().slice(0, 64),
        href: item.href.trim(),
      }))
    : [
        { label: "Home", href: "/" },
        { label: "All products", href: "/collections/all" },
      ];

  for (const collection of (opts.collections || []).slice(0, 4)) {
    const handle = collection.handle.trim();
    const title = collection.title.trim();
    if (!handle || !title) continue;
    const href = `/collections/${handle}`;
    if (items.some((item) => hrefPath(item.href).endsWith(`/collections/${handle}`))) {
      continue;
    }
    if (items.some((item) => labelKey(item.label) === labelKey(title))) continue;
    items.push({ label: title.slice(0, 64), href });
  }

  if (opts.hasSaleProducts && !hasLabel(items, /\b(deal|deals|on sale|sale)\b/i)) {
    items.push({ label: "Deals", href: "/collections/all?sort=sale" });
  }
  if (opts.hasAbout && !hasLabel(items, /^about$/i)) {
    items.push({ label: "About", href: "/pages/about" });
  }

  return items.slice(0, 12);
}

export function storefrontPathKey(path: string, handle: string): string {
  const raw = (path.split("?")[0] || "/").trim() || "/";
  const prefix = `/s/${handle.trim().toLowerCase()}`;
  let next = raw;
  if (next === prefix || next === `${prefix}/`) next = "/";
  else if (next.startsWith(`${prefix}/`)) next = next.slice(prefix.length) || "/";
  return next.replace(/\/$/, "") || "/";
}

export function storefrontNavIsActive(opts: {
  pathname: string;
  href: string;
  handle: string;
  search?: string;
}): boolean {
  const current = storefrontPathKey(opts.pathname, opts.handle);
  const target = storefrontPathKey(hrefPath(opts.href), opts.handle);
  if (target === "/") return current === "/";
  if (current !== target) return false;
  if (opts.href.includes("sort=sale")) {
    return (opts.search || "").includes("sort=sale");
  }
  if (target === "/collections/all") {
    return !(opts.search || "").includes("sort=sale");
  }
  return true;
}

export function announcementMessages(
  text?: string | null,
  storeName?: string
): string[] {
  const raw = text?.trim() || (storeName?.trim() ? `Welcome to ${storeName.trim()}` : "");
  if (!raw) return [];
  const parts = raw
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts : [raw];
}

export function trustStripItems(subhead?: string | null): string[] {
  return (subhead || "")
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 6);
}
