import { classifyProviderError, redactProviderMessage } from "@/lib/ai/gemini-model";

function readErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" && Number.isFinite(status) ? status : null;
}

/**
 * Gemini is only for a timeout or a service outage after OpenAI was attempted.
 * Missing keys, authentication failures, retired models, empty output, and
 * ordinary 429 rate limits stay on the existing OpenAI error path.
 */
export function qualifiesForGeminiFallback(error: unknown): boolean {
  if (error instanceof Error && (error.name === "EmptyOutput" || /empty output/i.test(error.message))) {
    return false;
  }
  const status = readErrorStatus(error);
  if (status === 401 || status === 403 || status === 404 || status === 429) return false;
  if (status === 408 || status === 500 || status === 502 || status === 503 || status === 504) return true;
  const category = classifyProviderError(error);
  if (
    category === "authentication" ||
    category === "retired_model" ||
    category === "rate_limit" ||
    category === "malformed" ||
    category === "empty_output"
  ) {
    return false;
  }
  return category === "timeout" || category === "provider";
}

export function safeProviderLog(error: unknown): string {
  return redactProviderMessage(error);
}
