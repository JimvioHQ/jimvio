/**
 * Run: node scripts/tmp/verify-growth-activation.mjs
 * Pure checks for activation checklist math and event naming.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function loadTsModule(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
}

const checklist = await loadTsModule("../../lib/growth/onboarding-checklist.ts");
const eventsSource = await readFile(new URL("../../services/growth/events.ts", import.meta.url), "utf8");

for (const intent of ["browse", "create", "sell", "join"]) {
  const items = checklist.listChecklistForIntent(intent);
  assert.ok(items.length > 0, `${intent} must have checklist items`);
  assert.ok(items.every((item) => item.href.startsWith("/")), `${intent} uses local routes`);
}

const browse = checklist.listChecklistForIntent("browse");
assert.equal(checklist.computeProgress({}, "browse"), 0);
assert.equal(checklist.computeProgress(Object.fromEntries(browse.map((item) => [item.key, { done: true }])), "browse"), 100);
assert.equal(checklist.computeProgress({ [browse[0].key]: { done: true } }, "browse"), 33);
assert.match(eventsSource, /function isAllowedGrowthEvent[\s\S]*\/\^growth/);

console.log("Growth activation verification passed.");
