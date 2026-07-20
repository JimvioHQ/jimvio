#!/usr/bin/env node
/**
 * Blocks git push unless .git/jimvio-ci-pass.json matches the current
 * content fingerprint from a successful `npm run ci:prepush`.
 *
 * Commits are allowed (so you can land a green tree) but push is fail-closed.
 * Agents must still run ci:prepush before commit per .cursor/rules/pre-push-ci.mdc.
 */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const stampPath = join(root, ".git", "jimvio-ci-pass.json");

function readStdin() {
  try {
    return JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {
    return {};
  }
}

function listSourceFiles() {
  return execFileSync("git", ["ls-files", "-co", "--exclude-standard"], { cwd: root })
    .toString()
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter(
      (f) =>
        !f.startsWith("node_modules/") &&
        !f.startsWith(".next/") &&
        !f.startsWith("test-results/") &&
        !f.startsWith("scripts/tmp/smoke-auth") &&
        !f.endsWith(".log")
    )
    .sort();
}

function fingerprint() {
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root }).toString().trim();
  const files = listSourceFiles();
  const h = createHash("sha256");
  h.update(head + "\n");
  for (const f of files) {
    h.update(f + "\n");
    try {
      h.update(readFileSync(join(root, f)));
      h.update("\n");
    } catch {
      h.update("MISSING\n");
    }
  }
  return { head, hash: h.digest("hex") };
}

function allow() {
  process.stdout.write(JSON.stringify({ permission: "allow" }));
  process.exit(0);
}

function deny(userMessage, agentMessage) {
  process.stdout.write(
    JSON.stringify({
      permission: "deny",
      user_message: userMessage,
      agent_message: agentMessage,
    })
  );
  process.exit(0);
}

const input = readStdin();
const command = String(input.command || "");
const isGitPush = /\bgit\s+push\b/.test(command);

// Fail-closed on push only. Commits remain gated by the Cursor rule + human process
// so landing the CI tooling itself is possible after a green ci:prepush.
if (!isGitPush) allow();

if (!existsSync(stampPath)) {
  deny(
    "Blocked push: run npm run ci:prepush first (no CI stamp).",
    "PRE-PUSH CI POLICY: git push denied until npm run ci:prepush passes."
  );
}

let stamp;
try {
  stamp = JSON.parse(readFileSync(stampPath, "utf8"));
} catch {
  deny("Blocked push: invalid CI stamp.", "Re-run npm run ci:prepush.");
}

const fp = fingerprint();
// After commit, HEAD changes — require stamp.hash to match content hash recomputed
// with CURRENT head (re-run ci after commit) OR stamp was taken on same file set:
// Recompute hash with stamp.head substituted only if working tree clean & equals HEAD tree.
const dirty = execFileSync("git", ["status", "--porcelain=v1"], { cwd: root })
  .toString()
  .split("\n")
  .filter((l) => l && !l.includes("scripts/tmp/smoke-auth") && !l.endsWith(".log"))
  .join("\n");

if (dirty) {
  deny(
    "Blocked push: working tree dirty. Commit or stash, then re-run npm run ci:prepush.",
    "Push requires a clean worktree and a matching CI stamp."
  );
}

// Clean tree: fingerprint must match stamp computed for this HEAD.
if (stamp.head !== fp.head || stamp.hash !== fp.hash) {
  deny(
    "Blocked push: CI stamp does not match HEAD. Run npm run ci:prepush on the commit you are pushing.",
    `Stamp head=${stamp.head} current=${fp.head}. Re-run npm run ci:prepush after commit, then push.`
  );
}

allow();
