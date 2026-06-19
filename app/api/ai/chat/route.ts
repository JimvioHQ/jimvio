import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  AI_CACHE_TTL_MS,
  JIMVIO_AI_SYSTEM_PROMPT,
  buildCacheKey,
  trimChatHistory,
  type ChatMessage,
} from "@/lib/ai/chat-shared";

const responseCache = new Map<string, { text: string; mode: "live" | "demo"; ts: number }>();

function isUsableApiKey(key?: string): boolean {
  if (!key?.trim()) return false;
  const value = key.trim().toLowerCase();
  if (value.length < 12) return false;
  if (value.includes("your-") || value.includes("changeme") || value === "xxx") return false;
  return true;
}

function isOpenAiQuotaError(message: string): boolean {
  return /429|quota|billing|insufficient/i.test(message);
}

function isGeminiKeyError(message: string): boolean {
  return /api_key_invalid|api key expired|invalid api key|400 bad request/i.test(message);
}

function buildMockResponse(query: string): string {
  const q = query.toLowerCase();

  if (/earn|money|income|calculator|how much/.test(q)) {
    return `**Quick Answer**
You can earn on Jimvio through affiliate commissions, UGC campaigns, and community monetization — often stacking all three.

**Steps**
- Promote 2–3 high-commission products from the marketplace
- Join one UGC campaign that fits your content style
- Share links where your audience already engages

**Recommended Action**
Open your dashboard and pick one earning path to start today.

**Related Opportunities**
- Affiliate links pay per sale · UGC pays per view or post

[CALCULATOR] [PRODUCTS: "high commission affiliate"] [CAMPAIGNS: "ugc paid"] [FOLLOWUPS: "Which products pay the most?", "How do UGC payouts work?", "How do I get my first sale?"] [LINKS: "Affiliate Program|/affiliates", "Browse Campaigns|/ugc", "Dashboard|/dashboard"]`;
  }

  if (/ugc|campaign|creator|content/.test(q)) {
    return `**Quick Answer**
UGC campaigns on Jimvio pay creators for content that matches brand briefs — per view or per approved post.

**Steps**
- Browse active campaigns and check payout type
- Join campaigns that match your platforms
- Submit content and track earnings in your dashboard

**Recommended Action**
Join one campaign you can publish to this week.

[FOLLOWUPS: "Which campaigns pay the most?", "How do I submit content?", "What content performs best?"] [CAMPAIGNS: "ugc creator paid"] [LINKS: "Browse UGC Campaigns|/ugc", "Creator Dashboard|/dashboard", "Get Started|/register"]`;
  }

  if (/affiliate|commission|promot|link|product/.test(q)) {
    return `**Quick Answer**
Pick high-commission products, generate your affiliate link, and share where your audience buys.

**Steps**
- Browse marketplace products with strong commission rates
- Generate your unique affiliate link per product
- Track clicks and conversions from your dashboard

**Recommended Action**
Start with 2–3 products that fit your niche.

[FOLLOWUPS: "What are the top commission products?", "How do affiliate links work?", "When do I get paid?"] [PRODUCTS: "affiliate high commission"] [LINKS: "Marketplace|/marketplace", "Affiliate Program|/affiliates", "Dashboard|/dashboard"]`;
  }

  if (/sell|vendor|store|list/.test(q)) {
    return `**Quick Answer**
Register as a vendor, list products with clear pricing, and use affiliates + UGC creators to drive traffic.

**Steps**
- Complete your vendor store profile
- Publish your first listing with strong images
- Set a competitive commission to attract promoters

**Recommended Action**
Publish your first product listing today.

[FOLLOWUPS: "How do I set up my store?", "How do affiliates help vendors?", "What fees does Jimvio charge?"] [LINKS: "Open Dashboard|/dashboard", "Marketplace|/marketplace", "Create Account|/register"]`;
  }

  if (/community|live|course|monetiz/.test(q)) {
    return `**Quick Answer**
Build a community hub, host live sessions, and monetize with products, courses, or paid access.

**Steps**
- Create a community around one clear topic
- Post consistently and engage members weekly
- Link your community to products or campaigns

**Recommended Action**
Define one community topic and invite your first 10 members.

[FOLLOWUPS: "How do I monetize a community?", "Can I sell courses?", "How do live events work?"] [COMMUNITIES: "creator community"] [LINKS: "Explore Communities|/communities", "Dashboard|/dashboard", "Start Free|/register"]`;
  }

  return `**Quick Answer**
Jimvio helps you earn via affiliates, UGC campaigns, marketplace sales, and communities — start with one action today.

**Steps**
- Browse trending marketplace products
- Join a UGC campaign that fits your style
- Share affiliate links where your audience engages

**Recommended Action**
Pick one path and track results in your dashboard.

[FOLLOWUPS: "How can I earn the fastest?", "What products should I promote?", "How do campaigns work?"] [PRODUCTS: "${query.slice(0, 60)}"] [LINKS: "Browse Marketplace|/marketplace", "Join UGC Campaigns|/ugc", "Start Earning|/register"]`;
}

function sseChunk(content: string) {
  const payload = { choices: [{ delta: { content } }] };
  return `data: ${JSON.stringify(payload)}\n\n`;
}

function streamText(text: string, mode: "live" | "demo" = "live") {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const chunks = text.match(/[\s\S]{1,48}/g) ?? [text];
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(sseChunk(chunk)));
        if (mode === "demo") {
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

function streamOpenAi(
  openaiResponse: AsyncIterable<{ choices: Array<{ delta?: { content?: string | null } }> }>
) {
  const encoder = new TextEncoder();
  let buffer = "";

  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of openaiResponse) {
        const content = chunk.choices[0]?.delta?.content ?? "";
        if (!content) continue;
        buffer += content;
        if (buffer.length >= 24) {
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
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    systemInstruction: { role: "system", parts: [{ text: JIMVIO_AI_SYSTEM_PROMPT }] },
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

async function tryOpenAi(messages: ChatMessage[]) {
  const openAIKey = process.env.OPENAI_API_KEY;
  if (!isUsableApiKey(openAIKey)) return null;

  const openai = new OpenAI({ apiKey: openAIKey });
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [
      { role: "system", content: JIMVIO_AI_SYSTEM_PROMPT },
      ...messages.map((m) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      })),
    ],
    max_tokens: 900,
    temperature: 0.6,
    stream: true,
  });

  return streamOpenAi(response);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawMessages: ChatMessage[] = body?.messages ?? [];
    if (!rawMessages.length) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const messages = trimChatHistory(rawMessages);
    const lastMessageText = messages[messages.length - 1]?.content ?? "";
    const cacheKey = buildCacheKey(messages);
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < AI_CACHE_TTL_MS) {
      return streamText(cached.text, cached.mode);
    }

    const failures: string[] = [];

    try {
      const geminiRes = await tryGemini(messages);
      if (geminiRes) return geminiRes;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      failures.push(`Gemini: ${msg}`);
      if (isGeminiKeyError(msg)) {
        console.info("[Jimvio AI] Gemini unavailable. Trying OpenAI…");
      } else {
        console.warn("[Jimvio AI] Gemini failed:", msg);
      }
    }

    try {
      const openAiRes = await tryOpenAi(messages);
      if (openAiRes) return openAiRes;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      failures.push(`OpenAI: ${msg}`);
      if (isOpenAiQuotaError(msg)) {
        console.info("[Jimvio AI] OpenAI unavailable (quota/billing). Using demo mode.");
      } else {
        console.warn("[Jimvio AI] OpenAI failed:", msg);
      }
    }

    if (failures.length) {
      console.info("[Jimvio AI] Falling back to demo response.", failures.join(" | "));
    }

    const demoText = buildMockResponse(lastMessageText);
    responseCache.set(cacheKey, { text: demoText, mode: "demo", ts: Date.now() });
    if (responseCache.size > 200) {
      const oldest = [...responseCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
      if (oldest) responseCache.delete(oldest[0]);
    }

    return streamText(demoText, "demo");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Jimvio AI] Critical error:", message);
    return NextResponse.json({ error: "Service Unavailable", message }, { status: 503 });
  }
}
