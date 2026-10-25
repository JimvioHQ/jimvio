import { pathDisallowed } from "./seo";
import { sanitizeSearchQuery } from "./search-console";

export type SearchInsightQuery = {
  query: string;
  clicks: number;
  impressions: number;
  position: number;
};

export type SearchInsightPage = {
  page: string;
  clicks: number;
  impressions: number;
  position: number;
};

export type SearchConsoleInsight = {
  id: string;
  kind: "low_clicks" | "relevant_query" | "title_or_content";
  query: string | null;
  path: string | null;
  clicks: number;
  impressions: number;
  position: number | null;
  statement: string;
  recommendation: string;
};

const SECRET_SAMPLE = /BEGIN [A-Z ]*PRIVATE KEY|PRIVATE KEY|private_key|client_email|ya29\.|eyJ[A-Za-z0-9_-]{10,}|Bearer\s+\S|service_account/i;
const MIN_IMPRESSIONS = 20;
const LOW_CTR = 0.05;

function slug(parts: string[]): string {
  return parts.join("-").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 72);
}

function nonNegative(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

function rounded(value: number): number {
  return Math.round(nonNegative(value) * 100) / 100;
}

function clickRate(clicks: number, impressions: number): number {
  if (impressions <= 0) return 0;
  return clicks / impressions;
}

function term(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function allowedPath(path: string, knownPaths: readonly string[]): boolean {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("..")) return false;
  if (!knownPaths.includes(path)) return false;
  if (pathDisallowed(path)) return false;
  return true;
}

/** Map a Search Console page URL onto one known public path. Other hosts and unknown paths stay unmapped. */
export function mapSearchConsolePage(pageUrl: string, knownPaths: readonly string[]): string | null {
  if (!pageUrl || SECRET_SAMPLE.test(pageUrl)) return null;
  let url: URL;
  try {
    url = new URL(pageUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  const host = url.hostname.toLowerCase();
  if (host !== "jimvio.com" && host !== "www.jimvio.com") return null;
  let path = url.pathname;
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  try {
    path = decodeURIComponent(path);
  } catch {
    return null;
  }
  return allowedPath(path, knownPaths) ? path : null;
}

/** Map a query only when it equals exactly one catalog slug or title. */
export function mapQueryToPath(
  query: string,
  pages: ReadonlyArray<{ path: string; title?: string | null }>,
  knownPaths: readonly string[],
): string | null {
  const needle = term(query);
  if (needle.length < 3 || SECRET_SAMPLE.test(query)) return null;
  const matches = new Set<string>();
  for (const page of pages) {
    if (!allowedPath(page.path, knownPaths)) continue;
    const slug = term(page.path.split("/").filter(Boolean).at(-1) ?? "");
    const title = term(page.title ?? "");
    if ((slug && needle === slug) || (title && needle === title)) matches.add(page.path);
  }
  if (matches.size !== 1) return null;
  return [...matches][0] ?? null;
}

function lowClicks(clicks: number, impressions: number): boolean {
  return impressions >= MIN_IMPRESSIONS && clickRate(clicks, impressions) < LOW_CTR;
}

/**
 * Recommendations from a readonly Search Analytics sample.
 * A page is attached only by an exact public URL or a unique slug/title match.
 */
export function buildSearchConsoleInsights(input: {
  queries: readonly SearchInsightQuery[];
  pages: readonly SearchInsightPage[];
  catalog: ReadonlyArray<{ path: string; title?: string | null }>;
  knownPaths: readonly string[];
}): SearchConsoleInsight[] {
  const insights: SearchConsoleInsight[] = [];
  const usedPaths = new Set<string>();
  const lowClickUnmapped: SearchInsightQuery[] = [];

  const queries = input.queries
    .map((row) => {
      const query = sanitizeSearchQuery(row.query);
      if (!query || SECRET_SAMPLE.test(query)) return null;
      return {
        query,
        clicks: nonNegative(row.clicks),
        impressions: nonNegative(row.impressions),
        position: rounded(row.position),
      };
    })
    .filter((row): row is SearchInsightQuery => Boolean(row));

  for (const row of queries) {
    if (!lowClicks(row.clicks, row.impressions)) continue;
    const path = mapQueryToPath(row.query, input.catalog, input.knownPaths);
    if (!path) {
      lowClickUnmapped.push(row);
      continue;
    }
    if (usedPaths.has(path) || insights.filter((item) => item.kind === "low_clicks" && item.path).length >= 2) continue;
    usedPaths.add(path);
    insights.push({
      id: slug(["sc-low-clicks", path]),
      kind: "low_clicks",
      query: row.query,
      path,
      clicks: row.clicks,
      impressions: row.impressions,
      position: row.position,
      statement: `"${row.query}" mapped to ${path}: ${row.impressions} impressions, ${row.clicks} clicks, average position ${row.position}.`,
      recommendation: `Review the title and opening content on ${path} for this query. This is a draft only. Do not change the live title, canonical tag, robots rules, or sitemap.`,
    });
  }

  if (lowClickUnmapped.length > 0) {
    const sample = lowClickUnmapped.slice(0, 5);
    insights.push({
      id: "sc-low-clicks-unmapped",
      kind: "low_clicks",
      query: sample[0]?.query ?? null,
      path: null,
      clicks: sample.reduce((sum, row) => sum + row.clicks, 0),
      impressions: sample.reduce((sum, row) => sum + row.impressions, 0),
      position: null,
      statement: `${sample.length} measured ${sample.length === 1 ? "query has" : "queries have"} impressions and a click rate under 5%, with no unique public page: ${sample.map((row) => `${row.query} (${row.impressions} impressions, ${row.clicks} clicks)`).join("; ")}.`,
      recommendation: "Keep these queries as demand notes. Do not attach them to a page or publish a new URL from the query alone.",
    });
  }

  let pageDrafts = 0;
  for (const row of input.pages) {
    if (pageDrafts >= 2) break;
    const path = mapSearchConsolePage(row.page, input.knownPaths);
    if (!path || usedPaths.has(path)) continue;
    const clicks = nonNegative(row.clicks);
    const impressions = nonNegative(row.impressions);
    const position = rounded(row.position);
    if (impressions < MIN_IMPRESSIONS) continue;
    if (!(position >= 8 || clickRate(clicks, impressions) < LOW_CTR)) continue;
    const current = input.catalog.find((page) => page.path === path);
    const title = current?.title?.trim();
    usedPaths.add(path);
    pageDrafts += 1;
    insights.push({
      id: slug(["sc-page", path]),
      kind: "title_or_content",
      query: null,
      path,
      clicks,
      impressions,
      position,
      statement: title
        ? `${path} has ${impressions} impressions, ${clicks} clicks, and average position ${position}. The current catalog title is "${title.slice(0, 80)}".`
        : `${path} has ${impressions} impressions, ${clicks} clicks, and average position ${position}. The catalog has no title for this path.`,
      recommendation: `Review the title and opening content on ${path}. This is a draft only. Do not change the live title, canonical tag, robots rules, or sitemap.`,
    });
  }

  const relevant = queries
    .filter((row) => row.impressions >= 5 && !lowClicks(row.clicks, row.impressions))
    .slice(0, 5);
  if (relevant.length > 0) {
    insights.push({
      id: "sc-relevant-queries",
      kind: "relevant_query",
      query: relevant[0]?.query ?? null,
      path: null,
      clicks: relevant.reduce((sum, row) => sum + row.clicks, 0),
      impressions: relevant.reduce((sum, row) => sum + row.impressions, 0),
      position: null,
      statement: `Relevant measured queries in this click-sorted sample: ${relevant.map((row) => row.query).join(", ")}.`,
      recommendation: "Use these queries as review context. Do not treat a query that is absent from this sample as zero demand.",
    });
  }

  return insights;
}
