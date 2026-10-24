#!/usr/bin/env node
/**
 * Secrets guide — required/optional inventory, where configured, which workflows depend on each.
 * Never prints secret values.
 *
 * Usage: npm run ci:secrets:guide
 *        npm run ci:secrets:guide -- --github
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const checkGithub = process.argv.includes("--github");

const CATALOG = [
  {
    name: "SUPABASE_ACCESS_TOKEN",
    required: true,
    purpose: "Supabase CLI auth for migration list/link",
    workflows: ["supabase.yml", "release.yml"],
    where: ["GitHub Actions secrets (repo/org)", ".env.local (local verify)"],
  },
  {
    name: "SUPABASE_PROJECT_REF",
    required: true,
    purpose: "Canonical Supabase project ref. Workflows do not read SUPABASE_PROJECT_ID.",
    workflows: ["supabase.yml", "release.yml"],
    where: ["GitHub Actions secrets", ".env.local"],
  },
  {
    name: "SUPABASE_DB_PASSWORD",
    required: false,
    purpose: "Linked DB operations that need a password",
    workflows: ["supabase.yml"],
    where: ["GitHub Actions secrets (optional)", ".env.local"],
  },
  {
    name: "VERCEL_TOKEN",
    required: true,
    purpose: "Vercel CLI preview/production deploys",
    workflows: ["release.yml", "preview.yml"],
    where: ["GitHub Actions secrets", "Vercel dashboard token"],
  },
  {
    name: "VERCEL_ORG_ID",
    required: true,
    purpose: "Vercel team/org id for CLI",
    workflows: ["release.yml", "preview.yml"],
    where: ["GitHub Actions secrets", "Vercel project settings"],
  },
  {
    name: "VERCEL_PROJECT_ID",
    required: true,
    purpose: "Vercel project id for CLI",
    workflows: ["release.yml", "preview.yml"],
    where: ["GitHub Actions secrets", "Vercel project settings"],
  },
  {
    name: "NEXT_PUBLIC_APP_URL",
    required: false,
    purpose: "Post-deploy health URL",
    workflows: ["release.yml"],
    where: ["GitHub Actions secrets", "Vercel env"],
  },
  {
    name: "LIVEKIT_API_KEY",
    required: false,
    purpose: "Live platform runtime (not required for CI build placeholders)",
    workflows: ["(runtime / Vercel — not CI workflow secrets)"],
    where: ["Vercel environment variables", ".env.local"],
  },
  {
    name: "LIVEKIT_API_SECRET",
    required: false,
    purpose: "Live platform runtime",
    workflows: ["(runtime / Vercel — not CI workflow secrets)"],
    where: ["Vercel environment variables", ".env.local"],
  },
  {
    name: "RESEND_API_KEY",
    required: false,
    purpose: "Transactional email",
    workflows: ["(runtime / Vercel — not CI workflow secrets)"],
    where: ["Vercel environment variables", ".env.local"],
  },
  {
    name: "GITHUB_TOKEN",
    required: false,
    purpose: "Provided automatically by Actions — do not set manually",
    workflows: ["ci.yml", "release.yml", "preview.yml", "codeql.yml"],
    where: ["GitHub Actions (automatic)"],
  },
];

function parseEnvFile(path) {
  const keys = new Set();
  if (!existsSync(path)) return keys;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq > 0) keys.add(t.slice(0, eq).trim());
  }
  return keys;
}

function isPresent(value) {
  if (value == null) return false;
  const v = String(value).trim();
  if (!v) return false;
  if (/^(your_|changeme|todo|xxx|placeholder)/i.test(v)) return false;
  return true;
}

const localKeys = new Set([
  ...parseEnvFile(join(root, ".env.local")),
  ...parseEnvFile(join(root, ".env")),
]);

let githubNames = new Set();
if (checkGithub) {
  const r = spawnSync("gh", ["secret", "list", "--json", "name"], {
    cwd: root,
    encoding: "utf8",
  });
  if (r.status === 0 && r.stdout) {
    try {
      githubNames = new Set(JSON.parse(r.stdout).map((x) => x.name));
    } catch {
      console.warn("⚠️  Could not parse gh secret list");
    }
  } else {
    console.warn("⚠️  gh secret list unavailable — GitHub column shows unknown");
  }
}

// Cross-check workflow files mention secrets
const wfDir = join(root, ".github/workflows");
const wfBodies = {};
if (existsSync(wfDir)) {
  for (const f of readdirSync(wfDir).filter((x) => x.endsWith(".yml"))) {
    wfBodies[f] = readFileSync(join(wfDir, f), "utf8");
  }
}

console.log("Jimvio CI secrets guide (values never printed)\n");
console.log(
  "Configure GitHub secrets at: Settings → Secrets and variables → Actions\n"
);

const rows = [];
for (const item of CATALOG) {
  const inEnv = isPresent(process.env[item.name]);
  let localStatus = "absent";
  if (inEnv) localStatus = "env";
  else if (localKeys.has(item.name)) {
    // Peek value presence without printing
    const maps = [join(root, ".env.local"), join(root, ".env")];
    let present = false;
    for (const p of maps) {
      if (!existsSync(p)) continue;
      for (const line of readFileSync(p, "utf8").split("\n")) {
        const t = line.trim();
        if (!t.startsWith(item.name + "=")) continue;
        const val = t.slice(item.name.length + 1).trim().replace(/^["']|["']$/g, "");
        if (isPresent(val)) present = true;
      }
    }
    localStatus = present ? "dotenv" : "dotenv-empty";
  }

  const ghStatus = checkGithub
    ? githubNames.has(item.name)
      ? "github"
      : item.where.some((w) => w.includes("automatic"))
        ? "n/a"
        : "missing-on-github"
    : "not-checked";

  const mentioned = Object.entries(wfBodies)
    .filter(([, body]) => body.includes(`secrets.${item.name}`) || body.includes(item.name))
    .map(([f]) => f);

  rows.push({
    ...item,
    localStatus,
    ghStatus,
    mentionedIn: mentioned.length ? mentioned : item.workflows,
  });
}

for (const row of rows) {
  const req = row.required ? "REQUIRED" : "optional";
  const mark =
    row.required && row.localStatus === "absent" && row.ghStatus !== "github"
      ? "❌"
      : row.localStatus.startsWith("dotenv") || row.localStatus === "env" || row.ghStatus === "github"
        ? "✅"
        : "⚠️ ";
  console.log(`${mark} ${row.name} [${req}]`);
  console.log(`   purpose: ${row.purpose}`);
  console.log(`   local:   ${row.localStatus}`);
  console.log(`   github:  ${row.ghStatus}`);
  console.log(`   where:   ${row.where.join(" | ")}`);
  console.log(`   workflows: ${row.mentionedIn.join(", ")}`);
  console.log("");
}

const missingReq = rows.filter(
  (r) =>
    r.required &&
    r.localStatus === "absent" &&
    r.ghStatus !== "github" &&
    r.ghStatus !== "n/a"
);

console.log("--------------------------------------");
console.log(`Required secrets tracked: ${rows.filter((r) => r.required).length}`);
console.log(`Optional secrets tracked: ${rows.filter((r) => !r.required).length}`);
if (missingReq.length) {
  console.log("\nMissing required (local + GitHub unchecked/missing):");
  for (const r of missingReq) console.log(`  - ${r.name}`);
  console.log("\nTip: npm run ci:secrets -- --github");
} else {
  console.log("\nNo required secrets marked fully absent under current checks.");
}
console.log("\nSee docs/CI_SELF_HOSTED.md § Secrets");
