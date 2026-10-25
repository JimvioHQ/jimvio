import { generateGeminiText } from "@/lib/ai/gemini-fallback";
import { qualifiesForGeminiFallback } from "@/lib/ai/provider-policy";
import {
  completeText,
  resolveOpenAIModel,
  shouldRetryProviderError,
  type JsonSchemaFormat,
  type ModelTurn,
} from "@/lib/ai/openai-runtime";

export function promptFromInput(input: string | ModelTurn[]): string {
  if (typeof input === "string") return input;
  return input.map((turn) => `${turn.role}: ${turn.content}`).join("\n");
}

type CompleteFn = typeof completeText;

type GeminiFn = (request: {
  instructions?: string;
  prompt: string;
  json: boolean;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  env?: Record<string, string | undefined>;
}) => Promise<string | null>;

/**
 * OpenAI Responses first. One retry for a timeout or generic provider error.
 * One Gemini call only when that failure qualifies as an outage. Empty output
 * is not an outage. A missing OpenAI key never reaches this helper.
 */
export async function completePrimaryText(options: {
  apiKey: string;
  model?: string;
  instructions?: string;
  input: string | ModelTurn[];
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  format?: "json_object";
  jsonSchema?: JsonSchemaFormat;
  geminiFallback?: boolean;
  env?: Record<string, string | undefined>;
  complete?: CompleteFn;
  gemini?: GeminiFn;
}): Promise<string> {
  const complete = options.complete ?? completeText;
  const model = options.model ?? resolveOpenAIModel().model;
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const text = (
        await complete({
          apiKey: options.apiKey,
          model,
          instructions: options.instructions,
          input: options.input,
          temperature: options.temperature,
          maxOutputTokens: options.maxOutputTokens,
          timeoutMs: options.timeoutMs,
          signal: options.signal,
          format: options.format,
          jsonSchema: options.jsonSchema,
        })
      ).trim();
      if (!text) {
        const empty = new Error("empty output");
        empty.name = "EmptyOutput";
        throw empty;
      }
      return text;
    } catch (error) {
      lastError = error;
      if (error instanceof Error && error.name === "EmptyOutput") break;
      if (attempt === 0 && shouldRetryProviderError(error)) continue;
      break;
    }
  }

  if (options.geminiFallback !== false && lastError && qualifiesForGeminiFallback(lastError)) {
    const gemini = options.gemini ?? ((request) => generateGeminiText(request));
    const text = await gemini({
      instructions: options.instructions,
      prompt: promptFromInput(options.input),
      json: Boolean(options.format || options.jsonSchema),
      temperature: options.temperature,
      maxOutputTokens: options.maxOutputTokens,
      timeoutMs: options.timeoutMs,
      env: options.env,
    });
    if (text?.trim()) return text.trim();
  }

  throw lastError instanceof Error ? lastError : new Error("AI request failed");
}
