import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  designatedUserAStorage,
  designatedUserBStorage,
  isolationDiagnostics,
  paymentsEnabled,
  readOnlySignedIn,
} from "./ugc-e2e-gates.mjs";

describe("ugc e2e gates", () => {
  it("refuses non-designated storage paths", () => {
    assert.equal(designatedUserAStorage(".auth/demo-jimvio.json").ok, false);
    assert.equal(designatedUserAStorage(".auth/ugc-user-a.json").ok, true);
    assert.equal(designatedUserBStorage(".auth/ugc-user-b.json").ok, true);
  });

  it("keeps payment sandbox fail-closed", () => {
    assert.equal(
      paymentsEnabled({
        allow: "1",
        mutate: "1",
        paymentSandbox: "1",
        sandboxConfirmed: "0",
        base: "http://localhost:3000",
      }),
      false,
    );
    assert.equal(
      paymentsEnabled({
        allow: "1",
        mutate: "1",
        paymentSandbox: "1",
        sandboxConfirmed: "1",
        base: "http://localhost:3000",
      }),
      true,
    );
  });

  it("blocks production without explicit target flag", () => {
    assert.equal(
      readOnlySignedIn({ allow: "1", base: "https://www.jimvio.com", productionTarget: undefined }),
      false,
    );
    assert.equal(
      readOnlySignedIn({ allow: "1", base: "https://www.jimvio.com", productionTarget: "1" }),
      true,
    );
  });

  it("lists isolation setup gaps without secrets", () => {
    const missing = isolationDiagnostics({ allow: "1", base: "http://localhost:3000" }, {});
    assert.ok(missing.some((m) => m.includes("ugc-user-a.json")));
    assert.ok(missing.some((m) => m.includes("ugc-user-b.json")));
  });
});
