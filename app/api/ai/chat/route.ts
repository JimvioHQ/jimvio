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
import { EARNING_GUIDE_SYSTEM_RULES, buildEarningGuideReply } from "@/lib/ai/earning-guide";
import {
  GEMINI_API_KEY_ENV,
  GEMINI_FALLBACK_MODEL,
  isUsableApiKey,
  resolveGeminiModel,
} from "@/lib/ai/gemini-model";
import { buildGroundedPrompt } from "@/lib/ai/knowledge";
import { sseChunk, sseDone, sseMode } from "@/lib/ai/sse";
import { rateLimit } from "@/lib/ops/rate-limit";

const FIRST_TOKEN_MS = 18_000;
const STREAM_DEADLINE_MS = 28_000;
const MAX_OUTPUT_CHARS = 12_000;
const MAX_MESSAGE_CHARS = 2_000;

const responseCache = new Map<string, { text: string; mode: "live" | "guide"; ts: number }>();

type AiFailureCategory =
  | "unconfigured"
  | "authentication"
  | "rate_limit"
  | "timeout"
  | "empty_output"
  | "malformed"
  | "retired_model"
  | "provider";

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "anon"
  );
}

function redactProviderMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  return raw.replace(/AIza[\w-]*/g, "[redacted]").replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]").slice(0, 180);
}

function classifyProviderError(error: unknown): AiFailureCategory {
  const name = error instanceof Error ? error.name : "";
  const message = redactProviderMessage(error);
  if (name === "TimeoutError" || name === "AbortError" || /timeout|timed out|aborted/i.test(message)) return "timeout";
  if (/429|rate limit|resource exhausted|quota|insufficient_quota/i.test(message)) return "rate_limit";
  if (/api_key_invalid|api key expired|invalid api key|unauthenticated|permission denied|401|403/i.test(message)) {
    return "authentication";
  }
  if (/not found|deprecated|no longer available|retired/i.test(message)) return "retired_model";
  if (/unexpected token|malformed|invalid json/i.test(message)) return "malformed";
  return "provider";
}

function logAiFailure(provider: string, category: AiFailureCategory, error?: unknown) {
  console.warn("[Jimvio AI] provider result", {
    provider,
    category,
    detail: error ? redactProviderMessage(error) : undefined,
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

function buildGuideResponse(messages: ChatMessage[]): string {
  const last = messages[messages.length - 1]?.content ?? "";
  const history = messages.slice(0, -1).map((item) => item.content);
  return `This is a Jimvio earning guide. The live model did not answer this turn.\n\n${buildEarningGuideReply(last, history)}`;
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

/**
 * Opens the Gemini stream and forwards each text part as SSE.
 * Returns null when Gemini produces nothing, so the caller can send the guide.
 */
async function openGeminiResponse(messages: ChatMessage[], modelName: string, cacheKey: string): Promise<Response | null> {
  const geminiKey = process.env[GEMINI_API_KEY_ENV];
  if (!isUsableApiKey(geminiKey)) {
    logAiFailure("gemini", "unconfigured");
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
    logAiFailure("gemini", error instanceof Error && error.name === "EmptyOutput" ? "empty_output" : classifyProviderError(error), error);
    return null;
  }

  const iterator = stream[Symbol.asyncIterator]();
  let first = "";
  try {
    const deadline = Date.now() + FIRST_TOKEN_MS;
    while (!first && Date.now() < deadline) {
      const step = await withTimeout(iterator.next(), Math.max(1_000, deadline - Date.now()));
      if (step.done) break;
      first += step.value.text() ?? "";
    }
  } catch (error) {
    logAiFailure("gemini", classifyProviderError(error), error);
    return null;
  }

  if (!first.trim()) {
    logAiFailure("gemini", "empty_output");
    return null;
  }

  const encoder = new TextEncoder();
  let accumulated = first;
  const body = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(sseMode("live")));
      controller.enqueue(encoder.encode(sseChunk(first)));
      const started = Date.now();
      try {
        while (accumulated.length < MAX_OUTPUT_CHARS && Date.now() - started < STREAM_DEADLINE_MS) {
          const step = await iterator.next();
          if (step.done) break;
          const next = step.value.text();
          if (!next) continue;
          accumulated += next;
          controller.enqueue(encoder.encode(sseChunk(next)));
        }
        const finalText = accumulated.trim();
        if (finalText) remember(cacheKey, finalText, "live");
      } catch (error) {
        logAiFailure("gemini", classifyProviderError(error), error);
      } finally {
        controller.enqueue(encoder.encode(sseDone()));
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

    const cacheKey = buildCacheKey(messages);
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < AI_CACHE_TTL_MS) {
      return streamText(cached.text, cached.mode);
    }

    const gemini = resolveGeminiModel();
    if (gemini.remapped) logAiFailure("gemini", "retired_model");

    const live = await openGeminiResponse(messages, gemini.model, cacheKey);
    if (live) return live;

    if (gemini.model !== GEMINI_FALLBACK_MODEL) {
      logAiFailure("gemini", "retired_model");
      const retry = await openGeminiResponse(messages, GEMINI_FALLBACK_MODEL, cacheKey);
      if (retry) return retry;
    }

    return streamText(buildGuideResponse(messages), "guide");
  } catch {
    console.error("[Jimvio AI] Critical error");
    return streamText("Jimvio AI is unavailable right now. Your message is still here. Try again in a moment.", "guide");
  }
}
