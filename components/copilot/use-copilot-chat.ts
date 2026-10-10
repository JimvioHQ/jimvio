"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AiChatMessageData } from "@/components/marketplace/ai/ai-chat-message";
import { planGuideTurn, writePendingAction } from "@/lib/ai/action-guide";
import { MAX_CHAT_HISTORY, parseAiTriggers, stripTriggersForDisplay } from "@/lib/ai/chat-shared";
import { getCopilotProvider } from "@/lib/ai/copilot/provider";
import { loadCopilotSession, saveCopilotDraft, saveCopilotSession } from "@/lib/ai/copilot/session";
import type { CopilotPageContext } from "@/lib/store/use-ai-store";
import { useAIStore } from "@/lib/store/use-ai-store";

const EMPTY_MESSAGES: AiChatMessageData[] = [];
const messageListeners = new Set<() => void>();
let messageCache: AiChatMessageData[] | null = null;
let messageCacheHydrated = false;

function readMessages() {
  if (typeof window === "undefined") return EMPTY_MESSAGES;
  if (!messageCacheHydrated) {
    messageCacheHydrated = true;
    messageCache = loadCopilotSession();
  }
  return messageCache ?? EMPTY_MESSAGES;
}

function setStoredMessages(
  value: AiChatMessageData[] | ((prev: AiChatMessageData[]) => AiChatMessageData[]),
) {
  const prev = readMessages();
  const next = typeof value === "function" ? value(prev) : value;
  messageCache = next;
  saveCopilotSession(next);
  messageListeners.forEach((listener) => listener());
}

export function useCopilotChat() {
  const pageContext = useAIStore((s) => s.pageContext);
  const pathname = useAIStore((s) => s.pathname);
  const setStatus = useAIStore((s) => s.setStatus);
  const [messages, setReactMessages] = useState<AiChatMessageData[]>([]);
  const [sessionReady, setSessionReady] = useState(false);
  const setMessages = useCallback(
    (value: AiChatMessageData[] | ((prev: AiChatMessageData[]) => AiChatMessageData[])) => {
      setStoredMessages(value);
    },
    [],
  );
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const apply = () => {
      setReactMessages(readMessages());
      setSessionReady(true);
    };
    messageListeners.add(apply);
    queueMicrotask(apply);
    return () => {
      messageListeners.delete(apply);
    };
  }, []);
  const sendingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const streamRaf = useRef<number | null>(null);
  const pendingContent = useRef("");

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (streamRaf.current != null) cancelAnimationFrame(streamRaf.current);
    };
  }, []);

  const sendMessage = useCallback(
    async (text: string, options?: { regenerateFromId?: string; actionId?: string }) => {
      if (sendingRef.current) return;

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

      const guided = planGuideTurn(messageText);
      if (guided) {
        writePendingAction(guided.pending);
        const userMsg: AiChatMessageData = {
          id: `${Date.now()}-user`,
          role: "user",
          content: messageText,
        };
        const withUser = (prev: AiChatMessageData[]) => {
          if (options?.regenerateFromId) {
            const idx = prev.findIndex((m) => m.id === options.regenerateFromId);
            return idx >= 0 ? prev.slice(0, idx) : prev;
          }
          return [...prev, userMsg];
        };
        setMessages(withUser);
        saveCopilotDraft("");

        if (guided.execute) {
          sendingRef.current = true;
          setIsSending(true);
          setStatus("thinking");
          const aiId = `${Date.now()}-ai`;
          setMessages((prev) => [...prev, { id: aiId, role: "ai", content: "", thinking: true }]);
          try {
            const response = await fetch("/api/ai/actions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                operation: guided.execute.operation,
                confirm: true,
                name: guided.execute.name,
                description: guided.execute.description,
              }),
            });
            const data = (await response.json().catch(() => null)) as {
              error?: string;
              href?: string;
              manageHref?: string;
              community?: { name?: string; slug?: string };
            } | null;
            if (!response.ok || !data?.href || !data.community?.slug) {
              const signedOut = response.status === 401;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiId
                    ? {
                        ...m,
                        thinking: false,
                        content: signedOut
                          ? "Sign in to create this community. Nothing was created."
                          : data?.error || "The community was not created. Nothing was published.",
                        links: signedOut
                          ? [{ label: "Sign in", href: "/login?next=/communities/create" }]
                          : [{ label: "Open the full form", href: "/communities/create" }],
                      }
                    : m,
                ),
              );
              setStatus(signedOut ? "ready" : "offline");
            } else {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiId
                    ? {
                        ...m,
                        thinking: false,
                        content: `Created the free public community “${data.community?.name || guided.execute?.name}”.`,
                        links: [
                          { label: "Open community", href: data.href! },
                          ...(data.manageHref ? [{ label: "Manage community", href: data.manageHref }] : []),
                        ],
                      }
                    : m,
                ),
              );
              setStatus("ready");
            }
          } catch {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiId
                  ? {
                      ...m,
                      thinking: false,
                      content: "Jimvio AI could not reach the server. The community was not created.",
                      links: [{ label: "Try the form", href: "/communities/create" }],
                    }
                  : m,
              ),
            );
            setStatus("offline");
          } finally {
            sendingRef.current = false;
            setIsSending(false);
          }
          return;
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-ai`,
            role: "ai",
            content: guided.content,
            links: guided.links,
            followups: guided.followups,
          },
        ]);
        setStatus("ready");
        return;
      }

      saveCopilotDraft("");

      sendingRef.current = true;
      abortRef.current?.abort();
      const request = new AbortController();
      abortRef.current = request;
      const generation = generationRef.current + 1;
      generationRef.current = generation;

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
        const provider = getCopilotProvider("jimvio-ai");
        let fullContent = "";
        let metadata: Partial<AiChatMessageData> = {};

        if (request.signal.aborted) return;

        for await (const chunk of provider.send({
          message: messageText,
          history,
          context: pageContext as CopilotPageContext,
          pathname,
          actionId: options?.actionId,
          signal: request.signal,
        })) {
          if (request.signal.aborted) return;
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

        if (generation !== generationRef.current) return;
        const parsed = parseAiTriggers(fullContent);
        const content = metadata.content || parsed.cleaned || stripTriggersForDisplay(fullContent);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId
              ? {
                  ...m,
                  ...metadata,
                  content,
                  thinking: false,
                  followups: parsed.followups ?? metadata.followups,
                  links: parsed.links ?? metadata.links,
                }
              : m,
          ),
        );
        setStatus("ready");
      } catch {
        if (generation !== generationRef.current || request.signal.aborted) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId
              ? {
                  ...m,
                  thinking: false,
                  content: "Jimvio AI could not finish that reply. Try again.",
                }
              : m,
          ),
        );
        setStatus("offline");
      } finally {
        if (generation === generationRef.current) {
          sendingRef.current = false;
          setIsSending(false);
          pendingContent.current = "";
        }
      }
    },
    [messages, pageContext, pathname, setMessages, setStatus],
  );

  const clearHistory = useCallback(() => {
    setMessages([]);
    saveCopilotSession([]);
    writePendingAction(null);
  }, [setMessages]);

  return {
    messages: sessionReady ? messages : [],
    isSending,
    sendMessage,
    clearHistory,
    setMessages,
  };
}
