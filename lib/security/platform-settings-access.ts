/**
 * Explicit allowlists for platform_settings.
 * The public table must never be readable in full by anon/authenticated.
 */

export const PUBLIC_PLATFORM_SETTING_KEYS = [
  "fees",
  "social_proof",
  "marketing",
  "contact",
  "payment_providers",
] as const;

export const ADMIN_PLATFORM_SETTING_KEYS = [
  ...PUBLIC_PLATFORM_SETTING_KEYS,
  "features",
  "fraud",
  "security",
  "defaults",
  "supplier_sources",
] as const;

export type PublicPlatformSettingKey = (typeof PUBLIC_PLATFORM_SETTING_KEYS)[number];
export type AdminPlatformSettingKey = (typeof ADMIN_PLATFORM_SETTING_KEYS)[number];

const SENSITIVE_KEY_PATTERN =
  /(credential|secret|token|api_key|^sessions:|activity_log_|favorite_|collection_|item_collection_)/i;

export function isSensitivePlatformSettingKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key);
}

export function isPublicPlatformSettingKey(key: string): boolean {
  return (PUBLIC_PLATFORM_SETTING_KEYS as readonly string[]).includes(key);
}

export function isAdminPlatformSettingKey(key: string): boolean {
  return (ADMIN_PLATFORM_SETTING_KEYS as readonly string[]).includes(key);
}
