import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { checkFeodo, checkOpenPhish, checkPhishTank, checkSslbl, checkUrlhaus, resetIntelCaches, shareableUrl, summarizeIntel, type IntelDeps, type IntelQuery } from "./intel-providers.ts";
import { assessLink } from "./link-assessment.ts";
import type { IntelResult, LinkDetails } from "./types.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const deps = (handler: (url: string, init?: RequestInit) => Response | Promise<Response>, env: Record<string, string> = {}, quota = true): IntelDeps => ({
  fetch: (async (u: RequestInfo | URL, init?: RequestInit) => handler(String(u), init)) as typeof fetch,
  env, quota: async () => quota, now: () => Date.now(),
});
const q = (url = "http://bad.example/payload.exe"): IntelQuery => ({ url: new URL(url), hosts: [new URL(url).hostname], ips: ["203.0.113.7"], certSha1: "a".repeat(40) });
const KEY = { URLHAUS_AUTH_KEY: "k" };

beforeEach(() => resetIntelCaches());

describe("URLhaus adapter", () => {
  it("missing key is a configuration issue, never clean", async () => {
    const r = await checkUrlhaus(q(), deps(() => json({})));
    assert.equal(r.status, "not_configured");
  });
  it("positive match", async () => {
    const r = await checkUrlhaus(q(), deps((u) => (u.endsWith("/url/") ? json({ query_status: "ok", url_status: "online", threat: "malware_download" }) : json({ query_status: "no_results" })), KEY));
    assert.equal(r.status, "match");
    assert.equal(r.threat, "malware_download");
  });
  it("negative match", async () => {
    const r = await checkUrlhaus(q(), deps(() => json({ query_status: "no_results" }), KEY));
    assert.equal(r.status, "clean");
  });
  it("outage, invalid response, rejected key, quota and timeout are never clean", async () => {
    assert.equal((await checkUrlhaus(q(), deps(() => new Response("oops", { status: 503 }), KEY))).status, "invalid_response");
    assert.equal((await checkUrlhaus(q(), deps(() => new Response("<html>", { status: 200 }), KEY))).status, "invalid_response");
    assert.equal((await checkUrlhaus(q(), deps(() => json({ query_status: "unknown_auth_key" }, 401), KEY))).status, "error");
    assert.equal((await checkUrlhaus(q(), deps(() => json({}), KEY, false))).status, "quota");
    assert.equal((await checkUrlhaus(q(), deps(() => { throw Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" }); }, KEY))).status, "timeout");
  });
  it("never sends private-looking query strings to the provider", async () => {
    const sent: string[] = [];
    await checkUrlhaus(q("https://shop.example/reset?token=abc123"), deps((u, init) => { sent.push(`${u} ${String(init?.body)}`); return json({ query_status: "no_results" }); }, KEY));
    assert.ok(sent.every((s) => !s.includes("abc123")));
    assert.ok(sent.every((s) => s.includes("/host/")));
    assert.equal(shareableUrl(new URL("https://u:p@a.example/x?id=1#f")), "https://a.example/x?id=1");
  });
});

describe("PhishTank adapter", () => {
  const env = { PHISHTANK_APP_KEY: "x", PHISHTANK_USERNAME: "jimvio" };
  it("not configured without credentials", async () => {
    assert.equal((await checkPhishTank(q(), deps(() => json({})))).status, "not_configured");
  });
  it("only verified + valid entries count", async () => {
    assert.equal((await checkPhishTank(q(), deps(() => json({ results: { in_database: true, verified: true, valid: true, phish_id: 1 } }), env))).status, "match");
    resetIntelCaches();
    assert.equal((await checkPhishTank(q(), deps(() => json({ results: { in_database: true, verified: false, valid: true } }), env))).status, "clean");
  });
  it("rate limit and garbage", async () => {
    assert.equal((await checkPhishTank(q(), deps(() => new Response("", { status: 509 }), env))).status, "quota");
    assert.equal((await checkPhishTank(q(), deps(() => json({ nope: 1 }), env))).status, "invalid_response");
  });
});

describe("feed providers", () => {
  it("Feodo Tracker and SSL Blacklist match and miss", async () => {
    const d = deps((u) => new Response(u.includes("feodo") ? "# list\n203.0.113.7\n198.51.100.1\n" : `# sslbl\n2026-01-01,${"a".repeat(40)},Botnet C2\n`));
    assert.equal((await checkFeodo(q(), d)).status, "match");
    assert.equal((await checkSslbl(q(), d)).status, "match");
    resetIntelCaches();
    const d2 = deps(() => new Response("# empty\n"));
    assert.equal((await checkFeodo(q(), d2)).status, "clean");
  });
  it("a feed that can't be downloaded is an error, not clean", async () => {
    assert.equal((await checkFeodo(q(), deps(() => new Response("", { status: 500 })))).status, "error");
  });
  it("OpenPhish stays off without a licensed feed and never matches host-only", async () => {
    assert.equal((await checkOpenPhish(q(), deps(() => new Response("")))).status, "not_configured");
    const d = deps(() => new Response("https://sites.google.com/view/fake-bank-login\n"), { OPENPHISH_FEED_URL: "https://licensed.example/feed" });
    assert.equal((await checkOpenPhish(q("https://sites.google.com/view/my-real-site"), d)).status, "clean");
    assert.equal((await checkOpenPhish(q("https://sites.google.com/view/fake-bank-login/step2"), d)).status, "match");
  });
});

describe("correlation", () => {
  const r = (id: IntelResult["id"], family: string, status: IntelResult["status"], covers: IntelResult["covers"]): IntelResult => ({ id, name: id, family, covers, status, matches: status === "match" ? ["x"] : [], threat: null, note: null, terms: null, checkedAt: "", ms: 0 });
  it("aggregators of the same data count once", () => {
    const s = summarizeIntel([r("phishing_database", "phish-aggregate", "match", ["phishing"]), r("openphish", "phish-aggregate", "match", ["phishing"]), r("urlhaus", "abusech-urlhaus", "clean", ["malware"])]);
    assert.equal(s.independentHits, 1);
    assert.ok(s.phishingCovered && s.malwareUrlCovered);
  });
  const link = (intel: IntelResult[]): LinkDetails => ({ kind: "links", submittedUrl: "https://a.example/", finalUrl: "https://a.example/", domain: "a.example", registeredAt: null, ageDays: 4000, registrar: null, ip: "203.0.113.9", httpStatus: 200, contentType: "text/html", pageFetched: true, redirects: [], tls: { status: "valid", issuer: "X", validTo: null, daysLeft: 50 }, webRisk: { status: "unavailable", threats: [] }, phishingList: { status: "clean", match: null }, officialPlatform: null, contentInspected: true, intel });
  it("Web Risk billing missing + URLhaus clean → malware check is clean, coverage honest", () => {
    const a = assessLink({ findings: [], details: link([r("phishing_database", "phish-aggregate", "clean", ["phishing"]), r("google_web_risk", "google", "error", ["malware", "phishing"]), r("urlhaus", "abusech-urlhaus", "clean", ["malware"]), r("feodo", "abusech-c2", "clean", ["c2"])]) });
    assert.equal(a.checks.find((k) => k.id === "malware")!.status, "CLEAN");
    assert.equal(a.checks.find((k) => k.id === "blocklist")!.status, "CLEAN");
    assert.equal(a.state, "NO_KNOWN_THREATS");
  });
  it("only C2 lists answered → malware inconclusive, assessment incomplete", () => {
    const a = assessLink({ findings: [], details: link([r("phishing_database", "phish-aggregate", "clean", ["phishing"]), r("urlhaus", "abusech-urlhaus", "not_configured", ["malware"]), r("feodo", "abusech-c2", "clean", ["c2"])]) });
    assert.equal(a.checks.find((k) => k.id === "malware")!.status, "INCONCLUSIVE");
    assert.equal(a.state, "INCOMPLETE_ASSESSMENT");
  });
  it("a provider match stays a threat when others time out", () => {
    const a = assessLink({ findings: [], details: link([r("urlhaus", "abusech-urlhaus", "match", ["malware"]), r("phishing_database", "phish-aggregate", "timeout", ["phishing"])]) });
    assert.equal(a.state, "THREAT_DETECTED");
    assert.ok(a.riskScore >= 90);
  });
});
