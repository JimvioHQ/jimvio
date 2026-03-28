import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const lastMessageText = messages[messages.length - 1].content.toLowerCase();

    const openAIKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    // --- 1. TRY OPENAI FIRST ---
    if (openAIKey) {
      try {
        const openai = new OpenAI({ apiKey: openAIKey });
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: ALIBABA_SYSTEM_PROMPT },
            ...messages.map((m: any) => ({
              role: m.role === "assistant" ? "assistant" : "user",
              content: m.content,
            }))
          ] as any,
          stream: true,
        });

        return streamResponse(response);
      } catch (e: any) {
        console.warn("OpenAI Failed, falling back to Gemini...", e.message);
      }
    }

    // --- 2. TRY GEMINI SECOND ---
    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ 
          model: "gemini-flash-latest",
          systemInstruction: { role: "system", parts: [{ text: ALIBABA_SYSTEM_PROMPT }] }
        });

        const lastMessage = messages[messages.length - 1].content;
        const history = messages.slice(0, -1).map((m: any) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));

        const result = await model.startChat({ history }).sendMessageStream(lastMessage);
        return streamGeminiResponse(result);
      } catch (e: any) {
        console.warn("Gemini Failed, falling back to Mock...", e.message);
      }
    }

    // --- 3. LAST RESORT: MOCK DEMO RESPONSE (Prevents UI Crash) ---
    return mockResponse(lastMessageText);

  } catch (error: any) {
    console.error("Critical Router Error:", error.message);
    return NextResponse.json({ error: "Service Unavailable", message: error.message }, { status: 503 });
  }
}

const ALIBABA_SYSTEM_PROMPT = `You are Jimvio AI, the primary Sourcing Strategist. 
        
RESPONSE FRAMEWORK (Alibaba AI style):
1. SUMMARY: 2-3 sentence expert overview.
2. KEY HIGHLIGHTS: Bullet points for "Materials", "Price Range", and "MOQ".

INTERACTIVE TRIGGERS:
- DO NOT use headers like "VISUALS:". Directly append: [PRODUCTS: "query"] [LINKS: "Label|url"]
- TONE: Executive, proactive, and market-savvy.`;

function streamResponse(openaiResponse: any) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of openaiResponse) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          const payload = { choices: [{ delta: { content } }] };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        }
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
}

async function streamGeminiResponse(geminiResult: any) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of geminiResult.stream) {
        const text = chunk.text();
        if (text) {
          const payload = { choices: [{ delta: { content: text } }] };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        }
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
}

function mockResponse(query: string) {
  const mockText = `[DEMO MODE] I've analyzed your request for "${query}". As your Sourcing Strategist, I've identified top-tier verified manufacturers matching this category. 

**Key Highlights:**
- **Materials:** High-grade industrial standards.
- **Price Range:** Variable based on scaling.
- **MOQ:** Flexible batches available.

[PRODUCTS: "${query}"] [LINKS: "View Suppliers|/vendors", "Compare Top 3|compare", "Request Sample|samples"]`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const payload = { choices: [{ delta: { content: mockText } }] };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
}
