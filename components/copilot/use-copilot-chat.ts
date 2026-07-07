"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AiChatMessageData } from "@/components/marketplace/ai/ai-chat-message";
import { MAX_CHAT_HISTORY, stripTriggersForDisplay } from "@/lib/ai/chat-shared";
import { getCopilotProvider } from "@/lib/ai/copilot/provider";
import { loadCopilotSession, saveCopilotSession } from "@/lib/ai/copilot/session";
import type { CopilotPageContext } from "@/lib/store/use-ai-store";
import { useAIStore } from "@/lib/store/use-ai-store";

export function useCopilotChat() {
  const pageContext = useAIStore((s) => s.pageContext);
  const pathname = useAIStore((s) => s.pathname);
  const setStatus = useAIStore((s) => s.setStatus);
  const [messages, setMessages] = useState<AiChatMessageData[]>(() => loadCopilotSession());
  const [isSending, setIsSending] = useState(false);
  const streamRaf = useRef<number | null>(null);
  const pendingContent = useRef("");

  useEffect(() => {
    saveCopilotSession(messages);
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string, options?: { regenerateFromId?: string; actionId?: string }) => {
      if (isSending) return;

      let baseMessages = messages;
      let messageText = text.trim();

      if (options?.regenerateFromId) {
        const idx = messages.findIndex((m) => m.id === options.regenerateFromId);
        if (idx > 0) {
          const userBefore = messages[idx - 1];
          if (userBefore?.role === "user") {
            baseMessages = messages.slice(0, idx);
            messageText = userBefore.content;
          }
        }
      }

      if (!messageText) return;

      const userMsg: AiChatMessageData = {
        id: `${Date.now()}-user`,
        role: "user",
        content: messageText,
      };

      const history = baseMessages
        .filter((m) => m.content.trim() && !m.thinking)
        .map((m) => ({
          role: (m.role === "ai" ? "assistant" : "user") as "assistant" | "user",
          content: m.content,
        }))
        .slice(-MAX_CHAT_HISTORY);

      setMessages((prev) => {
        if (options?.regenerateFromId) {
          return prev.slice(0, prev.findIndex((m) => m.id === options.regenerateFromId));
        }
        return [...prev, userMsg];
      });
      setIsSending(true);
      setStatus("thinking");

      const aiId = `${Date.now()}-ai`;
      setMessages((prev) => [...prev, { id: aiId, role: "ai", content: "", thinking: true }]);

      const flushStream = () => {
        const content = pendingContent.current;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId
              ? {
                  ...m,
                  content: stripTriggersForDisplay(content),
                  thinking: !content.trim(),
                }
              : m,
          ),
        );
        streamRaf.current = null;
      };

      const scheduleStreamUpdate = (content: string) => {
        pendingContent.current = content;
        if (streamRaf.current == null) {
          streamRaf.current = requestAnimationFrame(flushStream);
        }
      };

      try {
        const provider = getCopilotProvider("stub");
        let fullContent = "";
        let metadata: Partial<AiChatMessageData> = {};

        for await (const chunk of provider.send({
          message: messageText,
          history,
          context: pageContext as CopilotPageContext,
          pathname,
          actionId: options?.actionId,
        })) {
          if (chunk.type === "text-delta" && chunk.text) {
            fullContent += chunk.text;
            setStatus("streaming");
            scheduleStreamUpdate(fullContent);
          } else if (chunk.type === "metadata" && chunk.message) {
            metadata = chunk.message;
          }
        }

        if (streamRaf.current != null) {
          cancelAnimationFrame(streamRaf.current);
          streamRaf.current = null;
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId
              ? {
                  ...m,
                  content: stripTriggersForDisplay(fullContent),
                  thinking: false,
                  ...metadata,
                }
              : m,
          ),
        );
        setStatus("ready");
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId
              ? {
                  ...m,
                  thinking: false,
                  content: "Something went wrong. Please try again.",
                }
              : m,
          ),
        );
        setStatus("offline");
      } finally {
        setIsSending(false);
        pendingContent.current = "";
      }
    },
    [isSending, messages, pageContext, pathname, setStatus],
  );

  const clearHistory = useCallback(() => {
    setMessages([]);
    saveCopilotSession([]);
  }, []);

  return {
    messages,
    isSending,
    sendMessage,
    clearHistory,
    setMessages,
  };
}
