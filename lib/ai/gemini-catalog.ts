import {
  classifyProviderError,
  modelsFromListPayload,
  redactProviderMessage,
  type GeminiFailureCategory,
} from "@/lib/ai/gemini-model";

export type GeminiCatalogResult = {
  models: string[];
  category?: Exclude<GeminiFailureCategory, "success" | "fallback" | "unconfigured">;
  detail?: string;
};

let modelCatalog: { at: number; models: string[] } | null = null;

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const error = new Error("The model timed out");
      error.name = "TimeoutError";
      reject(error);
    }, ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Models this API key can call generateContent on.
 * Shared by Jimvio AI chat and Affiliate promotion so both use the same catalog.
 */
export async function listAccessibleGeminiModels(key: string): Promise<GeminiCatalogResult> {
  if (modelCatalog && Date.now() - modelCatalog.at < 10 * 60_000) {
    return { models: modelCatalog.models };
  }
  try {
    const models: string[] = [];
    let pageToken = "";
    for (let page = 0; page < 3; page += 1) {
      const url = new URL("https://generativelanguage.googleapis.com/v1beta/models");
      url.searchParams.set("pageSize", "100");
      url.searchParams.set("key", key);
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const response = await withTimeout(fetch(url), 8_000);
      const payload = (await response.json().catch(() => null)) as {
        nextPageToken?: string;
        error?: { message?: string };
      } | null;
      if (!response.ok) {
        const message = redactProviderMessage(new Error(payload?.error?.message || String(response.status)));
        const category =
          response.status === 429
            ? "rate_limit"
            : response.status === 401 || response.status === 403
              ? "authentication"
              : "provider";
        return { models: [], category, detail: message };
      }
      models.push(...modelsFromListPayload(payload));
      pageToken = payload?.nextPageToken ?? "";
      if (!pageToken) break;
    }
    modelCatalog = { at: Date.now(), models };
    return { models };
  } catch (error) {
    return { models: [], category: classifyProviderError(error), detail: redactProviderMessage(error) };
  }
}

/** Test-only reset so catalog cache does not leak across cases. */
export function resetGeminiCatalogCache(): void {
  modelCatalog = null;
}
