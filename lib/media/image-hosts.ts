/**
 * Hosts the Next.js image optimizer may fetch from. Before this list any host
 * was accepted, so /_next/image could be used to proxy and resize arbitrary
 * third-party images against Jimvio's free image quota.
 *
 * Built from the hosts actually stored in the database (products, variants,
 * profiles, communities, vendors, stores, videos) and referenced in code.
 * Images from other hosts are still shown where components render them
 * unoptimized; they are just not proxied through /_next/image.
 */
export const IMAGE_HOSTS: readonly string[] = [
  // Jimvio + storage/CDN
  "jimvio.com",
  "**.jimvio.com",
  "res.cloudinary.com",
  "vsfhwfimudpdipdkxbww.supabase.co",
  // Supplier catalog images
  "**.cjdropshipping.com",
  "**.aliyuncs.com",
  "**.alicdn.com",
  // Stock / avatars / social thumbnails
  "images.unsplash.com",
  "**.googleusercontent.com",
  "**.ggpht.com",
  "i.ytimg.com",
  "**.tiktokcdn.com",
  "static-cdn.jtvnw.net",
  "pbs.twimg.com",
  "img.logokit.com",
  "basemaps.cartocdn.com",
];

export function isAllowedImageHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return IMAGE_HOSTS.some((pattern) =>
    pattern.startsWith("**.") ? host === pattern.slice(3) || host.endsWith(pattern.slice(2)) : host === pattern,
  );
}
