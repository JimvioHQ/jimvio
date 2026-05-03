/** Deterministic "deal" discount for SSR (no Math.random per request). */
export function stableDiscountPercent(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 1)) % 997;
  return 10 + (h % 21);
}

export function industryCardBackground(slug: string, imageUrl: string | null | undefined): string {
  if (imageUrl?.trim()) return imageUrl.trim();
  const s = slug.toLowerCase();
  const map: Record<string, string> = {
    electronics: "/images/industries/electronics.png",
    fashion: "/images/industries/fashion.png",
    machinery: "/images/industries/machinery.png",
    agriculture: "/images/industries/agriculture.png",
    health: "/images/industries/health.png",
    digital: "/images/industries/electronics.png",
  };
  return (
    map[s] ??
    "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800"
  );
}

export const INDUSTRY_GRADIENTS = [
  "from-orange-600/10 to-ink-darker/80",
  "from-purple-600/10 to-ink-darker/80",
  "from-blue-600/10 to-ink-darker/80",
  "from-green-600/10 to-ink-darker/80",
  "from-red-600/10 to-ink-darker/10",
  "from-cyan-600/10 to-ink-darker/80",
];
