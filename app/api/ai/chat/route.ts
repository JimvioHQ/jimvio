import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  AI_CACHE_TTL_MS,
  JIMVIO_AI_SYSTEM_PROMPT,
  buildCacheKey,
  trimChatHistory,
  type ChatMessage,
} from "@/lib/ai/chat-shared";
import { CONFIDENTIAL_AI_REFUSAL, isConfidentialAiRequest } from "@/lib/ai/ai-guard";
import { EARNING_GUIDE_SYSTEM_RULES, buildEarningGuideReply } from "@/lib/ai/earning-guide";

const responseCache = new Map<string, { text: string; mode: "live" | "guide"; ts: number }>();

function isUsableApiKey(key?: string): boolean {
  if (!key?.trim()) return false;
  const value = key.trim().toLowerCase();
  if (value.length < 12) return false;
  if (value.includes("your-") || value.includes("changeme") || value === "xxx") return false;
  return true;
}

function isGeminiKeyError(message: string): boolean {
  return /api_key_invalid|api key expired|invalid api key|400 bad request|403|permission/i.test(message);
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

function streamText(text: string, mode: "live" | "guide" = "guide") {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const chunks = text.match(/[\s\S]{1,48}/g) ?? [text];
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(sseChunk(chunk)));
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

async function streamGemini(geminiResult: { stream: AsyncIterable<{ text(): string }> }) {
  const encoder = new TextEncoder();
  let buffer = "";

  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of geminiResult.stream) {
        const text = chunk.text();
        if (!text) continue;
        buffer += text;
        if (buffer.length >= 20) {
          controller.enqueue(encoder.encode(sseChunk(buffer)));
          buffer = "";
        }
      }
      if (buffer) controller.enqueue(encoder.encode(sseChunk(buffer)));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "X-Jimvio-AI-Mode": "live" },
  });
}

async function tryGemini(messages: ChatMessage[]) {
  const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!isUsableApiKey(geminiKey)) return null;

  const genAI = new GoogleGenerativeAI(geminiKey!);
  const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";
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

  const result = await model.startChat({ history }).sendMessageStream(lastMessage);
  return streamGemini(result);
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

    try {
      const geminiRes = await tryGemini(messages);
      if (geminiRes) return geminiRes;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (isGeminiKeyError(msg)) {
        console.info("[Jimvio AI] Gemini unavailable. Using the earning guide.");
      } else {
        console.warn("[Jimvio AI] Gemini failed. Using the earning guide.");
      }
    }

    const demoText = buildGuideResponse(messages);
    responseCache.set(cacheKey, { text: demoText, mode: "guide", ts: Date.now() });
    if (responseCache.size > 200) {
      const oldest = [...responseCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
      if (oldest) responseCache.delete(oldest[0]);
    }

    return streamText(demoText, "guide");
  } catch {
    console.error("[Jimvio AI] Critical error");
    return NextResponse.json({ error: "Jimvio AI is unavailable right now." }, { status: 503 });
  }
}
