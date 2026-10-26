import "server-only";

import { checkoutGeocodeQuery } from "@/lib/geo/address-components";
import { forwardGeocodeAddress, reverseGeocodeCoordinates } from "@/lib/geo/google-geocode";
import {
  applyGeocodeOutcome,
  deniedLocationRecord,
  grantedLocationRecord,
  parseStoredPreciseLocation,
  preciseLocationKey,
  type StoredPreciseLocation,
} from "@/lib/geo/precise-location";
import type { CheckoutAddressInput } from "@/lib/geo/location-resolution";
import { createAdminClient } from "@/lib/supabase/admin";

async function writePreciseLocation(userId: string, value: StoredPreciseLocation | null): Promise<void> {
  const supabase = createAdminClient();
  const key = preciseLocationKey(userId);
  if (!value) {
    const { error } = await supabase.from("platform_settings").delete().eq("key", key);
    if (error) console.error("[precise-location] delete failed");
    return;
  }
  const { error } = await supabase.from("platform_settings").upsert(
    { key, value, updated_at: new Date().toISOString() },
    { onConflict: "key" },
  );
  if (error) console.error("[precise-location] save failed");
}

export async function readPreciseLocation(userId: string, now = Date.now()): Promise<StoredPreciseLocation | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", preciseLocationKey(userId))
      .maybeSingle();
    if (error || !data) return null;
    const parsed = parseStoredPreciseLocation(data.value, now);
    if (parsed) return parsed;
    if (data.value) await writePreciseLocation(userId, null);
    return null;
  } catch {
    return null;
  }
}

export async function saveSharedLocation(input: {
  userId: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  capturedAt?: string;
}): Promise<StoredPreciseLocation> {
  const capturedAt = input.capturedAt ?? new Date().toISOString();
  const outcome = await reverseGeocodeCoordinates(input.latitude, input.longitude);
  const record = grantedLocationRecord({ ...input, capturedAt, outcome });
  await writePreciseLocation(input.userId, record);
  return record;
}

export async function saveDeclinedLocation(userId: string, declinedAt = new Date().toISOString()): Promise<void> {
  await writePreciseLocation(userId, deniedLocationRecord(declinedAt));
}

export async function clearPreciseLocation(userId: string): Promise<void> {
  await writePreciseLocation(userId, null);
}

/** Fill an address estimate once a geocoding key exists. Failures stay on the stored point. */
export async function refreshPreciseAddress(
  userId: string,
  record: StoredPreciseLocation,
): Promise<StoredPreciseLocation> {
  if (record.permission !== "granted" || record.latitude == null || record.longitude == null) return record;
  if (record.geocodeState === "resolved" || record.geocodeState === "unavailable") return record;
  if (record.geocodeState === "error" || record.geocodeState === "rate_limited") return record;
  try {
    const outcome = await reverseGeocodeCoordinates(record.latitude, record.longitude);
    if (outcome.state === "unconfigured") {
      return applyGeocodeOutcome(record, outcome);
    }
    const next = applyGeocodeOutcome(record, outcome);
    await writePreciseLocation(userId, next);
    return next;
  } catch {
    return record;
  }
}

export async function lookupCheckoutPoint(
  orders: CheckoutAddressInput[],
): Promise<{ latitude: number; longitude: number } | null> {
  const query = checkoutGeocodeQuery(orders, true);
  if (!query) return null;
  try {
    const outcome = await forwardGeocodeAddress(query);
    if (outcome.state !== "resolved") return null;
    return { latitude: outcome.latitude, longitude: outcome.longitude };
  } catch {
    return null;
  }
}
