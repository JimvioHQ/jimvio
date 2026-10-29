"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Bot,
  CheckCircle2,
  Eye,
  Heart,
  Info,
  Loader2,
  MessageCircle,
  ScanSearch,
  ShieldAlert,
  Sparkles,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LinkCheck } from "@/lib/ugc/checker/check-link";
import type { CheckerVerdict, SignalTone } from "@/lib/ugc/checker/post-signals";
import { CampaignCheckerPanel } from "@/components/ugc/verification/CampaignCheckerPanel";

const VERDICT: Record<CheckerVerdict, { label: string; sub: string; tone: string; ring: string; icon: React.ComponentType<{ className?: string }> }> = {
  real: { label: "Looks real", sub: "Healthy numbers. No signs of bought views.", tone: "bg-emerald-600", ring: "#059669", icon: BadgeCheck },
  review: { label: "Needs a look", sub: "Some numbers are unusual. Review before paying.", tone: "bg-amber-500", ring: "#F59E0B", icon: AlertTriangle },
  suspicious: { label: "Likely bot or bought", sub: "The numbers point to fake views or likes.", tone: "bg-rose-600", ring: "#E11D48", icon: Bot },
  too_early: { label: "Too early", sub: "Not enough views yet to judge.", tone: "bg-slate-500", ring: "#64748B", icon: Info },
  unknown: { label: "Not enough data", sub: "This platform does not share numbers publicly.", tone: "bg-slate-500", ring: "#64748B", icon: Info },
};

const TONE: Record<SignalTone, { cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  good: { cls: "border-emerald-200 bg-emerald-50 text-emerald-800", icon: CheckCircle2 },
  warn: { cls: "border-amber-200 bg-amber-50 text-amber-900", icon: AlertTriangle },
  bad: { cls: "border-rose-200 bg-rose-50 text-rose-800", icon: XCircle },
  info: { cls: "border-slate-200 bg-slate-50 text-slate-700", icon: Info },
};

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 10_000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString("en-US");
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20" aria-label={`Trust score ${score} of 100`}>
      <circle cx="40" cy="40" r={r} fill="none" stroke="#E5E7EB" strokeWidth="8" />
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${(score / 100) * c} ${c}`}
        transform="rotate(-90 40 40)"
      />
      <text x="40" y="46" textAnchor="middle" className="fill-[#111827] text-[18px] font-bold">
        {score}
      </text>
    </svg>
  );
}

function Meter({ label, value, invert = false }: { label: string; value: number | null; invert?: boolean }) {
  if (value == null) return null;
  const good = invert ? value <= 30 : value >= 70;
  const bad = invert ? value >= 70 : value < 45;
  return (
    <div>
      <div className="mb-1 flex justify-between text-[12px]">
        <span className="font-semibold text-[#374151]">{label}</span>
        <span className={cn("font-bold tabular-nums", good ? "text-emerald-700" : bad ? "text-rose-700" : "text-amber-700")}>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#F3F4F6]">
        <div
          className={cn("h-full rounded-full", good ? "bg-emerald-500" : bad ? "bg-rose-500" : "bg-amber-400")}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

type MyCampaign = { id: string; title: string; status: string };

/**
 * Jimvio View Checker: paste any video to see real vs bot signals and an AI
 * read of the content, or open a campaign to see every submission checked.
 */
export function ViewCheckerPage() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LinkCheck | null>(null);
  const [campaigns, setCampaigns] = useState<MyCampaign[]>([]);
  const [campaignId, setCampaignId] = useState("");

  useEffect(() => {
    fetch("/api/ugc/campaigns?mine=true&status=all&limit=50", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const list = (Array.isArray(j?.data) ? j.data : []) as MyCampaign[];
        setCampaigns(list);
        if (list[0]) setCampaignId(list[0].id);
      })
      .catch(() => undefined);
  }, []);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ugc/checker/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not check this link.");
      setResult(json.result as LinkCheck);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not check this link.");
    } finally {
      setBusy(false);
    }
  }

  const v = result ? VERDICT[result.assessment.verdict] : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-1 pb-16">
      <header className="relative overflow-hidden rounded-[22px] bg-[#111827] px-5 py-7 text-white sm:px-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#FF5A1F]/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide">
            <ScanSearch className="h-3.5 w-3.5" /> Jimvio View Checker
          </p>
          <h1 className="mt-3 text-[26px] font-bold leading-tight tracking-tight sm:text-[32px]">Real views or bots? Know before you pay.</h1>
          <p className="mt-2 max-w-2xl text-[14px] text-white/75">
            Paste a video link. Jimvio reads the public numbers, looks for signs of bought views and likes, and watches the
            video to judge quality and whether it looks AI-generated.
          </p>
          <form onSubmit={run} className="mt-5 flex flex-col gap-2 sm:flex-row">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=… or a TikTok / Instagram link"
              className="h-12 flex-1 rounded-2xl border border-white/10 bg-white px-4 text-[14px] text-[#111827] outline-none placeholder:text-[#9CA3AF] focus:ring-2 focus:ring-[#FF5A1F]"
              inputMode="url"
              aria-label="Video link"
            />
            <button
              type="submit"
              disabled={busy || !url.trim()}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#FF5A1F] px-6 text-[14px] font-bold text-white disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
              {busy ? "Checking… (up to a minute)" : "Check video"}
            </button>
          </form>
          {error ? <p className="mt-2 text-[13px] font-medium text-rose-300">{error}</p> : null}
        </div>
      </header>

      {result && v ? (
        <section className="space-y-4" aria-live="polite">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <div className="flex gap-4 rounded-2xl border border-[#EEF0F2] bg-white p-4 shadow-sm">
              {result.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={result.thumbnail} alt="" className="h-24 w-40 shrink-0 rounded-xl object-cover" />
              ) : null}
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">{result.platform ?? "Link"}</p>
                <p className="line-clamp-2 text-[15px] font-bold text-[#111827]">{result.title ?? result.url}</p>
                {result.channel ? <p className="text-[12.5px] text-[#6B7280]">{result.channel}</p> : null}
                <div className="mt-2 flex flex-wrap gap-3 text-[12.5px] text-[#374151]">
                  <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {fmt(result.numbers.views)}</span>
                  <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {fmt(result.numbers.likes)}</span>
                  <span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {fmt(result.numbers.comments)}</span>
                </div>
              </div>
            </div>
            <div className={cn("flex items-center gap-4 rounded-2xl p-4 text-white shadow-sm", v.tone)}>
              <div className="rounded-full bg-white p-1">
                <ScoreRing score={result.assessment.score} color={v.ring} />
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-[20px] font-bold">
                  <v.icon className="h-5 w-5" /> {v.label}
                </p>
                <p className="text-[13px] text-white/90">{v.sub}</p>
                {result.assessment.engagementRate != null ? (
                  <p className="mt-1 text-[12px] text-white/80">
                    Engagement {(result.assessment.engagementRate * 100).toFixed(1)}%
                    {result.assessment.viewsPerDay != null ? ` · ${fmt(result.assessment.viewsPerDay)} views/day` : ""}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#EEF0F2] bg-white p-4 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-[14px] font-bold text-[#111827]">
                <ShieldAlert className="h-4 w-4 text-[#FF5A1F]" /> What the numbers say
              </h2>
              <ul className="space-y-2">
                {result.assessment.signals.map((sig, i) => {
                  const t = TONE[sig.tone];
                  return (
                    <li key={i} className={cn("flex items-start gap-2 rounded-xl border px-3 py-2 text-[13px]", t.cls)}>
                      <t.icon className="mt-0.5 h-4 w-4 shrink-0" /> {sig.text}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="rounded-2xl border border-[#EEF0F2] bg-white p-4 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-[14px] font-bold text-[#111827]">
                <Sparkles className="h-4 w-4 text-[#FF5A1F]" /> What the video shows
              </h2>
              {result.content ? (
                <div className="space-y-3">
                  {result.content.summary ? <p className="text-[13px] leading-relaxed text-[#374151]">{result.content.summary}</p> : null}
                  <Meter label="AI-generated likelihood" value={result.content.aiGeneratedLikelihood} invert />
                  <Meter label="Production quality" value={result.content.qualityScore} />
                  {[...result.content.aiSignals, ...result.content.qualityNotes].length ? (
                    <ul className="list-disc space-y-0.5 pl-4 text-[12px] text-[#6B7280]">
                      {[...result.content.aiSignals, ...result.content.qualityNotes].map((n, i) => (
                        <li key={i}>{n}</li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="text-[11px] text-[#9CA3AF]">AI estimate from watching the video. Use it as a guide, not proof.</p>
                </div>
              ) : (
                <p className="text-[13px] text-[#6B7280]">Video analysis works for public YouTube videos.</p>
              )}
            </div>
          </div>

          {result.limits.length ? (
            <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-3 text-[12.5px] text-[#4B5563]">
              {result.limits.map((l, i) => (
                <p key={i} className="flex items-start gap-1.5">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {l}
                </p>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[18px] font-bold text-[#111827]">Your campaign submissions</h2>
            <p className="text-[13px] text-[#6B7280]">Every post submitted to your campaigns is checked automatically.</p>
          </div>
          {campaigns.length ? (
            <select
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              className="h-10 rounded-xl border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium"
              aria-label="Campaign"
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        {campaignId ? (
          <CampaignCheckerPanel key={campaignId} campaignId={campaignId} />
        ) : (
          <p className="rounded-2xl border border-dashed border-[#E5E7EB] bg-white p-6 text-center text-[13px] text-[#6B7280]">
            When you run a campaign, every submission appears here with its result.
          </p>
        )}
      </section>
    </div>
  );
}
