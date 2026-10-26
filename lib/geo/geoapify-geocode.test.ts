import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  forwardGeocodeAddress,
  mapGeoapifyBody,
  readGeocodingKey,
  resetGeocodeCache,
  reverseGeocodeCoordinates,
} from "./geoapify-geocode.ts";

function feature(properties: Record<string, unknown>, coordinates?: [number, number]) {
  return {
    type: "Feature",
    properties,
    geometry: coordinates ? { type: "Point", coordinates } : undefined,
  };
}

describe("geoapify geocoding", () => {
  it("maps returned address levels and does not invent a missing level", () => {
    const outcome = mapGeoapifyBody({
      type: "FeatureCollection",
      features: [feature({
        housenumber: "12",
        street: "Example Road",
        city: "Test City",
        country: "Rwanda",
        formatted: "12 Example Road, Test City",
        result_type: "street",
      }, [30.06, -1.94])],
    });
    assert.equal(outcome.state, "resolved");
    if (outcome.state !== "resolved") return;
    assert.equal(outcome.approximate, true);
    assert.deepEqual(
      outcome.components.map((component) => component.label),
      ["Street", "City", "Country", "Formatted estimate"],
    );
    assert.equal(outcome.components.find((component) => component.label === "Street")?.value, "12 Example Road");
    assert.equal(outcome.components.some((component) => component.label === "Village"), false);
    assert.equal(outcome.latitude, -1.94);
    assert.equal(outcome.longitude, 30.06);

    const building = mapGeoapifyBody({
      features: [feature({
        street: "Example Road",
        housenumber: "12",
        name: "Example House",
        result_type: "building",
      }, [2, 1])],
    });
    assert.equal(building.state, "resolved");
    if (building.state === "resolved") {
      assert.equal(building.approximate, false);
      assert.equal(building.components.find((component) => component.label === "Street")?.value, "12 Example Road");
      assert.equal(building.components.find((component) => component.label === "Building")?.value, "Example House");
    }
  });

  it("rejects an invalid address and a result without coordinates", () => {
    assert.equal(mapGeoapifyBody({ features: [] }).state, "unavailable");
    assert.equal(mapGeoapifyBody({ features: [feature({ city: "Test City" })] }).state, "unavailable");
    assert.equal(mapGeoapifyBody({ statusCode: 429, message: "Too many requests" }).state, "rate_limited");
    assert.equal(mapGeoapifyBody({ statusCode: 401, message: "Invalid apiKey test-key" }).state, "error");
    assert.equal(mapGeoapifyBody("nope").state, "error");
    const denied = mapGeoapifyBody({ statusCode: 401, message: "Invalid apiKey test-key" });
    assert.equal(JSON.stringify(denied).includes("test-key"), false);
  });

  it("stays unconfigured without a server key and hides the key from provider failures", async () => {
    resetGeocodeCache();
    assert.equal(readGeocodingKey({}), null);
    let called = false;
    const missing = await reverseGeocodeCoordinates(1, 2, {
      env: {},
      fetchImpl: async () => {
        called = true;
        return new Response(null, { status: 200 });
      },
    });
    assert.equal(called, false);
    assert.equal(missing.state, "unconfigured");

    const blank = await forwardGeocodeAddress("   ", {
      env: { GEOAPIFY_API_KEY: "test-key" },
      fetchImpl: async () => {
        called = true;
        return new Response(null, { status: 200 });
      },
    });
    assert.equal(called, false);
    assert.equal(blank.state, "unavailable");

    resetGeocodeCache();
    let requestUrl = "";
    const limited = await forwardGeocodeAddress("12 Example Road, Test City", {
      env: { GEOAPIFY_API_KEY: "test-key" },
      fetchImpl: async (input) => {
        requestUrl = String(input);
        return new Response(null, { status: 429 });
      },
    });
    assert.equal(limited.state, "rate_limited");
    assert.match(requestUrl, /^https:\/\/api\.geoapify\.com\/v1\/geocode\/search\?/);
    assert.equal(requestUrl.includes("apiKey=test-key"), true);
    assert.equal(JSON.stringify(limited).includes("test-key"), false);

    resetGeocodeCache();
    const resolved = await reverseGeocodeCoordinates(-1.944072, 30.061885, {
      env: { GEOAPIFY_API_KEY: "test-key" },
      fetchImpl: async (input) => {
        requestUrl = String(input);
        return Response.json({
          features: [feature({
            city: "Test City",
            country: "Rwanda",
            result_type: "city",
          }, [30.061885, -1.944072])],
        });
      },
    });
    assert.match(requestUrl, /\/v1\/geocode\/reverse\?/);
    assert.equal(resolved.state, "resolved");
    if (resolved.state === "resolved") {
      assert.equal(resolved.latitude, -1.944072);
      assert.equal(resolved.longitude, 30.061885);
      assert.equal(resolved.components.some((component) => component.label === "Village"), false);
    }
    assert.equal(JSON.stringify(resolved).includes("test-key"), false);

    resetGeocodeCache();
    const failed = await reverseGeocodeCoordinates(1, 2, {
      env: { GEOAPIFY_API_KEY: "test-key" },
      fetchImpl: async () => {
        throw new Error("timeout test-key");
      },
    });
    assert.equal(failed.state, "error");
    assert.equal(JSON.stringify(failed).includes("test-key"), false);

    const source = readFileSync(new URL("./geoapify-geocode.ts", import.meta.url), "utf8");
    const store = readFileSync(new URL("./precise-location-store.ts", import.meta.url), "utf8");
    assert.equal(source.includes("process.env.NEXT_PUBLIC"), false);
    assert.equal(source.includes("console."), false);
    assert.match(source, /GEOAPIFY_API_KEY_ENV/);
    assert.equal(source.includes("maps.googleapis.com"), false);
    assert.match(store, /geoapify-geocode/);
    assert.equal(store.includes("google-geocode"), false);
  });
});
