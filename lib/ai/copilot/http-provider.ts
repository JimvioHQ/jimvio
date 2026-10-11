import { parseAiTriggers } from "@/lib/ai/chat-shared";
import { parseSseBuffer } from "@/lib/ai/sse";
import type { CopilotProvider, CopilotSendInput, CopilotStreamChunk } from "./types";

const TIMEOUT_MS = 45_000;

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
  let sawDone = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parsed = parseSseBuffer(buffer);
      buffer = parsed.rest;
      fallback = fallback || parsed.fallback;
      if (parsed.errorCode && !full && !parsed.text) {
        throw new Error("Jimvio AI is unavailable right now.");
      }
      if (parsed.text) {
        full += parsed.text;
        yield { type: "text-delta", text: parsed.text };
      }
      if (parsed.done) {
        sawDone = true;
        break;
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) {
      const parsed = parseSseBuffer(`${buffer}\n\n`);
      fallback = fallback || parsed.fallback;
      if (parsed.done) sawDone = true;
      if (parsed.text) {
        full += parsed.text;
        yield { type: "text-delta", text: parsed.text };
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!sawDone) fallback = true;
  if (!full.trim()) {
    throw new Error("Jimvio AI is unavailable right now.");
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
