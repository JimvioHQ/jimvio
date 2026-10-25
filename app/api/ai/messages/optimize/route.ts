import { NextRequest, NextResponse } from "next/server";
import { isConfidentialAiRequest } from "@/lib/ai/ai-guard";
import { redactProviderMessage } from "@/lib/ai/gemini-model";
import { wrapUntrusted } from "@/lib/ai/information-policy";
import { readOpenAIKey, resolveOpenAIModel } from "@/lib/ai/openai-runtime";
import { completePrimaryText } from "@/lib/ai/text-generation";
import { rateLimit } from "@/lib/ops/rate-limit";

/**
 * AI Sourcing Inquiry Optimizer: Natural Language → Professional Sourcing Draft
 * Example POST: { "interest": "I want these earbuds, how many for $1000?", "product_context": { "name": "Wireless Pro Earbuds", "moq": 500 } }
 */
export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip")?.trim() ||
      "anon";
    const limited = rateLimit(`ai-optimize:${ip}`, 8, 60_000);
    if (!limited.allowed) {
      return NextResponse.json({ error: "Failed", message: "Too many requests. Wait a moment and retry." }, { status: 429 });
    }

    const { interest, product_context } = await req.json();
    if (!interest || !product_context) return NextResponse.json({ error: "Context required" }, { status: 400 });
    if (isConfidentialAiRequest(String(interest))) {
      return NextResponse.json(
        { error: "Failed", message: "Describe the product and quantity you want to ask the supplier about." },
        { status: 400 },
      );
    }

    const apiKey = readOpenAIKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Failed", message: "Jimvio AI is temporarily unavailable." },
        { status: 503 },
      );
    }

    const prompt = `Act as a senior sourcing agent. Draft a professional, high-conversion message to a supplier for the following product.

    ${wrapUntrusted("Product", `${product_context.name} (MOQ: ${product_context.moq})`, 500)}
    ${wrapUntrusted("Buyer interest", String(interest), 2000)}

    Requirements:
    - Formal but direct tone.
    - Ask for specific price tiers, lead times, and shipping estimates.
    - Keep it under 150 words.
    - Output ONLY the draft message text.`;

    const draft = await completePrimaryText({
      apiKey,
      model: resolveOpenAIModel().model,
      input: prompt,
      temperature: 0.4,
      maxOutputTokens: 400,
      timeoutMs: 20_000,
    });

    return NextResponse.json({
      draft,
      suggested_next_steps: [
        "Ask for a factory audit report",
        "Request a physical sample",
        "Negotiate on shipping terms (DDP/FOB)",
      ],
    });
  } catch (error: unknown) {
    const message = redactProviderMessage(error);
    console.error("Inquiry Optimization Error:", message);
    return NextResponse.json({ error: "Failed", message: "Failed to draft the inquiry." }, { status: 500 });
  }
}
