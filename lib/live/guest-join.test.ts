import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isHubAuthRequired } from "../community/hub-auth.ts";
import {
  buildLiveSessionPath,
  displayNameFromVerifiedEmail,
  isLiveSessionGuestPath,
  isSafeLiveReturnPath,
  sanitizeLiveReturnPath,
} from "./guest-join.ts";

const SESSION = "a1b2c3d4-e5f6-4789-a012-3456789abcde";

describe("unauthenticated visitor sees Join Live instead of normal login", () => {
  it("allows guest access to /communities/live/{uuid}", () => {
    assert.equal(isLiveSessionGuestPath(`/communities/live/${SESSION}`), true);
    assert.equal(isHubAuthRequired(`/communities/live/${SESSION}`), false);
  });

  it("still requires auth for the Live hub listing", () => {
    assert.equal(isHubAuthRequired("/communities/live"), true);
    assert.equal(isLiveSessionGuestPath("/communities/live"), false);
  });
});

describe("successful authentication returns to the exact Live room", () => {
  it("builds and sanitizes the session return path", () => {
    assert.equal(buildLiveSessionPath(SESSION), `/communities/live/${SESSION}`);
    assert.equal(
      sanitizeLiveReturnPath(`/communities/live/${SESSION}`, SESSION),
      `/communities/live/${SESSION}`
    );
  });
});

describe("invalid or unsafe redirect is rejected", () => {
  it("rejects external and protocol-relative URLs", () => {
    assert.equal(isSafeLiveReturnPath("https://evil.example/phish"), false);
    assert.equal(isSafeLiveReturnPath("//evil.example"), false);
    assert.equal(
      sanitizeLiveReturnPath("https://evil.example", SESSION),
      `/communities/live/${SESSION}`
    );
    assert.equal(
      sanitizeLiveReturnPath("/login", SESSION),
      `/communities/live/${SESSION}`
    );
  });
});

describe("private room still requires authorization", () => {
  it("does not treat community slug live as a guest session path", () => {
    assert.equal(isLiveSessionGuestPath("/communities/africa-creators/live"), false);
    assert.equal(isHubAuthRequired("/communities/africa-creators/live"), true);
  });
});

describe("existing authenticated users bypass the guest modal", () => {
  it("keeps non-session hub paths auth-required so create/go-live stays gated", () => {
    assert.equal(isHubAuthRequired("/communities/live"), true);
    // Trailing junk under a session id is not a guest path — still gated
    assert.equal(
      isHubAuthRequired(`/communities/live/${SESSION}/settings`),
      true
    );
  });
});

describe("participant name fallback from verified email", () => {
  it("derives a safe unique-ish name instead of shared Guest", () => {
    assert.equal(displayNameFromVerifiedEmail("ada.lovelace@example.com"), "Ada Lovelace");
    assert.notEqual(displayNameFromVerifiedEmail("one@x.com"), "Guest");
    assert.notEqual(displayNameFromVerifiedEmail("two@x.com"), "Guest");
  });
});

describe("host/speaker permissions remain protected path-wise", () => {
  it("guest path only unlocks the session URL, not the creator hub", () => {
    assert.equal(isHubAuthRequired("/communities/live"), true);
    assert.equal(isHubAuthRequired(`/communities/live/${SESSION}`), false);
  });
});
