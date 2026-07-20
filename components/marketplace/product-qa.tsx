"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageCircleQuestion, Send, Sparkles } from "lucide-react";

type Answer = {
  id: string;
  body: string;
  is_seller?: boolean;
  created_at: string;
  profiles?: { full_name: string | null; username: string | null } | null;
};

type Question = {
  id: string;
  body: string;
  created_at: string;
  profiles?: { full_name: string | null; username: string | null; avatar_url: string | null } | null;
  product_answers?: Answer[];
};

export function ProductQA({ productId }: { productId: string }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingMigration, setPendingMigration] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}/questions`);
      const data = await res.json();
      setQuestions(data.questions ?? []);
      setPendingMigration(Boolean(data.pendingMigration));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function ask() {
    if (!text.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not post question");
        return;
      }
      setText("");
      await load();
    } catch {
      setError("Network error");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <MessageCircleQuestion className="h-4 w-4 text-[#fd5000]" />
        <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Questions & Answers</h3>
      </div>

      {pendingMigration && (
        <p className="mb-3 text-[12px] text-[var(--color-text-muted)]">
          Q&A will unlock after migration 087 is applied.
        </p>
      )}

      <div className="mb-4 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask about shipping, size, materials…"
          className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-2 text-[13px] outline-none focus:border-[#fd5000]"
          onKeyDown={(e) => {
            if (e.key === "Enter") void ask();
          }}
        />
        <button
          type="button"
          disabled={!text.trim() || sending || pendingMigration}
          onClick={() => void ask()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#fd5000] px-3 py-2 text-[12px] font-bold text-white disabled:opacity-40"
        >
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Ask
        </button>
      </div>
      {error && <p className="mb-3 text-[11px] text-red-500">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--color-text-muted)]" />
        </div>
      ) : questions.length === 0 ? (
        <p className="py-4 text-center text-[12px] text-[var(--color-text-muted)]">
          No questions yet. Be the first to ask.
        </p>
      ) : (
        <ul className="space-y-4">
          {questions.map((q) => (
            <li key={q.id} className="border-t border-[var(--color-border)] pt-3 first:border-0 first:pt-0">
              <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                Q: {q.body}
              </p>
              <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                {q.profiles?.full_name || q.profiles?.username || "Buyer"}
              </p>
              {(q.product_answers ?? []).map((a) => (
                <div key={a.id} className="mt-2 ml-3 rounded-xl bg-[var(--color-surface-secondary)] px-3 py-2">
                  <p className="text-[12px] text-[var(--color-text-primary)]">
                    <span className="font-semibold text-[#fd5000]">
                      {a.is_seller ? "Seller" : "A"}:
                    </span>{" "}
                    {a.body}
                  </p>
                </div>
              ))}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ProductAiSummary({ productId }: { productId: string }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/products/${productId}/ai-summary`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setSummary(data.summary ?? null);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[12px] text-[var(--color-text-muted)]">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#fd5000]" />
        Generating AI summary…
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="rounded-2xl border border-[#fd5000]/25 bg-gradient-to-br from-[#fd5000]/8 to-transparent px-4 py-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#fd5000]">
        <Sparkles className="h-3.5 w-3.5" /> AI summary
      </div>
      <p className="text-[13px] leading-relaxed text-[var(--color-text-primary)]">{summary}</p>
    </div>
  );
}
