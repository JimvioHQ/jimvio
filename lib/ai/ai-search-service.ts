import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

/**
 * Generate a 768-dimension vector for any text.
 * This is used for both indexing (write) and querying (read).
 */
export async function generateTextEmbedding(text: string): Promise<number[]> {
  try {
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error("Embedding Generation Error:", error);
    throw new Error("Failed to generate vector");
  }
}

/**
 * AI Intent Parser: Extract filters (price, category, features) from a natural language query.
 * Example: "cheap wireless earbuds under $50 with long battery"
 * Result: { "category": "electronics", "max_price": 50, "search_term": "wireless earbuds" }
 */
export async function parseSearchIntent(query: string) {
    const intentModel = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `Extract sourcing filters from this user query: "${query}". 
    Return JSON with: "category" (string or null), "max_price" (number or null), "min_price" (number or null), "search_term" (string).`;

    const result = await intentModel.generateContent(prompt);
    return JSON.parse(result.response.text());
}
