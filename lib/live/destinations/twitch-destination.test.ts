import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  encryptCredentials,
  decryptCredentials,
  fingerprintIngestUrl,
  isEncryptionConfigured,
} from "./encryption.ts";
import {
  mapTwitchOAuthError,
  TWITCH_OAUTH_SCOPES,
  TWITCH_OAUTH_REDIRECT_PATH,
  twitchAuthUrl,
} from "./adapters/twitch.ts";

/** Mirror of sanitizeOAuthReturnPath — keep in sync with oauth-state.ts */
function sanitizeOAuthReturnPath(path: string | null | undefined): string {
  const fallback = "/communities/live";
  if (!path || typeof path !== "string") return fallback;
  if (!path.startsWith("/") || path.startsWith("//")) return fallback;
  if (path.includes("://") || path.includes("\\")) return fallback;
  return path.slice(0, 200);
}

describe("destination credential encryption", () => {
  it("round-trips Twitch credential payload", () => {
    process.env.LIVE_DESTINATION_ENCRYPTION_KEY =
      "test-live-destination-encryption-key-for-unit-tests";
    const payload = {
      accessToken: "twitch_access_token_value",
      refreshToken: "twitch_refresh_token_value",
      streamKey: "live_xxxxxxxx_stream_key",
      rtmpUrl: "rtmps://live.twitch.tv:443/app",
      scopes: [...TWITCH_OAUTH_SCOPES],
      expiresAt: new Date().toISOString(),
    };
    const enc = encryptCredentials(payload);
    assert.ok(enc.startsWith("jvd1:"));
    assert.equal(enc.includes("twitch_access_token_value"), false);
    assert.equal(enc.includes("live_xxxxxxxx_stream_key"), false);
    const dec = decryptCredentials(enc);
    assert.equal(dec.accessToken, payload.accessToken);
    assert.equal(dec.refreshToken, payload.refreshToken);
    assert.equal(dec.streamKey, payload.streamKey);
  });

  it("fingerprints ingest URLs without storing the key", () => {
    const push = "rtmps://live.twitch.tv:443/app/live_secret_key_abc";
    const fp = fingerprintIngestUrl(push);
    assert.equal(fp.length, 24);
    assert.equal(fp.includes("secret"), false);
  });

  it("reports encryption configured when key present", () => {
    process.env.LIVE_DESTINATION_ENCRYPTION_KEY = "unit-test-key";
    assert.equal(isEncryptionConfigured(), true);
  });
});

describe("oauth return path sanitization", () => {
  it("allows relative Jimvio paths", () => {
    assert.equal(
      sanitizeOAuthReturnPath("/communities/live?open=settings"),
      "/communities/live?open=settings"
    );
  });

  it("rejects open redirects", () => {
    assert.equal(sanitizeOAuthReturnPath("//evil.com"), "/communities/live");
    assert.equal(
      sanitizeOAuthReturnPath("https://evil.com"),
      "/communities/live"
    );
    assert.equal(
      sanitizeOAuthReturnPath("javascript:alert(1)"),
      "/communities/live"
    );
  });
});

describe("twitch oauth helpers", () => {
  it("requests only required scopes", () => {
    assert.deepEqual([...TWITCH_OAUTH_SCOPES], [
      "channel:manage:broadcast",
      "channel:read:stream_key",
    ]);
    assert.equal(
      TWITCH_OAUTH_SCOPES.includes("user:read:email" as never),
      false
    );
  });

  it("uses exact callback path", () => {
    assert.equal(
      TWITCH_OAUTH_REDIRECT_PATH,
      "/api/integrations/twitch/callback"
    );
  });

  it("maps denial and missing errors safely", () => {
    assert.equal(
      mapTwitchOAuthError("access_denied", null),
      "Twitch authorization was cancelled."
    );
    assert.ok(mapTwitchOAuthError(null, null).includes("Twitch"));
    assert.equal(mapTwitchOAuthError(null, "a".repeat(300)).length, 160);
  });

  it("builds auth URL with force_verify and no secrets", () => {
    process.env.TWITCH_CLIENT_ID = "test_client_id";
    process.env.TWITCH_CLIENT_SECRET = "test_client_secret";
    process.env.NODE_ENV = "test";
    const url = twitchAuthUrl({
      state: "state_value_abc",
      redirectUri: "https://www.jimvio.com/api/integrations/twitch/callback",
    });
    assert.ok(url);
    assert.ok(url!.includes("force_verify=true"));
    assert.ok(url!.includes("channel%3Amanage%3Abroadcast"));
    assert.ok(url!.includes("channel%3Aread%3Astream_key"));
    assert.equal(url!.includes("test_client_secret"), false);
    assert.equal(url!.includes("user%3Aread%3Aemail"), false);
  });

  it("rejects non-https redirect in production", () => {
    process.env.TWITCH_CLIENT_ID = "test_client_id";
    process.env.TWITCH_CLIENT_SECRET = "test_client_secret";
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const url = twitchAuthUrl({
      state: "s",
      redirectUri: "http://localhost:3000/api/integrations/twitch/callback",
    });
    process.env.NODE_ENV = prev;
    assert.equal(url, null);
  });
});
