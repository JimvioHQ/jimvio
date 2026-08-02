import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { logWalletActivity } from "@/lib/wallet-os/activity";

const scrypt = promisify(scryptCallback);

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

const KEY_LENGTH = 64;
const MAX_PIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

function isValidPin(pin: string): boolean {
  return /^[0-9]{4,6}$/.test(pin);
}

async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(pin, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

async function comparePin(pin: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  const derived = (await scrypt(pin, salt, KEY_LENGTH)) as Buffer;
  const storedBuf = Buffer.from(hashHex, "hex");
  if (storedBuf.length !== derived.length) return false;
  return timingSafeEqual(derived, storedBuf);
}

export interface WalletSecurityStatus {
  pinSet: boolean;
  requireTwoFactorWithdraw: boolean;
  locked: boolean;
  lockedUntil: string | null;
  failedAttempts: number;
}

export async function getWalletSecurityStatus(userId: string, db?: ServiceClient): Promise<WalletSecurityStatus> {
  const client = db ?? createServiceRoleClient();
  const { data } = await client
    .from("wallet_security")
    .select("pin_hash, require_2fa_withdraw, pin_locked_until, pin_failed_attempts")
    .eq("user_id", userId)
    .maybeSingle();

  const lockedUntil = data?.pin_locked_until ? new Date(data.pin_locked_until) : null;
  const locked = Boolean(lockedUntil && lockedUntil.getTime() > Date.now());

  return {
    pinSet: Boolean(data?.pin_hash),
    requireTwoFactorWithdraw: data?.require_2fa_withdraw ?? true,
    locked,
    lockedUntil: lockedUntil ? lockedUntil.toISOString() : null,
    failedAttempts: Number(data?.pin_failed_attempts ?? 0),
  };
}

export interface SetWalletPinOptions {
  requireTwoFactorWithdraw?: boolean;
  ip?: string | null;
  userAgent?: string | null;
}

export async function setWalletPin(userId: string, pin: string, opts: SetWalletPinOptions = {}): Promise<void> {
  if (!isValidPin(pin)) throw new Error("PIN must be 4-6 digits");
  const db = createServiceRoleClient();
  const pinHash = await hashPin(pin);

  const { error } = await db.from("wallet_security").upsert(
    {
      user_id: userId,
      pin_hash: pinHash,
      pin_set_at: new Date().toISOString(),
      pin_failed_attempts: 0,
      pin_locked_until: null,
      require_2fa_withdraw: opts.requireTwoFactorWithdraw ?? true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;

  await logWalletActivity({
    userId,
    action: "wallet_pin_set",
    surface: "security",
    ip: opts.ip,
    userAgent: opts.userAgent,
    db,
  });
}

export interface VerifyPinResult {
  valid: boolean;
  locked: boolean;
  lockedUntil: string | null;
  attemptsRemaining: number;
}

export async function verifyWalletPin(
  userId: string,
  pin: string,
  opts: { ip?: string | null; userAgent?: string | null } = {},
): Promise<VerifyPinResult> {
  const db = createServiceRoleClient();
  const { data } = await db
    .from("wallet_security")
    .select("pin_hash, pin_failed_attempts, pin_locked_until")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data?.pin_hash) {
    // No PIN configured — nothing to verify against.
    return { valid: true, locked: false, lockedUntil: null, attemptsRemaining: MAX_PIN_ATTEMPTS };
  }

  const lockedUntil = data.pin_locked_until ? new Date(data.pin_locked_until) : null;
  if (lockedUntil && lockedUntil.getTime() > Date.now()) {
    return { valid: false, locked: true, lockedUntil: lockedUntil.toISOString(), attemptsRemaining: 0 };
  }

  const matches = await comparePin(pin, data.pin_hash);
  if (matches) {
    await db
      .from("wallet_security")
      .update({ pin_failed_attempts: 0, pin_locked_until: null, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    await logWalletActivity({ userId, action: "wallet_pin_verified", surface: "security", ip: opts.ip, userAgent: opts.userAgent, db });
    return { valid: true, locked: false, lockedUntil: null, attemptsRemaining: MAX_PIN_ATTEMPTS };
  }

  const attempts = Number(data.pin_failed_attempts ?? 0) + 1;
  const shouldLock = attempts >= MAX_PIN_ATTEMPTS;
  const nextLockedUntil = shouldLock ? new Date(Date.now() + LOCK_DURATION_MS).toISOString() : null;

  await db
    .from("wallet_security")
    .update({
      pin_failed_attempts: shouldLock ? 0 : attempts,
      pin_locked_until: nextLockedUntil,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  await logWalletActivity({ userId, action: "wallet_pin_failed", surface: "security", ip: opts.ip, userAgent: opts.userAgent, db });

  return {
    valid: false,
    locked: shouldLock,
    lockedUntil: nextLockedUntil,
    attemptsRemaining: Math.max(0, MAX_PIN_ATTEMPTS - attempts),
  };
}

export async function listTrustedDevices(userId: string, db?: ServiceClient) {
  const client = db ?? createServiceRoleClient();
  const { data, error } = await client
    .from("wallet_trusted_devices")
    .select("id, device_label, device_fingerprint, last_seen_at, created_at")
    .eq("user_id", userId)
    .order("last_seen_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addTrustedDevice(userId: string, input: { label: string; fingerprint: string }) {
  if (!input.fingerprint?.trim()) throw new Error("Device fingerprint is required");
  const db = createServiceRoleClient();
  const { data, error } = await db
    .from("wallet_trusted_devices")
    .upsert(
      {
        user_id: userId,
        device_label: input.label || "Trusted device",
        device_fingerprint: input.fingerprint,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "user_id,device_fingerprint" },
    )
    .select()
    .single();
  if (error) throw error;

  await logWalletActivity({
    userId,
    action: "wallet_device_trusted",
    surface: "security",
    db,
    metadata: { fingerprint: input.fingerprint },
  });
  return data;
}

export async function removeTrustedDevice(userId: string, deviceId: string): Promise<void> {
  if (!deviceId) throw new Error("deviceId is required");
  const db = createServiceRoleClient();
  const { error } = await db.from("wallet_trusted_devices").delete().eq("id", deviceId).eq("user_id", userId);
  if (error) throw error;

  await logWalletActivity({ userId, action: "wallet_device_removed", surface: "security", db, metadata: { deviceId } });
}
