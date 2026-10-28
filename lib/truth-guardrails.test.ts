/**
 * Truth guardrails (P0-1 / N-8).
 *
 * Public pages must never show platform counts, ratings or "trusted by N"
 * claims that are written into code. Any public number has to come from live
 * data. This test fails the build if such a claim is added back.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const SCAN_DIRS = ["app", "components", "lib"];
// Admin dashboards render live database values; test files hold fixtures.
const SKIP = [/\/admin\//, /\.test\.tsx?$/, /\/community\/editorial-/];

const FORBIDDEN: { name: string; pattern: RegExp }[] = [
  {
    name: "hardcoded audience count",
    pattern:
      /\b\d{1,3}(?:,\d{3})+\+?\s+(?:creators|users|affiliates|businesses|sellers|vendors|products|members|customers)\b/i,
  },
  {
    name: "hardcoded K/M audience count",
    pattern: /\b\d+(?:\.\d+)?\s?[KM]\+?\s+(?:creators|users|affiliates|businesses|sellers|members|customers)\b/,
  },
  { name: "hardcoded N+ count in markup", pattern: />\s*\d{1,3}(?:,\d{3})+\+\s*</ },
  { name: "trusted-by count", pattern: /Trusted by\s+(?:<[^>]+>|\d)/ },
  { name: "happy customers claim", pattern: /happy customers/i },
  { name: "hardcoded star rating", pattern: />\s*4\.\d\/5\s*</ },
  { name: "illustrative stats module", pattern: /demo-platform-stats|getDemoPlatformStats/ },
];

function walk(dir: string, acc: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx)$/.test(entry)) acc.push(full);
  }
  return acc;
}

describe("truth guardrails", () => {
  it("public code contains no fabricated counts, ratings or trust claims", () => {
    const violations: string[] = [];
    for (const dir of SCAN_DIRS) {
      for (const file of walk(join(root, dir))) {
        const rel = relative(root, file);
        if (SKIP.some((re) => re.test(`/${rel}`))) continue;
        const lines = readFileSync(file, "utf8").split("\n");
        lines.forEach((line, i) => {
          for (const rule of FORBIDDEN) {
            if (rule.pattern.test(line)) violations.push(`${rel}:${i + 1} ${rule.name}`);
          }
        });
      }
    }
    assert.deepEqual(violations, [], `Fabricated public claims found:\n${violations.join("\n")}`);
  });
});
