import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { jimvioAiAvailabilityLabel } from "./chat-shared.ts";
import {
  assistantActionLabel,
  completeAssistantTurn,
  failAssistantTurn,
  fallbackNotice,
  GUIDE_PREFIX,
  isAppOfflineError,
  isCurrentGeneration,
  isJimvioGuide,
  MODEL_UNAVAILABLE_REPLY,
  prepareChatTurn,
} from "./chat-turn.ts";
import {
  DEFAULT_GEMINI_MODEL,
  GEMINI_API_KEY_ENV,
  GEMINI_FALLBACK_MODEL,
  GEMINI_MODEL_ENV,
  classifyProviderError,
  geminiAttemptOrder,
  isUsableApiKey,
  iterateGeminiText,
  modelsFromListPayload,
  redactProviderMessage,
  resolveGeminiModel,
} from "./gemini-model.ts";
import { CLARIFYING_GUIDE, greetingReply, presentAssistantContent, PRIVATE_ACCOUNT_GUIDE } from "./guide-copy.ts";
import { buildGuideResponse } from "./guide-reply.ts";
import { composePublicGuide, retrieveJimvioKnowledge, verifiedGuideHrefs } from "./knowledge.ts";
import { stabilizeStreamingMarkdown } from "./markdown-stream.ts";
import { parseSseBuffer, sseChunk, sseDone, sseError, sseMode, streamNeedsFallback } from "./sse.ts";
import { clearRateLimitsForTests, rateLimit } from "../ops/rate-limit.ts";

const root = new URL("../../", import.meta.url);

describe("gemini sse parsing", () => {
  it("joins split chunks and stops on the finish event", () => {
    const payload = `${sseMode("live")}${sseChunk("Hel")}${sseChunk("lo")}${sseDone()}`;
    const splitAt = payload.indexOf("lo");
    const first = parseSseBuffer(payload.slice(0, splitAt));
    const second = parseSseBuffer(first.rest + payload.slice(splitAt));
    assert.equal(first.text + second.text, "Hello");
    assert.equal(second.done, true);
    assert.equal(second.fallback, false);
  });

  it("ignores malformed events and keeps a partial event buffered", () => {
    const partial = parseSseBuffer('data: {"choices":[{"delta":{"content":"Hi"}}]}\n\ndata: {not-json}\n\ndata: {"choi');
    assert.equal(partial.text, "Hi");
    assert.match(partial.rest, /choi/);
    assert.equal(partial.done, false);
  });

  it("reads provider error events without treating them as answer text", () => {
    const parsed = parseSseBuffer(`${sseError("rate_limit")}${sseDone()}`);
    assert.equal(parsed.text, "");
    assert.equal(parsed.errorCode, "rate_limit");
    assert.equal(parsed.done, true);
    assert.equal(streamNeedsFallback({ sawDone: true, fallback: false, errorCode: parsed.errorCode }), true);
    const partial = parseSseBuffer(`${sseMode("live")}${sseChunk("Partial")}${sseError("unavailable")}`);
    assert.equal(partial.text, "Partial");
    assert.equal(partial.done, false);
    assert.equal(
      streamNeedsFallback({ sawDone: partial.done, fallback: partial.fallback, errorCode: partial.errorCode }),
      true,
    );
    assert.equal(streamNeedsFallback({ sawDone: true, fallback: false }), false);
  });

  it("marks a guide stream as fallback and leaves an interrupted stream unfinished", () => {
    const guide = parseSseBuffer(
      `${sseMode("guide")}${sseChunk("This is a Jimvio earning guide. The live model did not answer this turn.\n\nOpen /orders.")}${sseDone()}`,
    );
    assert.equal(guide.fallback, true);
    assert.equal(guide.done, true);
    assert.match(guide.text, /\/orders/);
    const cut = parseSseBuffer(`${sseMode("live")}${sseChunk("Partial")}`);
    assert.equal(cut.done, false);
    assert.equal(cut.fallback, false);
    assert.equal(cut.text, "Partial");
    const malformed = parseSseBuffer("data: {not-json}\n\n");
    assert.equal(malformed.done, false);
    assert.equal(malformed.text, "");
    assert.equal(malformed.fallback, false);
  });

  it("keeps multibyte characters inside one JSON chunk", () => {
    const parsed = parseSseBuffer(`${sseChunk("Café — 日本語")}${sseDone()}`);
    assert.equal(parsed.text, "Café — 日本語");
  });
});

describe("chat turn ordering", () => {
  it("shows the customer message immediately and blocks a second send", () => {
    const first = prepareChatTurn({
      messages: [],
      text: "How do I sell?",
      busy: false,
      now: 10,
    });
    assert.equal(first.accepted, true);
    if (!first.accepted) return;
    assert.deepEqual(
      first.messages.map((message) => message.role),
      ["user", "ai"],
    );
    assert.equal(first.messages[0]?.content, "How do I sell?");
    assert.equal(first.messages[1]?.thinking, true);
    assert.equal(first.history.length, 0);

    const duplicate = prepareChatTurn({
      messages: first.messages,
      text: "How do I sell?",
      busy: true,
      now: 11,
    });
    assert.deepEqual(duplicate, { accepted: false, reason: "busy" });
  });

  it("retries the same customer message without duplicating it", () => {
    const start = prepareChatTurn({
      messages: [{ id: "1-user", role: "user", content: "Where is the wallet?" }],
      text: "",
      busy: false,
      now: 20,
      regenerateFromId: "1-ai",
    });
    assert.equal(start.accepted, false);

    const retry = prepareChatTurn({
      messages: [
        { id: "1-user", role: "user", content: "Where is the wallet?" },
        { id: "1-ai", role: "ai", content: "Checking.", thinking: false },
      ],
      text: "",
      busy: false,
      now: 21,
      regenerateFromId: "1-ai",
    });
    assert.equal(retry.accepted, true);
    if (!retry.accepted) return;
    assert.equal(retry.messages.filter((message) => message.role === "user").length, 1);
    assert.equal(retry.requestText, "Where is the wallet?");
    assert.equal(retry.messages.at(-1)?.thinking, true);
    assert.equal(retry.history.length, 0);
  });

  it("regenerates only the targeted reply and keeps earlier turns", () => {
    const turn = prepareChatTurn({
      messages: [
        { id: "u1", role: "user", content: "Where is the wallet?" },
        { id: "a1", role: "ai", content: "Open /wallet." },
        { id: "u2", role: "user", content: "Where are orders?" },
        { id: "a2", role: "ai", content: "Open /orders." },
      ],
      text: "",
      busy: false,
      now: 30,
      regenerateFromId: "a2",
    });
    assert.equal(turn.accepted, true);
    if (!turn.accepted) return;
    assert.deepEqual(
      turn.messages.map((message) => message.role),
      ["user", "ai", "user", "ai"],
    );
    assert.equal(turn.messages[0]?.content, "Where is the wallet?");
    assert.equal(turn.messages[1]?.content, "Open /wallet.");
    assert.equal(turn.requestText, "Where are orders?");
    assert.equal(turn.messages.filter((message) => message.role === "user").length, 2);
    assert.equal(turn.messages.at(-1)?.thinking, true);
    assert.equal(turn.messages.filter((message) => message.role === "ai").length, 2);
  });

  it("restores the previous answer when a retry fails before new text arrives", () => {
    const previous = { id: "a1", role: "ai" as const, content: "Open /wallet.", fallback: false };
    const started = prepareChatTurn({
      messages: [
        { id: "u1", role: "user", content: "Where is the wallet?" },
        previous,
      ],
      text: "",
      busy: false,
      now: 40,
      regenerateFromId: "a1",
    });
    assert.equal(started.accepted, true);
    if (!started.accepted) return;
    const failed = failAssistantTurn(started.messages, started.assistantId, {
      timedOut: true,
      previous,
    });
    assert.equal(failed[0]?.content, "Where is the wallet?");
    assert.equal(failed[1]?.content, "Open /wallet.");
    assert.equal(failed[1]?.fallback, true);
    assert.equal(failed[1]?.thinking, false);
    assert.equal(fallbackNotice(failed[1]?.content ?? ""), null);
    assert.equal(failed.filter((message) => message.role === "ai").length, 1);
  });

  it("keeps the question when the first reply fails", () => {
    const started = prepareChatTurn({
      messages: [],
      text: "Where is the wallet?",
      busy: false,
      now: 41,
    });
    assert.equal(started.accepted, true);
    if (!started.accepted) return;
    const failed = failAssistantTurn(started.messages, started.assistantId, {
      timedOut: false,
      previous: null,
    });
    assert.equal(failed[0]?.content, "Where is the wallet?");
    assert.equal(failed[1]?.content, MODEL_UNAVAILABLE_REPLY);
    assert.equal(failed[1]?.fallback, true);
    assert.equal(failed[1]?.thinking, false);
  });

  it("labels an empty completion as a guide and ignores a stale generation", () => {
    const started = prepareChatTurn({
      messages: [],
      text: "Where is the wallet?",
      busy: false,
      now: 42,
    });
    assert.equal(started.accepted, true);
    if (!started.accepted) return;
    const done = completeAssistantTurn(started.messages, started.assistantId, {
      content: "   ",
      fallback: false,
    });
    assert.equal(done[1]?.content, MODEL_UNAVAILABLE_REPLY);
    assert.equal(done[1]?.fallback, true);
    assert.equal(assistantActionLabel(true), "Retry");
    assert.equal(assistantActionLabel(false), "Regenerate");
    assert.equal(isCurrentGeneration(2, 2), true);
    assert.equal(isCurrentGeneration(3, 2), false);
  });

  it("keeps a live answer labeled for regenerate and a guide labeled for retry", () => {
    const started = prepareChatTurn({
      messages: [],
      text: "Where do sellers manage products?",
      busy: false,
      now: 43,
    });
    assert.equal(started.accepted, true);
    if (!started.accepted) return;
    const live = completeAssistantTurn(started.messages, started.assistantId, {
      content: "Sellers use /seller/products.",
      fallback: false,
    });
    assert.equal(live[1]?.fallback, false);
    assert.equal(assistantActionLabel(live[1]?.fallback), "Regenerate");
    const guide = completeAssistantTurn(started.messages, started.assistantId, {
      content: `${GUIDE_PREFIX}\n\nOpen /orders.`,
      fallback: true,
    });
    assert.equal(guide[1]?.fallback, true);
    assert.equal((guide[1]?.content ?? "").includes("not a live answer"), false);
    assert.equal(fallbackNotice(guide[1]?.content ?? ""), null);
    assert.equal(assistantActionLabel(guide[1]?.fallback), "Retry");
    assert.match(guide[1]?.content ?? "", /\/orders/);
  });

  it("uses one friendly message for timeout, rate limit, and an empty reply", () => {
    const started = prepareChatTurn({
      messages: [],
      text: "Where can I view my orders?",
      busy: false,
      now: 44,
    });
    assert.equal(started.accepted, true);
    if (!started.accepted) return;
    const timedOut = failAssistantTurn(started.messages, started.assistantId, {
      timedOut: true,
      previous: null,
    });
    const rejected = failAssistantTurn(started.messages, started.assistantId, {
      timedOut: false,
      previous: null,
    });
    assert.equal(timedOut[1]?.content, MODEL_UNAVAILABLE_REPLY);
    assert.equal(rejected[1]?.content, MODEL_UNAVAILABLE_REPLY);
    assert.equal(timedOut[0]?.content, "Where can I view my orders?");
    assert.equal(fallbackNotice(MODEL_UNAVAILABLE_REPLY), null);
    assert.equal(fallbackNotice("Partial"), "Jimvio AI couldn't finish this response. Please try again.");
    assert.equal(isJimvioGuide("This is a Jimvio earning guide. The live model did not answer."), true);
    assert.equal(isAppOfflineError(new TypeError("Failed to fetch")), true);
    assert.equal(isAppOfflineError(new Error("503 Service Unavailable")), false);
    const abort = new Error("aborted");
    abort.name = "AbortError";
    assert.equal(isAppOfflineError(abort), false);
  });
});

describe("jimvio ai availability label", () => {
  it("says Online while the app is up and Offline only when disconnected", () => {
    assert.equal(jimvioAiAvailabilityLabel("ready"), "Online");
    assert.equal(jimvioAiAvailabilityLabel("streaming"), "Responding");
    assert.equal(jimvioAiAvailabilityLabel("thinking"), "Thinking");
    assert.equal(jimvioAiAvailabilityLabel("offline"), "Offline");
    const header = readFileSync(new URL("components/copilot/JimvioCopilot.tsx", root), "utf8");
    const footer = readFileSync(new URL("components/ai/AiComposer.tsx", root), "utf8");
    assert.match(header, /jimvioAiAvailabilityLabel/);
    assert.equal(header.includes('"Ready"'), false);
    assert.match(footer, /jimvio-ai-footer/);
    assert.match(footer, /text-\[10px\]/);
    assert.match(footer, /text-center/);
    assert.equal(footer.includes("sm:text-xs"), false);
  });
});

describe("streaming markdown", () => {
  it("closes an unfinished fence and bold marker", () => {
    const stable = stabilizeStreamingMarkdown("**Steps\n```ts\nconst x = 1");
    assert.equal((stable.match(/```/g) ?? []).length % 2, 0);
    assert.equal((stable.match(/\*\*/g) ?? []).length % 2, 0);
  });

  it("leaves complete markdown unchanged aside from null bytes", () => {
    const source = "**Done**\n\n- one\n\n```js\nconst ok = true\n```";
    assert.equal(stabilizeStreamingMarkdown(source), source);
  });
});

describe("jimvio knowledge", () => {
  it("grounds marketplace and wallet answers in real routes", () => {
    const market = retrieveJimvioKnowledge("How do I list a product on the marketplace?");
    assert.match(market, /\/marketplace/);
    assert.match(market, /\/seller\/products/);
    const wallet = retrieveJimvioKnowledge("Where are wallet withdrawals?");
    assert.match(wallet, /\/wallet\/withdrawals/);
    assert.equal(market.includes("%"), false);
  });

  it("answers the product question matrix from real routes", () => {
    const orders = retrieveJimvioKnowledge("Where can I view my orders?");
    assert.match(orders, /\/orders/);
    assert.match(orders, /\/commerce\/orders/);
    assert.equal(orders.includes("tracking number"), true);
    const affiliate = retrieveJimvioKnowledge("When are affiliate commissions eligible for payout?");
    assert.match(affiliate, /\/affiliates\/payouts/);
    assert.match(affiliate, /Do not quote a percentage/);
    const ugc = retrieveJimvioKnowledge("How do I submit UGC campaign content?");
    assert.match(ugc, /\/ugc\/submissions/);
    const verification = retrieveJimvioKnowledge("What does a rejected identity verification mean?");
    assert.match(verification, /\/identity\/verification/);
    assert.match(verification, /cannot confirm verification/);
    const wallet = retrieveJimvioKnowledge("What should I do when a payment fails?");
    assert.match(wallet, /\/wallet\/transactions/);
    assert.match(wallet, /Do not claim a payment/);
  });

  it("refuses to invent an unverified feature", () => {
    const unknown = retrieveJimvioKnowledge("Does Jimvio have a Mars colony shipping perk?");
    assert.match(unknown, /clarifying question/i);
    assert.equal(unknown.includes("/mars"), false);
  });
});

const INTERNAL_LEAK =
  /Say you cannot verify|Do not invent|Do not quote|Do not claim|Unverified words:|No verified Jimvio article|Related public facts:|I can't see this account, its orders, payments, or verification from chat|Internal note, not a customer answer/i;

function markdownHrefs(text: string): string[] {
  return [...text.matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1] ?? "");
}

describe("public guide wording", () => {
  const allowed = new Set(verifiedGuideHrefs());
  const prohibited = /not a live answer|couldn't verify that information|check the relevant Jimvio page or contact support before relying on it/i;

  it("welcomes a greeting without a product essay or a disclaimer", () => {
    for (const message of ["hi", "hello", "hey", "good morning", "how are you?"]) {
      const reply = buildGuideResponse([{ content: message }]);
      assert.match(reply, /Welcome to Jimvio/);
      assert.equal(prohibited.test(reply), false);
      assert.equal(reply.includes("Welcome to Jimvio AI"), false);
    }
    assert.match(greetingReply("hi"), /selling products/);
  });

  it("hides internal instructions and raw fallback templates", () => {
    const leaked = buildGuideResponse([
      { content: "Does Jimvio have a Mars colony shipping perk?" },
    ]);
    assert.equal(INTERNAL_LEAK.test(leaked), false);
    assert.equal(leaked.includes("couldn't verify"), false);
    assert.equal(leaked.includes("not a live answer"), false);
    assert.equal(leaked.includes("/mars"), false);
    assert.deepEqual(markdownHrefs(leaked), []);
    assert.equal(leaked.split(GUIDE_PREFIX).length - 1, 0);
    assert.equal(/gemini/i.test(leaked), false);
    assert.match(leaked, /I can help you with that on Jimvio/);

    const raw = presentAssistantContent(
      `${GUIDE_PREFIX}\n\n${GUIDE_PREFIX}\n\nNo verified Jimvio article covers this exact question. Say you cannot verify that feature, fee, or policy. Do not invent a page or a number.`,
    );
    assert.equal(INTERNAL_LEAK.test(raw), false);
    assert.equal(raw.includes("couldn't verify"), false);
    assert.equal(raw.split(GUIDE_PREFIX).length - 1, 0);
    assert.equal(raw, CLARIFYING_GUIDE);
  });

  it("answers an unverified feature and a private account question in natural words", () => {
    const feature = composePublicGuide("Does Jimvio have a Mars colony shipping perk?");
    assert.equal(feature, CLARIFYING_GUIDE);
    assert.equal(feature.includes("couldn't verify"), false);
    assert.equal(feature.includes("%"), false);
    assert.equal(feature.includes("$"), false);

    const account = buildGuideResponse([
      { content: "Was my identity verification approved?" },
    ]);
    assert.match(account, /can't access your private account details/);
    assert.match(account, /\/identity\/verification/);
    assert.equal(account.includes(PRIVATE_ACCOUNT_GUIDE) || /can't access your private account details/.test(account), true);
    assert.equal(/approved your|your verification is/i.test(account), false);
    assert.equal(INTERNAL_LEAK.test(account), false);
    for (const href of markdownHrefs(account)) {
      assert.equal(allowed.has(href), true, href);
    }
    assert.equal(account.split(GUIDE_PREFIX).length - 1, 0);
    assert.equal(account.includes("not a live answer"), false);
  });

  it("uses a verified route for a documented question and keeps live answers unlabeled", () => {
    const orders = buildGuideResponse([{ content: "Where can I view my orders?" }]);
    assert.match(orders, /\/orders/);
    assert.equal(INTERNAL_LEAK.test(orders), false);
    assert.equal(orders.includes("couldn't verify"), false);
    for (const href of markdownHrefs(orders)) assert.equal(allowed.has(href), true, href);
    assert.equal(orders.split(GUIDE_PREFIX).length - 1, 0);
    assert.equal(orders.includes("not a live answer"), false);

    const live = "Sellers manage listings at /seller/products.";
    assert.equal(isJimvioGuide(live), false);
    assert.equal(presentAssistantContent(live), live);
    assert.equal(assistantActionLabel(false), "Regenerate");
    assert.equal(assistantActionLabel(true), "Retry");
  });

  it("stores a scrubbed guide without dropping a previous answer on failure", () => {
    const started = prepareChatTurn({ messages: [], text: "Where can I view my orders?", busy: false, now: 5 });
    assert.equal(started.accepted, true);
    if (!started.accepted) return;
    const done = completeAssistantTurn(started.messages, started.assistantId, {
      content: `${GUIDE_PREFIX}\n\nNo verified Jimvio article covers this exact question. Unverified words: mars. Say you cannot verify that feature, fee, or policy. Do not invent a page or a number.\n\nI can't see this account, its orders, payments, or verification from chat.`,
      fallback: true,
    });
    const content = done[1]?.content ?? "";
    assert.equal(INTERNAL_LEAK.test(content), false);
    assert.equal(content.includes("couldn't verify"), false);
    assert.equal(content.includes("not a live answer"), false);
    assert.match(content, /private account details|I can help you/);
    assert.equal(done[1]?.fallback, true);
    assert.equal(assistantActionLabel(done[1]?.fallback), "Retry");

    const previous = done[1];
    const retry = prepareChatTurn({
      messages: done,
      text: "",
      busy: false,
      now: 6,
      regenerateFromId: started.assistantId,
    });
    assert.equal(retry.accepted, true);
    if (!retry.accepted) return;
    assert.equal(retry.requestText, "Where can I view my orders?");
    assert.equal(retry.messages.filter((message) => message.role === "user").length, 1);
    const preserved = failAssistantTurn(retry.messages, retry.assistantId, { timedOut: false, previous });
    assert.equal(preserved.find((message) => message.id === retry.assistantId)?.content, content);
    assert.equal(preserved.filter((message) => message.role === "user").length, 1);
  });
});

describe("gemini configuration", () => {
  it("uses Flash-Lite and remaps retired models", () => {
    assert.equal(resolveGeminiModel(undefined).model, DEFAULT_GEMINI_MODEL);
    assert.equal(DEFAULT_GEMINI_MODEL, "gemini-2.5-flash-lite");
    assert.equal(GEMINI_FALLBACK_MODEL, "gemini-2.5-flash");
    assert.equal(resolveGeminiModel("gemini-2.0-flash").model, DEFAULT_GEMINI_MODEL);
    assert.equal(resolveGeminiModel("gemini-2.0-flash").remapped, true);
    assert.equal(GEMINI_API_KEY_ENV, "GOOGLE_GENERATIVE_AI_API_KEY");
    assert.equal(GEMINI_MODEL_ENV, "GEMINI_MODEL");
  });

  it("rejects missing and placeholder keys", () => {
    assert.equal(isUsableApiKey(undefined), false);
    assert.equal(isUsableApiKey("xxx"), false);
    assert.equal(isUsableApiKey("your-gemini-key"), false);
    assert.equal(isUsableApiKey("AIzaSyEXAMPLEKEY123456"), true);
  });

  it("selects only models the key can generate with", () => {
    const available = modelsFromListPayload({
      models: [
        { name: "models/gemini-2.5-flash-lite", supportedGenerationMethods: ["generateContent"] },
        { name: "models/gemini-2.5-flash", supportedGenerationMethods: ["generateContent"] },
        { name: "models/gemini-embedding", supportedGenerationMethods: ["embedContent"] },
      ],
    });
    assert.deepEqual(geminiAttemptOrder(available, "gemini-2.5-flash-lite"), [
      "gemini-2.5-flash-lite",
      "gemini-2.5-flash",
    ]);
    assert.deepEqual(geminiAttemptOrder(["gemini-2.5-flash"], "gemini-2.5-flash-lite"), ["gemini-2.5-flash"]);
    assert.deepEqual(geminiAttemptOrder([], "gemini-2.5-flash"), []);
  });

  it("joins multiple upstream text chunks", async () => {
    async function* parts() {
      yield { text: () => "Hel" };
      yield { text: () => "lo" };
      yield { text: () => " there" };
    }
    const seen: string[] = [];
    for await (const part of iterateGeminiText(parts())) seen.push(part);
    assert.deepEqual(seen, ["Hel", "lo", " there"]);
  });

  it("classifies model, permission, quota, and timeout errors without keeping secrets", () => {
    assert.equal(classifyProviderError(new Error("404 Not Found This model is not found")), "retired_model");
    assert.equal(classifyProviderError(new Error("403 permission denied")), "authentication");
    assert.equal(classifyProviderError(new Error("429 quota exceeded")), "rate_limit");
    assert.equal(classifyProviderError(new Error("503 Service Unavailable high demand")), "rate_limit");
    const timeout = new Error("timed out");
    timeout.name = "TimeoutError";
    assert.equal(classifyProviderError(timeout), "timeout");
    const redacted = redactProviderMessage(new Error("bad key=AIzaSySECRETVALUE123456"));
    assert.equal(redacted.includes("AIza"), false);
    assert.equal(redacted.includes("key=[redacted]"), true);
  });
});

describe("copilot route safety", () => {
  it("keeps Gemini, rate limits, and does not fall back to another provider", () => {
    const route = readFileSync(new URL("app/api/ai/chat/route.ts", root), "utf8");
    const guardAt = route.indexOf("isConfidentialAiRequest");
    const greetingAt = route.indexOf("isSimpleGreeting");
    const geminiAt = route.indexOf("openGeminiResponse(messages");
    assert.ok(guardAt > 0 && greetingAt > guardAt && geminiAt > greetingAt);
    assert.match(route, /rateLimit\(`ai-chat:/);
    assert.match(route, /geminiAttemptOrder/);
    assert.match(route, /listAccessibleGeminiModels/);
    const catalog = readFileSync(new URL("lib/ai/gemini-catalog.ts", root), "utf8");
    assert.match(catalog, /v1beta\/models/);
    assert.match(route, /category: "fallback"|\"fallback\"/);
    assert.match(route, /buildGuideResponse\(messages\), "guide"/);
    const guideReply = readFileSync(new URL("lib/ai/guide-reply.ts", root), "utf8");
    assert.match(guideReply, /isSimpleGreeting/);
    assert.match(guideReply, /composePublicGuide/);
    assert.equal(guideReply.includes("This is not a live answer"), false);
    assert.equal(route.includes("The live model did not answer"), false);
    assert.equal(route.includes("Say you cannot verify"), false);
    assert.equal(route.includes("I can't see this account"), false);
    assert.equal(route.includes("X-Jimvio-AI-Model"), true);
    const guideModelHeader = route.slice(route.indexOf("function streamText"), route.indexOf("function remember"));
    assert.equal(guideModelHeader.includes("X-Jimvio-AI-Model"), false);
    assert.equal(route.includes("openai"), false);
    assert.equal(route.includes("OPENAI"), false);
    assert.equal(route.includes("service_role"), false);
    assert.equal(route.includes("body.userId"), false);
    assert.equal(route.includes("@/lib/supabase"), false);
    assert.match(route, /sseError\("unavailable"\)/);
    assert.match(route, /if \(failed\)/);
  });

  it("wraps long text in the message renderer", () => {
    const markdown = readFileSync(new URL("components/marketplace/ai/ai-message-markdown.tsx", root), "utf8");
    const bubble = readFileSync(new URL("components/marketplace/ai/ai-chat-message.tsx", root), "utf8");
    assert.match(markdown, /overflow-wrap:anywhere/);
    assert.match(markdown, /whitespace-pre-wrap/);
    assert.match(bubble, /overflow-wrap:anywhere/);
    assert.match(bubble, /stabilizeStreamingMarkdown/);
    assert.match(bubble, /presentAssistantContent/);
    assert.match(bubble, /actionsDisabled/);
    assert.match(bubble, /Retry this answer/);
    const experience = readFileSync(new URL("components/ai/JimvioAiExperience.tsx", root), "utf8");
    const hook = readFileSync(new URL("components/copilot/use-copilot-chat.ts", root), "utf8");
    assert.match(experience, /actionsDisabled=\{isSending\}/);
    assert.match(hook, /failAssistantTurn/);
    assert.match(hook, /isCurrentGeneration/);
    assert.match(hook, /sendingRef\.current\) return false/);
  });
});

describe("ai chat rate limit", () => {
  it("stops accepting after the window is exhausted", () => {
    clearRateLimitsForTests();
    for (let i = 0; i < 20; i += 1) {
      assert.equal(rateLimit("ai-chat:test", 20, 60_000, 1_000).allowed, true);
    }
    assert.equal(rateLimit("ai-chat:test", 20, 60_000, 1_000).allowed, false);
    clearRateLimitsForTests();
  });
});
