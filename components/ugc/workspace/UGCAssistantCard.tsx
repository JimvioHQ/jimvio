"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, FileText, Lightbulb, Loader2, Megaphone, MessageCircle, RotateCcw, Send, Sparkles, Video, X, Users, Clapperboard, MoreHorizontal, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { JIMVIO_ORANGE } from "@/lib/marketplace/category-catalog";
import { ASSISTANT_SUGGESTIONS, type AssistantCampaign, type CampaignDraft } from "@/lib/ugc/assistant";

type Msg = {
  role: "user" | "assistant";
  content: string;
  campaigns?: AssistantCampaign[];
  draft?: CampaignDraft | null;
};

const money = (n: number | null | undefined) => (n == null ? "—" : `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}`);

function payLine(c: AssistantCampaign) {
  return c.paymentModel === "fixed_per_content" ? `${money(c.fixedRate)}/post` : `${money(c.ratePer1k)}/1K`;
}

/** Shared state: the sidebar card and the full chat panel show one conversation. */
function useAssistant() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const last = useRef("");
  const abort = useRef<AbortController | null>(null);

  async function ask(raw: string) {
    const text = raw.replace(/\s+/g, " ").trim();
    if (!text || status === "loading") return;
    last.current = text;
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, { role: "user", content: text }]);
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/ugc/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
        signal: ctrl.signal,
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        reply?: string;
        campaigns?: AssistantCampaign[];
        draft?: CampaignDraft | null;
        error?: string;
        signedIn?: boolean;
      };
      if (!res.ok || !json.ok || !json.reply) {
        setStatus("error");
        setError(json.error === "rate_limit" ? "Too many questions at once. Wait a moment, then retry." : "Jimvio AI couldn't answer. Try again.");
        setMessages((m) => m.slice(0, -1));
        return;
      }
      if (typeof json.signedIn === "boolean") setSignedIn(json.signedIn);
      setMessages((m) => [...m, { role: "assistant", content: json.reply!, campaigns: json.campaigns ?? [], draft: json.draft ?? null }]);
      setStatus("idle");
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setStatus("error");
      setError("Jimvio AI couldn't be reached. Check your connection and retry.");
      setMessages((m) => m.slice(0, -1));
    }
  }

  return { messages, status, error, signedIn, ask, retry: () => void ask(last.current), reset: () => setMessages([]) };
}

type Assistant = ReturnType<typeof useAssistant>;

function DraftCard({ draft, signedIn }: { draft: CampaignDraft; signedIn: boolean | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/ugc/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, max_payout_per_sub: draft.max_payout_per_sub ?? undefined }),
      });
      const json = (await res.json().catch(() => ({}))) as { data?: { id?: string }; campaign?: { id?: string }; id?: string; error?: string };
      if (!res.ok) throw new Error(json.error || "Could not save the draft.");
      const id = json.data?.id ?? json.campaign?.id ?? json.id;
      router.push(id ? `/ugc/campaign-center/${id}/edit` : "/ugc/campaign-center/drafts");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save the draft.");
      setBusy(false);
    }
  }

  return (
    <div className="mt-1.5 rounded-lg bg-white p-2.5 text-[#111827] shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#FF5A1F]">Campaign draft</p>
      <p className="mt-0.5 text-[12px] font-bold leading-snug">{draft.title}</p>
      <dl className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10.5px]">
        <dt className="text-[#6B7280]">Pay</dt>
        <dd className="font-semibold">{draft.payment_model === "per_views" ? `${money(draft.rate_per_1k_views)} / 1K views` : `${money(draft.fixed_rate)} / post`}</dd>
        <dt className="text-[#6B7280]">Budget</dt>
        <dd className="font-semibold">{money(draft.total_budget)}</dd>
        <dt className="text-[#6B7280]">Platforms</dt>
        <dd className="font-semibold capitalize">{draft.allowed_platforms.join(", ")}</dd>
        <dt className="text-[#6B7280]">Join</dt>
        <dd className="font-semibold">{draft.join_mode === "application" ? "By request" : "Open to all"}</dd>
      </dl>
      {signedIn === false ? (
        <Link href="/login?next=/ugc" className="mt-1.5 inline-flex h-7 items-center rounded-full bg-[#FF5A1F] px-3 text-[11.5px] font-bold text-white">
          Sign in to save this draft
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          className="mt-1.5 inline-flex h-7 items-center gap-1 rounded-full bg-[#FF5A1F] px-3 text-[11.5px] font-bold text-white hover:bg-[#E54E18] disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save draft & review
        </button>
      )}
      <p className="mt-1 text-[9.5px] leading-snug text-[#6B7280]">You review and edit everything. Nothing goes live until you fund it.</p>
      {err ? <p className="mt-1 text-[10.5px] text-rose-700">{err}</p> : null}
    </div>
  );
}

function CampaignChips({ list, onCheck, compact }: { list: AssistantCampaign[]; onCheck: (campaign: AssistantCampaign) => void; compact: boolean }) {
  if (!list.length) return null;
  return (
    <div className={cn("mt-2 grid grid-cols-1 gap-2", compact ? "" : "2xl:grid-cols-2")}>
      {list.map((c) => (
        <article key={c.id} className="overflow-hidden rounded-xl border border-[#F1E4DC] bg-white text-[#111827] shadow-sm">
          <div className={cn("flex items-center gap-3", compact ? "min-h-0 p-2" : "min-h-[104px] p-3")}>
            {c.imageUrl ? (
              // Public campaign artwork only; fallback remains polished if no image is supplied.
              <span aria-hidden="true" className={cn("shrink-0 rounded-lg bg-cover bg-center bg-[#FFF1EA]", compact ? "h-11 w-11" : "h-[88px] w-[104px]")} style={{ backgroundImage: `url("${c.imageUrl}")` }} />
            ) : (
              <span className={cn("grid shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#FFF1EA] to-[#FFD2BD] text-[#F45A1B]", compact ? "h-11 w-11" : "h-[88px] w-[104px]")}><Video className="h-7 w-7" /></span>
            )}
            <span className="min-w-0 flex-1">
              <span className={cn("block line-clamp-2 font-extrabold leading-snug", compact ? "text-[11px]" : "text-[13px]")}>{c.title}</span>
              {c.brand ? <span className="mt-0.5 block truncate text-[10px] text-[#6B7280]">{c.brand}</span> : null}
              <span className="mt-1 block text-[11px] font-bold text-[#F45A1B]">{payLine(c)}</span>
              <span className="block text-[10px] text-[#6B7280]">{c.remainingUsd != null ? `${money(c.remainingUsd)} remaining` : "Live campaign"}</span>
            </span>
          </div>
          <div className={cn("grid gap-1.5 border-t border-[#F3F4F6] p-2", compact ? "grid-cols-1" : "grid-cols-2")}>
            <button type="button" onClick={() => onCheck(c)} className="inline-flex min-h-8 w-full items-center justify-center rounded-lg border border-[#FED7C7] px-2 text-[10.5px] font-bold text-[#C94A16] hover:bg-[#FFF5F0]">Check requirements</button>
            {!compact ? <Link href={`/ugc/${c.id}/join`} className="inline-flex min-h-8 w-full items-center justify-center rounded-lg bg-[#FF5A1F] px-2 text-[10.5px] font-bold text-white hover:bg-[#E94E18]">Join campaign</Link> : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function Conversation({ a, compact }: { a: Assistant; compact: boolean }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [a.messages.length, a.status]);
  const shown = compact ? a.messages.slice(-2) : a.messages;
  return (
    <div className={cn("space-y-2 overflow-y-auto", compact ? "max-h-56" : "flex-1")} aria-live="polite">
      {shown.map((m, i) =>
        m.role === "user" ? (
          <p key={i} className={cn("ml-6 rounded-xl rounded-br-sm px-2.5 py-1.5 text-[12px]", compact ? "bg-white/25 text-white" : "bg-[#FF5A1F] text-white")}>
            {m.content}
          </p>
        ) : (
          <div key={i} className={cn("rounded-xl rounded-bl-sm px-2.5 py-2 text-[12px] leading-relaxed", compact ? "bg-white/15 text-white" : "bg-[#F3F4F6] text-[#111827]")}>
            <p className="whitespace-pre-wrap">{m.content}</p>
            <CampaignChips compact={compact} list={m.campaigns ?? []} onCheck={(campaign) => void a.ask(`Please check and explain the full requirements for campaign "${campaign.title}" (campaign ID: ${campaign.id}). Use only verified campaign details and tell me what is missing from my profile, if known.`)} />
            {!compact && (m.campaigns?.length ?? 0) > 0 ? (
              <div className="mt-2 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => void a.ask(`Check the complete requirements for ${m.campaigns![0].title} (ID: ${m.campaigns![0].id}). Tell me which requirements I meet, which are missing, and which cannot be verified.`)} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#FF5A1F] px-3 text-[10.5px] font-bold text-white hover:bg-[#E94E18]">
                    <FileText className="h-3.5 w-3.5" /> View requirements
                  </button>
                  <button type="button" onClick={() => void a.ask(`Guide me through joining ${m.campaigns![0].title} (ID: ${m.campaigns![0].id}). First check the published requirements and tell me the exact next steps. Do not submit anything for me.`)} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-3 text-[10.5px] font-semibold text-[#344054] hover:bg-[#FFF8F4]">
                    <Users className="h-3.5 w-3.5" /> Help me join
                  </button>
                  <button type="button" onClick={() => void a.ask(`Create a campaign-specific short-form video concept and hook for ${m.campaigns![0].title} (ID: ${m.campaigns![0].id}), following its real requirements.`)} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-3 text-[10.5px] font-semibold text-[#344054] hover:bg-[#FFF8F4]">
                    <Clapperboard className="h-3.5 w-3.5" /> Create content idea
                  </button>
                  <Link href={`/ugc/${m.campaigns![0].id}`} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-3 text-[10.5px] font-semibold text-[#344054] hover:bg-[#FFF8F4]">
                    <MoreHorizontal className="h-3.5 w-3.5" /> More options
                  </Link>
                </div>
                <div className="rounded-xl border border-[#FFD5C3] bg-[#FFF7F2] p-2.5">
                  <p className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-[#C2410C]"><Sparkles className="h-3.5 w-3.5" /> Next step: join a campaign</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] leading-snug text-[#344054]">
                    <div><span className="mb-1 inline-grid h-5 w-5 place-items-center rounded-full bg-[#FF5A1F] font-bold text-white">1</span><p className="font-bold">Open a campaign</p><p className="text-[#667085]">Choose a card to see its brief.</p></div>
                    <div><span className="mb-1 inline-grid h-5 w-5 place-items-center rounded-full bg-[#FF5A1F] font-bold text-white">2</span><p className="font-bold">Check requirements</p><p className="text-[#667085]">Review rules and submission details.</p></div>
                    <div><span className="mb-1 inline-grid h-5 w-5 place-items-center rounded-full bg-[#FF5A1F] font-bold text-white">3</span><p className="font-bold">Join campaign</p><p className="text-[#667085]">Complete the secure join steps.</p></div>
                  </div>
                </div>
                <p className="text-[11px] text-[#667085]">Which campaign do you want to explore? I can also:</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    ["Explain requirements", "Explain the requirements for the first recommended campaign."],
                    ["Give a content idea", "Give me a campaign-specific content idea for the first recommended campaign."],
                    ["Help me write a script", "Help me write a video script for the first recommended campaign."],
                    ["Find more", "Find more live campaigns that fit my profile."],
                  ].map(([label, prompt]) => <button key={label} type="button" onClick={() => void a.ask(prompt)} className="rounded-full border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-[#344054] hover:border-[#FF5A1F]">{label}</button>)}
                </div>
              </div>
            ) : null}
            {m.draft ? <DraftCard draft={m.draft} signedIn={a.signedIn} /> : null}
          </div>
        ),
      )}
      {a.status === "loading" ? (
        <p className={cn("flex items-center gap-1.5 text-[11.5px]", compact ? "text-white/85" : "text-[#6B7280]")}>
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Jimvio AI is thinking…
        </p>
      ) : null}
      <div ref={end} />
    </div>
  );
}

function Composer({ a, light, onActivate }: { a: Assistant; light: boolean; onActivate?: () => void }) {
  const [text, setText] = useState("");
  const send = () => {
    if (!text.trim()) return;
    void a.ask(text);
    setText("");
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className={cn("flex items-center gap-1.5 rounded-xl px-3 py-1.5", light ? "bg-white shadow-sm" : "border border-[#E5E7EB] bg-white")}
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={800}
        autoFocus={!light}
        onFocus={() => { if (light) onActivate?.(); }}
        placeholder="Ask Jimvio AI…"
        aria-label="Ask Jimvio AI"
        className="min-w-0 flex-1 bg-transparent py-1 text-[12.5px] text-[#111827] outline-none placeholder:text-[#9CA3AF]"
      />
      <button
        type="submit"
        aria-label="Send"
        disabled={!text.trim() || a.status === "loading"}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[#FF5A1F] hover:bg-[#FFF1EA] disabled:opacity-40"
      >
        <Send className="h-4 w-4" />
      </button>
    </form>
  );
}

/**
 * Jimvio AI for UGC & Clipping: finds real live campaigns, explains rules,
 * writes hooks and ideas, and drafts campaigns for the owner to approve.
 */
export function UGCAssistantCard() {
  const a = useAssistant();
  const [open, setOpen] = useState(false);
  const [wide, setWide] = useState(false);
  const hasChat = a.messages.length > 0;

  return (
    <>
      <section
        aria-label="Jimvio AI"
        className="mx-2 mb-3 rounded-2xl p-3 text-white"
        style={{ background: JIMVIO_ORANGE.gradient135, boxShadow: "0 10px 28px rgba(255,90,31,0.28)" }}
      >
        <button type="button" onClick={() => setOpen(true)} className="flex w-full items-start gap-2 text-left" aria-label="Open Jimvio AI chat">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20 ring-1 ring-white/30">
            <Sparkles className="h-4.5 w-4.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="text-[15px] font-extrabold">Jimvio AI</span>
              <span className="rounded-full bg-white/25 px-1.5 py-px text-[9px] font-bold">Beta</span>
            </span>
            <span className="block text-[11px] leading-snug text-white/85">Your AI assistant for UGC & Clipping.</span>
          </span>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-white/80" />
        </button>

        <div className="mt-2 space-y-1.5 rounded-xl bg-white/12 p-1.5" style={{ background: "rgba(255,255,255,0.12)" }}>
          {hasChat ? (
            <>
              <Conversation a={a} compact />
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-white hover:underline">
                  <MessageCircle className="h-3.5 w-3.5" /> Open full chat
                </button>
                <button type="button" onClick={a.reset} className="text-[11px] text-white/75 hover:text-white">
                  New chat
                </button>
              </div>
            </>
          ) : (
            <p className="px-1 text-[11.5px] leading-snug text-white/90">Ask about campaigns, submission tips, or content ideas…</p>
          )}
          {a.status === "error" ? (
            <p className="flex items-center gap-1.5 px-1 text-[11px] text-white">
              {a.error}
              <button type="button" onClick={a.retry} className="inline-flex items-center gap-0.5 rounded-full bg-white/20 px-2 py-0.5 font-semibold">
                <RotateCcw className="h-3 w-3" /> Retry
              </button>
            </p>
          ) : null}
          <Composer a={a} light onActivate={() => setOpen(true)} />
        </div>

        {!hasChat ? (
          <div className="mt-2 rounded-xl bg-white/95 p-2.5 text-[#111827] shadow-sm">
            <p className="text-[11px] font-extrabold">Try these:</p>
            <div className="mt-1.5 flex flex-col gap-1.5">
              {ASSISTANT_SUGGESTIONS.slice(0, 4).map((s, index) => {
                const Icon = [Megaphone, Lightbulb, FileText, Video][index];
                return (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => { setOpen(true); void a.ask(s.message); }}
                    disabled={a.status === "loading"}
                    className="group flex min-h-[42px] w-full items-center gap-2 rounded-lg border border-[#F6C6B0] bg-[#FFF8F4] px-2.5 py-1.5 text-left transition-colors hover:border-[#FF9B70] hover:bg-[#FFF0E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white text-[#F45A1B]">
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1 text-[11px] font-semibold leading-snug text-[#172033]">
                      {s.label}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#344054] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      {open ? (
        <div className="fixed inset-0 z-[130] flex justify-end bg-black/30" onClick={() => setOpen(false)}>
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Jimvio AI chat"
            className={cn("flex h-full w-full max-w-none flex-col bg-white shadow-2xl transition-[width] sm:ml-auto", wide ? "sm:w-[min(84vw,1200px)]" : "sm:w-[min(54vw,820px)]") }
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center gap-2 px-4 py-3 text-white" style={{ background: JIMVIO_ORANGE.gradient135 }}>
              <Sparkles className="h-5 w-5" />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-extrabold">Jimvio AI</p>
                <p className="text-[11px] text-white/85">Campaigns, ideas, rules, and campaign drafts you approve</p>
              </div>
              <button type="button" onClick={() => setWide((v) => !v)} aria-label={wide ? "Narrow chat" : "Expand chat"} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/15">
                {wide ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/15">
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
              {hasChat ? (
                <Conversation a={a} compact={false} />
              ) : (
                <div className="flex-1 space-y-2">
                  <p className="text-[13px] text-[#4B5563]">Ask anything about UGC & Clipping. Try:</p>
                  {ASSISTANT_SUGGESTIONS.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => void a.ask(s.message)}
                      className="block min-h-10 w-full rounded-lg border border-[#F1E4DC] bg-[#FFF8F4] px-2.5 py-2 text-left text-[11.5px] font-semibold text-[#111827] hover:border-[#FF5A1F]"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
              {a.status === "error" ? (
                <p className="flex items-center gap-2 text-[12px] text-rose-700">
                  {a.error}
                  <button type="button" onClick={a.retry} className="font-semibold underline">
                    Retry
                  </button>
                </p>
              ) : null}
              <Composer a={a} light={false} />
              <p className="text-[10.5px] text-[#9CA3AF]">Jimvio AI can make mistakes. It never pays, funds or publishes anything for you.</p>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
