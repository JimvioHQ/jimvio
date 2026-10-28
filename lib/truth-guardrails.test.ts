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
import { APPROVED_PARTNER_LOGOS } from "@/lib/brand/payment-partners";

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
  // M-6: fake urgency — countdowns that reset at midnight, scarcity copy.
  { name: "fake midnight countdown", pattern: /setHours\(23,\s*59/ },
  { name: "fake urgency copy", pattern: /Don(?:&apos;|')t miss out|Limited time offers|Time Remaining/i },
  { name: "random badge or counter", pattern: /Math\.random\(\)\s*>\s*0\.\d/ },
  { name: "hardcoded timer", pattern: />\s*\d{2}:\d{2}:\d{2}\s*</ },
  // P0-7: claims Jimvio cannot back up.
  { name: "unverified claim", pattern: /["'>]\s*(?:100% safe|Money-back guarantee|Instant Payouts|24\/7 Support|Fast & reliable delivery)/i },
  { name: "unverified scale claim", pattern: /\b(?:millions|thousands) of (?:products|buyers|creators|users|affiliates|students|sellers|dropshipping products)\b/i },
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
          if (/^\s*(?:\/\/|\*)/.test(line)) return; // comments describe what is avoided
          for (const rule of FORBIDDEN) {
            if (rule.pattern.test(line)) violations.push(`${rel}:${i + 1} ${rule.name}`);
          }
        });
      }
    }
    assert.deepEqual(violations, [], `Fabricated public claims found:\n${violations.join("\n")}`);
  });
});

// P0-2: marketing pages may only show logos of payment methods Jimvio runs on.
const MARKETING_DIRS = ["components/layout", "components/about", "components/affiliate", "app/(public)"];
// No app-store badges: Jimvio ships as an installable web app (P0-8).
const LOGO_ALLOWLIST = new Set([...APPROVED_PARTNER_LOGOS]);

describe("partner logo guardrail", () => {
  it("marketing pages only use approved payment partner logos", () => {
    const violations: string[] = [];
    for (const dir of MARKETING_DIRS) {
      for (const file of walk(join(root, dir))) {
        const rel = relative(root, file);
        const text = readFileSync(file, "utf8");
        for (const match of text.matchAll(/["'`](\/logos\/[^"'`]+)["'`]/g)) {
          if (!LOGO_ALLOWLIST.has(match[1])) violations.push(`${rel} ${match[1]}`);
        }
      }
    }
    assert.deepEqual(violations, [], `Unapproved logos on marketing pages:\n${violations.join("\n")}`);
  });
});
