#!/usr/bin/env node
/**
 * Production verification — reproduces the GitHub CI gate locally without
 * consuming GitHub-hosted Actions minutes.
 *
 * Usage: npm run ci:verify
 *
 * Fail-closed: exits non-zero on the first failing step.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function log(step, msg) {
  console.log(`\n==> [${step}] ${msg}`);
}

function fail(step, msg) {
  console.error(`\n❌ VERIFY FAILED at ${step}: ${msg}`);
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
  if (result.error) {
    fail(step, result.error.message);
  }
  if (result.status !== 0) {
    fail(step, `${command} exited ${result.status ?? "unknown"}`);
  }
}

function hasBin(name) {
  const which = spawnSync(process.platform === "win32" ? "where" : "which", [name], {
    cwd: root,
    stdio: "pipe",
    shell: false,
  });
  return which.status === 0;
}

console.log("Jimvio local CI verification (fail-closed)");
console.log(`cwd: ${root}`);

run("install", "npm", ["ci"]);
run("lint", "npm", ["run", "lint"]);
run("type-check", "npm", ["run", "type-check"]);
run("test", "npm", ["run", "test"]);
run("build", "npm", ["run", "build"], {
  env: {
    NODE_OPTIONS: process.env.NODE_OPTIONS || "--max-old-space-size=8192",
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder",
    SUPABASE_SERVICE_ROLE_KEY:
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY0NTE5MjgwMCwiZXhwIjoxOTYwNzY4ODAwfQ.placeholder",
    SUPABASE_SECRET_KEY:
      process.env.SUPABASE_SECRET_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY0NTE5MjgwMCwiZXhwIjoxOTYwNzY4ODAwfQ.placeholder",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "https://jimvio.example",
    CRON_SECRET: process.env.CRON_SECRET || "ci-build-placeholder-cron-secret",
  },
});
run("ci:prepush", "npm", ["run", "ci:prepush"], {
  env: {
    NODE_OPTIONS: process.env.NODE_OPTIONS || "--max-old-space-size=8192",
  },
});

if (!hasBin("supabase")) {
  fail(
    "supabase",
    "supabase CLI not found on PATH. Install: https://supabase.com/docs/guides/cli"
  );
}

const linkedHint = join(root, "supabase", ".temp", "project-ref");
if (!existsSync(linkedHint) && !process.env.SUPABASE_PROJECT_REF) {
  console.warn(
    "\n⚠️  No linked Supabase project detected. migration list/up --linked may fail."
  );
  console.warn("   Run: supabase link --project-ref <ref>");
}

run("migrations-list", "supabase", [
  "migration",
  "list",
  "--linked",
  "--output-format",
  "json",
]);
run("migrations-up", "supabase", ["migration", "up", "--linked"]);

console.log("\n==============================");
console.log("✅ LOCAL VERIFICATION GREEN");
console.log("==============================");
console.log("GitHub-hosted Actions minutes were not used.");
