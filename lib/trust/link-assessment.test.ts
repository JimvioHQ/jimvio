import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assessLink, contentBlock, riskClass } from "./link-assessment.ts";
import type { Finding, LinkDetails } from "./types.ts";

const d = (over: Partial<LinkDetails> = {}): LinkDetails => ({
  kind: "links", submittedUrl: "https://example.com/", finalUrl: "https://example.com/", domain: "example.com", registeredAt: "2015-01-02T00:00:00Z",
  ageDays: 4000, registrar: "Example Registrar", ip: "93.184.215.14", httpStatus: 200, contentType: "text/html", pageFetched: true, redirects: [],
  tls: { status: "valid", issuer: "DigiCert", validTo: null, daysLeft: 90 }, webRisk: { status: "clean", threats: [] },
  phishingList: { status: "clean", match: null }, officialPlatform: null, contentInspected: true, ...over,
});
const offline = { webRisk: { status: "unavailable" as const, threats: [], note: "Google Web Risk refused the request." }, phishingList: { status: "unavailable" as const, match: null } };
const DONE = ["CLEAN", "THREAT_DETECTED", "SUSPICIOUS"];

describe("link assessment states", () => {
  it("complete clean scan → No Known Threats, high confidence", () => {
    const a = assessLink({ findings: [], details: d() });
    assert.equal(a.state, "NO_KNOWN_THREATS");
    assert.equal(a.confidence, "HIGH");
    assert.equal(a.coverage, 100);
    assert.ok(a.riskScore < 20);
    assert.equal(a.checks.length, 12);
  });
  it("provider outage → Incomplete, never clean", () => {
    const a = assessLink({ findings: [], details: d(offline) });
    assert.equal(a.state, "INCOMPLETE_ASSESSMENT");
    for (const id of ["malware", "blocklist"]) assert.equal(a.checks.find((k) => k.id === id)!.status, "UNAVAILABLE");
    assert.notEqual(a.confidence, "HIGH");
    assert.ok(a.couldNotVerify.some((t) => /Web Risk/.test(t)));
  });
  it("low score with incomplete critical checks is still Incomplete", () => {
    const a = assessLink({ findings: [], details: d({ webRisk: offline.webRisk }) });
    assert.ok(a.riskScore < 20);
    assert.equal(a.state, "INCOMPLETE_ASSESSMENT");
  });
  it("confirmed listing → Threat Detected with a critical score", () => {
    const a = assessLink({ findings: [{ tone: "bad", title: "On a known phishing list", source: "Phishing.Database" }], details: d({ phishingList: { status: "match", match: "evil.test" } }) });
    assert.equal(a.state, "THREAT_DETECTED");
    assert.ok(a.riskScore >= 90);
    assert.equal(a.riskClass, "Critical Risk");
  });
  it("a threat stays visible when another provider fails", () => {
    const a = assessLink({ findings: [], details: d({ webRisk: offline.webRisk, phishingList: { status: "match", match: "evil.test" }, pageFetched: false, contentInspected: false }) });
    assert.equal(a.state, "THREAT_DETECTED");
    assert.ok(a.riskScore >= 90);
  });
  it("suspicious page content → Suspicious Activity", () => {
    const f: Finding[] = [{ tone: "warn", title: "Urgency and prize wording", source: "Page content" }];
    const a = assessLink({ findings: f, details: d() });
    assert.equal(a.state, "SUSPICIOUS_ACTIVITY");
    assert.ok(a.riskScore >= 1 && a.riskScore < 60);
  });
  it("authentication wall → Website Could Not Be Inspected, content not marked clean", () => {
    const det = d({ finalUrl: "https://www.linkedin.com/authwall?trk=x", httpStatus: 200 });
    det.contentBlockedReason = contentBlock(det, "<html>…</html>");
    det.contentInspected = !det.contentBlockedReason;
    const a = assessLink({ findings: [], details: det });
    assert.equal(a.state, "WEBSITE_UNREACHABLE");
    assert.equal(a.checks.find((k) => k.id === "content")!.status, "INCONCLUSIVE");
  });
  it("LinkedIn regression: HTTP 999 block is not 'No Issues' or 'Low Risk'", () => {
    const det = d({ submittedUrl: "https://www.linkedin.com/feed?nis=true", finalUrl: "https://www.linkedin.com/feed?nis=true", domain: "linkedin.com", httpStatus: 999, officialPlatform: "LinkedIn" });
    det.contentBlockedReason = contentBlock(det, "<html></html>");
    det.contentInspected = false;
    const a = assessLink({ findings: [], details: det });
    assert.notEqual(a.state, "NO_KNOWN_THREATS");
    assert.ok(DONE.includes(a.checks.find((k) => k.id === "content")!.status) === false);
    assert.ok(a.couldNotVerify.some((t) => /HTTP 999/.test(t)));
    // with Web Risk down as well (today's production), the broader gap wins
    assert.equal(assessLink({ findings: [], details: { ...det, webRisk: offline.webRisk } }).state, "INCOMPLETE_ASSESSMENT");
  });
  it("blocked website (403) → Website Could Not Be Inspected, not malicious", () => {
    const det = d({ httpStatus: 403 });
    det.contentBlockedReason = contentBlock(det, "x");
    det.contentInspected = false;
    const a = assessLink({ findings: [], details: det });
    assert.equal(a.state, "WEBSITE_UNREACHABLE");
    assert.equal(a.counts.threats, 0);
  });
  it("technical failure → Scan Failed", () => {
    assert.equal(assessLink({ findings: [], details: d(), failed: true }).state, "SCAN_FAILED");
  });
  it("no checks executed → Scan Failed, nothing counted clean except local URL checks", () => {
    const a = assessLink({ findings: [], details: d({ ...offline, pageFetched: false, contentInspected: false, ip: null, ageDays: null, httpStatus: null, tls: { status: "unavailable", issuer: null, validTo: null, daysLeft: null } }) });
    assert.equal(a.state, "SCAN_FAILED");
    assert.ok(a.checks.filter((k) => k.status === "CLEAN").every((k) => ["url", "reputation"].includes(k.id)));
    assert.equal(a.confidence, "LOW");
  });
  it("keeps risk, coverage and confidence as separate dimensions", () => {
    const a = assessLink({ findings: [], details: d({ webRisk: offline.webRisk }) });
    assert.ok(a.riskScore < 20 && a.coverage < 100 && a.confidence !== "HIGH");
  });
  it("risk bands", () => {
    assert.equal(riskClass(0), "Very Low Observed Risk");
    assert.equal(riskClass(20), "Low Observed Risk");
    assert.equal(riskClass(40), "Moderate Risk");
    assert.equal(riskClass(60), "High Risk");
    assert.equal(riskClass(80), "Critical Risk");
  });
});

describe("URL shapes through the real heuristics", async () => {
  const { urlSignals, redirectSignals } = await import("./url-heuristics.ts");
  const { normalizeUrl, isPublicAddress } = await import("./url-guard.ts");
  const urlCheck = (raw: string) => {
    const u = new URL(raw);
    return assessLink({ findings: urlSignals(u), details: d({ submittedUrl: raw, finalUrl: raw }) }).checks.find((k) => k.id === "url")!;
  };
  it("raw IP address is flagged", () => assert.notEqual(urlCheck("http://203.0.113.10/login").status, "CLEAN"));
  it("embedded credentials are flagged", () => assert.notEqual(urlCheck("https://paypal.com@evil.example/").status, "CLEAN"));
  it("encoded / punycode hosts are flagged", () => assert.notEqual(urlCheck("https://xn--pypal-4ve.com/").status, "CLEAN"));
  it("an ordinary address is clean", () => assert.equal(urlCheck("https://www.wikipedia.org/").status, "CLEAN"));
  it("malformed, non-web and credential links are rejected before any request; private IPs are never fetched", () => {
    assert.throws(() => normalizeUrl("https://exa mple.com/"));
    assert.throws(() => normalizeUrl("javascript:alert(1)"));
    assert.throws(() => normalizeUrl("https://user:pass@example.com/"));
    assert.throws(() => normalizeUrl("http://localhost/"));
    assert.equal(isPublicAddress("127.0.0.1"), false);
    assert.equal(isPublicAddress("10.0.0.5"), false);
    assert.equal(isPublicAddress("169.254.169.254"), false);
  });
  it("redirects are followed and listed as evidence", () => {
    const hops = [{ url: "https://bit.ly/x", status: 301 }, { url: "https://a.example/", status: 200 }];
    const a = assessLink({ findings: redirectSignals(hops), details: d({ redirects: [hops[0]] }) });
    const r = a.checks.find((k) => k.id === "redirects")!;
    assert.match(r.explanation, /1 redirect/);
    assert.ok(r.evidence.some((e) => e.includes("bit.ly")));
  });
});

describe("acceptance regressions (Nov 2026 audit)", async () => {
  const { urlSignals } = await import("./url-heuristics.ts");
  const { normalizeUrl } = await import("./url-guard.ts");
  it("a typo like 'ht!tp://%%%not a url' is rejected instead of being scanned as a clean address", () => {
    for (const bad of ["ht!tp://%%%not a url", "https://com", "https://-bad-.com/", "https://a..b.com/"]) assert.throws(() => normalizeUrl(bad), /valid link/, bad);
    for (const ok of ["www.cloudflare.com", "https://xn--pypal-4ve.com/", "http://1.1.1.1/", "https://sub_domain.example.co.uk/x"]) assert.doesNotThrow(() => normalizeUrl(ok), ok);
  });
  it("suspicious URL and reputation items say what was found, not what was checked", () => {
    const raw = "http://1.1.1.1/";
    const a = assessLink({ findings: urlSignals(new URL(raw)), details: d({ submittedUrl: raw, finalUrl: raw }) });
    const url = a.checks.find((k) => k.id === "url")!;
    assert.equal(url.status, "SUSPICIOUS");
    assert.match(url.explanation, /^The address itself has risky features: .+\.$/);
    assert.ok(!/\.\.|; \./.test(url.explanation));
    assert.match(a.checks.find((k) => k.id === "reputation")!.explanation, /^No abused domain ending/);
  });
  it("domain age reads naturally (months under a year, plural years)", () => {
    const age = (ageDays: number) => assessLink({ findings: [], details: d({ ageDays }) }).checks.find((k) => k.id === "registration")!.explanation;
    assert.match(age(90), /^Registered 3 months ago\./);
    assert.match(age(40), /^Registered 1 month ago\./);
    assert.match(age(400), /^Registered 1 year ago\./);
    assert.match(age(7700), /^Registered 21 years ago\./);
    assert.ok(!/year\(s\)|<1/.test(age(200)));
  });
});
