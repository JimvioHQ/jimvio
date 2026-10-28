import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  acceptOwnedTrackingUrl,
  ownedAffiliateTrackingUrl,
  trackingUrlForOwnedLink,
} from "./owned-tracking-url";

const site = "https://www.jimvio.com";
const code = "LNK-ABCDEF123456";
const tracked = `${site}/ref/${code}`;

describe("owned affiliate tracking URL", () => {
  it("builds a short link from the affiliate's own code", () => {
    assert.equal(ownedAffiliateTrackingUrl(site, code.toLowerCase()), tracked);
    assert.equal(ownedAffiliateTrackingUrl("http://localhost:3000", code), `http://localhost:3000/ref/${code}`);
    assert.equal(
      ownedAffiliateTrackingUrl(site, "lnk-abcdef12-3"),
      `${site}/ref/LNK-ABCDEF12-3`,
    );
  });

  it("rejects another host, a query, a hash, or a destination path", () => {
    assert.equal(ownedAffiliateTrackingUrl("https://evil.example", code), null);
    assert.equal(ownedAffiliateTrackingUrl("https://jimvio.vercel.app", code), null);
    assert.equal(acceptOwnedTrackingUrl(`${tracked}?next=/wallet`), null);
    assert.equal(acceptOwnedTrackingUrl(`${tracked}#code`), null);
    assert.equal(acceptOwnedTrackingUrl("https://www.jimvio.com/marketplace/notebook"), null);
    assert.equal(acceptOwnedTrackingUrl("https://user:pass@www.jimvio.com/ref/" + code), null);
    assert.equal(acceptOwnedTrackingUrl(`https://www.jimvio.com/ref/${code}/extra`), null);
  });

  it("does not use an expired link or a code that is not a short link", () => {
    assert.equal(
      trackingUrlForOwnedLink({
        siteUrl: site,
        linkCode: code,
        expiresAt: "2026-10-01T00:00:00.000Z",
        now: Date.parse("2026-10-28T00:00:00.000Z"),
      }),
      null,
    );
    assert.equal(
      trackingUrlForOwnedLink({
        siteUrl: site,
        linkCode: "CMP-ABCDEF123456",
        expiresAt: null,
        now: Date.parse("2026-10-28T00:00:00.000Z"),
      }),
      null,
    );
    assert.equal(
      trackingUrlForOwnedLink({
        siteUrl: site,
        linkCode: code,
        expiresAt: "2026-11-01T00:00:00.000Z",
        now: Date.parse("2026-10-28T00:00:00.000Z"),
      }),
      tracked,
    );
  });
});
