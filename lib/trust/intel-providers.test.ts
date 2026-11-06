import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import * as intel from "./intel-providers.ts";
import { checkCertPl, checkFeodo, checkSslbl, domainListed, health, isActiveProvider, parseDomainList, PROVIDERS, resetIntelCaches, runIntel, summarizeIntel, type IntelDeps, type IntelQuery } from "./intel-providers.ts";
import { assessLink } from "./link-assessment.ts";
import type { IntelResult, LinkDetails } from "./types.ts";

const deps = (handler: (url: string, init?: RequestInit) => Response | Promise<Response>): IntelDeps => ({
  fetch: (async (u: RequestInfo | URL, init?: RequestInit) => handler(String(u), init)) as typeof fetch,
  now: () => Date.now(),
});
const q = (url = "http://bad.example/payload.exe"): IntelQuery => ({ url: new URL(url), hosts: [new URL(url).hostname], ips: ["203.0.113.7"], certSha1: "a".repeat(40) });

beforeEach(() => resetIntelCaches());

describe("provider registry", () => {
  it("registers only the four approved free-forever providers", () => {
    assert.deepEqual(Object.keys(PROVIDERS).sort(), ["cert_pl", "feodo", "phishing_database", "sslbl"]);
    for (const id of ["phishtank", "urlhaus", "openphish", "google_web_risk"]) assert.equal(isActiveProvider(id), false, id);
  });
  it("removed adapters no longer exist", () => {
    for (const fn of ["checkUrlhaus", "checkPhishTank", "checkOpenPhish", "shareableUrl"]) assert.equal((intel as Record<string, unknown>)[fn], undefined, fn);
  });
  it("runIntel queries exactly the active sources (plus Phishing.Database passed in)", async () => {
    const all = await runIntel(q(), deps(() => new Response("# empty\n")));
    assert.deepEqual(all.map((r) => r.id).sort(), ["cert_pl", "feodo", "sslbl"]);
    assert.deepEqual([...health.keys()].sort(), ["cert_pl", "feodo", "sslbl"]);
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
});

describe("correlation", () => {
  const r = (id: IntelResult["id"], family: string, status: IntelResult["status"], covers: IntelResult["covers"]): IntelResult => ({ id, name: id, family, covers, status, matches: status === "match" ? ["x"] : [], threat: null, note: null, terms: null, checkedAt: "", ms: 0 });
  it("aggregators of the same data count once (historical sources included)", () => {
    const s = summarizeIntel([r("phishing_database", "phish-aggregate", "match", ["phishing"]), r("openphish", "phish-aggregate", "match", ["phishing"]), r("urlhaus", "abusech-urlhaus", "clean", ["malware"])]);
    assert.equal(s.independentHits, 1);
    assert.ok(s.phishingCovered && s.malwareUrlCovered);
  });
  const link = (intel: IntelResult[]): LinkDetails => ({ kind: "links", submittedUrl: "https://a.example/", finalUrl: "https://a.example/", domain: "a.example", registeredAt: null, ageDays: 4000, registrar: null, ip: "203.0.113.9", httpStatus: 200, contentType: "text/html", pageFetched: true, redirects: [], tls: { status: "valid", issuer: "X", validTo: null, daysLeft: 50 }, webRisk: { status: "unavailable", threats: [] }, phishingList: { status: "clean", match: null }, officialPlatform: null, contentInspected: true, intel });
  it("historical report: a stored URLhaus clean result keeps its malware result", () => {
    const a = assessLink({ findings: [], details: link([r("phishing_database", "phish-aggregate", "clean", ["phishing"]), r("google_web_risk", "google", "error", ["malware", "phishing"]), r("urlhaus", "abusech-urlhaus", "clean", ["malware"]), r("feodo", "abusech-c2", "clean", ["c2"])]) });
    assert.equal(a.checks.find((k) => k.id === "malware")!.status, "CLEAN");
    // Web Risk errored on that historical scan, so not every source answered.
    assert.equal(a.checks.find((k) => k.id === "blocklist")!.status, "INCONCLUSIVE");
    assert.equal(a.state, "INCOMPLETE_ASSESSMENT");
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

describe("CERT Polska Warning List", () => {
  const feed = "# comment\nbank-login-pl.example\nBANK-LOGIN-PL.example\n\n1.2.3.4\nnot a domain\npaczka-dopłata.example\nsecure-parcel.example.\n";
  it("parses only valid domains and collapses duplicates", () => {
    const s = parseDomainList(feed);
    assert.deepEqual([...s].sort(), ["bank-login-pl.example", "secure-parcel.example"]);
  });
  it("matches the domain and its subdomains, never a parent", () => {
    const s = new Set(["login.shop-pl.example"]);
    assert.equal(domainListed("login.shop-pl.example", s), "login.shop-pl.example");
    assert.equal(domainListed("a.b.login.shop-pl.example", s), "login.shop-pl.example");
    assert.equal(domainListed("shop-pl.example", s), null);
    assert.equal(domainListed("notlogin.shop-pl.example", s), null);
  });
  it("match, clean, outage and empty feed", async () => {
    assert.equal((await checkCertPl(q("https://x.bank-login-pl.example/a"), deps(() => new Response(feed)))).status, "match");
    resetIntelCaches();
    assert.equal((await checkCertPl(q("https://www.example.com/"), deps(() => new Response(feed)))).status, "clean");
    resetIntelCaches();
    assert.equal((await checkCertPl(q(), deps(() => new Response("", { status: 503 })))).status, "error");
    resetIntelCaches();
    assert.equal((await checkCertPl(q(), deps(() => new Response("# nothing\n")))).status, "error", "an empty list is not evidence of clean");
  });
  it("caches the feed between lookups (one download within the refresh window)", async () => {
    let downloads = 0;
    const d = deps(() => { downloads++; return new Response(feed); });
    await checkCertPl(q(), d);
    await checkCertPl(q("https://other.example/"), d);
    assert.equal(downloads, 1);
  });
});

describe("current architecture (four free-forever sources)", () => {
  const r = (id: IntelResult["id"], family: string, status: IntelResult["status"], covers: IntelResult["covers"]): IntelResult => ({ id, name: PROVIDERS[id as "cert_pl"]?.name ?? id, family, covers, status, matches: status === "match" ? ["x.example"] : [], threat: status === "match" ? "phishing" : null, note: null, terms: null, checkedAt: "", ms: 0 });
  const all4 = (over: Partial<Record<string, IntelResult["status"]>> = {}) => [
    r("phishing_database", "phish-aggregate", over.phishing_database ?? "clean", ["phishing"]),
    r("cert_pl", "cert-pl", over.cert_pl ?? "clean", ["phishing"]),
    r("feodo", "abusech-c2", over.feodo ?? "clean", ["c2"]),
    r("sslbl", "abusech-c2", over.sslbl ?? "clean", ["c2"]),
  ];
  const link = (intel: IntelResult[]): LinkDetails => ({ kind: "links", submittedUrl: "https://a.example/", finalUrl: "https://a.example/", domain: "a.example", registeredAt: null, ageDays: 4000, registrar: null, ip: "203.0.113.9", httpStatus: 200, contentType: "text/html", pageFetched: true, redirects: [], tls: { status: "valid", issuer: "X", validTo: null, daysLeft: 50 }, phishingList: { status: "clean", match: null }, officialPlatform: null, contentInspected: true, intel });
  it("threat found while another source timed out: the gap is still listed once", () => {
    const a = assessLink({ findings: [], details: link(all4({ cert_pl: "match", sslbl: "timeout" })) });
    assert.equal(a.state, "THREAT_DETECTED");
    const gap = (a.couldNotVerifyItems ?? []).filter((x) => x.checkId === "intel_sources");
    assert.equal(gap.length, 1);
    assert.match(gap[0].text, /^SSL Blacklist timed out; 3 of 4 eligible sources answered\.$/);
  });
  it("clean URL: blocklist clean with a dynamic count, malware honestly not covered", () => {
    const a = assessLink({ findings: [], details: link(all4()) });
    const bl = a.checks.find((k) => k.id === "blocklist")!;
    assert.equal(bl.status, "CLEAN");
    assert.match(bl.explanation, /^All 4 eligible sources answered/);
    assert.ok(!/of 8/.test(JSON.stringify(a)));
    assert.equal(a.checks.find((k) => k.id === "malware")!.status, "INCONCLUSIVE");
    assert.match(a.checks.find((k) => k.id === "malware")!.explanation, /No eligible malware-URL database/);
    assert.equal(a.state, "INCOMPLETE_ASSESSMENT");
    assert.ok(!/try again later/i.test(a.actions.join(" ")), "a permanent gap is not a temporary one");
    assert.ok(a.actions.some((x) => /not checked against a malware database/.test(x)));
  });
  it("summary items: no double full stops, no repeated gap, findings vs checks distinguished", () => {
    const a = assessLink({ findings: [], details: link(all4()) });
    for (const t of [...a.found, ...a.couldNotVerify]) assert.ok(!/\.\.$/.test(t), t);
    assert.equal(a.couldNotVerifyItems!.filter((x) => /malware-URL/.test(x.text)).length, 1);
    assert.ok(a.foundItems!.every((x) => x.kind === "checked"));
    assert.match(a.foundItems!.find((x) => x.checkId === "phishing")!.text, /Phishing\.Database or CERT Polska/);
  });
  it("one provider timing out: dynamic count and a retry suggestion", () => {
    const a = assessLink({ findings: [], details: link(all4({ cert_pl: "timeout" })) });
    const bl = a.checks.find((k) => k.id === "blocklist")!;
    assert.equal(bl.status, "INCONCLUSIVE");
    assert.match(bl.explanation, /^3 of 4 eligible sources answered; CERT Polska timed out\.$/);
    assert.ok(a.actions.some((x) => /didn't answer/.test(x)));
  });
  it("skipped sources are not in the denominator", () => {
    const a = assessLink({ findings: [], details: link(all4({ sslbl: "skipped" })) });
    assert.match(a.checks.find((k) => k.id === "blocklist")!.explanation, /^All 3 eligible sources answered/);
  });
  it("known phishing URL: threat, listed source named, exact text", () => {
    const a = assessLink({ findings: [], details: link(all4({ cert_pl: "match" })) });
    assert.equal(a.state, "THREAT_DETECTED");
    assert.ok(a.foundItems!.some((x) => x.kind === "threat" && /CERT Polska/.test(x.text)));
  });
  it("all providers unavailable: never clean", () => {
    const a = assessLink({ findings: [], details: link(all4({ phishing_database: "error", cert_pl: "error", feodo: "error", sslbl: "error" })) });
    assert.equal(a.checks.find((k) => k.id === "blocklist")!.status, "UNAVAILABLE");
    assert.notEqual(a.state, "NO_KNOWN_THREATS");
  });
});

describe("attribution, independence and secrets", () => {
  it("every provider carries its licence/attribution text", () => {
    for (const p of Object.values(PROVIDERS)) assert.ok(p.terms && p.terms.length > 5, p.id);
    assert.match(PROVIDERS.phishing_database.terms!, /Mitchell Krog/);
  });
  it("CERT Polska is an independent family from Phishing.Database", () => {
    assert.notEqual(PROVIDERS.cert_pl.family, PROVIDERS.phishing_database.family);
  });
  it("an outage of every source is never clean", async () => {
    const all = await runIntel(q(), deps(() => new Response("", { status: 500 })));
    assert.ok(all.every((r) => r.status !== "clean"));
  });
  it("timeouts are errors, never clean", async () => {
    const all = await runIntel(q(), deps(() => { throw Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" }); }));
    assert.ok(all.every((r) => r.status === "error"));
  });
});
