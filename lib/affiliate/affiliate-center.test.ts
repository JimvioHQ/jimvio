import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeLinkMetrics } from "./link-metrics";
import { resolveWorkspaceNavActive, WORKSPACES } from "../workspace/config";
import { isWithinAttributionWindow } from "./attribution";

describe("affiliate link metrics merge", () => {
  it("prefers the higher of live vs denormalized counters", () => {
    assert.deepEqual(
      mergeLinkMetrics(
        { clicks: 10, conversions: 2, earnings: 5.5 },
        { clicks: 3, conversions: 4, earnings: 1 }
      ),
      { clicks: 10, conversions: 4, earnings: 5.5 }
    );
  });

  it("handles missing live metrics", () => {
    assert.deepEqual(
      mergeLinkMetrics(undefined, { clicks: 2, conversions: 1, earnings: 3 }),
      { clicks: 2, conversions: 1, earnings: 3 }
    );
  });
});

describe("affiliate workspace nav active", () => {
  it("highlights products on /affiliates hub", () => {
    assert.equal(resolveWorkspaceNavActive("/affiliates", "affiliates"), "products");
  });

  it("prefers specific affiliate routes over shared parents", () => {
    assert.equal(resolveWorkspaceNavActive("/affiliates/links", "affiliates"), "links");
    assert.equal(
      resolveWorkspaceNavActive("/affiliates/analytics", "affiliates"),
      "analytics"
    );
    assert.equal(resolveWorkspaceNavActive("/affiliates/ai", "affiliates"), "ai");
    assert.equal(
      resolveWorkspaceNavActive("/affiliates/dashboard", "affiliates"),
      "dashboard"
    );
    assert.equal(
      resolveWorkspaceNavActive("/affiliates/payouts", "affiliates"),
      "payouts"
    );
  });

  it("does not keep the affiliate sidebar promotional card", () => {
    assert.equal(WORKSPACES.affiliates.proCard, undefined);
    assert.equal(
      WORKSPACES.affiliates.sidebarSections?.some((section) =>
        section.items.some((item) => item.id === "products" && item.href === "/affiliates"),
      ),
      true,
    );
  });
});

describe("attribution window", () => {
  it("allows missing timestamp for legacy cookies", () => {
    assert.equal(isWithinAttributionWindow(null, 30), true);
  });

  it("rejects expired attribution", () => {
    const old = Date.now() - 40 * 24 * 60 * 60 * 1000;
    assert.equal(isWithinAttributionWindow(old, 30), false);
  });
});
