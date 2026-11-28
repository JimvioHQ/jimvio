#!/usr/bin/env node
/**
 * Jimvio pre-push CI gate (non-negotiable).
 * Usage: npm run ci:prepush
 *
 * On success, writes a stamp under .git/jimvio-ci-pass.json bound to the
 * current worktree fingerprint. Commit/push hooks must require a matching stamp.
 */

import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();

function stampPath() {
  const gitPath = execFileSync("git", ["rev-parse", "--git-path", "jimvio-ci-pass.json"], { cwd: root })
    .toString()
    .trim();
  return gitPath.startsWith("/") ? gitPath : join(root, gitPath);
}

function log(step, msg) {
  console.log(`\n==> [${step}] ${msg}`);
}

function fail(step, msg) {
  console.error(`\n❌ CI FAILED at ${step}: ${msg}`);
  process.exit(1);
}

function run(step, command, args, opts = {}) {
  log(step, `${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...opts.env },
    shell: false,
  });
  if (result.status !== 0) {
    fail(step, `${command} exited ${result.status}`);
  }
}

function listSourceFiles() {
  const out = execFileSync(
    "git",
    ["ls-files", "-co", "--exclude-standard"],
    { cwd: root }
  )
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
  return out;
}

function fingerprint() {
  // Must match .cursor/hooks/block-unsafe-git.mjs so push stamps validate.
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root })
    .toString()
    .trim();
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
  return {
    head,
    hash: h.digest("hex"),
    fileCount: files.length,
  };
}

/** Next.js App Router: only ONE page/layout/loading/error/route per URL after stripping route groups. */
function scanAppRouter() {
  log("routes", "Scanning App Router for duplicate URL resolutions");
  const appDir = join(root, "app");
  if (!existsSync(appDir)) fail("routes", "app/ directory missing");

  const kinds = new Set(["page.tsx", "page.ts", "page.jsx", "page.js", "layout.tsx", "layout.ts", "loading.tsx", "loading.ts", "error.tsx", "error.ts", "route.ts", "route.js"]);
  const byKey = new Map();

  function walk(dir) {
    for (const entry of readdirSync(dir)) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        walk(full);
        continue;
      }
      if (!kinds.has(entry)) continue;
      const rel = relative(appDir, full);
      const parts = rel.split(/[\\/]/).slice(0, -1);
      const urlParts = parts.filter((p) => !(p.startsWith("(") && p.endsWith(")")) && !p.startsWith("@"));
      const url = "/" + urlParts.join("/");
      const key = `${entry}::${url === "/" ? "/" : url.replace(/\/$/, "") || "/"}`;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(join("app", rel));
    }
  }
  walk(appDir);

  const conflicts = [...byKey.entries()].filter(([, files]) => files.length > 1);
  // Nested layouts under different route groups for parent paths can be valid
  // (root + (public) layout). Flag only true duplicates for page/route/loading/error,
  // and layout duplicates only when both are siblings at the same folder depth
  // after group stripping AND more than one file maps to identical URL with same kind
  // where neither is a parent nesting case — for safety we still fail page/route/loading/error.
  const hard = conflicts.filter(([key]) => {
    const kind = key.split("::")[0];
    return kind.startsWith("page.") || kind.startsWith("route.") || kind.startsWith("loading.") || kind.startsWith("error.");
  });

  if (hard.length) {
    console.error("Duplicate App Router resolutions:");
    for (const [key, files] of hard) {
      console.error(`  ${key}`);
      for (const f of files) console.error(`    - ${f}`);
    }
    fail("routes", `${hard.length} hard route conflict(s)`);
  }

  // Soft-warn layout stacking at identical URL (often intentional nesting via groups)
  const layoutConflicts = conflicts.filter(([key]) => key.startsWith("layout."));
  if (layoutConflicts.length) {
    console.log(`Note: ${layoutConflicts.length} stacked layout URL(s) (route groups). Review if unexpected.`);
  }
  console.log("App Router hard conflicts: none");
}

/** Client components must not import server-only modules. */
function scanServerClientBoundaries() {
  log("rsc", "Scanning use client files for server-only imports");
  const banned = [
    "@/lib/supabase/server",
    "@/lib/supabase/admin",
    "next/headers",
    "server-only",
    "@/lib/supabase/service-role",
  ];
  const offenders = [];

  function walk(dir) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(tsx|ts|jsx|js)$/.test(entry)) continue;
      const src = readFileSync(full, "utf8");
      if (!/^["']use client["'];/m.test(src)) continue;
      for (const b of banned) {
        const importRe = new RegExp(
          String.raw`(?:from\s+|require\s*\(\s*)['"]${b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}['"]`
        );
        if (importRe.test(src)) {
          offenders.push(`${relative(root, full)} imports ${b}`);
        }
      }
    }
  }
  for (const d of ["app", "components", "hooks", "lib", "services"]) walk(join(root, d));
  if (offenders.length) {
    console.error(offenders.join("\n"));
    fail("rsc", `${offenders.length} server/client boundary violation(s)`);
  }
  console.log("Server/client boundary scan: clean");
}

/** Required production env keys must exist in .env.example (documentation gate). */
function scanEnvExample() {
  log("env", "Verifying production-critical keys are documented in .env.example");
  const examplePath = join(root, ".env.example");
  if (!existsSync(examplePath)) fail("env", ".env.example missing");
  const example = readFileSync(examplePath, "utf8");
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_APP_URL",
    "CRON_SECRET",
  ];
  // Prefer new keys OR legacy fallbacks
  const either = [
    ["SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
    ["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
  ];
  for (const key of required) {
    if (!example.includes(`${key}=`)) fail("env", `Missing ${key} in .env.example`);
  }
  for (const group of either) {
    if (!group.some((k) => example.includes(`${k}=`))) {
      fail("env", `Missing one of [${group.join(", ")}] in .env.example`);
    }
  }
  console.log("Env example documentation: OK");
}

function runVerifies() {
  log("verify", "Running project verification scripts");
  const scriptsDir = join(root, "scripts");
  // Hard gate: static/product invariants that must pass for every push.
  const required = [
    "verify-business-verification-fee.mjs",
    "verify-checkout-payment-flow.mjs",
    "verify-site-icon-manager.mjs",
    "verify-create-upload-product.mjs",
    "verify-quantforg-webhook.mjs",
  ];
  for (const f of required) {
    const full = join(scriptsDir, f);
    if (!existsSync(full)) fail("verify", `Missing required verify script: ${f}`);
    run("verify", process.execPath, [full]);
  }
  // Advisory: remaining scripts/verify-*.mjs (may need live network / drift).
  const extras = readdirSync(scriptsDir)
    .filter((f) => f.startsWith("verify-") && f.endsWith(".mjs") && !required.includes(f))
    .sort();
  for (const f of extras) {
    log("verify", `advisory ${f}`);
    const result = spawnSync(process.execPath, [join(scriptsDir, f)], {
      cwd: root,
      stdio: "inherit",
      env: process.env,
      shell: false,
      // Advisory checks must never stall the required release gate indefinitely.
      // They remain non-blocking and are reported as warnings if they time out.
      timeout: 60_000,
      killSignal: "SIGTERM",
    });
    if (result.status !== 0) {
      console.warn(`⚠ Advisory verify failed (non-blocking): ${f}`);
    }
  }
}

function writeStamp(fp) {
  const target = stampPath();
  writeFileSync(
    target,
    JSON.stringify(
      {
        head: fp.head,
        hash: fp.hash,
        passedAt: new Date().toISOString(),
        policy: "PRE-PUSH CI POLICY",
      },
      null,
      2
    )
  );
  console.log(`\n✅ CI stamp written: ${target}`);
}

function timedBuild() {
  log("build", "Production build with timing");
  const started = Date.now();
  run("build", "npm", ["run", "build"]);
  const durationMs = Date.now() - started;
  const nextDir = join(root, ".next");
  mkdirSync(nextDir, { recursive: true });
  writeFileSync(join(nextDir, "build-timing.json"), JSON.stringify({ durationMs, at: new Date().toISOString() }, null, 2));
  console.log(`Build duration: ${durationMs}ms`);
}

function main() {
  console.log("Jimvio PRE-PUSH CI — fail closed");
  scanAppRouter();
  scanServerClientBoundaries();
  scanEnvExample();
  run("migrations", process.execPath, [join(root, "scripts", "release", "verify-migrations.mjs")]);
  run("supabase-migrations", process.execPath, [
    join(root, "scripts", "release", "verify-supabase-migrations.mjs"),
  ]);
  run("auth-email-templates", process.execPath, [
    join(root, "scripts", "release", "verify-auth-email-templates.mjs"),
  ]);
  run("unit", "npm", ["run", "test:unit"]);
  timedBuild();
  run("perf", process.execPath, [join(root, "scripts", "release", "performance-budget.mjs")]);
  run("lint", "npm", ["run", "lint"]);
  run("type-check", "npm", ["run", "type-check"]);
  runVerifies();
  const fp = fingerprint();
  writeStamp(fp);
  console.log("\n==============================");
  console.log("✅ ALL PRE-PUSH GATES GREEN");
  console.log("==============================");
  console.log("You may now commit and push.");
}

main();
