import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseGeminiProviderFailure,
  readRetryAfterSeconds,
  shouldContinueGeminiAttempts,
} from "./gemini-model.ts";

describe("gemini shopping limit handling", () => {
  it("reads Google retryDelay without treating a daily quota as a short retry", () => {
    const error = new Error(
      '[429 Too Many Requests] {"error":{"message":"Resource exhausted","details":[{"retryDelay":"22s"}]}}',
    );
    (error as Error & { status?: number }).status = 429;
    assert.equal(readRetryAfterSeconds(error), 22);
    const parsed = parseGeminiProviderFailure(error);
    assert.equal(parsed.category, "rate_limit");
    assert.equal(parsed.quotaScope, "minute");
    assert.equal(parsed.retryAfterSeconds, 22);
    assert.equal(parsed.detail.includes("AIza"), false);
  });

  it("distinguishes daily quota from a 503 overload", () => {
    const daily = parseGeminiProviderFailure(
      Object.assign(new Error("429 You exceeded your daily quota for generate content free tier"), { status: 429 }),
    );
    assert.equal(daily.quotaScope, "daily");

    const overload = parseGeminiProviderFailure(
      Object.assign(new Error("503 Service Unavailable high demand"), { status: 503 }),
    );
    assert.equal(overload.quotaScope, "overload");
    assert.equal(overload.retryAfterSeconds, null);
  });

  it("stops after a rate limit and only continues when the model is retired", () => {
    assert.equal(shouldContinueGeminiAttempts("rate_limit"), false);
    assert.equal(shouldContinueGeminiAttempts("authentication"), false);
    assert.equal(shouldContinueGeminiAttempts("timeout"), false);
    assert.equal(shouldContinueGeminiAttempts("retired_model"), true);
  });
});
