import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import {
  AI_CACHE_TTL_MS,
  JIMVIO_AI_SYSTEM_PROMPT,
  buildCacheKey,
  trimChatHistory,
  type ChatMessage,
} from "@/lib/ai/chat-shared";
import { CONFIDENTIAL_AI_REFUSAL, isConfidentialAiRequest } from "@/lib/ai/ai-guard";
import { EARNING_GUIDE_SYSTEM_RULES, buildEarningGuideReply } from "@/lib/ai/earning-guide";

const PROVIDER_TIMEOUT_MS = 20_000;
const CURRENT_GEMINI_MODEL = "gemini-2.5-flash";
const RETIRED_GEMINI_MODELS = new Set([
  "gemini-1.0-pro",
  "gemini-pro",
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-pro",
  "gemini-1.5-pro-latest",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-2.0-flash-lite",
]);

const responseCache = new Map<string, { text: string; mode: "live" | "guide"; ts: number }>();

function isUsableApiKey(key?: string): boolean {
  if (!key?.trim()) return false;
  const value = key.trim().toLowerCase();
  if (value.length < 12) return false;
  if (value.includes("your-") || value.includes("changeme") || value === "xxx") return false;
  return true;
}

type AiFailureCategory =
  | "unconfigured"
  | "authentication"
  | "rate_limit"
  | "timeout"
  | "empty_output"
  | "malformed"
  | "retired_model"
  | "provider";

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
  console.warn("[Jimvio AI] provider fallback", {
    provider,
    category,
    detail: error ? redactProviderMessage(error) : undefined,
  });
}

function resolveGeminiModel(): { model: string; remapped: boolean } {
  const configured = (process.env.GEMINI_MODEL || CURRENT_GEMINI_MODEL).trim();
  if (RETIRED_GEMINI_MODELS.has(configured)) {
    return { model: CURRENT_GEMINI_MODEL, remapped: true };
  }
  return { model: configured, remapped: false };
}

function withTimeout<T>(work: Promise<T>, ms = PROVIDER_TIMEOUT_MS): Promise<T> {
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

function sseChunk(content: string) {
  const payload = { choices: [{ delta: { content } }] };
  return `data: ${JSON.stringify(payload)}\n\n`;
}

function sseMode(mode: "live" | "guide") {
  return `data: ${JSON.stringify({ jimvio: { mode } })}\n\n`;
}

function streamText(text: string, mode: "live" | "guide" = "guide") {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const chunks = text.match(/[\s\S]{1,48}/g) ?? [text];
      for (let index = 0; index < chunks.length; index += 1) {
        if (index === 0) controller.enqueue(encoder.encode(sseMode(mode)));
        controller.enqueue(encoder.encode(sseChunk(chunks[index])));
        if (mode === "guide") {
          await new Promise((resolve) => setTimeout(resolve, 4));
        }
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
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

async function readProviderText(
  stream: AsyncIterable<{ text(): string }>,
): Promise<string> {
  let text = "";
  for await (const chunk of stream) {
    const next = chunk.text();
    if (next) text += next;
    if (text.length > 12_000) break;
  }
  return text.trim();
}

async function tryGemini(messages: ChatMessage[], modelName: string): Promise<string> {
  const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!isUsableApiKey(geminiKey)) {
    logAiFailure("gemini", "unconfigured");
    throw Object.assign(new Error("Gemini is not configured"), { category: "unconfigured" });
  }

  const genAI = new GoogleGenerativeAI(geminiKey!);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: {
      role: "system",
      parts: [{ text: `${JIMVIO_AI_SYSTEM_PROMPT}\n\n${EARNING_GUIDE_SYSTEM_RULES}` }],
    },
    generationConfig: {
      maxOutputTokens: 900,
      temperature: 0.6,
    },
  });

  const lastMessage = messages[messages.length - 1].content;
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  while (history[0]?.role === "model") history.shift();

  const result = await withTimeout(model.startChat({ history }).sendMessageStream(lastMessage));
  const text = await withTimeout(readProviderText(result.stream));
  if (!text) {
    const error = new Error("Gemini returned no text");
    error.name = "EmptyOutput";
    throw error;
  }
  return text;
}

function createOpenAIClient(): OpenAI {
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    return new OpenAI({
      apiKey: openaiKey,
      baseURL: process.env.OPENAI_BASE_URL?.trim() || undefined,
    });
  }
  const gatewayKey = process.env.AI_GATEWAY_API_KEY?.trim() || process.env.VERCEL_AI_GATEWAY_API_KEY?.trim();
  if (gatewayKey) {
    return new OpenAI({
      apiKey: gatewayKey,
      baseURL: process.env.AI_GATEWAY_BASE_URL?.trim() || "https://ai-gateway.vercel.sh/v1",
    });
  }
  throw new Error("No AI provider configured");
}

async function tryOpenAI(messages: ChatMessage[]): Promise<string> {
  const openai = createOpenAIClient();
  const completion = await withTimeout(
    openai.chat.completions.create({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0.6,
      max_tokens: 900,
      stream: false,
      messages: [
        { role: "system", content: `${JIMVIO_AI_SYSTEM_PROMPT}\n\n${EARNING_GUIDE_SYSTEM_RULES}` },
        ...messages.map((item) => ({
          role: item.role === "assistant" ? "assistant" as const : "user" as const,
          content: item.content,
        })),
      ],
    }),
  );
  const text = completion.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) {
    const error = new Error("OpenAI returned no text");
    error.name = "EmptyOutput";
    throw error;
  }
  return text;
}

async function tryLiveModel(messages: ChatMessage[]): Promise<string | null> {
  const gemini = resolveGeminiModel();
  if (gemini.remapped) logAiFailure("gemini", "retired_model");
  if (isUsableApiKey(process.env.GOOGLE_GENERATIVE_AI_API_KEY)) {
    try {
      return await tryGemini(messages, gemini.model);
    } catch (error) {
      const category = error instanceof Error && error.name === "EmptyOutput"
        ? "empty_output"
        : classifyProviderError(error);
      logAiFailure("gemini", category, error);
      if (category === "retired_model" && gemini.model !== CURRENT_GEMINI_MODEL) {
        try {
          return await tryGemini(messages, CURRENT_GEMINI_MODEL);
        } catch (retryError) {
          logAiFailure("gemini", classifyProviderError(retryError), retryError);
        }
      }
    }
  } else {
    logAiFailure("gemini", "unconfigured");
  }

  try {
    return await tryOpenAI(messages);
  } catch (error) {
    const message = redactProviderMessage(error);
    const category = /not set|no ai provider/i.test(message) ? "unconfigured" : classifyProviderError(error);
    logAiFailure("openai", category, error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawMessages: ChatMessage[] = body?.messages ?? [];
    if (!rawMessages.length) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const messages = trimChatHistory(rawMessages);
    if (messages.some((item) => isConfidentialAiRequest(item.content))) {
      return streamText(CONFIDENTIAL_AI_REFUSAL, "guide");
    }

    const cacheKey = buildCacheKey(messages);
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < AI_CACHE_TTL_MS) {
      return streamText(cached.text, cached.mode);
    }

    const liveText = await tryLiveModel(messages);
    if (liveText) {
      responseCache.set(cacheKey, { text: liveText, mode: "live", ts: Date.now() });
      if (responseCache.size > 200) {
        const oldest = [...responseCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
        if (oldest) responseCache.delete(oldest[0]);
      }
      return streamText(liveText, "live");
    }

    return streamText(buildGuideResponse(messages), "guide");
  } catch {
    console.error("[Jimvio AI] Critical error");
    return NextResponse.json({ error: "Jimvio AI is unavailable right now." }, { status: 503 });
  }
}
