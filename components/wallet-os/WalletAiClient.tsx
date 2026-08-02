"use client";

import { useState } from "react";
import { Bot, Send, Sparkles, User } from "lucide-react";
import {
  WalletButton,
  WalletCard,
  WalletErrorState,
  WalletLoading,
  WalletSectionHeading,
  cn,
  useWalletFetch,
} from "./wallet-ui";

interface AiMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
}

interface AiInsight {
  id: string;
  title: string;
  detail?: string;
}

interface WalletAiResponse {
  greeting?: string;
  insights?: AiInsight[];
  suggestions?: string[];
}

const FALLBACK_SUGGESTIONS = [
  "How much did I earn this month?",
  "When will my escrow funds release?",
  "What's my best-performing income source?",
  "Help me plan a withdrawal",
];

export function WalletAiClient() {
  const { status, data, error, retry } = useWalletFetch<WalletAiResponse>("/api/wallet/os/ai");
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: AiMessage = { id: `u-${Date.now()}`, role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/wallet/os/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      if (!res.ok) throw new Error("The AI assistant isn't available yet.");
      const json = await res.json();
      const reply: AiMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: json.reply || json.message || "I couldn't generate a response just now.",
      };
      setMessages((prev) => [...prev, reply]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: err instanceof Error ? err.message : "Something went wrong reaching the assistant.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  const suggestions = data?.suggestions?.length ? data.suggestions : FALLBACK_SUGGESTIONS;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <WalletSectionHeading
        eyebrow="Jimvio Wallet OS"
        title="AI Assistant"
        description="Ask about balances, earnings trends, escrow timing, or the best time to withdraw."
        className="mb-6"
      />

      {status === "loading" && <WalletLoading label="Waking up the assistant…" />}
      {status === "error" && (
        <WalletErrorState message={error || "The AI assistant endpoint isn't available yet."} onRetry={retry} />
      )}

      {(status === "ready" || status === "empty") && (
        <div className="space-y-4">
          {(data?.insights?.length ?? 0) > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {data!.insights!.map((insight) => (
                <WalletCard key={insight.id} className="flex flex-col gap-1.5 p-4">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[#FFF1EA] text-[#D6480F]">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-[12.5px] font-semibold text-[#121113]">{insight.title}</p>
                  {insight.detail && <p className="text-[11px] leading-relaxed text-[#8B8579]">{insight.detail}</p>}
                </WalletCard>
              ))}
            </div>
          )}

          <WalletCard tone="ink" className="flex min-h-[420px] flex-col overflow-hidden">
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              <div className="flex items-start gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#FF5A1F]/20 text-[#FF7A45]">
                  <Bot className="h-4 w-4" />
                </span>
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white/[0.06] px-3.5 py-2.5 text-[13px] leading-relaxed text-white/85">
                  {data?.greeting ||
                    "Hi, I'm your Jimvio wallet assistant. Ask me anything about your balances, earnings, or withdrawals."}
                </div>
              </div>

              {messages.map((m) => (
                <div key={m.id} className={cn("flex items-start gap-2.5", m.role === "user" && "flex-row-reverse")}>
                  <span
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-full",
                      m.role === "user" ? "bg-white/10 text-white/70" : "bg-[#FF5A1F]/20 text-[#FF7A45]",
                    )}
                  >
                    {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </span>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                      m.role === "user" ? "rounded-tr-sm bg-[#FF5A1F] text-white" : "rounded-tl-sm bg-white/[0.06] text-white/85",
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#FF5A1F]/20 text-[#FF7A45]">
                    <Bot className="h-4 w-4" />
                  </span>
                  <span className="flex gap-1 rounded-2xl rounded-tl-sm bg-white/[0.06] px-3.5 py-2.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50 [animation-delay:-0.2s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50 [animation-delay:-0.1s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50" />
                  </span>
                </div>
              )}
            </div>

            {messages.length === 0 && (
              <div className="flex flex-wrap gap-1.5 border-t border-white/[0.06] px-5 py-3">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => sendMessage(s)}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11.5px] font-medium text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendMessage(input);
              }}
              className="flex items-center gap-2 border-t border-white/[0.06] p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your wallet…"
                disabled={sending}
                className="h-11 flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 text-[13px] text-white placeholder:text-white/35 outline-none focus:border-[#FF5A1F]/60"
              />
              <WalletButton type="submit" variant="primary" size="icon" loading={sending} disabled={!input.trim()}>
                <Send className="h-4 w-4" />
              </WalletButton>
            </form>
          </WalletCard>
        </div>
      )}
    </div>
  );
}
