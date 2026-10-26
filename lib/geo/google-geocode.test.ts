import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  forwardGeocodeAddress,
  mapGoogleGeocodeBody,
  readGeocodingKey,
  resetGeocodeCache,
  reverseGeocodeCoordinates,
} from "./google-geocode.ts";

describe("google geocoding", () => {
  it("maps returned address levels and skips levels the provider did not send", () => {
    const outcome = mapGoogleGeocodeBody({
      status: "OK",
      results: [{
        formatted_address: "Example Road, Test City",
        geometry: { location_type: "APPROXIMATE", location: { lat: -1.94, lng: 30.06 } },
        address_components: [
          { long_name: "12", types: ["street_number"] },
          { long_name: "Example Road", types: ["route"] },
          { long_name: "Test City", types: ["locality", "political"] },
          { long_name: "Rwanda", short_name: "RW", types: ["country", "political"] },
        ],
      }],
    });
    assert.equal(outcome.state, "resolved");
    if (outcome.state !== "resolved") return;
    assert.equal(outcome.approximate, true);
    assert.deepEqual(
      outcome.components.map((component) => component.label),
      ["Street", "City", "Country", "Formatted estimate"],
    );
    assert.equal(outcome.components.find((component) => component.label === "Street")?.value, "12 Example Road");

    const reversed = mapGoogleGeocodeBody({
      status: "OK",
      results: [{
        geometry: { location_type: "ROOFTOP", location: { lat: 1, lng: 2 } },
        address_components: [
          { long_name: "Example Road", types: ["route"] },
          { long_name: "12", types: ["street_number"] },
        ],
      }],
    });
    assert.equal(reversed.state, "resolved");
    if (reversed.state === "resolved") {
      assert.equal(reversed.approximate, false);
      assert.equal(reversed.components.find((component) => component.label === "Street")?.value, "12 Example Road");
    }
    assert.equal(outcome.components.some((component) => component.label === "Village"), false);
    assert.equal(outcome.latitude, -1.94);
    assert.equal(outcome.longitude, 30.06);
  });

  it("classifies provider failures without requiring a network call", () => {
    assert.equal(mapGoogleGeocodeBody({ status: "ZERO_RESULTS", results: [] }).state, "unavailable");
    assert.equal(mapGoogleGeocodeBody({ status: "OVER_QUERY_LIMIT" }).state, "rate_limited");
    assert.equal(mapGoogleGeocodeBody({ status: "REQUEST_DENIED" }).state, "error");
    assert.equal(mapGoogleGeocodeBody("nope").state, "error");
  });

  it("stays unconfigured when the server key is missing and hides the key from results", async () => {
    resetGeocodeCache();
    assert.equal(readGeocodingKey({}), null);
    const missing = await reverseGeocodeCoordinates(1, 2, { env: {} });
    assert.equal(missing.state, "unconfigured");

    let called = false;
    const keyed = await forwardGeocodeAddress("12 Example Road, Test City", {
      env: { GOOGLE_MAPS_GEOCODING_API_KEY: "test-key" },
      fetchImpl: async () => {
        called = true;
        return new Response(null, { status: 429 });
      },
    });
    assert.equal(called, true);
    assert.equal(keyed.state, "rate_limited");
    assert.equal(JSON.stringify(keyed).includes("test-key"), false);

    resetGeocodeCache();
    const failed = await reverseGeocodeCoordinates(1, 2, {
      env: { GOOGLE_MAPS_GEOCODING_API_KEY: "test-key" },
      fetchImpl: async () => {
        throw new Error("timeout");
      },
    });
    assert.equal(failed.state, "error");
    assert.equal(JSON.stringify(failed).includes("test-key"), false);

    const source = readFileSync(new URL("./google-geocode.ts", import.meta.url), "utf8");
    assert.equal(source.includes("process.env.NEXT_PUBLIC"), false);
    assert.match(source, /GOOGLE_MAPS_GEOCODING_ENV/);
  });
});
