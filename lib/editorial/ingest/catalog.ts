import type { CatalogSource } from "@/lib/editorial/ingest/types";

const CHECKED = "2026-10-27T00:00:00.000Z";

export const VERIFIED_FEEDS: CatalogSource[] = [
  {
    name: "NASA News Releases",
    kind: "rss",
    locator: "https://www.nasa.gov/news-release/feed/",
    categories: ["news"],
    language: "en",
    region: "US",
    permittedUsage: "facts",
    imageRights: "none",
    pollMinutes: 360,
    enabled: false,
    alwaysReview: false,
    termsNote:
      "Checked 2026-10-27: this URL returned RSS 2.0 as application/rss+xml. The older breaking-news address redirects here. US government works are not copyrighted under 17 USC 105. Briefings are original. Feed images are not reused. A same-site NASA photograph can be used only after its bytes are checked.",
    rateNote: "No rate-limit header on the check. Feed poll every 360 minutes. A cycle reads at most two article pages and one official image.",
    accessMethod: "rss",
    verifiedAt: CHECKED,
  },
  {
    name: "NIST News",
    kind: "rss",
    locator: "https://www.nist.gov/news-events/news/rss.xml",
    categories: ["technology"],
    language: "en",
    region: "US",
    permittedUsage: "facts",
    imageRights: "none",
    pollMinutes: 360,
    enabled: false,
    alwaysReview: false,
    termsNote:
      "Checked 2026-10-27: this URL returned RSS as application/rss+xml. US government works are not copyrighted under 17 USC 105. Briefings are original. Feed images are not reused.",
    rateNote: "No rate-limit header on the check. One GET, 8 second timeout, poll every 360 minutes.",
    accessMethod: "rss",
    verifiedAt: CHECKED,
  },
  {
    name: "NOAA News",
    kind: "rss",
    locator: "https://www.noaa.gov/rss.xml",
    categories: ["news"],
    language: "en",
    region: "US",
    permittedUsage: "facts",
    imageRights: "none",
    pollMinutes: 360,
    enabled: false,
    alwaysReview: true,
    termsNote:
      "Checked 2026-10-27: this URL returned RSS. US government works are not copyrighted under 17 USC 105. Hazard and science items stay in editorial review. Feed images are not reused.",
    rateNote: "No rate-limit header on the check. One GET, 8 second timeout, poll every 360 minutes.",
    accessMethod: "rss",
    verifiedAt: CHECKED,
  },
  {
    name: "Library of Congress News",
    kind: "rss",
    locator: "https://www.loc.gov/rss/pao/news.xml",
    categories: ["news"],
    language: "en",
    region: "US",
    permittedUsage: "facts",
    imageRights: "none",
    pollMinutes: 360,
    enabled: false,
    alwaysReview: false,
    termsNote:
      "Checked 2026-10-27: this URL returned RSS with content type text/xml. US government works are not copyrighted under 17 USC 105. Briefings are original. Feed images are not reused.",
    rateNote: "No rate-limit header on the check. One GET, 8 second timeout, poll every 360 minutes.",
    accessMethod: "rss",
    verifiedAt: CHECKED,
  },
  {
    name: "arXiv Computers and Society",
    kind: "educational",
    locator: "https://export.arxiv.org/rss/cs.CY",
    categories: ["technology"],
    language: "en",
    region: "global",
    permittedUsage: "facts",
    imageRights: "none",
    pollMinutes: 360,
    enabled: false,
    alwaysReview: true,
    termsNote:
      "Checked 2026-10-27: export.arxiv.org returned RSS. Terms allow descriptive metadata, including title and abstract, under CC0. Full text is not copied or hosted. Paper claims stay in review.",
    rateNote: "arXiv terms require at most one request every three seconds on one connection. This source polls every 360 minutes.",
    accessMethod: "rss",
    verifiedAt: CHECKED,
  },
];

export const LICENSED_PROVIDERS = [
  { name: "Reuters", reason: "A wire license is required. This provider is not fetched." },
  { name: "Associated Press", reason: "A wire license is required. This provider is not fetched." },
  { name: "Getty Images", reason: "An image license is required. Public web images are not reused." },
  { name: "NewsAPI", reason: "An API key and license are required. This provider is not activated." },
] as const;

export const REJECTED_CANDIDATES = [
  { name: "Federal Register search RSS", reason: "On 2026-10-27 the search URL returned an HTML access wall, not a feed." },
  { name: "weather.gov RSS index", reason: "On 2026-10-27 the URL returned HTML, not a feed." },
  { name: "ESA Our Activities RSS", reason: "One response was RSS, then TLS verification failed. It is not registered." },
  { name: "JPL news RSS", reason: "TLS verification failed. It is not registered." },
] as const;

export function catalogByLocator(locator: string): CatalogSource | null {
  return VERIFIED_FEEDS.find((source) => source.locator === locator) ?? null;
}
