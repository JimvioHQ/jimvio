"use client";

import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { isEngineSnapshot, type EngineDashboardSnapshot } from "@/lib/growth/engine/dashboard";

type Snapshot = EngineDashboardSnapshot;

export default function GrowthEnginePage() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState("");

  async function load() {
    try {
      const response = await fetch("/api/admin/growth/engine");
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok || !isEngineSnapshot(body)) {
        const error = isRecord(body) && typeof body.error === "string" ? body.error : "The engine status could not be loaded.";
        setMessage(error);
        return;
      }
      setData(body);
    } catch {
      setMessage("The engine status could not be loaded.");
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/admin/growth/engine");
        const body: unknown = await response.json().catch(() => null);
        if (cancelled) return;
        if (!response.ok || !isEngineSnapshot(body)) {
          const error = isRecord(body) && typeof body.error === "string" ? body.error : "The engine status could not be loaded.";
          setMessage(error);
          return;
        }
        setData(body);
      } catch {
        if (!cancelled) setMessage("The engine status could not be loaded.");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setMessage("");
    const response = await fetch("/api/admin/growth/engine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const body: unknown = await response.json().catch(() => null);
    const snapshot = isRecord(body) ? body.snapshot : null;
    if (!response.ok || !isEngineSnapshot(snapshot)) {
      const error = isRecord(body) && typeof body.error === "string" ? body.error : "The action was blocked.";
      setMessage(error);
      await load();
      return;
    }
    setData(snapshot);
    setMessage(resultMessage(action, body));
  }

  async function planFollowup(event: FormEvent) {
    event.preventDefault();
    await act("plan_followup", { userId, trigger: "incomplete_onboarding", audienceCount: 1 });
    setUserId("");
  }

  const storedVersusEffective = data && data.status !== data.effectiveStatus
    ? `Stored status is ${data.status}. Effective status is ${data.effectiveStatus}.`
    : null;

  return <div className="space-y-6">
    <header>
      <p className="text-xs font-semibold uppercase tracking-wider text-[#fd5000]">Growth engine</p>
      <h1 className="mt-1 text-2xl font-semibold text-[var(--color-text-primary)]">Automation control</h1>
      <p className="mt-2 max-w-3xl text-sm text-[var(--color-text-muted)]">Discovers SEO and onboarding opportunities, stores drafts, and keeps a log. It does not publish the site, send bulk email, spend on ads, or credit wallets.</p>
    </header>
    {message ? <p className="text-sm text-[var(--color-text-secondary)]">{message}</p> : null}
    {data?.persistenceError ? <p className="rounded-md border border-[#fd5000] px-3 py-2 text-sm text-[#fd5000]">{data.persistenceError}</p> : null}
    {data?.killSwitch ? <p className="rounded-md border border-[#fd5000] px-3 py-2 text-sm text-[#fd5000]">GROWTH_ENGINE_KILL is on. Resume and cycles stay paused until that variable is removed and the deployment is updated.</p> : null}
    <section className="grid gap-3 sm:grid-cols-4">
      <Metric label="Effective status" value={data ? `${data.effectiveStatus}${data.killSwitch ? " · kill switch" : ""}` : "—"} />
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
    <p className="text-sm text-[var(--color-text-muted)]">
      {data ? `Stored status ${data.status}. Control row ${data.persisted ? "saved" : "not saved"}.` : "Status has not loaded."}
      {storedVersusEffective ? ` ${storedVersusEffective}` : ""}
    </p>
    <p className="text-sm text-[var(--color-text-muted)]">{data?.lock?.held ? "A run holds the lock." : "No run holds the lock."}</p>
    {data?.lastError ? <p className="text-sm text-[#fd5000]">Last error: {data.lastError}</p> : null}

    <Panel title="Capabilities">
      {data?.capabilities.length ? data.capabilities.map((item) => <article key={item.id} className="border-t border-[var(--color-border)] py-3 text-sm">
        <p className="font-medium text-[var(--color-text-primary)]">{item.label} · {item.state.split("_").join(" ")}</p>
        <p className="text-[var(--color-text-muted)]">{item.requirement}</p>
      </article>) : <Empty>Capability report has not loaded.</Empty>}
    </Panel>

    <Panel title="Opportunities">
      {data?.opportunities.length ? data.opportunities.slice(0, 12).map((item, index) => <OpportunityRow key={opportunityKey(item, index)} item={item} />) : <Empty>No cycle has stored opportunities yet.</Empty>}
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
      <p className="mb-2 text-sm text-[var(--color-text-muted)]">Planning does not send. Consent is read from the stored notification preference, not from this form. Approve records one use. Deliver sends an in-app note only after that approval and a fresh consent check.</p>
      {data?.followups.length ? data.followups.map((item) => <article key={item.id} className="border-t border-[var(--color-border)] py-2 text-sm text-[var(--color-text-secondary)]">
        <p>{item.trigger} · {item.status} · sent {item.sent ? "yes" : "no"} · {item.reason}</p>
        {item.status === "planned_not_sent" && !item.sent ? <div className="mt-2 flex gap-3">
          <button className="underline" type="button" onClick={() => act("approve", { riskClass: "followup_delivery", subjectId: item.id, hours: 24 })}>Approve one delivery</button>
          <button className="underline" type="button" onClick={() => act("deliver_followup", { followupId: item.id })}>Deliver in-app note</button>
        </div> : null}
      </article>) : <Empty>No follow-ups planned.</Empty>}
    </Panel>

    <Panel title="Approvals">
      {data?.approvals.length ? data.approvals.map((item) => <p key={item.id} className="text-sm text-[var(--color-text-secondary)]">{item.riskClass} · uses left {item.usesRemaining} · expires {item.expiresAt} · subject {item.subjectId}</p>) : <Empty>No approvals recorded.</Empty>}
    </Panel>

    <Panel title="Referrals and ads">
      {data?.referrals.length ? data.referrals.map((item) => <p key={item.id} className="text-sm text-[var(--color-text-secondary)]">{item.status} · issued {item.issued ? "yes" : "no"} · flags {item.flags.join(", ") || "none"}</p>) : <Empty>No referral assessments in this record.</Empty>}
      {data?.campaigns.map((item) => <p key={item.id} className="mt-2 text-sm text-[var(--color-text-secondary)]">{item.landingPath} · spend {item.spendEnabled ? "on" : "off"} · submitted {item.submitted ? "yes" : "no"} · cost unknown. {item.reason}</p>)}
    </Panel>

    <Panel title="Providers, cost, and recent runs">
      {data?.providers.map((provider) => <article key={provider.id} className="text-sm text-[var(--color-text-secondary)]">
        <p>{provider.name}: {provider.verification.split("_").join(" ")} · {provider.priceStatus}.</p>
        <p className="text-[var(--color-text-muted)]">{provider.requirement}</p>
        <p className="text-[var(--color-text-muted)]">{provider.summary}</p>
      </article>)}
      {data?.costs.slice(-5).map((cost) => <p key={cost.id} className="mt-2 text-sm text-[var(--color-text-muted)]">{cost.provider}: {cost.amountUsd ?? "unknown"} USD ({cost.basis}). {cost.note}</p>)}
      {data?.runs.slice(-5).map((run) => <p key={run.id} className="mt-2 text-sm text-[var(--color-text-secondary)]">{run.status} · {run.tasksRun} tasks. {run.summary}{run.errors.length ? ` Errors: ${run.errors.join(" ")}` : ""}</p>)}
    </Panel>

    <Panel title="Audit">
      {data?.audit.length ? data.audit.slice(-8).map((entry) => <p key={`${entry.at}-${entry.action}-${entry.subjectId ?? entry.detail}`} className="text-sm text-[var(--color-text-secondary)]">{entry.at} · {entry.action} · {entry.outcome} · {entry.detail}</p>) : <Empty>No audit entries in this record.</Empty>}
    </Panel>

    <Panel title="Recovery">
      {data?.recovery.map((step) => <p key={step} className="text-sm text-[var(--color-text-secondary)]">{step}</p>)}
    </Panel>
  </div>;
}

function resultMessage(action: string, body: unknown): string {
  if (action === "run") {
    const summary = isRecord(body) && isRecord(body.summary) && typeof body.summary.status === "string" ? body.summary.status : "finished";
    return `Cycle ${summary}. No ads were submitted and no rewards were issued.`;
  }
  if (action === "deliver_followup") return "Delivery action finished. Read the follow-up row for sent or blocked. No email was attached by this action.";
  if (action === "approve") return "Approval saved. It does not send by itself.";
  if (action === "pause") return "Pause saved.";
  if (action === "resume") return "Resume saved. Spend, bulk email, rewards, and site publication stay blocked.";
  return "Saved.";
}

function opportunityKey(item: unknown, index: number): string {
  return isRecord(item) && typeof item.id === "string" ? item.id : `opportunity-${index}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function OpportunityRow({ item }: { item: unknown }) {
  if (!isRecord(item) || typeof item.title !== "string" || typeof item.id !== "string") return null;
  const confidence = typeof item.confidence === "string" ? item.confidence : "unknown";
  const benefitBasis = typeof item.benefitBasis === "string" ? item.benefitBasis : "unknown";
  const nextAction = typeof item.nextAction === "string" ? item.nextAction : "";
  const evidence = Array.isArray(item.evidence) ? item.evidence : [];
  return <article className="border-t border-[var(--color-border)] py-3 text-sm">
    <p className="font-medium text-[var(--color-text-primary)]">{item.title}</p>
    <p className="text-[var(--color-text-muted)]">Confidence {confidence}. Benefit basis: {benefitBasis}.</p>
    <p className="text-[var(--color-text-secondary)]">{nextAction}</p>
    {evidence.slice(0, 2).map((entry) => {
      if (!isRecord(entry) || typeof entry.statement !== "string") return null;
      const kind = typeof entry.kind === "string" ? entry.kind : "note";
      return <p key={entry.statement} className="text-[var(--color-text-muted)]">{kind}: {entry.statement}</p>;
    })}
  </article>;
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
