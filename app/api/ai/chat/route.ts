import { NextRequest } from "next/server";
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
  classifyProviderError,
  redactProviderMessage,
  type GeminiFailureCategory,
} from "@/lib/ai/gemini-model";
import { greetingReply, isSimpleGreeting } from "@/lib/ai/guide-copy";
import { buildGuideResponse } from "@/lib/ai/guide-reply";
import { buildGroundedPrompt } from "@/lib/ai/knowledge";
import {
  openaiAttemptModels,
  openResponseStream,
  readOpenAIKey,
  shouldRetryProviderError,
  type ModelTurn,
} from "@/lib/ai/openai-runtime";
import { sseChunk, sseDone, sseError, sseMode } from "@/lib/ai/sse";
import { verifyAffiliatePromotionTask } from "@/lib/ai/affiliate-task-token";
import { rateLimit } from "@/lib/ops/rate-limit";

const FIRST_TOKEN_MS = 18_000;
const STREAM_DEADLINE_MS = 28_000;
const MAX_OUTPUT_CHARS = 12_000;
const MAX_MESSAGE_CHARS = 2_000;

const responseCache = new Map<string, { text: string; mode: "live" | "guide"; ts: number }>();

type AiFailureCategory = GeminiFailureCategory;

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
    provider: "openai",
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

function toModelInput(messages: ChatMessage[]): ModelTurn[] {
  const history: ModelTurn[] = messages.slice(0, -1).map((item) => ({
    role: item.role === "assistant" ? "assistant" : "user",
    content: item.content.slice(0, MAX_MESSAGE_CHARS),
  }));
  while (history[0]?.role === "assistant") history.shift();
  history.push({
    role: "user",
    content: (messages[messages.length - 1]?.content ?? "").slice(0, MAX_MESSAGE_CHARS),
  });
  return history;
}

/**
 * Opens the OpenAI stream and forwards each text part as SSE.
 * Returns null when the model produces nothing, so the caller can send the guide.
 */
async function openLiveResponse(
  messages: ChatMessage[],
  modelName: string,
  cacheKey: string,
  productAddendum?: string,
): Promise<Response | null> {
  const apiKey = readOpenAIKey();
  if (!apiKey) {
    logAiResult("unconfigured");
    return null;
  }

  const lastMessage = messages[messages.length - 1]?.content ?? "";
  const grounded = buildGroundedPrompt(`${JIMVIO_AI_SYSTEM_PROMPT}\n\n${EARNING_GUIDE_SYSTEM_RULES}`, lastMessage);
  const systemText = productAddendum
    ? `${grounded}\n\n${productAddendum.slice(0, 3500)}`
    : grounded;

  const controller = new AbortController();
  const hardStop = setTimeout(() => controller.abort(), FIRST_TOKEN_MS + STREAM_DEADLINE_MS);
  let iterator: AsyncIterator<string>;
  try {
    const stream = await openResponseStream({
      apiKey,
      model: modelName,
      instructions: systemText,
      input: toModelInput(messages),
      temperature: 0.4,
      maxOutputTokens: 700,
      timeoutMs: FIRST_TOKEN_MS + STREAM_DEADLINE_MS,
      signal: controller.signal,
    });
    iterator = stream[Symbol.asyncIterator]();
  } catch (error) {
    clearTimeout(hardStop);
    controller.abort();
    logAiResult(error instanceof Error && error.name === "EmptyOutput" ? "empty_output" : classifyProviderError(error), {
      model: modelName,
      detail: redactProviderMessage(error),
    });
    throw error;
  }

  let first = "";
  try {
    const deadline = Date.now() + FIRST_TOKEN_MS;
    while (!first && Date.now() < deadline) {
      const step = await withTimeout(iterator.next(), Math.max(1_000, deadline - Date.now()));
      if (step.done) break;
      first += step.value ?? "";
    }
  } catch (error) {
    clearTimeout(hardStop);
    controller.abort();
    logAiResult(classifyProviderError(error), { model: modelName, detail: redactProviderMessage(error) });
    throw error;
  }

  if (!first.trim()) {
    clearTimeout(hardStop);
    controller.abort();
    logAiResult("empty_output", { model: modelName });
    return null;
  }

  const encoder = new TextEncoder();
  let accumulated = first;
  let chunks = 1;
  const body = new ReadableStream({
    async start(streamController) {
      streamController.enqueue(encoder.encode(sseMode("live")));
      streamController.enqueue(encoder.encode(sseChunk(first)));
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
          streamController.enqueue(encoder.encode(sseChunk(next)));
        }
        const finalText = accumulated.trim();
        if (finalText) remember(cacheKey, finalText, "live");
        logAiResult("success", { model: modelName, chunks });
      } catch (error) {
        failed = true;
        logAiResult(classifyProviderError(error), { model: modelName, detail: redactProviderMessage(error) });
      } finally {
        clearTimeout(hardStop);
        controller.abort();
        if (failed) streamController.enqueue(encoder.encode(sseError("unavailable")));
        else streamController.enqueue(encoder.encode(sseDone()));
        streamController.close();
      }
    },
    cancel() {
      clearTimeout(hardStop);
      controller.abort();
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

    let body: { messages?: ChatMessage[]; affiliateTask?: string } = {};
    try {
      body = JSON.parse(rawBody) as { messages?: ChatMessage[]; affiliateTask?: string };
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

    const apiKey = readOpenAIKey();
    if (!apiKey) {
      logAiResult("unconfigured");
      logAiResult("fallback", { detail: "unconfigured" });
      return streamText(buildGuideResponse(messages), "guide");
    }

    const attempts = openaiAttemptModels();
    const affiliateTask =
      typeof body.affiliateTask === "string" ? verifyAffiliatePromotionTask(body.affiliateTask) : null;

    let retried = false;
    for (const modelName of attempts) {
      try {
        const live = await openLiveResponse(messages, modelName, cacheKey, affiliateTask?.addendum);
        if (live) return live;
      } catch (error) {
        const category = classifyProviderError(error);
        if (!retried && shouldRetryProviderError(error)) {
          retried = true;
          try {
            const live = await openLiveResponse(messages, modelName, cacheKey, affiliateTask?.addendum);
            if (live) return live;
          } catch (retryError) {
            logAiResult(classifyProviderError(retryError), {
              model: modelName,
              detail: redactProviderMessage(retryError),
            });
          }
        }
        if (category !== "retired_model") break;
      }
    }

    logAiResult("fallback", { detail: "models_failed", model: attempts.join(",") });
    return streamText(buildGuideResponse(messages), "guide");
  } catch {
    console.error("[Jimvio AI] Critical error");
    return streamText("Jimvio AI is unavailable right now. Your message is still here. Try again in a moment.", "guide");
  }
}
