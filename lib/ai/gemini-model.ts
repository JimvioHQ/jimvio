export const GEMINI_API_KEY_ENV = "GOOGLE_GENERATIVE_AI_API_KEY";
export const GEMINI_MODEL_ENV = "GEMINI_MODEL";

/** Cost-efficient stable Flash-Lite model verified in scripts/models_data.json. */
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";

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
