import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  dbPushArgs,
  dryRunMatchesApprovedSet,
  evaluateBaseline,
  evaluatePending,
  linkArgs,
  plannedMigrationVersions,
  readSupabaseProjectRef,
} from "./migration-policy.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const remote = [{ version: "20261001000000", name: "baseline" }];
const localBase = [{ version: "20261001000000", name: "baseline", sql: "select 1;" }];
const pendingVersion = "20261002000000";
const safeSql = "create table if not exists public.widgets (id uuid primary key);";

function withPending(sql, version = pendingVersion, name = "add_widget") {
  return [...localBase, { version, name, sql }];
}

test("a newer allowlisted non-destructive migration is approved", () => {
  const baseline = evaluateBaseline(withPending(safeSql), remote);
  assert.equal(baseline.ok, true);
  assert.equal(baseline.pending.length, 1);

  const decision = evaluatePending({
    local: withPending(safeSql),
    remote,
    allowlist: [pendingVersion],
  });
  assert.equal(decision.ok, true);
  assert.deepEqual(decision.approved, [pendingVersion]);
});

test("a pending migration outside the allowlist is rejected", () => {
  const decision = evaluatePending({
    local: withPending(safeSql),
    remote,
    allowlist: [],
  });
  assert.equal(decision.ok, false);
  assert.deepEqual(decision.approved, []);
  assert.equal(decision.errors.some((error) => error.code === "not_allowlisted"), true);
});

test("a remote-only version is a baseline failure", () => {
  const baseline = evaluateBaseline(localBase, [
    ...remote,
    { version: "20261003000000", name: "missing_file" },
  ]);
  assert.equal(baseline.ok, false);
  assert.equal(baseline.errors.some((error) => error.code === "remote_only"), true);

  const decision = evaluatePending({
    local: localBase,
    remote: [...remote, { version: "20261003000000", name: "missing_file" }],
    allowlist: [],
  });
  assert.equal(decision.ok, false);
  assert.deepEqual(decision.approved, []);
});

test("duplicate local and remote versions are rejected", () => {
  const local = evaluateBaseline(
    [...localBase, { version: "20261001000000", name: "baseline_again", sql: "select 2;" }],
    remote
  );
  assert.equal(local.errors.some((error) => error.code === "duplicate_local"), true);

  const remoteDup = evaluateBaseline(localBase, [
    ...remote,
    { version: "20261001000000", name: "baseline_copy" },
  ]);
  assert.equal(remoteDup.errors.some((error) => error.code === "duplicate_remote"), true);
});

test("a same-version name mismatch is a baseline failure", () => {
  const baseline = evaluateBaseline(localBase, [{ version: "20261001000000", name: "renamed" }]);
  assert.equal(baseline.ok, false);
  assert.equal(baseline.errors.some((error) => error.code === "name_mismatch"), true);
});

test("destructive pending SQL stops for human review", () => {
  for (const sql of [
    "truncate public.wallets;",
    "delete from public.wallets;",
    "drop table public.wallets;",
    "update public.wallets set balance = 0;",
  ]) {
    const decision = evaluatePending({
      local: withPending(sql),
      remote,
      allowlist: [pendingVersion],
    });
    assert.equal(decision.ok, false, sql);
    assert.equal(decision.errors.some((error) => error.code === "destructive"), true, sql);
    assert.deepEqual(decision.approved, []);
  }
});

test("destructive SQL inside comments does not block an allowlisted migration", () => {
  const decision = evaluatePending({
    local: withPending("-- delete from public.wallets;\ncreate table public.notes (id int);"),
    remote,
    allowlist: [pendingVersion],
  });
  assert.equal(decision.ok, true);
  assert.deepEqual(decision.approved, [pendingVersion]);
});

test("DML inside a stored function body is not treated as migration-time data mutation", () => {
  const sql = `-- ALLOWLISTED_STORED_FUNCTION_DML
CREATE OR REPLACE FUNCTION public.reserve_wallet()
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE public.wallets SET available_balance = available_balance - 1;
END;
$function$;`;
  const decision = evaluatePending({
    local: withPending(sql),
    remote,
    allowlist: [pendingVersion],
  });
  assert.equal(decision.ok, true);
  assert.deepEqual(decision.approved, [pendingVersion]);
});

test("unmarked stored function DML remains blocked for human review", () => {
  const sql = `CREATE OR REPLACE FUNCTION public.unreviewed_wallet_change()
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE public.wallets SET available_balance = 0;
END;
$function$;`;
  const decision = evaluatePending({
    local: withPending(sql),
    remote,
    allowlist: [pendingVersion],
  });
  assert.equal(decision.ok, false);
  assert.equal(decision.errors.some((error) => error.code === "destructive"), true);
});

test("an allowlisted migration older than remote history is rejected", () => {
  const decision = evaluatePending({
    local: withPending(safeSql, "20260901000000", "old_change"),
    remote,
    allowlist: ["20260901000000"],
  });
  assert.equal(decision.ok, false);
  assert.equal(decision.errors.some((error) => error.code === "not_newer"), true);
});

test("dry-run output must equal the approved set", () => {
  const exact = `
Would push these migrations:
 • 20261002000000_add_widget.sql
Finished supabase db push.
`;
  assert.equal(dryRunMatchesApprovedSet(exact, [pendingVersion]), true);

  const extra = `${exact}\n • 20261003000000_other.sql`;
  assert.equal(dryRunMatchesApprovedSet(extra, [pendingVersion]), false);

  const missing = "Remote database is up to date.";
  assert.equal(dryRunMatchesApprovedSet(missing, [pendingVersion]), false);
  assert.equal(dryRunMatchesApprovedSet(missing, []), true);

  const unrelatedDigits = "notice 202610020000009999 finished";
  assert.deepEqual(plannedMigrationVersions(unrelatedDigits), []);
});

test("push commands never reset, repair, or include all history", () => {
  for (const args of [dbPushArgs(true), dbPushArgs(false), linkArgs("a".repeat(20))]) {
    assert.equal(args.includes("--include-all"), false);
    assert.equal(args.includes("reset"), false);
    assert.equal(args.includes("repair"), false);
  }
  assert.deepEqual(dbPushArgs(true), ["db", "push", "--linked", "--dry-run", "--yes"]);
  assert.deepEqual(dbPushArgs(false), ["db", "push", "--linked", "--yes"]);
});

test("project secret naming accepts only SUPABASE_PROJECT_REF", () => {
  const alias = "project-id-value-should-stay-hidden";
  const missing = readSupabaseProjectRef({ SUPABASE_PROJECT_ID: alias });
  assert.equal(missing.ok, false);
  assert.match(missing.message, /SUPABASE_PROJECT_REF/);
  assert.equal(missing.message.includes(alias), false);

  const present = readSupabaseProjectRef({ SUPABASE_PROJECT_REF: "a".repeat(20) });
  assert.equal(present.ok, true);
  assert.equal(present.ref, "a".repeat(20));
});

test("workflows keep one project secret and do not deploy production themselves", () => {
  const release = readFileSync(join(root, ".github/workflows/release.yml"), "utf8");
  const supabase = readFileSync(join(root, ".github/workflows/supabase.yml"), "utf8");
  assert.equal(/vercel deploy/.test(release), false);
  assert.match(release, /Wait for Vercel Git production commit/);
  assert.match(release, /secrets\.SUPABASE_PROJECT_REF/);
  assert.match(supabase, /secrets\.SUPABASE_PROJECT_REF/);
  assert.equal(/secrets\.SUPABASE_PROJECT_ID/.test(release), false);
  assert.equal(/secrets\.SUPABASE_PROJECT_ID/.test(supabase), false);
  assert.match(supabase, /verify-remote-migration-history\.mjs/);
  assert.match(supabase, /verify-pending-migrations\.mjs/);
  assert.match(supabase, /apply-eligible-migrations\.mjs/);
  assert.equal(/--include-all|db reset|migration repair/.test(supabase), false);
});
