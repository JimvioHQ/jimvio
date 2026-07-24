"use client";

import { useMemo, useState } from "react";
import { Copy, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getAiContentProvider,
  type AiContentDraft,
  type AiContentKind,
  type AiNativeContext,
} from "@/lib/ai/native";

const KINDS: { id: AiContentKind; label: string }[] = [
  { id: "post", label: "Posts" },
  { id: "article", label: "Articles" },
  { id: "product_description", label: "Product descriptions" },
  { id: "campaign_brief", label: "Campaign briefs" },
  { id: "course_outline", label: "Course outlines" },
  { id: "community_rules", label: "Community rules" },
  { id: "welcome_message", label: "Welcome messages" },
  { id: "email_campaign", label: "Email campaigns" },
  { id: "affiliate_promo", label: "Affiliate promotions" },
  { id: "social_caption", label: "Social captions" },
  { id: "announcement", label: "Announcements" },
  { id: "reply", label: "Replies" },
  { id: "marketing_copy", label: "Marketing copy" },
];

export function AiContentStudio({
  context,
  className,
}: {
  context: AiNativeContext;
  className?: string;
}) {
  const [kind, setKind] = useState<AiContentKind>("announcement");
  const [draft, setDraft] = useState<AiContentDraft | null>(null);
  const [copied, setCopied] = useState(false);
  const providerId = useMemo(() => getAiContentProvider().id, []);

  async function generate() {
    const next = await Promise.resolve(
      getAiContentProvider().generate(kind, context)
    );
    setDraft(next);
    setCopied(false);
  }

  async function copy() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft.body);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5",
        className
      )}
      aria-label="AI content studio"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden />
            AI Content Studio
          </h3>
          <p className="mt-1 text-[12.5px] text-[var(--color-text-muted)]">
            Generate posts, briefs, emails, and more · provider `{providerId}`
          </p>
        </div>
        <button
          type="button"
          onClick={generate}
          className="rounded-full bg-[var(--color-accent)] px-3 py-1.5 text-[11px] font-semibold text-white"
        >
          Generate
        </button>
      </div>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => setKind(k.id)}
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
              kind === k.id
                ? "border-[var(--color-accent)]/40 bg-[var(--color-accent-subtle)] text-[var(--color-accent)]"
                : "border-[var(--color-border)] text-[var(--color-text-muted)]"
            )}
          >
            {k.label}
          </button>
        ))}
      </div>

      {draft ? (
        <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] font-bold text-[var(--color-text-primary)]">
              {draft.title}
            </p>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
            >
              <Copy className="h-3 w-3" aria-hidden />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">{draft.tone}</p>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">
            {draft.body}
          </pre>
        </div>
      ) : (
        <p className="mt-3 rounded-xl border border-dashed border-[var(--color-border)] px-3 py-4 text-[13px] text-[var(--color-text-muted)]">
          Choose a format and generate a draft. Swap providers later without UI changes.
        </p>
      )}
    </section>
  );
}
