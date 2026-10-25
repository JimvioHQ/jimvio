import { redactProviderMessage } from "@/lib/ai/gemini-model";
import {
  completeText,
  embedText,
  readOpenAIKey,
  resolveOpenAIModel,
  shouldRetryProviderError,
} from "@/lib/ai/openai-runtime";

/**
 * Generate a 768-dimension vector for any text.
 * This is used for both indexing (write) and querying (read).
 * Production has no stored product vectors; search falls back to keywords when this fails.
 */
export async function generateTextEmbedding(text: string): Promise<number[]> {
  const apiKey = readOpenAIKey();
  if (!apiKey) throw new Error("Failed to generate vector");
  try {
    return await embedText(apiKey, text, 12_000);
  } catch (error) {
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
  const prompt = `Extract sourcing filters from this user query: "${query}". 
    Return JSON with: "category" (string or null), "max_price" (number or null), "min_price" (number or null), "search_term" (string).`;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const text = await completeText({
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
      lastError = error;
      if (attempt === 0 && shouldRetryProviderError(error)) continue;
      break;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("AI intent failed");
}
