import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { adminUserDetailDecision, containsSensitiveKey } from "./user-detail-access.ts";
import { buildAdminUserLocationView, describeStoredDevice } from "./user-location-view.ts";

describe("admin user location view", () => {
  it("labels sources and does not invent a browser location or rate-limit history", () => {
    const view = buildAdminUserLocationView({
      country: "KE",
      city: "Nairobi",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
      phone: "+254700000000",
      fullName: "Amina",
      username: "amina",
      avatarUrl: null,
      bio: null,
      emailConfirmedAt: "2026-01-02T00:00:00.000Z",
      lastSignInAt: "2026-04-01T00:00:00.000Z",
      sessions: [
        {
          id: "s1",
          device: "Chrome on Android",
          ip: "203.0.113.8",
          lastActivity: "2026-04-01T00:00:00.000Z",
          location: "KE",
          current: true,
        },
      ],
      orders: [
        {
          shippingAddress: {
            country: "Kenya",
            city: "Nairobi",
            line1: "Hidden Court",
          },
          paymentStatus: "paid",
          createdAt: "2026-03-02T00:00:00.000Z",
        },
      ],
      includeCheckoutStreet: false,
      latestIpCountry: "US",
      latestIpAt: "2026-04-01T00:00:00.000Z",
    });

    assert.equal(view.facts.find((fact) => fact.id === "account")?.sourceLabel, "User-provided");
    assert.equal(view.facts.find((fact) => fact.id === "ip")?.sourceLabel, "IP-estimated");
    assert.equal(view.facts.find((fact) => fact.id === "browser")?.value, "Not available");
    assert.equal(view.facts.find((fact) => fact.id === "checkout")?.sourceLabel, "Checkout address");
    assert.equal(view.checkoutStreet, null);
    assert.doesNotMatch(view.facts.find((fact) => fact.id === "checkout")?.value ?? "", /Hidden Court/);
    assert.equal(view.conflict, true);
    assert.equal(view.phone.verified, false);
    assert.equal(view.phone.sourceLabel, "User-provided");
    assert.equal(view.rateLimitHistory, null);
    assert.equal(view.sessions[0]?.browserVersion, null);
    assert.equal(view.sessions[0]?.category, "mobile");
    assert.equal(describeStoredDevice("Safari on iOS").operatingSystem, "iOS");
    assert.equal(view.profileCompletion.missing.includes("Photo"), true);
    assert.equal(containsSensitiveKey(view), false);
  });

  it("shows the checkout street only to the authorized detail view", () => {
    const hidden = buildAdminUserLocationView({
      country: null,
      city: null,
      createdAt: null,
      updatedAt: null,
      phone: null,
      fullName: null,
      username: null,
      avatarUrl: null,
      bio: null,
      emailConfirmedAt: null,
      lastSignInAt: null,
      sessions: [],
      orders: [
        {
          shippingAddress: { country_code: "RW", line1: "KG 12 Ave" },
          paymentStatus: "pending",
          createdAt: "2026-04-01T00:00:00.000Z",
        },
      ],
      includeCheckoutStreet: false,
      latestIpCountry: null,
      latestIpAt: null,
    });
    const shown = buildAdminUserLocationView({
      ...{
        country: null,
        city: null,
        createdAt: null,
        updatedAt: null,
        phone: null,
        fullName: null,
        username: null,
        avatarUrl: null,
        bio: null,
        emailConfirmedAt: null,
        lastSignInAt: null,
        sessions: [],
        latestIpCountry: null,
        latestIpAt: null,
        orders: hidden ? [
          {
            shippingAddress: { country_code: "RW", line1: "KG 12 Ave" },
            paymentStatus: "pending",
            createdAt: "2026-04-01T00:00:00.000Z",
          },
        ] : [],
      },
      includeCheckoutStreet: true,
    });
    assert.equal(hidden.checkoutStreet, null);
    assert.equal(shown.checkoutStreet, "KG 12 Ave");
  });

  it("renders missing session and phone fields without throwing", () => {
    const view = buildAdminUserLocationView({
      country: null,
      city: null,
      createdAt: null,
      updatedAt: null,
      phone: null,
      fullName: null,
      username: null,
      avatarUrl: null,
      bio: null,
      emailConfirmedAt: null,
      lastSignInAt: null,
      sessions: [
        {
          id: "",
          device: undefined,
          ip: undefined,
          lastActivity: undefined,
          location: undefined,
        } as unknown as {
          id: string;
          device: string;
          ip: string;
          lastActivity: string;
          location: string;
        },
      ],
      orders: [],
      includeCheckoutStreet: false,
      latestIpCountry: null,
      latestIpAt: null,
    });
    assert.equal(view.phone.value, null);
    assert.equal(view.sessions[0]?.device, "Unknown device");
    assert.equal(view.sessions[0]?.ip, "Not available");
    assert.equal(view.sessions[0]?.ipCountry, null);
    assert.equal(describeStoredDevice(undefined).category, "unknown");
    assert.equal(view.map, null);
    assert.equal(view.network.isp, null);
    assert.equal(view.device.browserVersion, null);
    assert.equal(view.addressComponents.some((component) => component.label === "Village"), false);
  });

  it("shows a consented coordinate without turning an IP city into a street address", () => {
    const view = buildAdminUserLocationView({
      country: "KE",
      city: "Nairobi",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
      phone: null,
      fullName: null,
      username: null,
      avatarUrl: null,
      bio: null,
      emailConfirmedAt: null,
      lastSignInAt: null,
      sessions: [{
        id: "s1",
        device: "Chrome on macOS",
        browser: "Chrome",
        browserVersion: "120.0",
        os: "macOS",
        osVersion: "10.15",
        ip: "203.0.113.8",
        lastActivity: "2026-04-01T00:00:00.000Z",
        location: "US",
        ipRegion: "TX",
        ipCity: "Austin",
        networkSignal: "none",
        current: true,
      }],
      orders: [],
      includeCheckoutStreet: true,
      latestIpCountry: "US",
      latestIpAt: "2026-04-01T00:00:00.000Z",
      precise: {
        permission: "granted",
        latitude: -1.944072,
        longitude: 30.061885,
        accuracyMeters: 40,
        capturedAt: "2026-04-02T00:00:00.000Z",
        expiresAt: "2026-07-01T00:00:00.000Z",
        declinedAt: null,
        geocodeState: "unconfigured",
        components: [],
        formattedAddress: null,
      },
    });
    assert.equal(view.personalizationCountry, "KE");
    assert.match(view.facts.find((fact) => fact.id === "ip")?.value ?? "", /Austin/);
    assert.match(view.facts.find((fact) => fact.id === "ip")?.note ?? "", /not a street address/i);
    assert.equal(view.facts.find((fact) => fact.id === "browser")?.useForPersonalization, undefined);
    assert.equal(view.facts.find((fact) => fact.id === "browser")?.sourceLabel, "Browser permission");
    assert.match(view.map?.googleMapsUrl ?? "", /-1\.944072,30\.061885/);
    assert.equal(view.map?.sourceLabel, "Browser permission");
    assert.equal(view.device.browserVersion, "120.0");
    assert.equal(view.network.isp, null);
    assert.match(view.geocoderNote, /GEOAPIFY_API_KEY/);
    assert.equal(containsSensitiveKey(view), false);
  });

  it("denies anonymous users and non-uuid ids", () => {
    assert.equal(adminUserDetailDecision({ ok: false }, "11111111-1111-4111-8111-111111111111"), "unauthorized");
    assert.equal(adminUserDetailDecision({ ok: true }, "not-a-user"), "invalid_id");
    assert.equal(
      adminUserDetailDecision({ ok: true }, "11111111-1111-4111-8111-111111111111"),
      "allow",
    );
  });

  it("wires the admin detail read through authorization and an audit event", () => {
    const source = readFileSync(new URL("../../services/admin/getAdminUsers.ts", import.meta.url), "utf8");
    const page = readFileSync(
      new URL("../../app/admin/users/[id]/page.tsx", import.meta.url),
      "utf8",
    );
    assert.match(source, /adminUserDetailDecision/);
    assert.match(source, /writeAuditEvent/);
    assert.match(source, /buildAdminUserLocationView/);
    assert.match(page, /AdminUserDetailClient/);
    assert.doesNotMatch(source, /password|access_token|api_key/);
  });
});
