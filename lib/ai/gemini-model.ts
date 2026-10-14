export const GEMINI_API_KEY_ENV = "GOOGLE_GENERATIVE_AI_API_KEY";
export const GEMINI_MODEL_ENV = "GEMINI_MODEL";

/**
 * Preferred cost-efficient model. Production listModels for this key may not
 * include it; the chat route then tries GEMINI_FALLBACK_MODEL.
 */
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";
/** Previously configured stable Gemini model. Used when Flash-Lite is unavailable. */
export const GEMINI_FALLBACK_MODEL = "gemini-2.5-flash";

const RETIRED_GEMINI_MODELS = new Set([
  "gemini-1.0-pro",
  "gemini-pro",
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-pro",
  "gemini-1.5-pro-latest",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-lite-001",
]);

export function isUsableApiKey(key?: string): boolean {
  if (!key?.trim()) return false;
  const value = key.trim().toLowerCase();
  if (value.length < 12) return false;
  if (value.includes("your-") || value.includes("changeme") || value === "xxx") return false;
  return true;
}

export function resolveGeminiModel(configured = process.env[GEMINI_MODEL_ENV]): {
  model: string;
  remapped: boolean;
} {
  const name = (configured || DEFAULT_GEMINI_MODEL).trim();
  if (!name || RETIRED_GEMINI_MODELS.has(name)) {
    return { model: DEFAULT_GEMINI_MODEL, remapped: name !== DEFAULT_GEMINI_MODEL };
  }
  return { model: name, remapped: false };
}

/** Preference only. A model is used when models.list says this key can call generateContent. */
export const GEMINI_MODEL_PREFERENCE = [
  DEFAULT_GEMINI_MODEL,
  GEMINI_FALLBACK_MODEL,
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
] as const;

export function modelsFromListPayload(payload: unknown): string[] {
  const models = (payload as { models?: Array<{ name?: string; supportedGenerationMethods?: string[] }> })?.models;
  if (!Array.isArray(models)) return [];
  return models
    .filter((model) => model.supportedGenerationMethods?.includes("generateContent"))
    .map((model) => String(model.name ?? "").replace(/^models\//, ""))
    .filter(Boolean);
}

export function geminiAttemptOrder(available: string[], configured?: string): string[] {
  const allowed = new Set(available);
  const order: string[] = [];
  const add = (name?: string) => {
    const model = name?.trim();
    if (!model || !allowed.has(model) || order.includes(model)) return;
    order.push(model);
  };
  add(configured);
  for (const model of GEMINI_MODEL_PREFERENCE) add(model);
  for (const model of available) {
    if (/flash/i.test(model) && !/image|tts|audio|embed|native/i.test(model)) add(model);
  }
  return order.slice(0, 3);
}

export function redactProviderMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  return raw.replace(/AIza[\w-]*/g, "[redacted]").replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]").replace(/key=[^&\s]+/gi, "key=[redacted]").slice(0, 240);
}

export type GeminiFailureCategory =
  | "unconfigured"
  | "authentication"
  | "rate_limit"
  | "timeout"
  | "empty_output"
  | "malformed"
  | "retired_model"
  | "provider"
  | "success"
  | "fallback";

export type GeminiQuotaScope = "minute" | "daily" | "overload";

export type GeminiProviderFailure = {
  category: Exclude<GeminiFailureCategory, "success" | "fallback" | "unconfigured">;
  retryAfterSeconds: number | null;
  quotaScope: GeminiQuotaScope | null;
  detail: string;
};

function readErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" && Number.isFinite(status) ? status : null;
}

/** Seconds from Retry-After, Google retryDelay, or "retry in Ns". Never invents a daily reset. */
export function readRetryAfterSeconds(error: unknown): number | null {
  const detail = redactProviderMessage(error);
  const candidates: number[] = [];
  const delay = detail.match(/retryDelay["']?\s*[:=]\s*["']?(\d+(?:\.\d+)?)\s*s/i);
  if (delay) candidates.push(Number(delay[1]));
  const retryIn = detail.match(/retry in\s+(\d+(?:\.\d+)?)\s*s/i);
  if (retryIn) candidates.push(Number(retryIn[1]));
  const headerValue = (error as { headers?: { get?: (name: string) => string | null } } | null)?.headers?.get?.("retry-after");
  if (headerValue && /^\d+$/.test(headerValue.trim())) candidates.push(Number(headerValue.trim()));
  const seconds = candidates.find((value) => Number.isFinite(value) && value >= 0 && value <= 86_400);
  return seconds == null ? null : Math.ceil(seconds);
}

export function parseGeminiProviderFailure(error: unknown): GeminiProviderFailure {
  const detail = redactProviderMessage(error);
  const status = readErrorStatus(error);
  const category = classifyProviderError(error);
  const daily = /per day|daily quota|requests per day|generate content free tier/i.test(detail);
  const overload = status === 503 || (/503|high demand/.test(detail) && status !== 429);
  let quotaScope: GeminiQuotaScope | null = null;
  if (category === "rate_limit" && daily) quotaScope = "daily";
  else if (category === "rate_limit" && overload) quotaScope = "overload";
  else if (category === "rate_limit") quotaScope = "minute";
  return {
    category,
    retryAfterSeconds: readRetryAfterSeconds(error),
    quotaScope,
    detail,
  };
}

/** Only a retired model is worth another attempt. Quota and overload stops immediately. */
export function shouldContinueGeminiAttempts(
  category: GeminiProviderFailure["category"],
): boolean {
  return category === "retired_model";
}

export function classifyProviderError(error: unknown): Exclude<GeminiFailureCategory, "success" | "fallback" | "unconfigured"> {
  const name = error instanceof Error ? error.name : "";
  const message = redactProviderMessage(error);
  if (name === "TimeoutError" || name === "AbortError" || /timeout|timed out|aborted/i.test(message)) return "timeout";
  if (/429|503|rate limit|resource exhausted|quota|insufficient_quota|high demand/i.test(message)) return "rate_limit";
  if (/api_key_invalid|api key expired|invalid api key|unauthenticated|permission denied|401|403/i.test(message)) {
    return "authentication";
  }
  if (/not found|deprecated|no longer available|retired|404/i.test(message)) return "retired_model";
  if (/unexpected token|malformed|invalid json/i.test(message)) return "malformed";
  return "provider";
}

export async function* iterateGeminiText(
  stream: AsyncIterable<{ text(): string }>,
): AsyncGenerator<string> {
  for await (const chunk of stream) {
    const next = chunk.text();
    if (next) yield next;
  }
}
