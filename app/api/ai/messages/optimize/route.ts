import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

/**
 * AI Sourcing Inquiry Optimizer: Natural Language → Professional Sourcing Draft
 * Example POST: { "interest": "I want these earbuds, how many for $1000?", "product_context": { "name": "Wireless Pro Earbuds", "moq": 500 } }
 */
export async function POST(req: NextRequest) {
  try {
    const { interest, product_context } = await req.json();
    if (!interest || !product_context) return NextResponse.json({ error: "Context required" }, { status: 400 });

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Act as a senior sourcing agent. Draft a professional, high-conversion message to a supplier for the following product: 

    PRODUCT: "${product_context.name}" (MOQ: ${product_context.moq}). 
    BUYER INTEREST: "${interest}". 

    Requirements:
    - Formal but direct tone.
    - Ask for specific price tiers, lead times, and shipping estimates.
    - Keep it under 150 words. 
    - Output ONLY the draft message text.`;

    const result = await model.generateContent(prompt);
    
    return NextResponse.json({
      draft: result.response.text(),
      suggested_next_steps: [
        "Ask for a factory audit report",
        "Request a physical sample",
        "Negotiate on shipping terms (DDP/FOB)"
      ]
    });
  } catch (error: any) {
    console.error("Inquiry Optimization Error:", error.message);
    return NextResponse.json({ error: "Failed", message: error.message }, { status: 500 });
  }
}
