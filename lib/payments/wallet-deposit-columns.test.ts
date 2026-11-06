import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

/**
 * wallet_deposits has no updated_at column. Writing one made PostgREST reject
 * every expiry/failure update (PATCH 400 ~2,400 times a day), so failed and
 * expired deposits stayed "pending" forever.
 */
const COLUMNS = new Set(["id", "user_id", "amount", "currency", "method", "status", "reference", "invoice_url", "receipt_url", "metadata", "created_at", "completed_at"]);

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "node_modules" ? [] : files(path);
    return /\.ts$/.test(name) && !name.includes(".test.") ? [path] : [];
  });
}

describe("wallet_deposits writes use real columns only", () => {
  const sources = [...files("app"), ...files("lib"), ...files("services")];
  it("every update/insert object literal names existing columns", () => {
    let checked = 0;
    for (const path of sources) {
      const src = readFileSync(path, "utf8");
      for (const m of src.matchAll(/from\("wallet_deposits"\)\s*\.(update|insert)\(\s*\{([^{}]*)\}/g)) {
        checked++;
        const keys = [...m[2]!.matchAll(/(?:^|,)\s*([a-z_]+)\s*(?::|,|$)/g)].map((k) => k[1]!);
        for (const key of keys) assert.ok(COLUMNS.has(key), `${path}: wallet_deposits has no column "${key}"`);
      }
    }
    assert.ok(checked >= 5, `checked ${checked} writes`);
  });
});
