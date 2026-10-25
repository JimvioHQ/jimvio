import OpenAI from "openai";
import { classifyProviderError, isUsableApiKey } from "@/lib/ai/gemini-model";

export const OPENAI_API_KEY_ENV = "OPENAI_API_KEY";
export const OPENAI_MODEL_ENV = "OPENAI_MODEL";

/**
 * Cost-effective production model already used by this repo's OpenAI SDK.
 * The installed SDK accepts it on the Responses API. Override with OPENAI_MODEL.
 */
export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
export const OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";
/** Matches the previous search embedding width. No product vectors are stored today. */
export const OPENAI_EMBEDDING_DIMENSIONS = 768;

const BLOCKED_MODEL = /gemini|gpt-3\.5|text-davinci|your-model/i;
const clients = new Map<string, OpenAI>();

export type ModelTurn = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type JsonSchemaFormat = {
  name: string;
  schema: Record<string, unknown>;
};

type ResponseCreate = (
  body: OpenAI.Responses.ResponseCreateParamsNonStreaming,
  options?: { signal?: AbortSignal; timeout?: number; maxRetries?: number },
) => Promise<{ output_text?: string | null }>;

export function resolveOpenAIModel(configured = process.env[OPENAI_MODEL_ENV]): {
  model: string;
  remapped: boolean;
} {
  const name = (configured || "").trim();
  if (!name || BLOCKED_MODEL.test(name)) {
    return { model: DEFAULT_OPENAI_MODEL, remapped: Boolean(name) && name !== DEFAULT_OPENAI_MODEL };
  }
  return { model: name, remapped: false };
}

/** Primary model, then the default when a custom model is retired. */
export function openaiAttemptModels(configured?: string): string[] {
  const primary = resolveOpenAIModel(configured).model;
  return primary === DEFAULT_OPENAI_MODEL ? [primary] : [primary, DEFAULT_OPENAI_MODEL];
}

export function readOpenAIKey(env: Record<string, string | undefined> = process.env): string | null {
  const key = env[OPENAI_API_KEY_ENV];
  return isUsableApiKey(key) ? key!.trim() : null;
}

export function shouldRetryProviderError(error: unknown): boolean {
  const category = classifyProviderError(error);
  return category === "timeout" || category === "provider";
}

function clientFor(apiKey: string): OpenAI {
  const existing = clients.get(apiKey);
  if (existing) return existing;
  const client = new OpenAI({ apiKey, timeout: 20_000, maxRetries: 0 });
  clients.set(apiKey, client);
  if (clients.size > 4) {
    const oldest = clients.keys().next().value;
    if (oldest && oldest !== apiKey) clients.delete(oldest);
  }
  return client;
}

export async function* iterateResponseText(
  stream: AsyncIterable<{ type?: string; delta?: unknown }>,
): AsyncGenerator<string> {
  for await (const event of stream) {
    if (event.type === "response.output_text.delta" && typeof event.delta === "string" && event.delta) {
      yield event.delta;
    }
  }
}

export async function openResponseStream(options: {
  apiKey: string;
  model: string;
  instructions?: string;
  input: string | ModelTurn[];
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}): Promise<AsyncIterable<string>> {
  const timeoutMs = options.timeoutMs ?? 20_000;
  const stream = await clientFor(options.apiKey).responses.create(
    {
      model: options.model,
      instructions: options.instructions,
      input: options.input,
      temperature: options.temperature,
      max_output_tokens: options.maxOutputTokens,
      store: false,
      stream: true,
    },
    {
      signal: options.signal,
      timeout: timeoutMs,
      maxRetries: 0,
    },
  );
  return iterateResponseText(stream);
}

export async function completeText(options: {
  apiKey: string;
  model: string;
  instructions?: string;
  input: string | ModelTurn[];
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  format?: "json_object";
  jsonSchema?: JsonSchemaFormat;
  create?: ResponseCreate;
}): Promise<string> {
  const timeoutMs = options.timeoutMs ?? 20_000;
  const signal = options.signal ?? AbortSignal.timeout(timeoutMs);
  const body: OpenAI.Responses.ResponseCreateParamsNonStreaming = {
    model: options.model,
    instructions: options.instructions,
    input: options.input,
    temperature: options.temperature,
    max_output_tokens: options.maxOutputTokens,
    store: false,
    text: options.jsonSchema
      ? {
          format: {
            type: "json_schema",
            name: options.jsonSchema.name,
            schema: options.jsonSchema.schema,
            strict: true,
          },
        }
      : options.format === "json_object"
        ? { format: { type: "json_object" } }
        : undefined,
  };
  const create: ResponseCreate =
    options.create ??
    ((payload, request) => clientFor(options.apiKey).responses.create(payload, request));
  const response = await create(body, { signal, timeout: timeoutMs, maxRetries: 0 });
  return (response.output_text ?? "").trim();
}

export async function embedText(apiKey: string, input: string, timeoutMs = 12_000): Promise<number[]> {
  const response = await clientFor(apiKey).embeddings.create(
    {
      model: OPENAI_EMBEDDING_MODEL,
      input: input.slice(0, 8_000),
      dimensions: OPENAI_EMBEDDING_DIMENSIONS,
    },
    { timeout: timeoutMs, maxRetries: 0, signal: AbortSignal.timeout(timeoutMs) },
  );
  const values = response.data[0]?.embedding;
  if (!values?.length) throw new Error("empty embedding");
  return values;
}
