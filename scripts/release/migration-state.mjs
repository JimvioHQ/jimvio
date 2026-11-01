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
  const maxAttempts = 5;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        signal: AbortSignal.timeout(30_000),
      });

      if (response.ok) {
        const remote = await response.json();
        return (Array.isArray(remote) ? remote : remote.migrations || [])
          .map((row) => ({
            version: String(row.version || ""),
            name: String(row.name || ""),
          }))
          .filter((row) => row.version);
      }

      const error = new Error(`Management API migrations failed: HTTP ${response.status}`);
      // Retry transient gateway, rate-limit, and server errors only.
      if (response.status < 500 && response.status !== 429) throw error;
      lastError = error;
    } catch (error) {
      lastError = error;
      if (error instanceof Error && /^Management API migrations failed: HTTP 4/.test(error.message)) {
        throw error;
      }
    }

    if (attempt < maxAttempts) {
      const delayMs = Math.min(1_000 * 2 ** (attempt - 1), 8_000);
      console.warn(`Supabase Management API request failed (attempt ${attempt}/${maxAttempts}); retrying in ${delayMs}ms.`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(
    `Supabase Management API migrations unavailable after ${maxAttempts} attempts: ${lastError instanceof Error ? lastError.message : "unknown error"}`
  );
}
