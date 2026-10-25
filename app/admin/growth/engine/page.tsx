"use client";

import { FormEvent, useEffect, useState, type ReactNode } from "react";

type Snapshot = {
  status: "paused" | "running";
  effectiveStatus: "paused" | "running";
  killSwitch: boolean;
  pausedReason: string;
  persisted: boolean;
  persistenceError: string | null;
  limits: { maxTasksPerRun: number; maxDailyTasks: number; maxDailyExternalCalls: number };
  daily: { date: string; tasks: number; externalCalls: number };
  opportunities: Array<{ id: string; title: string; confidence: string; benefitBasis: string; nextAction: string; evidence: Array<{ kind: string; statement: string }> }>;
  drafts: Array<{ id: string; title: string; status: string; publication: string; appliedToSite: boolean; qualityIssues: string[] }>;
  followups: Array<{ id: string; trigger: string; status: string; reason: string; sent: boolean }>;
  referrals: Array<{ id: string; status: string; issued: boolean; flags: string[]; calculatedRewardUsd: number | null }>;
  campaigns: Array<{ id: string; landingPath: string; spendEnabled: boolean; submitted: boolean; estimatedCostUsd: null; reason: string }>;
  providers: Array<{ id: string; name: string; connected: boolean; priceStatus: string; summary: string }>;
  runs: Array<{ id: string; status: string; summary: string; tasksRun: number; errors: string[] }>;
  costs: Array<{ id: string; provider: string; amountUsd: number | null; basis: string; note: string }>;
  recovery: string[];
  lock?: { held: boolean; until: string | null };
  lastError: string | null;
  sentFollowups: number;
  issuedRewards: number;
  submittedCampaigns: number;
};

export default function GrowthEnginePage() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState("");
  const load = () => fetch("/api/admin/growth/engine").then((response) => response.json()).then(setData).catch(() => setMessage("The engine status could not be loaded."));
  useEffect(() => { void load(); }, []);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setMessage("");
    const response = await fetch("/api/admin/growth/engine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error ?? "The action was blocked.");
      await load();
      return;
    }
    if (body.snapshot) setData(body.snapshot);
    setMessage(action === "run" ? "One cycle finished. No ads were submitted and no rewards were issued." : "Saved.");
  }

  async function planFollowup(event: FormEvent) {
    event.preventDefault();
    await act("plan_followup", { userId, trigger: "incomplete_onboarding", audienceCount: 1 });
    setUserId("");
  }

  return <div className="space-y-6">
    <header>
      <p className="text-xs font-semibold uppercase tracking-wider text-[#fd5000]">Growth engine</p>
      <h1 className="mt-1 text-2xl font-semibold text-[var(--color-text-primary)]">Automation control</h1>
      <p className="mt-2 max-w-3xl text-sm text-[var(--color-text-muted)]">Discovers SEO and onboarding opportunities, stores drafts, and keeps a log. It does not publish the site, send bulk email, spend on ads, or credit wallets.</p>
    </header>
    {message ? <p className="text-sm text-[var(--color-text-secondary)]">{message}</p> : null}
    {data?.persistenceError ? <p className="rounded-md border border-[#fd5000] px-3 py-2 text-sm text-[#fd5000]">{data.persistenceError}</p> : null}
    <section className="grid gap-3 sm:grid-cols-4">
      <Metric label="Status" value={data ? `${data.effectiveStatus}${data.killSwitch ? " · kill switch" : ""}` : "—"} />
      <Metric label="Tasks today" value={data ? `${data.daily.tasks}/${data.limits.maxDailyTasks}` : "—"} />
      <Metric label="In-app follow-ups sent" value={data?.sentFollowups ?? "—"} />
      <Metric label="Rewards issued / ads submitted" value={data ? `${data.issuedRewards} / ${data.submittedCampaigns}` : "—"} />
    </section>
    <section className="flex flex-wrap gap-2">
      <button className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" onClick={() => act("pause")} type="button">Pause</button>
      <button className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" onClick={() => act("resume")} type="button">Resume</button>
      <button className="rounded-md bg-[#fd5000] px-3 py-2 text-sm font-semibold text-white" onClick={() => act("run")} type="button">Run one cycle</button>
    </section>
    <p className="text-sm text-[var(--color-text-muted)]">{data?.pausedReason}</p>
    <p className="text-sm text-[var(--color-text-muted)]">{data?.lock?.held ? "A run holds the lock." : "No run holds the lock."}</p>
    {data?.lastError ? <p className="text-sm text-[#fd5000]">Last error: {data.lastError}</p> : null}

    <Panel title="Opportunities">
      {data?.opportunities.length ? data.opportunities.slice(0, 12).map((item) => <article key={item.id} className="border-t border-[var(--color-border)] py-3 text-sm">
        <p className="font-medium text-[var(--color-text-primary)]">{item.title}</p>
        <p className="text-[var(--color-text-muted)]">Confidence {item.confidence}. Benefit basis: {item.benefitBasis}.</p>
        <p className="text-[var(--color-text-secondary)]">{item.nextAction}</p>
        {item.evidence.slice(0, 2).map((evidence) => <p key={evidence.statement} className="text-[var(--color-text-muted)]">{evidence.kind}: {evidence.statement}</p>)}
      </article>) : <Empty>No cycle has stored opportunities yet.</Empty>}
    </Panel>

    <Panel title="Drafts">
      {data?.drafts.length ? data.drafts.map((draft) => <article key={draft.id} className="border-t border-[var(--color-border)] py-3 text-sm">
        <p className="font-medium text-[var(--color-text-primary)]">{draft.title}</p>
        <p className="text-[var(--color-text-muted)]">{draft.status} · {draft.publication} · live site changed: {draft.appliedToSite ? "yes" : "no"}</p>
        {draft.qualityIssues.map((issue) => <p key={issue} className="text-[#fd5000]">{issue}</p>)}
        <div className="mt-2 flex gap-2">
          <button className="text-sm underline" type="button" onClick={() => act("review_draft", { draftId: draft.id })}>Mark reviewed</button>
          <button className="text-sm underline" type="button" onClick={() => act("rollback_draft", { draftId: draft.id })}>Rollback version</button>
          <button className="text-sm underline" type="button" onClick={() => act("reject_draft", { draftId: draft.id })}>Reject</button>
        </div>
      </article>) : <Empty>No drafts yet.</Empty>}
    </Panel>

    <Panel title="Follow-ups">
      <form onSubmit={planFollowup} className="mb-3 flex flex-wrap gap-2">
        <input aria-label="User id" value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="User id for one consented reminder" className="min-w-64 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm" />
        <button className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" type="submit">Plan in-app reminder</button>
      </form>
      <p className="mb-2 text-sm text-[var(--color-text-muted)]">Planning does not send. Consent is read from the stored notification preference, not from this form. Delivery needs a separate one-time approval and sends an in-app note only.</p>
      {data?.followups.length ? data.followups.map((item) => <p key={item.id} className="border-t border-[var(--color-border)] py-2 text-sm text-[var(--color-text-secondary)]">{item.trigger} · {item.status} · sent {item.sent ? "yes" : "no"} · {item.reason}</p>) : <Empty>No follow-ups planned.</Empty>}
    </Panel>

    <Panel title="Referrals and ads">
      {data?.referrals.length ? data.referrals.map((item) => <p key={item.id} className="text-sm text-[var(--color-text-secondary)]">{item.status} · issued {item.issued ? "yes" : "no"} · flags {item.flags.join(", ") || "none"}</p>) : <Empty>No referral assessments in this record.</Empty>}
      {data?.campaigns.map((item) => <p key={item.id} className="mt-2 text-sm text-[var(--color-text-secondary)]">{item.landingPath} · spend {item.spendEnabled ? "on" : "off"} · submitted {item.submitted ? "yes" : "no"} · cost unknown. {item.reason}</p>)}
    </Panel>

    <Panel title="Providers, cost, and recent runs">
      {data?.providers.map((provider) => <p key={provider.id} className="text-sm text-[var(--color-text-secondary)]">{provider.name}: {provider.connected ? "configured" : "not configured"} · {provider.priceStatus}. {provider.summary}</p>)}
      {data?.costs.slice(-5).map((cost) => <p key={cost.id} className="mt-2 text-sm text-[var(--color-text-muted)]">{cost.provider}: {cost.amountUsd ?? "unknown"} USD ({cost.basis}). {cost.note}</p>)}
      {data?.runs.slice(-5).map((run) => <p key={run.id} className="mt-2 text-sm text-[var(--color-text-secondary)]">{run.status} · {run.tasksRun} tasks. {run.summary}</p>)}
    </Panel>

    <Panel title="Recovery">
      {data?.recovery.map((step) => <p key={step} className="text-sm text-[var(--color-text-secondary)]">{step}</p>)}
    </Panel>
  </div>;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"><p className="text-xs text-[var(--color-text-muted)]">{label}</p><p className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">{value}</p></div>;
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><h2 className="font-semibold text-[var(--color-text-primary)]">{title}</h2><div className="mt-3 space-y-2">{children}</div></section>;
}

function Empty({ children }: { children: string }) {
  return <p className="text-sm text-[var(--color-text-muted)]">{children}</p>;
}
