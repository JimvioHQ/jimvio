/**
 * Unified threat-intelligence adapters for Scam & Malicious Link Detection.
 *
 * Every provider returns the same shape and an honest status: a timeout,
 * outage, missing key, quota or bad response is NEVER "clean". Providers
 * are only queried when their terms allow Jimvio's (commercial) use:
 *
 * | Provider            | Covers            | Access / terms (checked Nov 2026)                               |
 * |---------------------|-------------------|------------------------------------------------------------------|
 * | Phishing.Database   | phishing domains  | MIT licence, public list (aggregates OpenPhish, PhishTank, …)    |
 * | Feodo Tracker       | botnet C2 IPs     | abuse.ch, CC0 — free for commercial use                          |
 * | SSL Blacklist       | botnet C2 certs   | abuse.ch, CC0 — free for commercial use                          |
 * | URLhaus             | malware URLs      | free Auth-Key; commercial use may need a Spamhaus subscription   |
 * | PhishTank           | phishing URLs     | app key; new registrations closed since 2020                     |
 * | OpenPhish           | phishing URLs     | community feed is non-commercial; licensed feed URL required     |
 * | Google Web Risk     | malware/phishing  | API key + billing on the Google Cloud project                    |
 *
 * Pure apart from injected deps (fetch, env, quota, clock), so it is unit-testable.
 */
import type { IntelResult } from "./types";

export type IntelDeps = {
  fetch: typeof fetch;
  env: Record<string, string | undefined>;
  quota: (provider: string, dailyLimit: number) => Promise<boolean>;
  now: () => number;
};

export type IntelQuery = { url: URL; hosts: string[]; ips: string[]; certSha1: string | null };

type Meta = Pick<IntelResult, "id" | "name" | "family" | "covers" | "terms">;

export const PROVIDERS: Record<IntelResult["id"], Meta> = {
  phishing_database: { id: "phishing_database", name: "Phishing.Database", family: "phish-aggregate", covers: ["phishing"], terms: "MIT licence" },
  openphish: { id: "openphish", name: "OpenPhish", family: "phish-aggregate", covers: ["phishing"], terms: "Licensed feed only (community feed is non-commercial)" },
  phishtank: { id: "phishtank", name: "PhishTank", family: "phish-aggregate", covers: ["phishing"], terms: "Requires a PhishTank app key (registrations closed)" },
  urlhaus: { id: "urlhaus", name: "URLhaus (abuse.ch)", family: "abusech-urlhaus", covers: ["malware"], terms: "Auth-Key; commercial use may require a Spamhaus subscription" },
  feodo: { id: "feodo", name: "Feodo Tracker (abuse.ch)", family: "abusech-c2", covers: ["c2"], terms: "CC0, commercial use permitted" },
  sslbl: { id: "sslbl", name: "SSL Blacklist (abuse.ch)", family: "abusech-c2", covers: ["c2"], terms: "CC0, commercial use permitted" },
  google_web_risk: { id: "google_web_risk", name: "Google Web Risk", family: "google", covers: ["malware", "phishing"], terms: "API key + billing" },
};

export const URLHAUS_DAILY_CAP = 2000;
export const PHISHTANK_DAILY_CAP = 2000;
const TIMEOUT_MS = 8_000;
const FEED_TTL_MS = 15 * 60_000;
const LOOKUP_TTL_MS = 15 * 60_000;

const result = (id: IntelResult["id"], deps: IntelDeps, started: number, r: Partial<IntelResult> & Pick<IntelResult, "status">): IntelResult => ({
  ...PROVIDERS[id],
  matches: [],
  threat: null,
  note: null,
  ...r,
  checkedAt: new Date(deps.now()).toISOString(),
  ms: Math.max(0, deps.now() - started),
});

/** Parameters that often carry personal tokens: such URLs are never sent to third parties in full. */
const SENSITIVE_PARAM = /(^|_|-)(token|key|apikey|auth|code|session|sid|sig|signature|password|pass|pwd|secret|email|otp|ticket|access)($|_|-)/i;

/** Canonical form for external lookups: no credentials, no fragment; null when the query looks private. */
export function shareableUrl(u: URL): string | null {
  const c = new URL(u.toString());
  c.username = "";
  c.password = "";
  c.hash = "";
  c.hostname = c.hostname.toLowerCase().replace(/\.$/, "");
  for (const k of c.searchParams.keys()) if (SENSITIVE_PARAM.test(k)) return null;
  return c.toString();
}

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

const isTimeout = (e: unknown) => e instanceof Error && /timeout|aborted/i.test(`${e.name} ${e.message}`);

// ── Feed-based providers (downloaded, indexed locally, refreshed on schedule) ──
type Feed = { at: number; items: Set<string> } | null;
const feeds = new Map<string, Feed>();
const loading = new Map<string, Promise<Feed>>();

async function loadFeed(deps: IntelDeps, key: string, url: string, parse: (text: string) => Set<string>): Promise<Feed> {
  const cur = feeds.get(key) ?? null;
  if (cur && deps.now() - cur.at < FEED_TTL_MS) return cur;
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

export function parseUrlList(text: string): Set<string> {
  const s = new Set<string>();
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (/^https?:\/\//i.test(t)) s.add(t.replace(/\/+$/, "").toLowerCase());
  }
  return s;
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

export async function checkOpenPhish(q: IntelQuery, deps: IntelDeps): Promise<IntelResult> {
  const t = deps.now();
  const feedUrl = deps.env.OPENPHISH_FEED_URL?.trim();
  if (!feedUrl) return result("openphish", deps, t, { status: "not_configured", note: "OpenPhish's free community feed is licensed for non-commercial use only; a licensed feed URL (OPENPHISH_FEED_URL) is required." });
  const f = await loadFeed(deps, "openphish", feedUrl, parseUrlList);
  if (!fresh(f, deps)) return result("openphish", deps, t, { status: "error", note: "The OpenPhish feed could not be downloaded." });
  const target = q.url.toString().replace(/\/+$/, "").toLowerCase();
  // Exact URL, or a listed URL that is a path prefix of it. Never host-only: phishing kits often sit on shared hosts (sites.google.com, github.io…).
  const hits = [...f!.items]
    .filter((u) => {
      if (u === target) return true;
      try {
        const l = new URL(u);
        return l.hostname === q.url.hostname.toLowerCase() && l.pathname.length > 1 && target.startsWith(u.replace(/\/+$/, "") + "/");
      } catch {
        return false;
      }
    })
    .slice(0, 5);
  return result("openphish", deps, t, hits.length ? { status: "match", matches: hits, threat: "phishing" } : { status: "clean" });
}

// ── Lookup APIs ──
const lookups = new Map<string, { at: number; r: IntelResult }>();
const cached = (key: string, deps: IntelDeps) => {
  const c = lookups.get(key);
  return c && deps.now() - c.at < LOOKUP_TTL_MS ? c.r : null;
};
const remember = (key: string, r: IntelResult, deps: IntelDeps) => {
  if (r.status === "match" || r.status === "clean") {
    if (lookups.size > 2000) lookups.delete(lookups.keys().next().value as string);
    lookups.set(key, { at: deps.now(), r });
  }
  return r;
};

export async function checkUrlhaus(q: IntelQuery, deps: IntelDeps): Promise<IntelResult> {
  const t = deps.now();
  const key = deps.env.URLHAUS_AUTH_KEY?.trim();
  if (!key) return result("urlhaus", deps, t, { status: "not_configured", note: "URLHAUS_AUTH_KEY is not set (free key from auth.abuse.ch; commercial use may require a Spamhaus subscription)." });
  const share = shareableUrl(q.url);
  const cacheKey = `urlhaus:${share ?? q.hosts[0]}`;
  const c = cached(cacheKey, deps);
  if (c) return { ...c, note: `${c.note ? `${c.note} ` : ""}(cached)` };
  if (!(await deps.quota("urlhaus", URLHAUS_DAILY_CAP))) return result("urlhaus", deps, t, { status: "quota", note: "Today's URLhaus query allowance is used up." });
  try {
    const post = (path: string, body: Record<string, string>) =>
      fetchWithRetry(deps, `https://urlhaus-api.abuse.ch/v1/${path}/`, { method: "POST", headers: { "Auth-Key": key, "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(body).toString() });
    const matches: string[] = [];
    let threat: string | null = null;
    // Exact URL (only when it carries nothing private), then every host on the path.
    if (share) {
      const res = await post("url", { url: share });
      const j = await parseJson(res);
      if (res.status === 401 || res.status === 403) return result("urlhaus", deps, t, { status: "error", note: "URLhaus rejected the Auth-Key." });
      if (res.status === 429) return result("urlhaus", deps, t, { status: "quota", note: "URLhaus rate limit reached." });
      if (!res.ok || !j || typeof j.query_status !== "string") return result("urlhaus", deps, t, { status: "invalid_response", note: `URLhaus answered ${res.status} without a usable result.` });
      if (j.query_status === "ok") { matches.push(`${share} (${String(j.url_status ?? "listed")})`); threat = String(j.threat ?? "malware_download"); }
      else if (j.query_status !== "no_results" && j.query_status !== "invalid_url") return result("urlhaus", deps, t, { status: "invalid_response", note: `URLhaus: ${j.query_status}` });
    }
    for (const host of q.hosts.slice(0, 3)) {
      const res = await post("host", { host });
      const j = await parseJson(res);
      if (!res.ok || !j || typeof j.query_status !== "string") return result("urlhaus", deps, t, { status: res.status === 429 ? "quota" : "invalid_response", note: `URLhaus host lookup answered ${res.status}.` });
      const online = Array.isArray(j.urls) ? (j.urls as { url_status?: string }[]).filter((u) => u.url_status === "online").length : 0;
      if (j.query_status === "ok" && online > 0) { matches.push(`${host} (${online} malware URL${online > 1 ? "s" : ""} online)`); threat = threat ?? "malware_download"; }
    }
    return remember(cacheKey, result("urlhaus", deps, t, matches.length ? { status: "match", matches, threat } : { status: "clean", note: share ? null : "Only the host was checked (the link's parameters look private)." }), deps);
  } catch (e) {
    return result("urlhaus", deps, t, { status: isTimeout(e) ? "timeout" : "error", note: isTimeout(e) ? "URLhaus did not answer in time." : "URLhaus could not be reached." });
  }
}

export async function checkPhishTank(q: IntelQuery, deps: IntelDeps): Promise<IntelResult> {
  const t = deps.now();
  const appKey = deps.env.PHISHTANK_APP_KEY?.trim();
  const user = deps.env.PHISHTANK_USERNAME?.trim();
  if (!appKey || !user) return result("phishtank", deps, t, { status: "not_configured", note: "PhishTank needs PHISHTANK_APP_KEY and PHISHTANK_USERNAME; PhishTank has closed new registrations." });
  const share = shareableUrl(q.url);
  if (!share) return result("phishtank", deps, t, { status: "skipped", note: "Not sent: the link's parameters look private and PhishTank only checks full URLs." });
  const cacheKey = `phishtank:${share}`;
  const c = cached(cacheKey, deps);
  if (c) return c;
  if (!(await deps.quota("phishtank", PHISHTANK_DAILY_CAP))) return result("phishtank", deps, t, { status: "quota", note: "Today's PhishTank allowance is used up." });
  try {
    const res = await fetchWithRetry(deps, "https://checkurl.phishtank.com/checkurl/", {
      method: "POST",
      headers: { "user-agent": `phishtank/${user}`, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ url: share, format: "json", app_key: appKey }).toString(),
    });
    if (res.status === 509 || res.status === 429) return result("phishtank", deps, t, { status: "quota", note: "PhishTank rate limit reached." });
    const j = await parseJson(res);
    const r = j?.results as { in_database?: boolean; verified?: boolean; valid?: boolean; phish_id?: number | string } | undefined;
    if (!res.ok || !r || typeof r.in_database !== "boolean") return result("phishtank", deps, t, { status: "invalid_response", note: `PhishTank answered ${res.status} without a usable result.` });
    // Only verified, still-valid entries count as threats; unverified submissions are not evidence.
    const hit = r.in_database && r.verified === true && r.valid === true;
    return remember(cacheKey, result("phishtank", deps, t, hit ? { status: "match", matches: [`${share} (PhishTank #${r.phish_id ?? "?"})`], threat: "phishing" } : { status: "clean", note: r.in_database ? "Submitted to PhishTank but not verified as phishing." : null }), deps);
  } catch (e) {
    return result("phishtank", deps, t, { status: isTimeout(e) ? "timeout" : "error", note: isTimeout(e) ? "PhishTank did not answer in time." : "PhishTank could not be reached." });
  }
}

async function parseJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    const j = (await res.json()) as unknown;
    return j && typeof j === "object" ? (j as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Provider health, kept in memory per server instance (last outcome per provider). */
export const health = new Map<IntelResult["id"], { status: IntelResult["status"]; at: string; ms: number }>();

export async function runIntel(q: IntelQuery, deps: IntelDeps, extra: IntelResult[] = []): Promise<IntelResult[]> {
  const settled = await Promise.all([checkUrlhaus(q, deps), checkPhishTank(q, deps), checkOpenPhish(q, deps), checkFeodo(q, deps), checkSslbl(q, deps)]);
  const all = [...extra, ...settled];
  for (const r of all) health.set(r.id, { status: r.status, at: r.checkedAt, ms: r.ms });
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

/** Test helper: forget cached feeds and lookups. */
export function resetIntelCaches(): void {
  feeds.clear();
  loading.clear();
  lookups.clear();
  health.clear();
}
