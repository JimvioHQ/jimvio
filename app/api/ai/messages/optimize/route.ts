import { NextRequest, NextResponse } from "next/server";
import { redactProviderMessage } from "@/lib/ai/gemini-model";
import { completeText, readOpenAIKey, resolveOpenAIModel, shouldRetryProviderError } from "@/lib/ai/openai-runtime";
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

    const apiKey = readOpenAIKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Failed", message: "Jimvio AI is temporarily unavailable." },
        { status: 503 },
      );
    }

    const prompt = `Act as a senior sourcing agent. Draft a professional, high-conversion message to a supplier for the following product: 

    PRODUCT: "${product_context.name}" (MOQ: ${product_context.moq}). 
    BUYER INTEREST: "${interest}". 

    Requirements:
    - Formal but direct tone.
    - Ask for specific price tiers, lead times, and shipping estimates.
    - Keep it under 150 words. 
    - Output ONLY the draft message text.`;

    let draft = "";
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        draft = await completeText({
          apiKey,
          model: resolveOpenAIModel().model,
          input: prompt,
          temperature: 0.4,
          maxOutputTokens: 400,
          timeoutMs: 20_000,
        });
        break;
      } catch (error) {
        if (attempt === 0 && shouldRetryProviderError(error)) continue;
        throw error;
      }
    }

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
