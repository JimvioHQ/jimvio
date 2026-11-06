import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

/**
 * Browser code runs with the signed-in user's session, which cannot read
 * cost, supplier metadata or private file columns of products/product_variants
 * (migration 20261106160000). Any such read from browser code would both fail
 * and signal a leak attempt, so it is rejected here.
 */
const SENSITIVE = /\b(cost_price|source_metadata|digital_file_url|review_notes|file_digest|override_reason|verification_assignee_id)\b/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(name) && !name.includes(".test.") ? [path] : [];
  });
}

function productQueries(source: string) {
  const out: string[] = [];
  const re = /from\(\s*["'](products|product_variants)["']\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    const rest = source.slice(m.index + m[0].length);
    const end = rest.search(/;|\n\s*\n/);
    out.push(rest.slice(0, end < 0 ? 800 : end));
  }
  return out;
}

describe("browser code reads only storefront product columns", () => {
  const browserFiles = [...files("components"), ...files("hooks")].filter((path) => readFileSync(path, "utf8").includes('"use client"'));

  it("finds the browser files", () => {
    assert.ok(browserFiles.length > 50);
  });

  for (const path of browserFiles) {
    const chains = productQueries(readFileSync(path, "utf8"));
    if (!chains.length) continue;
    it(path, () => {
      for (const chain of chains) {
        const select = /\.select\(\s*(["'`])([\s\S]*?)\1/.exec(chain);
        if (select) {
          assert.ok(!/(^|[\s,(])\*/.test(select[2]!), `select * on products in ${path}`);
          assert.ok(!SENSITIVE.test(select[2]!), `sensitive column selected in ${path}`);
        }
        assert.ok(!/\.(insert|update|upsert)\([\s\S]*\.select\(\s*\)/.test(chain), `write returning all columns in ${path}`);
      }
    });
  }
});
