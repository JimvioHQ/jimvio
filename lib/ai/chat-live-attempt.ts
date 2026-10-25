import { classifyProviderError, redactProviderMessage } from "@/lib/ai/gemini-model";
import { shouldRetryProviderError } from "@/lib/ai/openai-runtime";
import { qualifiesForGeminiFallback } from "@/lib/ai/provider-policy";

type AttemptLog = (category: string, extra?: { model?: string; detail?: string }) => void;

/**
 * OpenAI attempts, one retry for a timeout or generic provider error, then
 * one Gemini call only when the last error is an eligible outage.
 * A null live result is empty output and does not call Gemini.
 */
export async function attemptLiveChat<T>(options: {
  models: string[];
  openLive: (model: string) => Promise<T | null>;
  openGemini: () => Promise<T | null>;
  log?: AttemptLog;
}): Promise<T | null> {
  const log = options.log ?? (() => {});
  let retried = false;
  let lastError: unknown = null;

  for (const modelName of options.models) {
    try {
      const live = await options.openLive(modelName);
      if (live) return live;
    } catch (error) {
      lastError = error;
      const category = classifyProviderError(error);
      if (!retried && shouldRetryProviderError(error)) {
        retried = true;
        try {
          const live = await options.openLive(modelName);
          if (live) return live;
        } catch (retryError) {
          lastError = retryError;
          log(classifyProviderError(retryError), {
            model: modelName,
            detail: redactProviderMessage(retryError),
          });
        }
      }
      if (category !== "retired_model") break;
    }
  }

  if (lastError && qualifiesForGeminiFallback(lastError)) {
    return options.openGemini();
  }
  return null;
}
