import { embedGemini768 } from "@/lib/ai/gemini-fallback";
import { redactProviderMessage } from "@/lib/ai/gemini-model";
import { wrapUntrusted } from "@/lib/ai/information-policy";
import {
  OPENAI_EMBEDDING_DIMENSIONS,
  embedText,
  readOpenAIKey,
  resolveOpenAIModel,
} from "@/lib/ai/openai-runtime";
import { qualifiesForGeminiFallback } from "@/lib/ai/provider-policy";
import { completePrimaryText } from "@/lib/ai/text-generation";

/**
 * Generate a 768-dimension vector for any text.
 * This is used for both indexing (write) and querying (read).
 * Production has no stored product vectors; search falls back to keywords when this fails.
 */
export async function generateTextEmbedding(text: string): Promise<number[]> {
  const apiKey = readOpenAIKey();
  if (!apiKey) throw new Error("Failed to generate vector");
  try {
    const values = await embedText(apiKey, text, 12_000);
    if (values.length !== OPENAI_EMBEDDING_DIMENSIONS) throw new Error("embedding dimension mismatch");
    return values;
  } catch (error) {
    const mismatch = error instanceof Error && /embedding dimension mismatch/i.test(error.message);
    if (!mismatch && qualifiesForGeminiFallback(error)) {
      const fallback = await embedGemini768(text);
      if (fallback?.length === OPENAI_EMBEDDING_DIMENSIONS) return fallback;
    }
    console.error("Embedding Generation Error:", redactProviderMessage(error));
    throw new Error("Failed to generate vector");
  }
}

/**
 * AI Intent Parser: Extract filters (price, category, features) from a natural language query.
 * Example: "cheap wireless earbuds under $50 with long battery"
 * Result: { "category": "electronics", "max_price": 50, "search_term": "wireless earbuds" }
 */
export async function parseSearchIntent(query: string) {
  const apiKey = readOpenAIKey();
  if (!apiKey) throw new Error("AI intent unavailable");
  const prompt = `Extract sourcing filters from this shopper query.
    Return JSON with: "category" (string or null), "max_price" (number or null), "min_price" (number or null), "search_term" (string).
    ${wrapUntrusted("Shopper query", query, 500)}`;
  try {
    const text = await completePrimaryText({
      apiKey,
      model: resolveOpenAIModel().model,
      input: prompt,
      format: "json_object",
      temperature: 0.2,
      maxOutputTokens: 300,
      timeoutMs: 12_000,
    });
    return JSON.parse(text) as {
      category?: string | null;
      max_price?: number | null;
      min_price?: number | null;
      search_term?: string;
    };
  } catch (error) {
    throw error instanceof Error ? error : new Error("AI intent failed");
  }
}
