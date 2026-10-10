export const AI_ACTION_OPERATIONS = ["create_community"] as const;

export type AiActionOperation = (typeof AI_ACTION_OPERATIONS)[number];

export type ParsedAiAction =
  | {
      ok: true;
      operation: "create_community";
      name: string;
      description?: string;
    }
  | { ok: false; error: string; status: number };

const NAME_MAX = 80;
const DESCRIPTION_MAX = 500;

function cleanText(value: unknown, max: number) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/**
 * Allowlist for assistant-executed operations.
 * Confirmation is required. Unknown operations and unconfirmed writes are rejected.
 */
export function parseAiActionBody(body: unknown): ParsedAiAction {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request", status: 400 };
  }
  const record = body as Record<string, unknown>;
  const operation = record.operation;
  if (operation !== "create_community") {
    return {
      ok: false,
      error: "That operation is not available from Jimvio AI.",
      status: 400,
    };
  }
  if (record.confirm !== true) {
    return {
      ok: false,
      error: "Confirmation is required before Jimvio AI can create a community.",
      status: 400,
    };
  }

  const name = cleanText(record.name, NAME_MAX);
  if (name.length < 2) {
    return { ok: false, error: "A community name of at least 2 characters is required.", status: 400 };
  }

  const description = cleanText(record.description, DESCRIPTION_MAX);
  return {
    ok: true,
    operation: "create_community",
    name,
    description: description || undefined,
  };
}
