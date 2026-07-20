"use client";

import { useEffect, useState } from "react";
import { MessageSquarePlus } from "lucide-react";

type Item = {
  id: string;
  category: string;
  message: string;
  page_path?: string | null;
  status: string;
  created_at: string;
  admin_notes?: string | null;
};

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/feedback?limit=100");
      const data = res.ok ? await res.json() : { items: [] };
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function setStatus(id: string, status: string) {
    await fetch("/api/admin/feedback", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    void load();
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#fd5000]">Soft launch</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--color-text-primary)]">Product feedback</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Bugs, ideas, and general feedback from signed-in users.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">No feedback yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                <MessageSquarePlus className="h-3.5 w-3.5 text-[#fd5000]" />
                <span className="font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                  {item.category}
                </span>
                <span>·</span>
                <span>{item.status}</span>
                <span>·</span>
                <span>{new Date(item.created_at).toLocaleString()}</span>
                {item.page_path ? (
                  <>
                    <span>·</span>
                    <span>{item.page_path}</span>
                  </>
                ) : null}
              </div>
              <p className="whitespace-pre-wrap text-sm text-[var(--color-text-primary)]">{item.message}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["open", "triaged", "resolved", "wontfix"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatus(item.id, status)}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${
                      item.status === status
                        ? "border-[#fd5000] text-[#fd5000]"
                        : "border-[var(--color-border)] text-[var(--color-text-muted)]"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
