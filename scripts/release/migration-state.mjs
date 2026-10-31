/**
 * Load local migration files, the allowlist, and remote history metadata.
 * Remote reads use the Management API. This module never runs migration SQL.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { readSupabaseProjectRef } from "./migration-policy.mjs";

export function readSupabaseAuth(env = process.env) {
  const token = String(env.SUPABASE_ACCESS_TOKEN || "").trim();
  const refResult = readSupabaseProjectRef(env);
  if (!token || !refResult.ok) {
    const parts = [];
    if (!token) parts.push("Missing SUPABASE_ACCESS_TOKEN.");
    if (!refResult.ok) parts.push(refResult.message);
    return { ok: false, message: parts.join(" ") };
  }
  return { ok: true, token, ref: refResult.ref };
}

export function loadLocalMigrations(root) {
  const dir = join(root, "supabase", "migrations");
  return readdirSync(dir)
    .filter((file) => file.endsWith(".sql"))
    .map((file) => {
      const match = file.match(/^(\d{14})_(.+)\.sql$/);
      if (!match) return null;
      return {
        version: match[1],
        name: match[2],
        file,
        sql: readFileSync(join(dir, file), "utf8"),
      };
    })
    .filter(Boolean);
}

export function loadAllowlist(root) {
  const parsed = JSON.parse(
    readFileSync(join(root, "scripts/release/eligible-migrations.json"), "utf8")
  );
  if (!parsed || !Array.isArray(parsed.versions)) {
    return {
      ok: false,
      versions: [],
      message: "scripts/release/eligible-migrations.json must contain a versions array",
    };
  }
  return { ok: true, versions: parsed.versions.map((version) => String(version)) };
}

export async function fetchRemoteMigrations({ token, ref }) {
  const url = `https://api.supabase.com/v1/projects/${ref}/database/migrations`;
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };
  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers });
      if (response.ok) {
        const remote = await response.json();
        return (Array.isArray(remote) ? remote : remote.migrations || [])
          .map((row) => ({
            version: String(row.version || ""),
            name: String(row.name || ""),
          }))
          .filter((row) => row.version);
      }

      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === maxAttempts) {
        throw new Error(`Management API migrations failed: HTTP ${response.status}`);
      }
      console.warn(`Supabase Management API returned HTTP ${response.status}; retrying (${attempt}/${maxAttempts - 1}).`);
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error instanceof Error
          ? error
          : new Error("Supabase Management API migration request failed");
      }
      if (error instanceof Error && /^Management API migrations failed: HTTP 4\d\d$/.test(error.message)) {
        throw error;
      }
      console.warn(`Supabase Management API request failed; retrying (${attempt}/${maxAttempts - 1}).`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1500 * 2 ** (attempt - 1)));
  }

  throw new Error("Supabase Management API migration request exhausted retries");
}
