import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  GEMINI_API_KEY_ENV,
  GEMINI_FALLBACK_MODEL,
  GEMINI_MODEL_ENV,
  classifyProviderError,
  isUsableApiKey,
  iterateGeminiText,
  redactProviderMessage,
  resolveGeminiModel,
  shouldContinueGeminiAttempts,
} from "@/lib/ai/gemini-model";
import { OPENAI_EMBEDDING_DIMENSIONS } from "@/lib/ai/openai-runtime";

/** Accepted only when the vector width matches the OpenAI request. */
export const GEMINI_EMBEDDING_MODEL = "text-embedding-004";

const clients = new Map<string, GoogleGenerativeAI>();

export function readGeminiKey(env: Record<string, string | undefined> = process.env): string | null {
  const key = env[GEMINI_API_KEY_ENV];
  return isUsableApiKey(key) ? key!.trim() : null;
}

export function geminiTextModel(configured?: string): string {
  return resolveGeminiModel(configured).model;
}

function clientFor(apiKey: string): GoogleGenerativeAI {
  const existing = clients.get(apiKey);
  if (existing) return existing;
  const client = new GoogleGenerativeAI(apiKey);
  clients.set(apiKey, client);
  if (clients.size > 4) {
    const oldest = clients.keys().next().value;
    if (oldest && oldest !== apiKey) clients.delete(oldest);
  }
  return client;
}

type GeminiGenerate = (request: {
  apiKey: string;
  model: string;
  systemInstruction?: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  json: boolean;
  timeoutMs: number;
}) => Promise<string>;

async function defaultGenerate(request: {
  apiKey: string;
  model: string;
  systemInstruction?: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  json: boolean;
  timeoutMs: number;
}): Promise<string> {
  const model = clientFor(request.apiKey).getGenerativeModel(
    {
      model: request.model,
      systemInstruction: request.systemInstruction,
      generationConfig: {
        temperature: request.temperature,
        maxOutputTokens: request.maxOutputTokens,
        responseMimeType: request.json ? "application/json" : undefined,
      },
    },
    { timeout: request.timeoutMs },
  );
  const result = await model.generateContent(request.prompt);
  return result.response.text();
}

/**
 * One Gemini text call after OpenAI failed over. A retired model may swap once
 * to GEMINI_FALLBACK_MODEL. Timeouts and rate limits do not start a second call.
 */
export async function generateGeminiText(request: {
  instructions?: string;
  prompt?: string;
  input?: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  json?: boolean;
  env?: Record<string, string | undefined>;
  generate?: GeminiGenerate;
}): Promise<string | null> {
  const env = request.env ?? process.env;
  const apiKey = readGeminiKey(env);
  if (!apiKey) return null;
  const prompt = (request.prompt ?? request.input ?? "").trim();
  if (!prompt) return null;

  const primary = geminiTextModel(env[GEMINI_MODEL_ENV]);
  const models = [primary];
  const generate = request.generate ?? defaultGenerate;
  for (let index = 0; index < models.length && index < 2; index += 1) {
    const model = models[index]!;
    try {
      const text = (
        await generate({
          apiKey,
          model,
          systemInstruction: request.instructions,
          prompt,
          temperature: request.temperature,
          maxOutputTokens: request.maxOutputTokens,
          json: Boolean(request.json),
          timeoutMs: request.timeoutMs ?? 20_000,
        })
      ).trim();
      return text || null;
    } catch (error) {
      const category = classifyProviderError(error);
      console.warn("[gemini-fallback]", { category, detail: redactProviderMessage(error) });
      if (
        index === 0 &&
        shouldContinueGeminiAttempts(category) &&
        primary !== GEMINI_FALLBACK_MODEL &&
        !models.includes(GEMINI_FALLBACK_MODEL)
      ) {
        models.push(GEMINI_FALLBACK_MODEL);
        continue;
      }
      return null;
    }
  }
  return null;
}

/** Primary Gemini model only. The caller already decided this request is an outage fallback. */
export async function streamGeminiText(request: {
  instructions?: string;
  input: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  env?: Record<string, string | undefined>;
}): Promise<AsyncIterable<string> | null> {
  const env = request.env ?? process.env;
  const apiKey = readGeminiKey(env);
  const input = request.input.trim();
  if (!apiKey || !input) return null;
  const model = clientFor(apiKey).getGenerativeModel(
    {
      model: geminiTextModel(env[GEMINI_MODEL_ENV]),
      systemInstruction: request.instructions,
      generationConfig: {
        temperature: request.temperature,
        maxOutputTokens: request.maxOutputTokens,
      },
    },
    { timeout: request.timeoutMs ?? 20_000 },
  );
  const result = await model.generateContentStream(input);
  return iterateGeminiText(result.stream);
}

/** Returns a vector only when Gemini produces the same width the search route expects. */
export async function embedGemini768(
  text: string,
  env: Record<string, string | undefined> = process.env,
): Promise<number[] | null> {
  const apiKey = readGeminiKey(env);
  const input = text.trim();
  if (!apiKey || !input) return null;
  try {
    const model = clientFor(apiKey).getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL }, { timeout: 12_000 });
    const result = await model.embedContent(input.slice(0, 8_000));
    const values = result.embedding?.values;
    if (!values || values.length !== OPENAI_EMBEDDING_DIMENSIONS) return null;
    return values;
  } catch (error) {
    console.warn("[gemini-fallback] embed", { detail: redactProviderMessage(error) });
    return null;
  }
}
