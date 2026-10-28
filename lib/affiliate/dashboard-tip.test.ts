import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  affiliateDashboardTipKey,
  clearDismissedAffiliateTip,
  readDismissedAffiliateTip,
  writeDismissedAffiliateTip,
  type AffiliateTipStorage,
} from "./dashboard-tip";

function memoryStorage(): AffiliateTipStorage & { dump(): Record<string, string> } {
  const values = new Map<string, string>();
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
    dump() {
      return Object.fromEntries(values);
    },
  };
}

describe("affiliate dashboard tip dismissal", () => {
  const affiliateA = "11111111-1111-4111-8111-111111111111";
  const affiliateB = "22222222-2222-4222-8222-222222222222";

  it("stores only the action id for that affiliate", () => {
    const storage = memoryStorage();
    writeDismissedAffiliateTip(storage, affiliateA, "discover");
    assert.equal(readDismissedAffiliateTip(storage, affiliateA), "discover");
    assert.equal(readDismissedAffiliateTip(storage, affiliateB), null);
    assert.deepEqual(Object.values(storage.dump()), ["discover"]);
    assert.equal(affiliateDashboardTipKey(affiliateA), affiliateDashboardTipKey(affiliateA.toUpperCase()));
  });

  it("ignores another affiliate, an unknown action, and a missing id", () => {
    const storage = memoryStorage();
    writeDismissedAffiliateTip(storage, affiliateA, "discover");
    writeDismissedAffiliateTip(storage, affiliateB, "share");
    writeDismissedAffiliateTip(storage, affiliateA, "balance");
    writeDismissedAffiliateTip(storage, "shared", "discover");
    assert.equal(readDismissedAffiliateTip(storage, affiliateA), "discover");
    assert.equal(readDismissedAffiliateTip(storage, affiliateB), "share");
    assert.equal(readDismissedAffiliateTip(storage, ""), null);
    assert.equal(readDismissedAffiliateTip(storage, affiliateA + "-extra"), null);
  });

  it("restores guidance by clearing only that affiliate's key", () => {
    const storage = memoryStorage();
    writeDismissedAffiliateTip(storage, affiliateA, "pending");
    writeDismissedAffiliateTip(storage, affiliateB, "fit");
    clearDismissedAffiliateTip(storage, affiliateA);
    assert.equal(readDismissedAffiliateTip(storage, affiliateA), null);
    assert.equal(readDismissedAffiliateTip(storage, affiliateB), "fit");
  });

  it("ignores a stored value that is not an action id", () => {
    const storage = memoryStorage();
    const key = affiliateDashboardTipKey(affiliateA);
    assert.ok(key);
    storage.setItem(key!, JSON.stringify({ available: 50, token: "secret" }));
    assert.equal(readDismissedAffiliateTip(storage, affiliateA), null);
  });
});
