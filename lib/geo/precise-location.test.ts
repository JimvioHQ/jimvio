import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { mapLinksForCoordinates } from "./map-links.ts";
import { checkoutAddressComponents } from "./address-components.ts";
import {
  PRECISE_LOCATION_TTL_MS,
  grantedLocationRecord,
  parseStoredPreciseLocation,
  preciseLocationCommand,
  preciseMapLinks,
} from "./precise-location.ts";

describe("precise location", () => {
  it("rejects anonymous callers and invalid coordinates", () => {
    assert.equal(preciseLocationCommand(null, { intent: "share", latitude: 1, longitude: 2 }).type, "unauthorized");
    assert.equal(preciseLocationCommand("user", { intent: "share", latitude: 120, longitude: 2 }).type, "invalid");
    assert.equal(preciseLocationCommand("user", { intent: "decline" }).type, "decline");
    assert.equal(preciseLocationCommand("user", { intent: "clear" }).type, "clear");
  });

  it("keeps a shared point for 90 days and builds map links from those coordinates", () => {
    const capturedAt = "2026-04-01T00:00:00.000Z";
    const record = grantedLocationRecord({
      latitude: -1.944072,
      longitude: 30.061885,
      accuracyMeters: 30,
      capturedAt,
      outcome: { state: "unconfigured" },
    });
    assert.equal(record.geocodeState, "unconfigured");
    assert.equal(Date.parse(record.expiresAt ?? "") - Date.parse(capturedAt), PRECISE_LOCATION_TTL_MS);
    const links = preciseMapLinks(record);
    assert.equal(links?.googleMapsUrl, "https://www.google.com/maps/search/?api=1&query=-1.944072,30.061885");
    assert.match(links?.embedUrl ?? "", /marker=-1\.944072%2C30\.061885/);
    assert.equal(parseStoredPreciseLocation(record, Date.parse(capturedAt) + PRECISE_LOCATION_TTL_MS + 1), null);
  });

  it("does not invent a village and does not map an invalid coordinate", () => {
    const components = checkoutAddressComponents([
      {
        shippingAddress: { country: "Kenya", city: "Nairobi", line1: "Hidden Court" },
        paymentStatus: "paid",
        createdAt: "2026-03-02T00:00:00.000Z",
      },
    ], false);
    assert.deepEqual(components.map((component) => component.label), ["Country", "City"]);
    assert.equal(components.some((component) => component.value === "Hidden Court"), false);
    assert.equal(mapLinksForCoordinates(Number.NaN, 30, false), null);
  });

  it("keeps the share route authenticated and out of public profile fields", () => {
    const route = readFileSync(new URL("../../app/api/account/precise-location/route.ts", import.meta.url), "utf8");
    const identity = readFileSync(new URL("../identity/resolve.ts", import.meta.url), "utf8");
    const config = readFileSync(new URL("../../next.config.ts", import.meta.url), "utf8");
    const allowlist = readFileSync(
      new URL("../../supabase/migrations/20260825015212_lock_user_roles_and_platform_settings.sql", import.meta.url),
      "utf8",
    );
    assert.match(route, /getUser\(/);
    assert.match(route, /preciseLocationCommand/);
    assert.doesNotMatch(route, /console\.(log|info|debug)/);
    assert.doesNotMatch(identity, /precise-location|latitude/);
    assert.match(config, /geolocation=\(\)/);
    assert.match(config, /source: "\/settings\/privacy"/);
    assert.match(config, /geolocation=\(self\)/);
    assert.doesNotMatch(allowlist, /precise-location/);
  });
});
