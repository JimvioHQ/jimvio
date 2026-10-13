/**
 * Durable CJ API quota circuit — shared across Vercel serverless isolates.
 *
 * In-memory alone is useless on serverless: each cold start resets the circuit
 * while enrichment crons keep burning daily API points, leaving checkout with
 * Remaining: 0 → "Shipping options are temporarily unavailable."
 */

import { isCjApiQuotaError } from "@/lib/cj/customer-errors-shared";

const SETTINGS_KEY = "cj_api_quota_circuit";
/** Minimum pause after a hard Remaining: 0 — avoid thrashing crons. */
const MIN_CIRCUIT_MS = 30 * 60 * 1000;
/** Cap so a stuck circuit cannot block forever if DB write fails oddly. */
const MAX_CIRCUIT_MS = 18 * 60 * 60 * 1000;

type CircuitValue = {
  open_until: string;
  message?: string;
  updated_at?: string;
};

let memoryOpenUntil = 0;
let lastDbReadAt = 0;
const DB_READ_TTL_MS = 15_000;

function nextUtcMidnightMs(from = Date.now()): number {
  const d = new Date(from);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 15, 0);
}

/** Prefer pause until next UTC day when Remaining: 0; otherwise a shorter window. */
export function resolveQuotaCircuitTtlMs(message: string): number {
  const remainingMatch = /Remaining:\s*(\d+)/i.exec(message);
  const remaining =
    remainingMatch != null ? Number.parseInt(remainingMatch[1] ?? "", 10) : NaN;

  if (Number.isFinite(remaining) && remaining === 0) {
    const untilMidnight = nextUtcMidnightMs() - Date.now();
    return Math.min(MAX_CIRCUIT_MS, Math.max(MIN_CIRCUIT_MS, untilMidnight));
  }

  // Low remaining — pause non-checkout work but allow recovery sooner.
  if (Number.isFinite(remaining) && remaining > 0 && remaining < 50) {
    return Math.min(MAX_CIRCUIT_MS, Math.max(10 * 60 * 1000, 60 * 60 * 1000));
  }

  return MIN_CIRCUIT_MS;
}

function syncMemory(untilMs: number): void {
  if (untilMs > memoryOpenUntil) memoryOpenUntil = untilMs;
}

async function getAdmin() {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  return createAdminClient();
}

async function readCircuitFromDb(): Promise<number> {
  const now = Date.now();
  if (lastDbReadAt > 0 && now - lastDbReadAt < DB_READ_TTL_MS) {
    return memoryOpenUntil;
  }
  lastDbReadAt = now;

  try {
    const admin = await getAdmin();
    const { data } = await admin
      .from("platform_settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();

    const value = data?.value as CircuitValue | null;
    const untilIso = value?.open_until;
    if (!untilIso) return memoryOpenUntil;

    const untilMs = Date.parse(untilIso);
    if (!Number.isFinite(untilMs)) return memoryOpenUntil;
    syncMemory(untilMs);
    return untilMs;
  } catch (err) {
    console.warn("[cj] quota_circuit_read_failed", {
      message: err instanceof Error ? err.message : String(err),
    });
    return memoryOpenUntil;
  }
}

async function writeCircuitToDb(untilMs: number, message: string): Promise<void> {
  try {
    const admin = await getAdmin();
    const payload: CircuitValue = {
      open_until: new Date(untilMs).toISOString(),
      message: message.slice(0, 240),
      updated_at: new Date().toISOString(),
    };
    const { error } = await admin.from("platform_settings").upsert(
      {
        key: SETTINGS_KEY,
        value: payload,
        updated_at: payload.updated_at,
      },
      { onConflict: "key" }
    );
    if (error) {
      console.warn("[cj] quota_circuit_write_failed", { message: error.message });
    }
  } catch (err) {
    console.warn("[cj] quota_circuit_write_failed", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

/** True when CJ daily points / quota circuit is open (memory + durable). */
export async function isCjQuotaCircuitOpenAsync(): Promise<boolean> {
  const now = Date.now();
  if (memoryOpenUntil > now) return true;
  const until = await readCircuitFromDb();
  return until > now;
}

/** Sync check — uses memory, optionally refreshed by prior async reads. */
export function isCjQuotaCircuitOpen(): boolean {
  return Date.now() < memoryOpenUntil;
}

/** Open the shared quota circuit (checkout + crons + PDP freight). */
export function markCjQuotaExhausted(message: string): void {
  const ttl = resolveQuotaCircuitTtlMs(message);
  const until = Date.now() + ttl;
  syncMemory(until);
  console.warn("[checkout] cj_quota_circuit_open", {
    until: new Date(until).toISOString(),
    message: message.slice(0, 160),
  });
  void writeCircuitToDb(until, message);
}

/** Call from async paths before spending CJ points on non-checkout work. */
export async function assertCjQuotaAvailableForBackground(): Promise<boolean> {
  if (await isCjQuotaCircuitOpenAsync()) return false;
  return true;
}

/** Detect quota from any CJ error shape and open the durable circuit. */
export function noteCjQuotaIfPresent(raw: unknown): boolean {
  if (!isCjApiQuotaError(raw)) return false;
  const message =
    raw instanceof Error
      ? raw.message
      : typeof raw === "string"
        ? raw
        : JSON.stringify(raw);
  markCjQuotaExhausted(message);
  return true;
}

export function quotaCircuitAssertMessage(): string {
  return "Insufficient API points. Remaining: 0 (circuit open — avoid repeated freightCalculate).";
}
