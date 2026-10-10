"use client";

import { useState } from "react";
import Link from "next/link";

export function SupportAssistant() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [mode, setMode] = useState<string>("");
  const [articles, setArticles] = useState<Array<{ slug: string; title: string; href: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function ask(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/support/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "The assistant could not answer.");
        setAnswer("");
      } else {
        setAnswer(data.answer || "");
        setMode(data.mode || "");
        setArticles(data.articles ?? []);
      }
    } catch {
      setError("The assistant could not answer. Search the articles or create a ticket.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Jimvio AI Support</h2>
      <p className="mt-1 text-sm text-[#6B7280]">
        Answers come from Jimvio help articles. Account balances, payouts, and approvals are confirmed only on their product pages.
      </p>
      <form onSubmit={ask} className="mt-4 space-y-3">
        <label htmlFor="support-ai-question" className="text-sm font-medium">
          Ask a question
        </label>
        <textarea
          id="support-ai-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={3}
          className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
          placeholder="How do I withdraw my earnings?"
        />
        <button
          type="submit"
          disabled={loading || question.trim().length < 2}
          className="rounded-xl bg-[#FF5A1F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Looking up articles…" : "Ask"}
        </button>
      </form>
      {error ? (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {error}{" "}
          <button type="button" className="underline" onClick={() => setQuestion((value) => value)}>
            You can retry the same question.
          </button>
        </p>
      ) : null}
      {answer ? (
        <div className="mt-4 rounded-xl bg-[#F8FAFC] p-4 text-sm leading-6 whitespace-pre-wrap">
          {mode === "knowledge" ? (
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              Knowledge base answer
            </p>
          ) : null}
          {mode === "live" ? (
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              Answer grounded in help articles
            </p>
          ) : null}
          {answer}
          {articles.length > 0 ? (
            <ul className="mt-3 space-y-1">
              {articles.map((article) => (
                <li key={article.slug}>
                  <Link href={article.href} className="font-medium text-[#FF5A1F] underline-offset-2 hover:underline">
                    {article.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          <Link href="/help/tickets/new" className="mt-3 inline-block font-semibold text-[#111827] underline">
            Create a ticket
          </Link>
        </div>
      ) : null}
    </section>
  );
}
