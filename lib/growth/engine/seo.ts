import { ROBOTS_DISALLOW } from "@/lib/seo/robots-rules";
import type { SeoFinding, SeoPage } from "./types";

const PROHIBITED_CLAIM = /paypal|pesapal|pawapay|afripay|\bstripe\b|guaranteed (income|earnings|returns)/i;

function slug(parts: string[]): string {
  return parts.join("-").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 96);
}

function finding(path: string, code: string, severity: SeoFinding["severity"], statement: string, basis: SeoFinding["basis"] = "measured"): SeoFinding {
  return { id: slug([code, path]), path, code, severity, statement, basis };
}

export function pathDisallowed(path: string, rules: readonly string[] = ROBOTS_DISALLOW): boolean {
  return rules.some((rule) => {
    if (rule.includes("*")) return false;
    if (rule.endsWith("/")) return path === rule.slice(0, -1) || path.startsWith(rule);
    return path === rule || path.startsWith(`${rule}/`);
  });
}

export function auditSeo(input: {
  pages: SeoPage[];
  sitemapPaths: string[];
  knownPaths: string[];
  internalHrefs?: string[];
  disallowedPaths?: readonly string[];
  organizationSchema?: boolean;
  websiteSchema?: boolean;
}): SeoFinding[] {
  const findings: SeoFinding[] = [];
  const known = new Set(input.knownPaths);
  const seen = new Map<string, number>();

  for (const page of input.pages) {
    seen.set(page.path, (seen.get(page.path) ?? 0) + 1);
    const title = page.title?.trim() ?? "";
    const description = page.description?.trim() ?? "";
    if (!title) findings.push(finding(page.path, "missing-title", "warning", "This page has no title."));
    else if (title.length < 15 || title.length > 70) {
      findings.push(finding(page.path, "title-length", "info", `Title length is ${title.length} characters. 15 to 70 is the review range used by this audit.`));
    }
    if (!description) findings.push(finding(page.path, "missing-description", "warning", "This page has no meta description."));
    else if (description.length < 50 || description.length > 160) {
      findings.push(finding(page.path, "description-length", "info", `Description length is ${description.length} characters. 50 to 160 is the review range used by this audit.`));
    }
    if (PROHIBITED_CLAIM.test(`${title} ${description}`)) {
      findings.push(finding(page.path, "prohibited-claim", "warning", "Metadata includes a retired payment brand or a guaranteed-earnings claim."));
    }
    if (!page.path.startsWith("/") || page.path.startsWith("//")) {
      findings.push(finding(page.path, "canonical-shape", "warning", "The path is not a same-site absolute path."));
    }
    if (page.canonical && page.canonical !== page.path) {
      findings.push(finding(page.path, "canonical-mismatch", "warning", `Canonical ${page.canonical} does not match the page path.`));
    }
  }

  for (const [path, count] of seen) {
    if (count > 1) findings.push(finding(path, "duplicate-path", "warning", `This path appears ${count} times in the metadata catalog.`));
  }

  const pagePaths = new Set(input.pages.map((page) => page.path));
  for (const path of input.sitemapPaths) {
    if (!pagePaths.has(path)) {
      findings.push(finding(path, "sitemap-without-metadata", "warning", "This sitemap URL has no entry in the page metadata catalog."));
    }
    if (pathDisallowed(path, input.disallowedPaths)) {
      findings.push(finding(path, "sitemap-disallowed", "warning", "This sitemap URL is also disallowed in robots.txt."));
    }
    if (!known.has(path)) known.add(path);
  }

  for (const path of pagePaths) {
    if (!input.sitemapPaths.includes(path)) {
      findings.push(finding(path, "metadata-not-in-sitemap", "info", "This metadata path is not in the static sitemap list."));
    }
  }

  for (const href of input.internalHrefs ?? []) {
    if (/^https?:\/\//i.test(href)) continue;
    const path = href.split(/[?#]/)[0] || "/";
    if (!known.has(path)) {
      findings.push(finding(path, "broken-internal-link", "warning", `${href} is not in the known public path set. External URLs are not fetched.`));
    }
  }

  if (input.organizationSchema === false) {
    findings.push(finding("/", "missing-organization-schema", "warning", "Organization JSON-LD was not reported for this run."));
  }
  if (input.websiteSchema === false) {
    findings.push(finding("/", "missing-website-schema", "warning", "WebSite JSON-LD was not reported for this run."));
  }

  findings.push(finding("/", "external-links-not-crawled", "info", "This audit does not fetch external URLs or search-result pages.", "measured"));
  return findings;
}
