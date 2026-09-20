import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  encryptCredentials,
  decryptCredentials,
  isEncryptionConfigured,
} from "./encryption.ts";
import {
  createTikTokAdapter,
  isTikTokLoginKitConfigured,
  isTikTokOfficialLivePublishingAvailable,
  tiktokAuthUrl,
  TIKTOK_LOGIN_KIT_SCOPE,
  TIKTOK_LIVE_BLOCKED_MESSAGE,
} from "./adapters/tiktok.ts";
import { platformCapabilities, platformReadiness } from "./capabilities.ts";
import { isTikTokOfficialLivePublishingAvailable as gateFromShared } from "./tiktok-live-gate.ts";

describe("TikTok LIVE capability gate", () => {
  it("reports official LIVE publishing unavailable", () => {
    assert.equal(isTikTokOfficialLivePublishingAvailable(), false);
    assert.equal(gateFromShared(), false);
  });

  it("never marks TikTok LIVE as supported via env alone", () => {
    const prevLive = process.env.TIKTOK_LIVE_ENABLED;
    const prevKey = process.env.TIKTOK_CLIENT_KEY;
    const prevSecret = process.env.TIKTOK_CLIENT_SECRET;
    try {
      process.env.TIKTOK_LIVE_ENABLED = "true";
      process.env.TIKTOK_CLIENT_KEY = "test_client_key";
      process.env.TIKTOK_CLIENT_SECRET = "test_client_secret";
      const readiness = platformReadiness("tiktok");
      assert.equal(readiness.status, "requires_approval");
      assert.equal(readiness.oauthConfigured, true);
      assert.ok(readiness.message && /Login Kit/i.test(readiness.message));
    } finally {
      if (prevLive === undefined) delete process.env.TIKTOK_LIVE_ENABLED;
      else process.env.TIKTOK_LIVE_ENABLED = prevLive;
      if (prevKey === undefined) delete process.env.TIKTOK_CLIENT_KEY;
      else process.env.TIKTOK_CLIENT_KEY = prevKey;
      if (prevSecret === undefined) delete process.env.TIKTOK_CLIENT_SECRET;
      else process.env.TIKTOK_CLIENT_SECRET = prevSecret;
    }
  });

  it("exposes Login Kit OAuth capability only (no fake broadcast flags)", () => {
    const caps = platformCapabilities("tiktok");
    assert.equal(caps.oauth, true);
    assert.equal(caps.createBroadcast, false);
    assert.equal(caps.createStream, false);
    assert.equal(caps.startBroadcast, false);
    assert.equal(caps.stopBroadcast, false);
  });
});

describe("TikTok adapter gate", () => {
  it("returns ApprovalRequiredAdapter that rejects prepare/start", async () => {
    const adapter = createTikTokAdapter();
    assert.equal(adapter.platform, "tiktok");
    const ctx = {
      userId: "user-1",
      destinationId: "dest-1",
      credentials: {
        accessToken: "tok",
        refreshToken: "ref",
        scopes: [TIKTOK_LOGIN_KIT_SCOPE],
      },
      metadata: { title: "Test Live" },
      displayName: "TikTok",
    };
    const validated = await adapter.validate(ctx);
    assert.equal(validated.ok, false);
    if (!validated.ok) {
      assert.ok(validated.error.includes("programmatic LIVE"));
      assert.equal(validated.permanent, true);
    }
    const prep = await adapter.prepare(ctx);
    assert.equal(prep.ok, false);
    const start = await adapter.start({
      ...ctx,
      prepared: {
        pushUrl: "rtmps://example.invalid/live/key",
        providerBroadcastId: null,
        providerStreamId: null,
      },
    });
    assert.equal(start.ok, false);
    const stop = await adapter.stop(ctx);
    assert.equal(stop.ok, true);
  });

  it("blocked message is stable and secret-free", () => {
    assert.ok(TIKTOK_LIVE_BLOCKED_MESSAGE.length > 20);
    assert.equal(/token|secret|key=/i.test(TIKTOK_LIVE_BLOCKED_MESSAGE), false);
  });
});

describe("TikTok Login Kit OAuth URL", () => {
  it("builds HTTPS authorize URL with Login Kit scope only", () => {
    const prevKey = process.env.TIKTOK_CLIENT_KEY;
    const prevSecret = process.env.TIKTOK_CLIENT_SECRET;
    try {
      process.env.TIKTOK_CLIENT_KEY = "jimvio_test_key";
      process.env.TIKTOK_CLIENT_SECRET = "jimvio_test_secret";
      assert.equal(isTikTokLoginKitConfigured(), true);
      const url = tiktokAuthUrl({
        state: "csrf-state-value",
        redirectUri: "https://www.jimvio.com/api/integrations/tiktok/callback",
      });
      assert.ok(url);
      const parsed = new URL(url!);
      assert.equal(parsed.hostname, "www.tiktok.com");
      assert.equal(parsed.searchParams.get("client_key"), "jimvio_test_key");
      assert.equal(parsed.searchParams.get("scope"), TIKTOK_LOGIN_KIT_SCOPE);
      assert.equal(parsed.searchParams.get("response_type"), "code");
      assert.equal(parsed.searchParams.get("state"), "csrf-state-value");
      assert.equal(parsed.searchParams.has("code_challenge"), false);
      assert.equal(parsed.searchParams.has("code_challenge_method"), false);
      assert.equal(parsed.searchParams.get("client_secret"), null);
    } finally {
      if (prevKey === undefined) delete process.env.TIKTOK_CLIENT_KEY;
      else process.env.TIKTOK_CLIENT_KEY = prevKey;
      if (prevSecret === undefined) delete process.env.TIKTOK_CLIENT_SECRET;
      else process.env.TIKTOK_CLIENT_SECRET = prevSecret;
    }
  });

  it("rejects localhost / non-HTTPS redirect URIs", () => {
    process.env.TIKTOK_CLIENT_KEY = "jimvio_test_key";
    process.env.TIKTOK_CLIENT_SECRET = "jimvio_test_secret";
    assert.equal(
      tiktokAuthUrl({
        state: "s",
        redirectUri: "http://localhost:3000/api/integrations/tiktok/callback",
      }),
      null
    );
    assert.equal(
      tiktokAuthUrl({
        state: "s",
        redirectUri: "http://www.jimvio.com/api/integrations/tiktok/callback",
      }),
      null
    );
  });
});

describe("TikTok credential encryption", () => {
  it("encrypts TikTok tokens without leaking plaintext", () => {
    process.env.LIVE_DESTINATION_ENCRYPTION_KEY =
      "test-live-destination-encryption-key-for-unit-tests";
    assert.equal(isEncryptionConfigured(), true);
    const payload = {
      accessToken: "tiktok_access_token_secret_value",
      refreshToken: "tiktok_refresh_token_secret_value",
      scopes: [TIKTOK_LOGIN_KIT_SCOPE],
      expiresAt: new Date().toISOString(),
      extra: { open_id: "open_id_abc" },
    };
    const enc = encryptCredentials(payload);
    assert.ok(enc.startsWith("jvd1:"));
    assert.equal(enc.includes("tiktok_access_token_secret_value"), false);
    assert.equal(enc.includes("tiktok_refresh_token_secret_value"), false);
    const dec = decryptCredentials(enc);
    assert.equal(dec.accessToken, payload.accessToken);
    assert.equal(dec.refreshToken, payload.refreshToken);
    assert.equal(dec.extra?.open_id, "open_id_abc");
  });
});

describe("TikTok failure isolation contract", () => {
  it("TikTok prepare failure is permanent and does not invent ingest URL", async () => {
    const adapter = createTikTokAdapter();
    const result = await adapter.prepare({
      userId: "u",
      destinationId: "d",
      credentials: { accessToken: "a", refreshToken: "r" },
      metadata: { title: "Live" },
      displayName: "TikTok",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.permanent, true);
      assert.equal("value" in result, false);
    }
  });
});
