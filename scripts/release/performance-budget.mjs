#!/usr/bin/env node
/**
 * Performance budget + build-time regression checks.
 * Expects `.next` from a completed `npm run build`.
 * Optional `.next/build-timing.json`: { "durationMs": number }
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const nextDir = join(root, ".next");
const budgetPath = join(root, "performance-budget.json");
const reportPath = join(nextDir, "performance-report.json");
const timingPath = join(nextDir, "build-timing.json");

function fail(msg) {
  console.error(`❌ Performance budget failed: ${msg}`);
  process.exit(1);
}

if (!existsSync(nextDir) || !existsSync(join(nextDir, "BUILD_ID"))) {
  fail(".next/BUILD_ID missing — run npm run build first");
}

const budget = existsSync(budgetPath)
  ? JSON.parse(readFileSync(budgetPath, "utf8"))
  : {
      maxBuildMs: 900_000,
      maxStaticKb: 20_000,
      maxChunksKb: 45_000,
    };

function dirSizeBytes(dir) {
  if (!existsSync(dir)) return 0;
  let total = 0;
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else total += st.size;
    }
  };
  walk(dir);
  return total;
}

const staticDir = join(nextDir, "static");
const chunksDir = join(staticDir, "chunks");
const staticKb = Math.round(dirSizeBytes(staticDir) / 1024);
const chunksKb = Math.round(dirSizeBytes(chunksDir) / 1024);

let buildMs = null;
if (existsSync(timingPath)) {
  try {
    buildMs = Number(JSON.parse(readFileSync(timingPath, "utf8")).durationMs);
  } catch {
    buildMs = null;
  }
}

const report = {
  at: new Date().toISOString(),
  buildMs,
  staticKb,
  chunksKb,
  budget: {
    maxBuildMs: budget.maxBuildMs ?? 900_000,
    maxStaticKb: budget.maxStaticKb ?? 20_000,
    maxChunksKb: budget.maxChunksKb ?? 45_000,
  },
};

writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

if (buildMs != null && Number.isFinite(buildMs) && buildMs > report.budget.maxBuildMs) {
  fail(`build time ${buildMs}ms > budget ${report.budget.maxBuildMs}ms`);
}

if (staticKb > report.budget.maxStaticKb) {
  fail(`static assets ${staticKb}KB > budget ${report.budget.maxStaticKb}KB`);
}

if (chunksKb > report.budget.maxChunksKb) {
  fail(`JS chunks ${chunksKb}KB > budget ${report.budget.maxChunksKb}KB`);
}

if (buildMs == null) {
  console.warn("⚠ build-timing.json missing — build-time regression not enforced this run");
}

console.log("✅ Performance budget checks passed");
