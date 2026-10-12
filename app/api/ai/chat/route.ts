import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { CONFIDENTIAL_AI_REFUSAL, isConfidentialAiRequest } from "@/lib/ai/ai-guard";
import {
  AI_CACHE_TTL_MS,
  JIMVIO_AI_SYSTEM_PROMPT,
  buildCacheKey,
  trimChatHistory,
  type ChatMessage,
} from "@/lib/ai/chat-shared";
import { EARNING_GUIDE_SYSTEM_RULES } from "@/lib/ai/earning-guide";
import {
  GEMINI_API_KEY_ENV,
  GEMINI_MODEL_ENV,
  classifyProviderError,
  geminiAttemptOrder,
  isUsableApiKey,
  iterateGeminiText,
  modelsFromListPayload,
  redactProviderMessage,
  type GeminiFailureCategory,
} from "@/lib/ai/gemini-model";
import { greetingReply, isSimpleGreeting } from "@/lib/ai/guide-copy";
import { buildGuideResponse } from "@/lib/ai/guide-reply";
import { buildGroundedPrompt } from "@/lib/ai/knowledge";
import { sseChunk, sseDone, sseError, sseMode } from "@/lib/ai/sse";
import { rateLimit } from "@/lib/ops/rate-limit";

const FIRST_TOKEN_MS = 18_000;
const STREAM_DEADLINE_MS = 28_000;
const MAX_OUTPUT_CHARS = 12_000;
const MAX_MESSAGE_CHARS = 2_000;

const responseCache = new Map<string, { text: string; mode: "live" | "guide"; ts: number }>();

type AiFailureCategory = GeminiFailureCategory;

let modelCatalog: { at: number; models: string[] } | null = null;

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "anon"
  );
}

function logAiResult(
  category: AiFailureCategory,
  extra?: { model?: string; chunks?: number; detail?: string },
) {
  console.warn("[Jimvio AI] provider result", {
    provider: "gemini",
    category,
    model: extra?.model,
    chunks: extra?.chunks,
    detail: extra?.detail,
  });
}

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const error = new Error("The model timed out");
      error.name = "TimeoutError";
      reject(error);
    }, ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function streamText(text: string, mode: "live" | "guide" = "guide") {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(sseMode(mode)));
      controller.enqueue(encoder.encode(sseChunk(text)));
      controller.enqueue(encoder.encode(sseDone()));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Jimvio-AI-Mode": mode,
    },
  });
}

function remember(cacheKey: string, text: string, mode: "live" | "guide") {
  responseCache.set(cacheKey, { text, mode, ts: Date.now() });
  if (responseCache.size > 200) {
    const oldest = [...responseCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) responseCache.delete(oldest[0]);
  }
}

async function accessibleGeminiModels(key: string): Promise<{ models: string[]; category?: AiFailureCategory; detail?: string }> {
  if (modelCatalog && Date.now() - modelCatalog.at < 10 * 60_000) {
    return { models: modelCatalog.models };
  }
  try {
    const models: string[] = [];
    let pageToken = "";
    for (let page = 0; page < 3; page += 1) {
      const url = new URL("https://generativelanguage.googleapis.com/v1beta/models");
      url.searchParams.set("pageSize", "100");
      url.searchParams.set("key", key);
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const response = await withTimeout(fetch(url), 8_000);
      const payload = await response.json().catch(() => null) as { nextPageToken?: string; error?: { message?: string } } | null;
      if (!response.ok) {
        const message = redactProviderMessage(new Error(payload?.error?.message || String(response.status)));
        const category = response.status === 429 ? "rate_limit" : response.status === 401 || response.status === 403 ? "authentication" : "provider";
        return { models: [], category, detail: message };
      }
      models.push(...modelsFromListPayload(payload));
      pageToken = payload?.nextPageToken ?? "";
      if (!pageToken) break;
    }
    modelCatalog = { at: Date.now(), models };
    return { models };
  } catch (error) {
    return { models: [], category: classifyProviderError(error), detail: redactProviderMessage(error) };
  }
}

/**
 * Opens the Gemini stream and forwards each text part as SSE.
 * Returns null when Gemini produces nothing, so the caller can send the guide.
 */
async function openGeminiResponse(messages: ChatMessage[], modelName: string, cacheKey: string): Promise<Response | null> {
  const geminiKey = process.env[GEMINI_API_KEY_ENV];
  if (!isUsableApiKey(geminiKey)) {
    logAiResult("unconfigured");
    return null;
  }

  const lastMessage = messages[messages.length - 1]?.content ?? "";
  const genAI = new GoogleGenerativeAI(geminiKey!);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: {
      role: "system",
      parts: [{ text: buildGroundedPrompt(`${JIMVIO_AI_SYSTEM_PROMPT}\n\n${EARNING_GUIDE_SYSTEM_RULES}`, lastMessage) }],
    },
    generationConfig: {
      maxOutputTokens: 700,
      temperature: 0.4,
    },
  });

  const history = messages.slice(0, -1).map((item) => ({
    role: item.role === "assistant" ? "model" : "user",
    parts: [{ text: item.content.slice(0, MAX_MESSAGE_CHARS) }],
  }));
  while (history[0]?.role === "model") history.shift();

  let stream: AsyncIterable<{ text(): string }>;
  try {
    const result = await withTimeout(
      model.startChat({ history }).sendMessageStream(lastMessage.slice(0, MAX_MESSAGE_CHARS)),
      FIRST_TOKEN_MS,
    );
    stream = result.stream;
  } catch (error) {
    logAiResult(error instanceof Error && error.name === "EmptyOutput" ? "empty_output" : classifyProviderError(error), {
      model: modelName,
      detail: redactProviderMessage(error),
    });
    return null;
  }

  const iterator = iterateGeminiText(stream)[Symbol.asyncIterator]();
  let first = "";
  try {
    const deadline = Date.now() + FIRST_TOKEN_MS;
    while (!first && Date.now() < deadline) {
      const step = await withTimeout(iterator.next(), Math.max(1_000, deadline - Date.now()));
      if (step.done) break;
      first += step.value ?? "";
    }
  } catch (error) {
    logAiResult(classifyProviderError(error), { model: modelName, detail: redactProviderMessage(error) });
    return null;
  }

  if (!first.trim()) {
    logAiResult("empty_output", { model: modelName });
    return null;
  }

  const encoder = new TextEncoder();
  let accumulated = first;
  let chunks = 1;
  const body = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(sseMode("live")));
      controller.enqueue(encoder.encode(sseChunk(first)));
      const started = Date.now();
      let failed = false;
      try {
        while (accumulated.length < MAX_OUTPUT_CHARS && Date.now() - started < STREAM_DEADLINE_MS) {
          const step = await iterator.next();
          if (step.done) break;
          const next = step.value;
          if (!next) continue;
          chunks += 1;
          accumulated += next;
          controller.enqueue(encoder.encode(sseChunk(next)));
        }
        const finalText = accumulated.trim();
        if (finalText) remember(cacheKey, finalText, "live");
        logAiResult("success", { model: modelName, chunks });
      } catch (error) {
        failed = true;
        logAiResult(classifyProviderError(error), { model: modelName, detail: redactProviderMessage(error) });
      } finally {
        if (failed) controller.enqueue(encoder.encode(sseError("unavailable")));
        else controller.enqueue(encoder.encode(sseDone()));
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Jimvio-AI-Mode": "live",
      "X-Jimvio-AI-Model": modelName,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(`ai-chat:${clientIp(req)}`, 20, 60_000);
    if (!limited.allowed) {
      return streamText("Jimvio AI is receiving too many messages right now. Wait a moment, then send this again.", "guide");
    }

    const rawBody = await req.text();
    if (rawBody.length > 80_000) {
      return streamText("That conversation is too long to send. Start a shorter question and try again.", "guide");
    }

    let body: { messages?: ChatMessage[] } = {};
    try {
      body = JSON.parse(rawBody) as { messages?: ChatMessage[] };
    } catch {
      return streamText("Jimvio AI could not read that message. Try sending it again.", "guide");
    }

    const rawMessages = Array.isArray(body.messages) ? body.messages : [];
    if (!rawMessages.length) {
      return new Response(JSON.stringify({ error: "No messages provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const messages = trimChatHistory(
      rawMessages.map((item) => ({
        role: item.role,
        content: String(item.content ?? "").slice(0, MAX_MESSAGE_CHARS),
      })),
    );
    if (!messages.length) {
      return new Response(JSON.stringify({ error: "No messages provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (messages.some((item) => isConfidentialAiRequest(item.content))) {
      return streamText(CONFIDENTIAL_AI_REFUSAL, "guide");
    }

    const latest = messages[messages.length - 1]?.content ?? "";
    if (isSimpleGreeting(latest)) {
      return streamText(greetingReply(latest), "live");
    }

    const cacheKey = buildCacheKey(messages);
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < AI_CACHE_TTL_MS) {
      return streamText(cached.text, cached.mode);
    }

    const geminiKey = process.env[GEMINI_API_KEY_ENV];
    if (!isUsableApiKey(geminiKey)) {
      logAiResult("unconfigured");
      logAiResult("fallback", { detail: "unconfigured" });
      return streamText(buildGuideResponse(messages), "guide");
    }

    const catalog = await accessibleGeminiModels(geminiKey!);
    if (catalog.category) {
      logAiResult(catalog.category, { detail: catalog.detail });
      logAiResult("fallback", { detail: catalog.category });
      return streamText(buildGuideResponse(messages), "guide");
    }

    const attempts = geminiAttemptOrder(catalog.models, process.env[GEMINI_MODEL_ENV]);
    if (!attempts.length) {
      logAiResult("retired_model", { detail: "no generateContent model in models.list" });
      logAiResult("fallback", { detail: "no_accessible_model" });
      return streamText(buildGuideResponse(messages), "guide");
    }

    for (const modelName of attempts) {
      const live = await openGeminiResponse(messages, modelName, cacheKey);
      if (live) return live;
    }

    logAiResult("fallback", { detail: "models_failed", model: attempts.join(",") });
    return streamText(buildGuideResponse(messages), "guide");
  } catch {
    console.error("[Jimvio AI] Critical error");
    return streamText("Jimvio AI is unavailable right now. Your message is still here. Try again in a moment.", "guide");
  }
}
