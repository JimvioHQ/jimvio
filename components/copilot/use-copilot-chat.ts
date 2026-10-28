"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AiChatMessageData } from "@/components/marketplace/ai/ai-chat-message";
import { affiliatePromotionUsesLiveModel } from "@/lib/ai/affiliate-workspace";
import { shouldRouteToAgent } from "@/lib/ai/agent/plan";
import { planGuideTurn, writePendingAction } from "@/lib/ai/action-guide";
import {
  completeAssistantTurn,
  failAssistantTurn,
  isAppOfflineError,
  isCurrentGeneration,
  isJimvioGuide,
  prepareChatTurn,
} from "@/lib/ai/chat-turn";
import { parseAiTriggers, stripTriggersForDisplay } from "@/lib/ai/chat-shared";
import { getCopilotProvider } from "@/lib/ai/copilot/provider";
import { loadCopilotSession, saveCopilotSession } from "@/lib/ai/copilot/session";
import type { CopilotPageContext } from "@/lib/store/use-ai-store";
import { useAIStore } from "@/lib/store/use-ai-store";

const EMPTY_MESSAGES: AiChatMessageData[] = [];
const EXECUTION_KEY = "jimvio_ai_execution_v1";
const AGENT_CONFIRM =
  /^(yes|yep|yeah|confirm|confirmed|create it|go ahead|do it|please create( it)?|try again|try the remaining steps)\b/i;
const AGENT_CANCEL = /^(no|nope|cancel|stop|don't|do not)\b/i;

function readExecutionId() {
  if (typeof window === "undefined") return null;
  try {
    const value = sessionStorage.getItem(EXECUTION_KEY);
    return value && value.startsWith("ai:") ? value : null;
  } catch {
    return null;
  }
}

function writeExecutionId(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (!id) sessionStorage.removeItem(EXECUTION_KEY);
    else sessionStorage.setItem(EXECUTION_KEY, id);
  } catch {
    // Private browsing can block session storage. The reply is still shown.
  }
}
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

function settleStopped(messages: AiChatMessageData[]) {
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
      generationRef.current += 1;
      sendingRef.current = false;
      if (streamRaf.current != null) cancelAnimationFrame(streamRaf.current);
      setStoredMessages((prev) => settleStopped(prev));
    };
  }, []);

  const sendMessage = useCallback(
    (text: string, options?: { regenerateFromId?: string; actionId?: string; affiliateTask?: string }): boolean => {
      if (sendingRef.current) return false;

      let baseMessages = readMessages();
      let messageText = text.trim();

      if (options?.regenerateFromId) {
        const current = readMessages();
        const idx = current.findIndex((m) => m.id === options.regenerateFromId);
        const userBefore = idx > 0 ? current[idx - 1] : undefined;
        if (userBefore?.role !== "user" || !userBefore.content.trim()) return false;
        baseMessages = current;
        messageText = userBefore.content.trim();
      }

      if (!messageText) return false;

      const replaced = options?.regenerateFromId
        ? baseMessages.find((message) => message.id === options.regenerateFromId)
        : undefined;

      const liveAffiliate = affiliatePromotionUsesLiveModel({
        message: messageText,
        affiliateTask: options?.affiliateTask,
      });
      const executionId = readExecutionId();
      const confirming = Boolean(executionId && AGENT_CONFIRM.test(messageText));
      const cancelling = Boolean(executionId && AGENT_CANCEL.test(messageText));
      if (!liveAffiliate && (confirming || cancelling || shouldRouteToAgent(messageText))) {
        const userMsg: AiChatMessageData = {
          id: `${Date.now()}-user`,
          role: "user",
          content: messageText,
        };
        setMessages((prev) => {
          if (options?.regenerateFromId) {
            const idx = prev.findIndex((message) => message.id === options.regenerateFromId);
            return idx >= 0 ? prev.slice(0, idx) : prev;
          }
          return [...prev, userMsg];
        });
        sendingRef.current = true;
        setIsSending(true);
        setStatus("thinking");
        const aiId = `${Date.now()}-ai`;
        setMessages((prev) => [...prev, { id: aiId, role: "ai", content: "", thinking: true }]);
        void (async () => {
          try {
            const response = await fetch("/api/ai/actions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(
                cancelling
                  ? { executionId, cancel: true }
                  : confirming
                    ? { executionId, confirm: true }
                    : { task: messageText },
              ),
            });
            const data = (await response.json().catch(() => null)) as {
              handled?: boolean;
              error?: string;
              content?: string;
              links?: AiChatMessageData["links"];
              followups?: string[];
              executionId?: string;
              status?: string;
            } | null;
            if (response.status === 401) {
              writeExecutionId(null);
              setMessages((prev) =>
                prev.map((message) =>
                  message.id === aiId
                    ? {
                        ...message,
                        thinking: false,
                        content: "Sign in to use Jimvio AI on your account. Nothing was created.",
                        links: [{ label: "Sign in", href: "/login?next=/ai" }],
                      }
                    : message,
                ),
              );
              setStatus("ready");
              return;
            }
            if (!response.ok || !data) {
              setMessages((prev) =>
                prev.map((message) =>
                  message.id === aiId
                    ? {
                        ...message,
                        thinking: false,
                        content: data?.error || "Jimvio AI could not complete that action. Nothing further was run.",
                      }
                    : message,
                ),
              );
              setStatus("ready");
              return;
            }
            if (data.handled === false) {
              const guided = planGuideTurn(messageText);
              if (guided) writePendingAction(guided.pending);
              setMessages((prev) =>
                prev.map((message) =>
                  message.id === aiId
                    ? {
                        ...message,
                        thinking: false,
                        content: guided?.content || "Tell me what you want to do on Jimvio.",
                        links: guided?.links,
                        followups: guided?.followups,
                      }
                    : message,
                ),
              );
              setStatus("ready");
              return;
            }
            const keep =
              data.executionId &&
              (data.status === "awaiting_confirmation" || data.status === "partial" || data.status === "failed")
                ? data.executionId
                : null;
            writeExecutionId(keep);
            const followups =
              data.status === "awaiting_confirmation"
                ? ["Yes, create it", "Cancel"]
                : data.status === "partial" || data.status === "failed"
                  ? ["Try the remaining steps"]
                  : undefined;
            setMessages((prev) =>
              prev.map((message) =>
                message.id === aiId
                  ? {
                      ...message,
                      thinking: false,
                      content: data.content || "Jimvio AI did not return a result.",
                      links: data.links,
                      followups,
                    }
                  : message,
              ),
            );
            setStatus("ready");
          } catch {
            setMessages((prev) =>
              prev.map((message) =>
                message.id === aiId
                  ? {
                      ...message,
                      thinking: false,
                      content: "Jimvio AI could not reach the server. Nothing further was run.",
                    }
                  : message,
              ),
            );
            setStatus("offline");
          } finally {
            sendingRef.current = false;
            setIsSending(false);
          }
        })();
        return true;
      }

      const guided = liveAffiliate ? null : planGuideTurn(messageText);
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

        if (guided.execute) {
          const execute = guided.execute;
          sendingRef.current = true;
          setIsSending(true);
          setStatus("thinking");
          const aiId = `${Date.now()}-ai`;
          setMessages((prev) => [...prev, { id: aiId, role: "ai", content: "", thinking: true }]);
          void (async () => {
            try {
              const response = await fetch("/api/ai/actions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  operation: execute.operation,
                  confirm: true,
                  name: execute.name,
                  description: execute.description,
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
                          content: `Created the free public community “${data.community?.name || execute.name}”.`,
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
          })();
          return true;
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
        return true;
      }

      const prepared = prepareChatTurn({
        messages: baseMessages,
        text: messageText,
        busy: false,
        regenerateFromId: options?.regenerateFromId,
      });
      if (!prepared.accepted) return false;

      abortRef.current?.abort();
      const request = new AbortController();
      abortRef.current = request;
      const generation = generationRef.current + 1;
      generationRef.current = generation;
      sendingRef.current = true;

      const history = prepared.history;
      const aiId = prepared.assistantId;
      setMessages(prepared.messages);
      setIsSending(true);
      setStatus("thinking");

      const flushStream = () => {
        if (!isCurrentGeneration(generationRef.current, generation)) {
          streamRaf.current = null;
          return;
        }
        const content = pendingContent.current;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId
              ? {
                  ...m,
                  content: stripTriggersForDisplay(content),
                  thinking: !content.trim(),
                  streaming: Boolean(content.trim()),
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

      void (async () => {
        try {
          const provider = getCopilotProvider("jimvio-ai");
          let fullContent = "";
          let metadata: Partial<AiChatMessageData> = {};

          for await (const chunk of provider.send({
            message: messageText,
            history,
            context: pageContext as CopilotPageContext,
            pathname,
            actionId: options?.actionId,
            affiliateTask: options?.affiliateTask,
            signal: request.signal,
          })) {
            if (request.signal.aborted || !isCurrentGeneration(generationRef.current, generation)) return;
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

          if (!isCurrentGeneration(generationRef.current, generation)) return;
          const parsed = parseAiTriggers(fullContent);
          const content = metadata.content || parsed.cleaned || stripTriggersForDisplay(fullContent);
          const guide = Boolean(metadata.fallback) || isJimvioGuide(content);
          setMessages((prev) =>
            completeAssistantTurn(prev, aiId, { content, fallback: guide }).map((m) =>
              m.id === aiId
                ? {
                    ...m,
                    ...metadata,
                    content: m.content,
                    fallback: m.fallback,
                    thinking: false,
                    streaming: false,
                    followups: parsed.followups ?? metadata.followups,
                    links: parsed.links ?? metadata.links,
                  }
                : m,
            ),
          );
          setStatus("ready");
        } catch (error) {
          if (!isCurrentGeneration(generationRef.current, generation)) return;
          const timedOut = request.signal.aborted;
          setMessages((prev) =>
            failAssistantTurn(prev, aiId, { timedOut, previous: replaced }),
          );
          setStatus(isAppOfflineError(error) ? "offline" : "ready");
        } finally {
          if (isCurrentGeneration(generationRef.current, generation)) {
            sendingRef.current = false;
            setIsSending(false);
            pendingContent.current = "";
          }
        }
      })();
      return true;
    },
    [pageContext, pathname, setMessages, setStatus],
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
