"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CampaignFunding } from "@/lib/ugc/escrow-funding";
import type { CampaignPerformance, PerformanceVerdict } from "@/lib/ugc/verification/campaign-performance";
import { VERDICT_LABELS } from "@/lib/ugc/verification/campaign-performance";
import { FLAG_LABELS, type VerificationFlag } from "@/lib/ugc/verification/signals";
import { MarkFundedDialog, DeleteCampaignDialog } from "@/components/admin/admin-campaign-dialogs";

type Data = {
  campaign: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  owner: { full_name?: string | null; username?: string | null; email?: string | null; country?: string | null } | null;
  escrow: Record<string, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  funding: CampaignFunding;
  performance: CampaignPerformance;
  submissions: (Record<string, any> & { verdict: PerformanceVerdict })[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  participants: Record<string, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  activity: { id: string; title: string; description: string | null; created_at: string }[];
  payouts: { id: string; amount: number; status: string; created_at: string }[];
};

const usd = (n: number) => `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (n: unknown) => (n == null ? "—" : Number(n).toLocaleString("en-US"));
const date = (s?: string | null) => (s ? new Date(s).toLocaleString() : "—");

const VERDICT_TONE: Record<PerformanceVerdict, string> = {
  real: "bg-emerald-50 text-emerald-700",
  held: "bg-amber-50 text-amber-800",
  not_verified: "bg-slate-100 text-slate-600",
  manual: "bg-sky-50 text-sky-700",
  checking: "bg-slate-100 text-slate-600",
};

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4", className)}>
      <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{title}</h2>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-[var(--color-border)]/50 py-1.5 text-[13px] last:border-0">
      <span className="text-[var(--color-text-muted)]">{k}</span>
      <span className="text-right font-medium text-[var(--color-text-primary)]">{v}</span>
    </div>
  );
}

/** Admin: full review of one campaign, with funding and permanent delete. */
export function AdminCampaignReview({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"fund" | "delete" | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/ugc/campaigns/${campaignId}`, { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) setError(json.error ?? "Could not load campaign.");
    else setData(json as Data);
  }, [campaignId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <p className="rounded-xl bg-rose-50 p-4 text-[13px] text-rose-700">{error}</p>;
  if (!data) return <Loader2 className="h-6 w-6 animate-spin text-[#FF5A1F]" />;

  const c = data.campaign;
  const f = data.funding;
  const p = data.performance;

  return (
    <div className="space-y-5">
      <Link href="/admin/ugc" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-text-secondary)]">
        <ArrowLeft className="h-4 w-4" /> Campaign Management
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Campaign review</p>
          <h1 className="text-[24px] font-semibold text-[var(--color-text-primary)]">{c.title}</h1>
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            {c.vendor?.business_name ?? "Brand"} · <span className="capitalize">{c.status}</span> · created {date(c.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/ugc/${c.id}`}
            target="_blank"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[var(--color-border)] px-3 text-[12px] font-semibold"
          >
            Public brief <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          {f.state !== "funded" && c.status !== "cancelled" && c.status !== "completed" ? (
            <button
              type="button"
              onClick={() => setDialog("fund")}
              className="inline-flex h-9 items-center rounded-md bg-emerald-600 px-3 text-[12px] font-semibold text-white"
            >
              Mark as Funded
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setDialog("delete")}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-rose-600 px-3 text-[12px] font-semibold text-white"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete permanently
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Campaign">
          <Row k="Type" v={c.campaign_type ?? "—"} />
          <Row k="Payment" v={c.payment_model === "per_views" ? `${usd(c.rate_per_1k_views)} / 1K views` : `${usd(c.fixed_rate)} per post`} />
          <Row k="Max per post" v={c.max_payout_per_sub ? usd(c.max_payout_per_sub) : "—"} />
          <Row k="Platforms" v={(c.allowed_platforms ?? []).join(", ") || "—"} />
          <Row k="Starts / ends" v={`${date(c.starts_at)} → ${date(c.ends_at)}`} />
          <Row k="Review mode" v={c.review_mode === "auto" ? "Jimvio reviews" : "Owner reviews"} />
          <Row k="Participants" v={num(data.participants.length)} />
        </Card>
        <Card title="Money">
          <Row k="Budget" v={usd(f.budgetUsd)} />
          <Row k="Held in escrow" v={usd(f.heldUsd)} />
          <Row k="Paid / reserved" v={usd(f.spentUsd)} />
          <Row k="Left to pay" v={usd(f.remainingUsd)} />
          <Row
            k="State"
            v={
              <span className={f.state === "funded" ? "text-emerald-700" : "text-amber-700"}>
                {f.state === "funded" ? "Fully funded" : f.state === "partly_funded" ? `${f.coveragePct}% funded` : "Not funded"}
              </span>
            }
          />
          {data.escrow.map((e) => (
            <p key={String(e.id)} className="mt-2 rounded-lg bg-black/[0.03] px-2 py-1.5 text-[11.5px] text-[var(--color-text-secondary)]">
              {String(e.status)} · {Number(e.amount).toLocaleString()} {String(e.currency)} · {String(e.payment_method ?? "—")} ·{" "}
              {String(e.payment_ref ?? "—")} · {date(e.deposited_at as string)}
            </p>
          ))}
        </Card>
        <Card title="Owner">
          <Row k="Name" v={data.owner?.full_name ?? "—"} />
          <Row k="Username" v={data.owner?.username ? <Link href={`/u/${data.owner.username}`} className="text-[#FF5A1F]">@{data.owner.username}</Link> : "—"} />
          <Row k="Email" v={data.owner?.email ?? "—"} />
          <Row k="Country" v={data.owner?.country ?? "—"} />
          <Row k="Brand verified" v={c.vendor?.verification_status ?? "—"} />
        </Card>
      </div>

      <Card title="Brief">
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--color-text-secondary)]">{c.description || "No description."}</p>
        {c.content_guidelines ? (
          <p className="mt-2 whitespace-pre-wrap text-[12.5px] text-[var(--color-text-muted)]">{c.content_guidelines}</p>
        ) : null}
      </Card>

      <Card title={`Submissions & view checker (${data.submissions.length})`}>
        <p className="mb-3 rounded-xl bg-black/[0.03] px-3 py-2 text-[13px] text-[var(--color-text-secondary)]">{p.summary}</p>
        {data.submissions.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-[12.5px]">
              <thead className="text-[11px] uppercase text-[var(--color-text-muted)]">
                <tr>
                  <th className="py-2 pr-3">Creator</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Result</th>
                  <th className="py-2 pr-3 text-right">At submit</th>
                  <th className="py-2 pr-3 text-right">Now</th>
                  <th className="py-2 pr-3 text-right">Accepted</th>
                  <th className="py-2 pr-3">AI / quality</th>
                  <th className="py-2 pr-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]/50">
                {data.submissions.map((s) => {
                  const inf = Array.isArray(s.influencer) ? s.influencer[0] : s.influencer;
                  const cc = s.content_check as { aiGeneratedLikelihood?: number; qualityScore?: number } | null;
                  return (
                    <tr key={s.id} className="align-top">
                      <td className="py-2 pr-3">
                        <p className="font-semibold">{inf?.display_name ?? "Creator"}</p>
                        <a href={s.post_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#FF5A1F]">
                          {s.platform} post ↗
                        </a>
                      </td>
                      <td className="py-2 pr-3 capitalize">{String(s.status).replace("_", " ")}</td>
                      <td className="py-2 pr-3">
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", VERDICT_TONE[s.verdict])}>
                          {VERDICT_LABELS[s.verdict]}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{num(s.baseline_views)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{num(s.latest_views)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{num(s.accepted_views)}</td>
                      <td className="py-2 pr-3">
                        {cc?.aiGeneratedLikelihood != null ? `AI ${cc.aiGeneratedLikelihood}%` : "—"}
                        {cc?.qualityScore != null ? ` · Q ${cc.qualityScore}` : ""}
                      </td>
                      <td className="py-2 pr-3 text-[11.5px] text-[var(--color-text-muted)]">
                        {(s.verification_flags ?? []).length
                          ? (s.verification_flags as string[]).map((fl) => FLAG_LABELS[fl as VerificationFlag] ?? fl).join(" ")
                          : s.verification_note ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[13px] text-[var(--color-text-muted)]">No submissions yet.</p>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={`Payouts (${data.payouts.length})`}>
          {data.payouts.length ? (
            data.payouts.map((po) => <Row key={po.id} k={`${date(po.created_at)} · ${po.status}`} v={usd(po.amount)} />)
          ) : (
            <p className="text-[13px] text-[var(--color-text-muted)]">No payouts.</p>
          )}
        </Card>
        <Card title="Activity">
          {data.activity.length ? (
            data.activity.map((a) => (
              <div key={a.id} className="border-b border-[var(--color-border)]/50 py-1.5 text-[12.5px] last:border-0">
                <p className="font-medium">{a.title}</p>
                <p className="text-[11.5px] text-[var(--color-text-muted)]">
                  {date(a.created_at)}
                  {a.description ? ` · ${a.description}` : ""}
                </p>
              </div>
            ))
          ) : (
            <p className="text-[13px] text-[var(--color-text-muted)]">No activity.</p>
          )}
        </Card>
      </div>

      {dialog === "fund" ? (
        <MarkFundedDialog
          campaign={{ id: c.id, title: c.title, total_budget: Number(c.total_budget ?? 0), heldUsd: f.heldUsd }}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            void load();
          }}
        />
      ) : null}
      {dialog === "delete" ? (
        <DeleteCampaignDialog
          campaign={{ id: c.id, title: c.title }}
          onClose={() => setDialog(null)}
          onDone={() => {
            toast.success("Campaign deleted.");
            router.push("/admin/ugc");
          }}
        />
      ) : null}
    </div>
  );
}
