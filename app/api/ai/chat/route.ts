import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

const JIMVIO_AI_SYSTEM_PROMPT = `You are Jimvio AI, the intelligent assistant for the Jimvio creator commerce platform.

You help users:
- Earn affiliate commissions and find high-converting products
- Join and succeed in UGC campaigns
- Sell products and launch vendor stores
- Build communities, host live events, and monetize courses
- Understand payouts, growth strategies, and next steps on Jimvio

RESPONSE STYLE:
1. Start with a clear, helpful summary (2-3 sentences).
2. Use short bullet points for actionable steps.
3. Be practical, friendly, and specific to Jimvio features.

INTERACTIVE TRIGGERS (when relevant):
- Append [PRODUCTS: "search query"] to suggest marketplace products.
- Append [LINKS: "Label|/path", "Label|/path"] for helpful Jimvio pages.
- Example links: /marketplace, /ugc, /affiliates, /communities, /register, /dashboard

Do not mention being a generic chatbot. Focus on helping the user take action on Jimvio.`;

type ChatMessage = { role: string; content: string };

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

  if (/ugc|campaign|creator|content/.test(q)) {
    return `**Guided answer (demo mode)** — renew **OPENAI_API_KEY** or **GOOGLE_GENERATIVE_AI_API_KEY** in \`.env\` for live AI.

**UGC on Jimvio**
- Browse active campaigns and check payout type (per view vs per post).
- Join campaigns that match your platforms and audience.
- Submit content against the brief and track earnings in your dashboard.

**Do this next**
- Open campaigns with clear rates and deadlines
- Start with one campaign you can publish to this week

[LINKS: "Browse UGC Campaigns|/ugc", "Creator Dashboard|/dashboard", "Get Started|/register"]`;
  }

  if (/affiliate|commission|promot|link/.test(q)) {
    return `**Guided answer (demo mode)** — add a valid AI API key in \`.env\` for personalized recommendations.

**Affiliate commissions**
- Pick products with strong commission rates in the marketplace.
- Generate your unique link and share where your audience already buys.
- Track clicks and conversions from your dashboard wallet.

**Do this next**
- Focus on 2–3 products that fit your niche
- Promote with a clear call to action

[PRODUCTS: "affiliate high commission"] [LINKS: "Marketplace|/marketplace", "Affiliate Program|/affiliates", "Dashboard|/dashboard"]`;
  }

  if (/sell|vendor|store|product|list/.test(q)) {
    return `**Guided answer (demo mode)** — live AI is unavailable until API keys are renewed.

**Selling on Jimvio**
- Register as a vendor and complete your store profile.
- List physical or digital products with clear pricing and images.
- Use affiliates and UGC creators to drive traffic.

**Do this next**
- Publish your first listing
- Set a competitive commission to attract promoters

[LINKS: "Open Dashboard|/dashboard", "Marketplace|/marketplace", "Create Account|/register"]`;
  }

  if (/community|live|course|monetiz/.test(q)) {
    return `**Guided answer (demo mode)** — configure AI keys for tailored growth advice.

**Grow on Jimvio**
- Build a community hub for your audience.
- Host live sessions and monetize with products or paid access.
- Sell courses or digital knowledge from your vendor tools.

**Do this next**
- Define one community topic you can post about weekly
- Link your community to products or campaigns

[LINKS: "Explore Communities|/communities", "Dashboard|/dashboard", "Start Free|/register"]`;
  }

  return `**Guided answer (demo mode)** — OpenAI quota expired and Gemini API key is invalid. Update keys in \`.env\` to enable live answers.

**Quick summary**
- Jimvio helps you earn via affiliates, UGC, marketplace sales, and communities.
- Start with one action today and track results in your dashboard.

**Suggested next steps**
- Browse trending marketplace products
- Join a UGC campaign that fits your content style
- Share affiliate links where your audience engages

[PRODUCTS: "${query.slice(0, 80)}"] [LINKS: "Browse Marketplace|/marketplace", "Join UGC Campaigns|/ugc", "Start Earning|/register"]`;
}

function sseChunk(content: string) {
  const payload = { choices: [{ delta: { content } }] };
  return `data: ${JSON.stringify(payload)}\n\n`;
}

function streamText(text: string, mode: "live" | "demo" = "live") {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const tokens = text.split(/(\s+)/);
      for (const token of tokens) {
        if (!token) continue;
        controller.enqueue(encoder.encode(sseChunk(token)));
        if (mode === "demo") {
          await new Promise((resolve) => setTimeout(resolve, 10));
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
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of openaiResponse) {
        const content = chunk.choices[0]?.delta?.content ?? "";
        if (content) controller.enqueue(encoder.encode(sseChunk(content)));
      }
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
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of geminiResult.stream) {
        const text = chunk.text();
        if (text) controller.enqueue(encoder.encode(sseChunk(text)));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "X-Jimvio-AI-Mode": "live" },
  });
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
    stream: true,
  });

  return streamOpenAi(response);
}

async function tryGemini(messages: ChatMessage[]) {
  const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!isUsableApiKey(geminiKey)) return null;

  const genAI = new GoogleGenerativeAI(geminiKey!);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    systemInstruction: { role: "system", parts: [{ text: JIMVIO_AI_SYSTEM_PROMPT }] },
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
    const messages: ChatMessage[] = body?.messages ?? [];
    if (!messages.length) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const lastMessageText = messages[messages.length - 1]?.content ?? "";
    const failures: string[] = [];

    try {
      const openAiRes = await tryOpenAi(messages);
      if (openAiRes) return openAiRes;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      failures.push(`OpenAI: ${msg}`);
      if (isOpenAiQuotaError(msg)) {
        console.info("[Jimvio AI] OpenAI unavailable (quota/billing). Trying Gemini…");
      } else {
        console.warn("[Jimvio AI] OpenAI failed:", msg);
      }
    }

    try {
      const geminiRes = await tryGemini(messages);
      if (geminiRes) return geminiRes;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      failures.push(`Gemini: ${msg}`);
      if (isGeminiKeyError(msg)) {
        console.info("[Jimvio AI] Gemini unavailable (invalid/expired key). Using guided demo mode.");
      } else {
        console.warn("[Jimvio AI] Gemini failed:", msg);
      }
    }

    if (failures.length) {
      console.info("[Jimvio AI] Falling back to demo response.", failures.join(" | "));
    }

    return streamText(buildMockResponse(lastMessageText), "demo");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Jimvio AI] Critical error:", message);
    return NextResponse.json({ error: "Service Unavailable", message }, { status: 503 });
  }
}
