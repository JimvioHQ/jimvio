import { MAX_CHAT_HISTORY } from "@/lib/ai/chat-shared";

export type TurnMessage = {
  id: string;
  role: "user" | "ai";
  content: string;
  thinking?: boolean;
  streaming?: boolean;
};

export type PreparedTurn =
  | { accepted: false; reason: "busy" | "empty" }
  | {
      accepted: true;
      messages: TurnMessage[];
      history: Array<{ role: "user" | "assistant"; content: string }>;
      requestText: string;
      assistantId: string;
    };

export const EMPTY_REPLY = "The live model did not answer. Your question is still here.";
export const TIMEOUT_REPLY = "Jimvio AI took too long. Your message is still here.";
export const FAILED_REPLY = "Jimvio AI could not finish that reply. Your message is still here.";

export function assistantActionLabel(fallback: boolean | undefined): "Retry" | "Regenerate" {
  return fallback ? "Retry" : "Regenerate";
}

export function isCurrentGeneration(active: number, generation: number): boolean {
  return active === generation;
}

export function completeAssistantTurn<T extends TurnMessage & { fallback?: boolean }>(
  messages: T[],
  assistantId: string,
  result: { content: string; fallback?: boolean },
): T[] {
  const trimmed = result.content.trim();
  const content = trimmed || EMPTY_REPLY;
  const fallback = Boolean(result.fallback) || !trimmed;
  return messages.map((message) =>
    message.id === assistantId
      ? { ...message, content, fallback, thinking: false, streaming: false }
      : message,
  );
}

export function failAssistantTurn<T extends TurnMessage & { fallback?: boolean }>(
  messages: T[],
  assistantId: string,
  input: { timedOut: boolean; previous?: T | null },
): T[] {
  return messages.map((message) => {
    if (message.id !== assistantId) return message;
    if (message.content.trim()) {
      return { ...message, thinking: false, streaming: false, fallback: true };
    }
    if (input.previous?.content.trim()) {
      return {
        ...input.previous,
        id: message.id,
        thinking: false,
        streaming: false,
      };
    }
    return {
      ...message,
      thinking: false,
      streaming: false,
      fallback: true,
      content: input.timedOut ? TIMEOUT_REPLY : FAILED_REPLY,
    };
  });
}

function settleInFlight(messages: TurnMessage[]): TurnMessage[] {
  return messages.map((message) =>
    message.thinking || message.streaming
      ? {
          ...message,
          thinking: false,
          streaming: false,
          content: message.content.trim() || "This reply was stopped.",
        }
      : message,
  );
}

export function prepareChatTurn(input: {
  messages: TurnMessage[];
  text: string;
  busy: boolean;
  now?: number;
  regenerateFromId?: string;
}): PreparedTurn {
  if (input.busy) return { accepted: false, reason: "busy" };

  const now = input.now ?? Date.now();
  let messages = settleInFlight(input.messages);
  let requestText = input.text.trim();

  if (input.regenerateFromId) {
    const index = messages.findIndex((message) => message.id === input.regenerateFromId);
    const previous = index > 0 ? messages[index - 1] : undefined;
    if (index < 0 || previous?.role !== "user" || !previous.content.trim()) {
      return { accepted: false, reason: "empty" };
    }
    messages = messages.slice(0, index);
    requestText = previous.content.trim();
  }

  if (!requestText) return { accepted: false, reason: "empty" };

  if (!input.regenerateFromId) {
    messages = [
      ...messages,
      { id: `${now}-user`, role: "user", content: requestText },
    ];
  }

  const assistantId = `${now}-ai`;
  messages = [
    ...messages,
    { id: assistantId, role: "ai", content: "", thinking: true, streaming: false },
  ];

  const history = messages
    .filter((message) => message.id !== assistantId && message.content.trim() && !message.thinking)
    .slice(0, -1)
    .map((message) => ({
      role: (message.role === "ai" ? "assistant" : "user") as "user" | "assistant",
      content: message.content.trim(),
    }))
    .slice(-MAX_CHAT_HISTORY);

  return { accepted: true, messages, history, requestText, assistantId };
}
