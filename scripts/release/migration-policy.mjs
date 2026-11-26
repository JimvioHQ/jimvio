/**
 * Pure migration approval policy. No network, database, or secret access.
 *
 * Baseline checks protect history already on the remote project.
 * Pending checks approve only an explicit allowlist entry that is unique,
 * newer than every remote version, and free of destructive SQL.
 * Nothing here runs SQL or repairs history.
 */

export const CANONICAL_SUPABASE_PROJECT_SECRET = "SUPABASE_PROJECT_REF";

const PROJECT_REF_PATTERN = /^[a-z0-9]{20}$/;
const VERSION_PATTERN = /^\d{14}$/;

const DESTRUCTIVE_PATTERNS = [
  { code: "truncate", pattern: /^\s*truncate\b/im },
  { code: "delete", pattern: /^\s*delete\s+from\b/im },
  { code: "drop_table", pattern: /^\s*drop\s+table\b/im },
  { code: "drop_schema", pattern: /^\s*drop\s+schema\b/im },
  { code: "drop_database", pattern: /^\s*drop\s+database\b/im },
  { code: "update", pattern: /^\s*update\s+[a-z0-9_."]+/im },
];

export function readSupabaseProjectRef(env = process.env) {
  const ref = String(env[CANONICAL_SUPABASE_PROJECT_SECRET] || "").trim();
  const unusedAlias = String(env.SUPABASE_PROJECT_ID || "").trim().length > 0;
  if (!ref) {
    const aliasNote = unusedAlias
      ? " SUPABASE_PROJECT_ID is not the canonical project secret."
      : "";
    return {
      ok: false,
      message: `Missing ${CANONICAL_SUPABASE_PROJECT_SECRET}.${aliasNote}`,
    };
  }
  if (!PROJECT_REF_PATTERN.test(ref)) {
    return {
      ok: false,
      message: `${CANONICAL_SUPABASE_PROJECT_SECRET} is not a 20-character project ref.`,
    };
  }
  return { ok: true, ref };
}

export function stripComments(sql) {
  return String(sql)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--[^\n]*/g, "");
}

export function destructiveFindings(sql) {
  // Only explicitly reviewed stored functions may contain DML without being
  // treated as migration-time data edits. Unmarked functions and top-level
  // UPDATE/DELETE/TRUNCATE/DROP statements remain blocked.
  const reviewedFunctionSql = String(sql).replace(
    /--\s*ALLOWLISTED_STORED_FUNCTION_DML\s*\r?\n(\bCREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\b[\s\S]*?\bAS\s+)(\$[a-zA-Z0-9_]*\$)[\s\S]*?\2/gi,
    (_match, prefix, delimiter) => `${prefix}${delimiter}${delimiter}`,
  );
  const body = stripComments(reviewedFunctionSql);
  return DESTRUCTIVE_PATTERNS.filter((item) => item.pattern.test(body)).map((item) => item.code);
}

export function isDestructive(sql) {
  return destructiveFindings(sql).length > 0;
}

function indexVersions(rows, label) {
  const map = new Map();
  const errors = [];
  for (const row of rows) {
    const version = String(row?.version || "");
    if (!version) continue;
    if (map.has(version)) {
      errors.push({
        scope: "baseline",
        code: label === "local" ? "duplicate_local" : "duplicate_remote",
        version,
        message: `Duplicate ${label} version ${version}`,
      });
      continue;
    }
    map.set(version, {
      version,
      name: String(row?.name || ""),
      sql: typeof row?.sql === "string" ? row.sql : undefined,
    });
  }
  return { map, errors };
}

/**
 * History that is already remote must have exactly one local file of the same name.
 * Local-only versions are pending candidates, not baseline failures.
 */
export function evaluateBaseline(localRows, remoteRows) {
  const local = indexVersions(localRows || [], "local");
  const remote = indexVersions(remoteRows || [], "remote");
  const errors = [...local.errors, ...remote.errors];

  for (const [version, row] of remote.map) {
    if (local.map.has(version)) continue;
    errors.push({
      scope: "baseline",
      code: "remote_only",
      version,
      message: `Remote version ${version}${row.name ? `_${row.name}` : ""} has no local migration file`,
    });
  }

  for (const [version, row] of local.map) {
    const remoteRow = remote.map.get(version);
    if (!remoteRow?.name || !row.name || remoteRow.name === row.name) continue;
    errors.push({
      scope: "baseline",
      code: "name_mismatch",
      version,
      message: `Name mismatch ${version}: local ${row.name} remote ${remoteRow.name}`,
    });
  }

  const pending = [...local.map.values()]
    .filter((row) => !remote.map.has(row.version))
    .sort((a, b) => a.version.localeCompare(b.version));

  const matched = [...local.map.keys()].filter((version) => remote.map.has(version)).length;

  return {
    ok: errors.length === 0,
    localCount: local.map.size,
    remoteCount: remote.map.size,
    matched,
    pending,
    errors,
  };
}

function latestRemoteVersion(remoteRows) {
  return (remoteRows || [])
    .map((row) => String(row?.version || ""))
    .filter((version) => VERSION_PATTERN.test(version))
    .sort()
    .at(-1) || "";
}

/**
 * Approve a pending set only when baseline history is consistent and every
 * pending version is allowlisted, newer, unique, and non-destructive.
 * Any failure clears the approved set so a later push cannot run.
 */
export function evaluatePending({ local, remote, allowlist }) {
  const baseline = evaluateBaseline(local, remote);
  const errors = baseline.ok ? [] : [...baseline.errors];
  const allowed = new Set();

  if (!Array.isArray(allowlist)) {
    errors.push({
      scope: "pending",
      code: "invalid_allowlist",
      message: "scripts/release/eligible-migrations.json must contain a versions array",
    });
  } else {
    const localVersions = new Set((local || []).map((row) => String(row?.version || "")));
    for (const entry of allowlist) {
      const version = String(entry);
      if (!VERSION_PATTERN.test(version)) {
        errors.push({
          scope: "pending",
          code: "invalid_allowlist",
          message: "Allowlist entries must be 14-digit migration versions",
        });
        continue;
      }
      if (!localVersions.has(version)) {
        errors.push({
          scope: "pending",
          code: "allowlist_missing",
          version,
          message: `Allowlisted version ${version} has no local migration file`,
        });
        continue;
      }
      allowed.add(version);
    }
  }

  const latest = latestRemoteVersion(remote);
  const approved = [];
  for (const pending of baseline.pending) {
    let blocked = false;
    const label = `${pending.version}${pending.name ? `_${pending.name}` : ""}`;
    if (!allowed.has(pending.version)) {
      blocked = true;
      errors.push({
        scope: "pending",
        code: "not_allowlisted",
        version: pending.version,
        message: `Pending migration ${label} is not in scripts/release/eligible-migrations.json`,
      });
    }
    if (latest && pending.version <= latest) {
      blocked = true;
      errors.push({
        scope: "pending",
        code: "not_newer",
        version: pending.version,
        message: `Pending migration ${label} is not newer than remote version ${latest}. --include-all will not be used.`,
      });
    }
    if (typeof pending.sql !== "string" || !pending.sql.trim()) {
      blocked = true;
      errors.push({
        scope: "pending",
        code: "unreviewed",
        version: pending.version,
        message: `Pending migration ${label} has no SQL to review`,
      });
    } else if (isDestructive(pending.sql)) {
      blocked = true;
      errors.push({
        scope: "pending",
        code: "destructive",
        version: pending.version,
        message: `Pending migration ${label} contains destructive or data-changing SQL. Explicit human review is required. Not applied.`,
      });
    }
    if (!blocked) approved.push(pending.version);
  }

  const ok = errors.length === 0;
  return {
    ok,
    approved: ok ? approved.sort() : [],
    pending: baseline.pending.map(({ version, name }) => ({ version, name })),
    errors,
    baseline,
  };
}

export function plannedMigrationVersions(dryRunOutput) {
  const found = [];
  const text = String(dryRunOutput || "");
  for (const match of text.matchAll(/(?:^|[\s•*-])(\d{14})_[a-z0-9_]+(?:\.sql)?/g)) {
    found.push(match[1]);
  }
  return [...new Set(found)];
}

export function dryRunMatchesApprovedSet(dryRunOutput, approvedVersions) {
  const planned = plannedMigrationVersions(dryRunOutput).sort();
  const approved = [...(approvedVersions || [])].map(String).sort();
  if (planned.length !== approved.length) return false;
  return planned.every((version, index) => version === approved[index]);
}

export function dbPushArgs(dryRun) {
  const args = ["db", "push", "--linked"];
  if (dryRun) args.push("--dry-run");
  args.push("--yes");
  return args;
}

export function linkArgs(ref) {
  return ["link", "--project-ref", ref, "--yes"];
}
