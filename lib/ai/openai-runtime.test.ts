import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { classifyProviderError } from "./gemini-model.ts";
import {
  DEFAULT_OPENAI_MODEL,
  completeText,
  iterateResponseText,
  openaiAttemptModels,
  readOpenAIKey,
  resolveOpenAIModel,
  shouldRetryProviderError,
} from "./openai-runtime.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("openai runtime", () => {
  it("uses gpt-4o-mini unless OPENAI_MODEL names another production model", () => {
    assert.equal(resolveOpenAIModel(undefined).model, DEFAULT_OPENAI_MODEL);
    assert.equal(resolveOpenAIModel("").model, DEFAULT_OPENAI_MODEL);
    assert.equal(resolveOpenAIModel("gemini-2.5-flash").model, DEFAULT_OPENAI_MODEL);
    assert.equal(resolveOpenAIModel("gemini-2.5-flash").remapped, true);
    assert.equal(resolveOpenAIModel("gpt-4.1-mini").model, "gpt-4.1-mini");
    assert.deepEqual(openaiAttemptModels(undefined), [DEFAULT_OPENAI_MODEL]);
    assert.deepEqual(openaiAttemptModels("gpt-4.1-mini"), ["gpt-4.1-mini", DEFAULT_OPENAI_MODEL]);
  });

  it("rejects a missing or placeholder key and does not return the key", () => {
    assert.equal(readOpenAIKey({}), null);
    assert.equal(readOpenAIKey({ OPENAI_API_KEY: "your-openai-key" }), null);
    assert.equal(readOpenAIKey({ OPENAI_API_KEY: "sk-test-fixture-key-123456" }), "sk-test-fixture-key-123456");
  });

  it("classifies OpenAI status codes and retries only transient failures", () => {
    const limited = Object.assign(new Error("busy"), { status: 429 });
    const missing = Object.assign(new Error("gone"), { status: 404 });
    const down = Object.assign(new Error("upstream"), { status: 500 });
    assert.equal(classifyProviderError(limited), "rate_limit");
    assert.equal(classifyProviderError(missing), "retired_model");
    assert.equal(classifyProviderError(down), "provider");
    assert.equal(shouldRetryProviderError(down), true);
    assert.equal(shouldRetryProviderError(limited), false);
    assert.equal(shouldRetryProviderError(missing), false);
  });

  it("joins response text deltas and ignores other events", async () => {
    async function* events() {
      yield { type: "response.created" };
      yield { type: "response.output_text.delta", delta: "Hel" };
      yield { type: "response.output_text.delta", delta: "lo" };
      yield { type: "response.completed" };
    }
    const seen: string[] = [];
    for await (const part of iterateResponseText(events())) seen.push(part);
    assert.deepEqual(seen, ["Hel", "lo"]);
  });

  it("sends instructions without storing the response and aborts on timeout", async () => {
    let seen: Record<string, unknown> | null = null;
    const text = await completeText({
      apiKey: "sk-test-fixture-key-123456",
      model: "gpt-4o-mini",
      instructions: "Stay on Jimvio help.",
      input: "Where are orders?",
      temperature: 0.2,
      maxOutputTokens: 40,
      create: async (body) => {
        seen = body as unknown as Record<string, unknown>;
        return { output_text: "Open /orders." };
      },
    });
    assert.equal(text, "Open /orders.");
    assert.equal(seen?.store, false);
    assert.equal(seen?.instructions, "Stay on Jimvio help.");
    assert.equal(JSON.stringify(seen).includes("sk-test-fixture"), false);

    const hang = completeText({
      apiKey: "sk-test-fixture-key-123456",
      model: "gpt-4o-mini",
      input: "hi",
      timeoutMs: 30,
      create: (_body, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        }),
    });
    // AbortSignal.timeout() does not keep the event loop alive. On Node 22 the
    // test runner then cancels the pending assertion before the abort fires.
    const keepAlive = setInterval(() => {}, 10);
    try {
      await assert.rejects(hang, /aborted/);
    } finally {
      clearInterval(keepAlive);
    }
  });

  it("keeps prompts and refuses to call Gemini from active entry points", () => {
    const files = [
      "app/api/ai/chat/route.ts",
      "app/api/ai/generate/route.ts",
      "app/api/ai/messages/optimize/route.ts",
      "app/api/ai/search/route.ts",
      "app/api/marketplace/shopping-assistant/route.ts",
      "lib/ai/ai-search-service.ts",
      "lib/ai/affiliate-gemini.ts",
      "lib/support/answer-question.ts",
    ];
    for (const file of files) {
      const source = readFileSync(join(root, file), "utf8");
      assert.equal(source.includes("@google/generative-ai"), false, file);
      assert.equal(source.includes("generativelanguage.googleapis.com"), false, file);
    }
    const chat = readFileSync(join(root, "app/api/ai/chat/route.ts"), "utf8");
    assert.match(chat, /JIMVIO_AI_SYSTEM_PROMPT/);
    assert.match(chat, /EARNING_GUIDE_SYSTEM_RULES/);
    assert.match(chat, /isConfidentialAiRequest/);
    assert.match(chat, /buildGuideResponse/);
    const support = readFileSync(join(root, "lib/support/answer-question.ts"), "utf8");
    assert.match(support, /Never invent payment status/);
    assert.match(support, /OPENAI_API_KEY|readOpenAIKey/);
    const shopping = readFileSync(join(root, "app/api/marketplace/shopping-assistant/route.ts"), "utf8");
    assert.match(shopping, /shoppingAssistantSystemPrompt/);
    assert.match(shopping, /rateLimit\(`shopping-assistant:/);
    const optimize = readFileSync(join(root, "app/api/ai/messages/optimize/route.ts"), "utf8");
    assert.match(optimize, /senior sourcing agent/);
    assert.match(optimize, /rateLimit\(`ai-optimize:/);
    const search = readFileSync(join(root, "lib/ai/ai-search-service.ts"), "utf8");
    assert.match(search, /Extract sourcing filters/);
    assert.match(search, /text-embedding-3-small|embedText/);
  });
});
