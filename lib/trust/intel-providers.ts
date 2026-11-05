/**
 * Threat-intelligence adapters for Scam & Malicious Link Detection.
 *
 * Only sources that are free forever AND allow Jimvio's commercial use are
 * active (licensing record: docs/trust-checker/threat-intel-providers.md):
 *
 * | Provider            | Covers            | Terms (checked Nov 2026)                                         |
 * |---------------------|-------------------|------------------------------------------------------------------|
 * | Phishing.Database   | phishing domains  | MIT licence (keep the copyright notice)                          |
 * | CERT Polska         | phishing domains  | "any purpose, including commercial"; refresh ≤5 min; no endorsement |
 * | Feodo Tracker       | botnet C2 IPs     | abuse.ch, CC0 — commercial use permitted                         |
 * | SSL Blacklist       | botnet C2 certs   | abuse.ch, CC0 — commercial use permitted                         |
 *
 * PhishTank, URLhaus, OpenPhish and Google Web Risk were removed (Nov 2026):
 * none is free forever for commercial use. No malware-URL database is
 * therefore available, and the assessment says so instead of guessing.
 *
 * Every adapter returns an honest status: a timeout, outage, empty feed or
 * bad response is NEVER "clean". Pure apart from injected deps (fetch, clock).
 */
import type { IntelResult } from "./types";

export type IntelDeps = {
  fetch: typeof fetch;
  now: () => number;
};

/** The providers Jimvio actually queries. */
export type ActiveProviderId = "phishing_database" | "cert_pl" | "feodo" | "sslbl";

export type IntelQuery = { url: URL; hosts: string[]; ips: string[]; certSha1: string | null };

type Meta = Pick<IntelResult, "name" | "family" | "covers" | "terms"> & { id: ActiveProviderId };

export const PROVIDERS: Record<ActiveProviderId, Meta> = {
  phishing_database: { id: "phishing_database", name: "Phishing.Database", family: "phish-aggregate", covers: ["phishing"], terms: "MIT licence — © Mitchell Krog, Nissar Chababy & Phishing.Database contributors" },
  cert_pl: { id: "cert_pl", name: "CERT Polska Warning List", family: "cert-pl", covers: ["phishing"], terms: "NASK-PIB / CERT Polska — any use incl. commercial; no endorsement implied" },
  feodo: { id: "feodo", name: "Feodo Tracker (abuse.ch)", family: "abusech-c2", covers: ["c2"], terms: "CC0, commercial use permitted" },
  sslbl: { id: "sslbl", name: "SSL Blacklist (abuse.ch)", family: "abusech-c2", covers: ["c2"], terms: "CC0, commercial use permitted" },
};


/** Display names for sources that older saved reports may contain. They are never queried. */
export const RETIRED_PROVIDERS: Record<string, string> = {
  phishtank: "PhishTank",
  urlhaus: "URLhaus (abuse.ch)",
  openphish: "OpenPhish",
  google_web_risk: "Google Web Risk",
};

export const isActiveProvider = (id: string): id is ActiveProviderId => id in PROVIDERS;
const TIMEOUT_MS = 8_000;
const FEED_TTL_MS = 15 * 60_000;

const result = (id: ActiveProviderId, deps: IntelDeps, started: number, r: Partial<IntelResult> & Pick<IntelResult, "status">): IntelResult => ({
  ...PROVIDERS[id],
  matches: [],
  threat: null,
  note: null,
  ...r,
  checkedAt: new Date(deps.now()).toISOString(),
  ms: Math.max(0, deps.now() - started),
});

async function fetchWithRetry(deps: IntelDeps, url: string, init: RequestInit, retries = 1): Promise<Response> {
  let last: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await deps.fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
      if (res.status >= 500 && i < retries) continue;
      return res;
    } catch (e) {
      last = e;
    }
  }
  throw last ?? new Error("fetch failed");
}


// ── Feed-based providers (downloaded, indexed locally, refreshed on schedule) ──
type Feed = { at: number; items: Set<string> } | null;
const feeds = new Map<string, Feed>();
const loading = new Map<string, Promise<Feed>>();

async function loadFeed(deps: IntelDeps, key: string, url: string, parse: (text: string) => Set<string>, ttlMs = FEED_TTL_MS): Promise<Feed> {
  const cur = feeds.get(key) ?? null;
  if (cur && deps.now() - cur.at < ttlMs) return cur;
  const inflight = loading.get(key);
  if (inflight) return inflight;
  const p = (async () => {
    try {
      const res = await fetchWithRetry(deps, url, { headers: { "user-agent": "Jimvio-TrustChecker/1.0 (+https://www.jimvio.com/trust-checker)" } });
      if (!res.ok) return cur; // keep the last good copy, but callers see its age
      const text = await res.text();
      if (text.length > 80_000_000) return cur;
      const f = { at: deps.now(), items: parse(text) };
      feeds.set(key, f);
      return f;
    } catch {
      return cur;
    } finally {
      loading.delete(key);
    }
  })();
  loading.set(key, p);
  return p;
}

/** Stale copies are usable for at most 6 hours; older ones count as unavailable. */
const fresh = (f: Feed, deps: IntelDeps) => Boolean(f && deps.now() - f.at < 6 * 60 * 60_000);

export function parseFeodo(text: string): Set<string> {
  const s = new Set<string>();
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(t)) s.add(t);
  }
  return s;
}

export function parseSslbl(text: string): Set<string> {
  const s = new Set<string>();
  for (const line of text.split("\n")) {
    if (line.startsWith("#")) continue;
    const sha1 = line.split(",")[1]?.trim().toLowerCase();
    if (sha1 && /^[0-9a-f]{40}$/.test(sha1)) s.add(sha1);
  }
  return s;
}

/** One registrable domain or host per line; comments, blanks, IPs and junk are dropped; duplicates collapse. */
export function parseDomainList(text: string): Set<string> {
  const s = new Set<string>();
  for (const line of text.split("\n")) {
    const t = line.trim().toLowerCase().replace(/\.$/, "");
    if (!t || t.startsWith("#")) continue;
    if (/^(?=.{3,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$/.test(t)) s.add(t);
  }
  return s;
}

/** A host matches a listed domain when it IS that domain or a subdomain of it — never a parent of it. */
export function domainListed(host: string, list: Set<string>): string | null {
  const h = host.toLowerCase().replace(/\.$/, "");
  const parts = h.split(".");
  for (let i = 0; i < parts.length - 1; i++) {
    const cand = parts.slice(i).join(".");
    if (list.has(cand)) return cand;
  }
  return null;
}

export async function checkCertPl(q: IntelQuery, deps: IntelDeps): Promise<IntelResult> {
  const t = deps.now();
  // CERT Polska asks integrators to refresh every 5 minutes.
  const f = await loadFeed(deps, "cert_pl", "https://hole.cert.pl/domains/v2/domains.txt", parseDomainList, 5 * 60_000);
  if (!fresh(f, deps) || !f!.items.size) return result("cert_pl", deps, t, { status: "error", note: "The CERT Polska Warning List could not be downloaded." });
  const hits = [...new Set(q.hosts.map((h) => domainListed(h, f!.items)).filter((x): x is string => Boolean(x)))];
  return result("cert_pl", deps, t, hits.length ? { status: "match", matches: hits, threat: "phishing" } : { status: "clean", note: `Checked against ${f!.items.size} listed domains (mainly campaigns targeting Polish users).` });
}

export async function checkFeodo(q: IntelQuery, deps: IntelDeps): Promise<IntelResult> {
  const t = deps.now();
  if (!q.ips.length) return result("feodo", deps, t, { status: "skipped", note: "No server IP address was resolved." });
  const f = await loadFeed(deps, "feodo", "https://feodotracker.abuse.ch/downloads/ipblocklist.txt", parseFeodo);
  if (!fresh(f, deps)) return result("feodo", deps, t, { status: "error", note: "The Feodo Tracker list could not be downloaded." });
  const hits = q.ips.filter((ip) => f!.items.has(ip));
  return result("feodo", deps, t, hits.length ? { status: "match", matches: hits, threat: "botnet_c2" } : { status: "clean", note: `Checked against ${f!.items.size} listed C2 IPs.` });
}

export async function checkSslbl(q: IntelQuery, deps: IntelDeps): Promise<IntelResult> {
  const t = deps.now();
  if (!q.certSha1) return result("sslbl", deps, t, { status: "skipped", note: "No TLS certificate was read." });
  const f = await loadFeed(deps, "sslbl", "https://sslbl.abuse.ch/blacklist/sslblacklist.csv", parseSslbl);
  if (!fresh(f, deps)) return result("sslbl", deps, t, { status: "error", note: "The SSL Blacklist could not be downloaded." });
  const hit = f!.items.has(q.certSha1.toLowerCase());
  return result("sslbl", deps, t, hit ? { status: "match", matches: [q.certSha1], threat: "botnet_c2_certificate" } : { status: "clean", note: `Certificate checked against ${f!.items.size} blacklisted certificates.` });
}

/** Provider health, kept in memory per server instance (last outcome per provider). */
export const health = new Map<ActiveProviderId, { status: IntelResult["status"]; at: string; ms: number }>();

export async function runIntel(q: IntelQuery, deps: IntelDeps, extra: IntelResult[] = []): Promise<IntelResult[]> {
  const settled = await Promise.all([checkCertPl(q, deps), checkFeodo(q, deps), checkSslbl(q, deps)]);
  const all = [...extra, ...settled];
  for (const r of all) if (isActiveProvider(r.id)) health.set(r.id, { status: r.status, at: r.checkedAt, ms: r.ms });
  return all;
}

export type IntelSummary = {
  answered: IntelResult[];
  failed: IntelResult[];
  notConfigured: IntelResult[];
  matches: IntelResult[];
  /** Distinct provider families that listed it (aggregators of the same sources count once). */
  independentHits: number;
  phishingCovered: boolean;
  malwareUrlCovered: boolean;
  c2Covered: boolean;
};

export function summarizeIntel(rs: IntelResult[]): IntelSummary {
  const answered = rs.filter((r) => r.status === "match" || r.status === "clean");
  const matches = rs.filter((r) => r.status === "match");
  return {
    answered,
    failed: rs.filter((r) => ["error", "timeout", "quota", "invalid_response"].includes(r.status)),
    notConfigured: rs.filter((r) => r.status === "not_configured"),
    matches,
    independentHits: new Set(matches.map((m) => m.family)).size,
    phishingCovered: answered.some((r) => r.covers.includes("phishing")),
    malwareUrlCovered: answered.some((r) => r.covers.includes("malware")),
    c2Covered: answered.some((r) => r.covers.includes("c2")),
  };
}

/** Test helper: forget cached feeds and provider health. */
export function resetIntelCaches(): void {
  feeds.clear();
  loading.clear();
  health.clear();
}
