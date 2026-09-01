#!/usr/bin/env node
/**
 * Repair broken 2FA enrollment (profile flag without active TOTP secret).
 *
 * Usage:
 *   ALLOW_PRODUCTION_SCRIPT=1 node --env-file=.env.local scripts/ops/repair-broken-2fa-account.mjs --email user@example.com
 */
import { createClient } from "@supabase/supabase-js";

const PRODUCTION_REFS = new Set(["vsfhwfimudpdipdkxbww"]);

function projectRefFromUrl(url) {
  const match = String(url ?? "").match(/https?:\/\/([^.]+)\.supabase\.co/);
  return match?.[1] ?? null;
}

function assertProductionScriptAllowed(scriptName) {
  const ref = process.env.SUPABASE_PROJECT_REF?.trim() || projectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!ref || !PRODUCTION_REFS.has(ref) || process.env.ALLOW_PRODUCTION_SCRIPT === "1") return;
  console.error(`[script-safety] Refusing ${scriptName} against production ${ref}. Set ALLOW_PRODUCTION_SCRIPT=1.`);
  process.exit(1);
}

assertProductionScriptAllowed("repair-broken-2fa-account");

const emailArg = process.argv.find((a) => a.startsWith("--email="))?.split("=")[1]
  ?? process.argv[process.argv.indexOf("--email") + 1];

if (!emailArg) {
  console.error("Usage: node scripts/ops/repair-broken-2fa-account.mjs --email user@example.com");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Missing Supabase env (NEXT_PUBLIC_SUPABASE_URL + service role key).");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });
const normalized = emailArg.trim().toLowerCase();

const { data: profile, error: profileErr } = await admin
  .from("profiles")
  .select("id, email, two_factor_enabled")
  .ilike("email", normalized)
  .maybeSingle();

if (profileErr || !profile) {
  console.error(profileErr?.message ?? `No profile for ${normalized}`);
  process.exit(1);
}

const { data: secretRow } = await admin
  .from("user_2fa_secrets")
  .select("secret")
  .eq("user_id", profile.id)
  .maybeSingle();

const hasSecret = typeof secretRow?.secret === "string" && secretRow.secret.trim().length > 0;
const broken = profile.two_factor_enabled === true && !hasSecret;

if (!broken) {
  console.log(JSON.stringify({ ok: true, repaired: false, reason: "not_broken", userId: profile.id }));
  process.exit(0);
}

const now = new Date().toISOString();
const { error: updateErr } = await admin
  .from("profiles")
  .update({ two_factor_enabled: false, updated_at: now })
  .eq("id", profile.id);

if (updateErr) {
  console.error(updateErr.message);
  process.exit(1);
}

if (secretRow) {
  const { error: deleteErr } = await admin.from("user_2fa_secrets").delete().eq("user_id", profile.id);
  if (deleteErr) {
    console.error(deleteErr.message);
    process.exit(1);
  }
}

console.log(JSON.stringify({ ok: true, repaired: true, userId: profile.id, email: profile.email }));
