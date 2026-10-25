import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { attemptLiveChat } from "./chat-live-attempt.ts";

function timeout(): Error {
  const error = new Error("timed out");
  error.name = "TimeoutError";
  return error;
}

function statusError(status: number, message = "failed"): Error {
  return Object.assign(new Error(message), { status });
}

describe("chat live provider attempts", () => {
  it("uses OpenAI once when the first attempt succeeds", async () => {
    let openai = 0;
    let gemini = 0;
    const live = await attemptLiveChat({
      models: ["gpt-4o-mini"],
      openLive: async () => {
        openai += 1;
        return { provider: "openai" };
      },
      openGemini: async () => {
        gemini += 1;
        return { provider: "gemini" };
      },
    });
    assert.deepEqual(live, { provider: "openai" });
    assert.equal(openai, 1);
    assert.equal(gemini, 0);
  });

  it("retries one eligible timeout and then calls Gemini once", async () => {
    let openai = 0;
    let gemini = 0;
    const live = await attemptLiveChat({
      models: ["gpt-4o-mini"],
      openLive: async () => {
        openai += 1;
        throw timeout();
      },
      openGemini: async () => {
        gemini += 1;
        return { provider: "gemini" };
      },
    });
    assert.deepEqual(live, { provider: "gemini" });
    assert.equal(openai, 2);
    assert.equal(gemini, 1);
  });

  it("calls Gemini once for an outage status and not for auth or a missing result", async () => {
    for (const status of [408, 500, 502, 503, 504]) {
      let gemini = 0;
      const live = await attemptLiveChat({
        models: ["gpt-4o-mini"],
        openLive: async () => {
          throw statusError(status);
        },
        openGemini: async () => {
          gemini += 1;
          return { provider: "gemini" };
        },
      });
      assert.equal(live?.provider, "gemini", String(status));
      assert.equal(gemini, 1, String(status));
    }

    for (const status of [401, 403, 404, 429]) {
      let openai = 0;
      let gemini = 0;
      const live = await attemptLiveChat({
        models: ["gpt-4o-mini"],
        openLive: async () => {
          openai += 1;
          throw statusError(status);
        },
        openGemini: async () => {
          gemini += 1;
          return { provider: "gemini" };
        },
      });
      assert.equal(live, null, String(status));
      assert.equal(openai, 1, String(status));
      assert.equal(gemini, 0, String(status));
    }

    let gemini = 0;
    const empty = await attemptLiveChat({
      models: ["gpt-4o-mini"],
      openLive: async () => null,
      openGemini: async () => {
        gemini += 1;
        return { provider: "gemini" };
      },
    });
    assert.equal(empty, null);
    assert.equal(gemini, 0);
  });

  it("keeps a missing OpenAI key on the guide path", () => {
    const route = readFileSync(new URL("../../app/api/ai/chat/route.ts", import.meta.url), "utf8");
    const post = route.slice(route.indexOf("export async function POST"));
    const unconfigured = post.slice(post.indexOf("if (!apiKey)"), post.indexOf("const attempts"));
    assert.match(unconfigured, /buildGuideResponse/);
    assert.equal(unconfigured.includes("openGemini"), false);
    assert.equal(unconfigured.includes("attemptLiveChat"), false);
    assert.ok(post.indexOf("if (!apiKey)") < post.indexOf("attemptLiveChat"));
  });
});
