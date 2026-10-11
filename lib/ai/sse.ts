export type ParsedSse = {
  text: string;
  rest: string;
  done: boolean;
  fallback: boolean;
  errorCode?: "unavailable" | "rate_limit" | "timeout" | "empty";
};

type SsePayload = {
  choices?: Array<{ delta?: { content?: string } }>;
  jimvio?: { mode?: string; error?: ParsedSse["errorCode"] };
};

export function sseChunk(content: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;
}

export function sseMode(mode: "live" | "guide"): string {
  return `data: ${JSON.stringify({ jimvio: { mode } })}\n\n`;
}

export function sseError(code: NonNullable<ParsedSse["errorCode"]>): string {
  return `data: ${JSON.stringify({ jimvio: { error: code } })}\n\n`;
}

export function sseDone(): string {
  return "data: [DONE]\n\n";
}

/** Parse complete SSE events. Incomplete trailing bytes stay in `rest`. */
export function parseSseBuffer(buffer: string): ParsedSse {
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  let text = "";
  let done = false;
  let fallback = false;
  let errorCode: ParsedSse["errorCode"];

  for (const part of parts) {
    const line = part
      .split("\n")
      .map((row) => row.trim())
      .find((row) => row.startsWith("data:"));
    if (!line) continue;
    const data = line.slice(5).trim();
    if (!data) continue;
    if (data === "[DONE]") {
      done = true;
      continue;
    }
    let json: SsePayload;
    try {
      json = JSON.parse(data) as SsePayload;
    } catch {
      continue;
    }
    if (json.jimvio?.mode === "guide") fallback = true;
    if (json.jimvio?.error) errorCode = json.jimvio.error;
    const delta = json.choices?.[0]?.delta?.content;
    if (typeof delta === "string" && delta) text += delta;
  }

  return { text, rest, done, fallback, errorCode };
}
