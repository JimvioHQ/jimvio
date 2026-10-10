import { parseAiTriggers } from "@/lib/ai/chat-shared";
import type { CopilotProvider, CopilotSendInput, CopilotStreamChunk } from "./types";

const TIMEOUT_MS = 25_000;

function parseSse(buffer: string): { text: string; rest: string; done: boolean; fallback: boolean } {
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  let text = "";
  let done = false;
  let fallback = false;
  for (const part of parts) {
    const line = part
      .split("\n")
      .map((row) => row.trim())
      .find((row) => row.startsWith("data:"));
    if (!line) continue;
    const data = line.slice(5).trim();
    if (data === "[DONE]") {
      done = true;
      continue;
    }
    let json: {
      choices?: Array<{ delta?: { content?: string } }>;
      jimvio?: { mode?: string };
    };
    try {
      json = JSON.parse(data) as typeof json;
    } catch {
      continue;
    }
    if (json.jimvio?.mode === "guide") fallback = true;
    const delta = json.choices?.[0]?.delta?.content;
    if (typeof delta === "string") text += delta;
  }
  return { text, rest, done, fallback };
}

async function* streamChat(input: CopilotSendInput, signal: AbortSignal): AsyncGenerator<CopilotStreamChunk> {
  const messages = [
    ...input.history.filter((item) => item.content.trim()),
    { role: "user" as const, content: input.message },
  ];
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,
  });
  if (!response.ok || !response.body) {
    throw new Error("Jimvio AI is unavailable right now.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  let fallback = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parsed = parseSse(buffer);
      buffer = parsed.rest;
      fallback = fallback || parsed.fallback;
      if (parsed.text) {
        full += parsed.text;
        yield { type: "text-delta", text: parsed.text };
      }
      if (parsed.done) break;
    }
  } finally {
    reader.releaseLock();
  }

  const triggers = parseAiTriggers(full);
  yield {
    type: "metadata",
    message: {
      content: triggers.cleaned,
      followups: triggers.followups,
      links: triggers.links,
      fallback,
    },
  };
  yield { type: "done" };
}

export const httpCopilotProvider: CopilotProvider = {
  id: "jimvio-ai",
  async *send(input) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const onParentAbort = () => controller.abort();
    input.signal?.addEventListener("abort", onParentAbort);
    try {
      yield* streamChat(input, controller.signal);
    } catch (error) {
      if (input.signal?.aborted) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error("Jimvio AI took too long. Try again.");
      }
      throw error;
    } finally {
      clearTimeout(timer);
      input.signal?.removeEventListener("abort", onParentAbort);
    }
  },
};
