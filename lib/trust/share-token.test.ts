import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createShareToken, publicReport, SHARE_TTL_MS, shareSecret, verifyShareToken } from "./share-token.ts";
import type { ScanReport } from "./types.ts";

const ID = "1c2be601-44b8-4de3-be53-bf48763e3817";
const OTHER = "2a05090c-f168-4b8c-b36f-fe898a8e7b38";
const SECRET = "test-secret-not-real";
const NOW = Date.UTC(2026, 10, 6, 9, 0, 0);

describe("share tokens", () => {
  it("a fresh token opens its own scan and reports when it expires", () => {
    const { token, expiresAt } = createShareToken(ID, NOW, SECRET);
    const v = verifyShareToken(ID, token, NOW, SECRET);
    assert.equal(v.ok, true);
    assert.equal(v.ok && v.expiresAt, expiresAt);
    assert.ok(Math.abs(Date.parse(expiresAt) - (NOW + SHARE_TTL_MS)) < 1000);
    assert.equal(verifyShareToken(ID.toUpperCase(), token, NOW, SECRET).ok, true, "ids are case-insensitive");
  });
  it("is bound to one scan: it cannot open another scan", () => {
    const { token } = createShareToken(ID, NOW, SECRET);
    assert.deepEqual(verifyShareToken(OTHER, token, NOW, SECRET), { ok: false, reason: "invalid" });
  });
  it("cannot be forged without the secret or by editing the expiry", () => {
    const { token } = createShareToken(ID, NOW, SECRET);
    assert.deepEqual(verifyShareToken(ID, token, NOW, "another-secret"), { ok: false, reason: "invalid" });
    const [exp, sig] = token.split(".");
    const later = (parseInt(exp, 36) + 86400 * 365).toString(36);
    assert.deepEqual(verifyShareToken(ID, `${later}.${sig}`, NOW, SECRET), { ok: false, reason: "invalid" });
    const flipped = sig.slice(0, -1) + (sig.endsWith("A") ? "B" : "A");
    assert.deepEqual(verifyShareToken(ID, `${exp}.${flipped}`, NOW, SECRET), { ok: false, reason: "invalid" });
  });
  it("expires after 30 days, with a distinct reason", () => {
    const { token } = createShareToken(ID, NOW, SECRET);
    assert.equal(verifyShareToken(ID, token, NOW + SHARE_TTL_MS - 5_000, SECRET).ok, true);
    assert.deepEqual(verifyShareToken(ID, token, NOW + SHARE_TTL_MS + 5_000, SECRET), { ok: false, reason: "expired" });
  });
  it("rejects malformed tokens", () => {
    for (const t of [null, undefined, "", "abc", "x.y", "zzzzzzzzzzz.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", `${"a".repeat(5)}.${"!".repeat(32)}`]) {
      assert.deepEqual(verifyShareToken(ID, t, NOW, SECRET), { ok: false, reason: "invalid" }, String(t));
    }
  });
  it("a token issued with a longer lifetime than allowed is refused", () => {
    const { token } = createShareToken(ID, NOW, SECRET, SHARE_TTL_MS * 4);
    assert.deepEqual(verifyShareToken(ID, token, NOW, SECRET), { ok: false, reason: "invalid" });
  });
});

describe("share secret", () => {
  it("prefers a dedicated secret, otherwise derives a separate key, never the raw Supabase key", () => {
    assert.equal(shareSecret({ TRUST_SHARE_SECRET: " own " }), "own");
    const derived = shareSecret({ SUPABASE_SERVICE_ROLE_KEY: "service-role-value" })!;
    assert.ok(derived && derived !== "service-role-value" && !derived.includes("service-role-value"));
    assert.equal(shareSecret({}), null);
  });
});

describe("public (shared) copy of a report", () => {
  const report = {
    id: ID, createdAt: new Date(NOW).toISOString(), status: "complete", input: { url: null, file: { name: "a.jpg", size: 1, type: "JPEG", sha256: "x" } },
    overall: { level: "low_risk", headline: "" }, durationMs: 1, category: "media",
    checkers: [{ id: "media", status: "low_risk", summary: "", findings: [], metrics: [], sources: [], limits: [], nextSteps: [], details: { kind: "media", gps: { lat: -1.944123, lon: 30.061987 } } }],
  } as unknown as ScanReport;
  it("coarsens a photo's GPS location to ~10 km and says so, without touching the original", () => {
    const p = publicReport(report);
    const d = p.checkers[0].details as unknown as { gps: { lat: number; lon: number } };
    assert.deepEqual(d.gps, { lat: -1.9, lon: 30.1 });
    assert.match(p.checkers[0].limits.at(-1)!, /rounded to about 10 km/);
    assert.deepEqual((report.checkers[0].details as unknown as { gps: unknown }).gps, { lat: -1.944123, lon: 30.061987 });
  });
  it("leaves reports without a location unchanged", () => {
    const noGps = structuredClone(report);
    (noGps.checkers[0].details as unknown as { gps: null }).gps = null;
    assert.deepEqual(publicReport(noGps), noGps);
  });
});
