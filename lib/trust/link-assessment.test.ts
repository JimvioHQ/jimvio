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
