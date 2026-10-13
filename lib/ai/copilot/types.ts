import type { AiChatMessageData } from "@/components/marketplace/ai/ai-chat-message";
import type { CopilotPageContext } from "@/lib/store/use-ai-store";

export type CopilotRole = "user" | "assistant";

export type CopilotMessage = AiChatMessageData;

export type CopilotStreamChunk = {
  type: "text-delta" | "done" | "metadata";
  text?: string;
  message?: Partial<CopilotMessage>;
};

export type CopilotSendInput = {
  message: string;
  history: Array<{ role: CopilotRole; content: string }>;
  context: CopilotPageContext;
  pathname: string;
  actionId?: string;
  signal?: AbortSignal;
  /** Signed server task. The workspace does not send product prices in this field. */
  affiliateTask?: string;
};

export type CopilotQuickAction = {
  id: string;
  label: string;
  prompt: string;
  icon: string;
  contexts?: CopilotPageContext[];
};

/** Provider contract — swap stub for OpenAI, Gemini, Claude, etc. */
export interface CopilotProvider {
  readonly id: string;
  send(input: CopilotSendInput): AsyncIterable<CopilotStreamChunk>;
}
