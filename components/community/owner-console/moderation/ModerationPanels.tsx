"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  OwnerAppealItem,
  OwnerAutoModRule,
  OwnerModeratedMember,
  OwnerModerationAnalytics,
  OwnerModerationLogItem,
} from "@/lib/community/owner-console/moderation";

export function AutoModPanel({
  rules,
  canManage,
  onSeed,
  onToggle,
}: {
  rules: OwnerAutoModRule[];
  canManage: boolean;
  onSeed: () => void;
  onToggle: (ruleId: string, enabled: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-[var(--color-text-muted)]">
          Configure detection rules. AI moderation hooks are future-ready.
        </p>
        {canManage && rules.length === 0 && (
          <Button type="button" size="sm" onClick={onSeed}>
            Initialize rules
          </Button>
        )}
      </div>
      {rules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-5 py-10 text-center text-sm text-[var(--color-text-muted)]">
          No auto-moderation rules yet.
        </div>
      ) : (
        <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {rule.name}
                </p>
                <p className="text-[12px] text-[var(--color-text-muted)]">
                  {rule.description} · {rule.severity} · {rule.action}
                </p>
              </div>
              <label className="flex items-center gap-2 text-[12px] font-semibold">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  disabled={!canManage}
                  onChange={(e) => onToggle(rule.id, e.target.checked)}
                />
                Enabled
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AppealsPanel({
  appeals,
  canManage,
  onUpdate,
}: {
  appeals: OwnerAppealItem[];
  canManage: boolean;
  onUpdate: (id: string, status: string) => void;
}) {
  return (
    <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      {appeals.length === 0 ? (
        <li className="px-4 py-10 text-center text-[13px] text-[var(--color-text-muted)]">
          No pending appeals
        </li>
      ) : (
        appeals.map((a) => (
          <li key={a.id} className="px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {a.appellantName ?? a.appellantId.slice(0, 8)}
                </p>
                <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
                  {a.reason}
                </p>
                <p className="mt-1 text-[11px] font-bold uppercase text-[var(--color-text-muted)]">
                  {a.status.replace(/_/g, " ")}
                </p>
              </div>
              {canManage && (a.status === "open" || a.status === "in_review") && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onUpdate(a.id, "in_review")}
                  >
                    In review
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onUpdate(a.id, "approved")}
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => onUpdate(a.id, "rejected")}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          </li>
        ))
      )}
    </ul>
  );
}

export function ModeratedMembersPanel({
  members,
  emptyLabel,
}: {
  members: OwnerModeratedMember[];
  emptyLabel: string;
}) {
  return (
    <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      {members.length === 0 ? (
        <li className="px-4 py-10 text-center text-[13px] text-[var(--color-text-muted)]">
          {emptyLabel}
        </li>
      ) : (
        members.map((m) => (
          <li
            key={m.membershipId}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                {m.displayName}
              </p>
              <p className="text-[12px] text-[var(--color-text-muted)]">
                {m.username ? `@${m.username}` : m.userId.slice(0, 8)} · {m.role}
              </p>
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              {m.banReason ||
                m.mutedUntil ||
                m.suspendedUntil ||
                m.timeoutUntil ||
                m.status}
            </p>
          </li>
        ))
      )}
    </ul>
  );
}

export function AuditTimeline({
  entries,
  search,
  onSearch,
}: {
  entries: OwnerModerationLogItem[];
  search: string;
  onSearch: (q: string) => void;
}) {
  return (
    <div className="space-y-3">
      <Input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search warnings, mutes, bans, notes…"
        aria-label="Search moderation history"
      />
      <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        {entries.length === 0 ? (
          <li className="px-4 py-10 text-center text-[13px] text-[var(--color-text-muted)]">
            No moderation history yet
          </li>
        ) : (
          entries.map((e) => (
            <li key={e.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {e.action.replace(/_/g, " ")}
                </p>
                <time className="text-[11px] text-[var(--color-text-muted)]">
                  {new Date(e.createdAt).toLocaleString()}
                </time>
              </div>
              <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
                {e.moderatorName ?? e.moderatorId.slice(0, 8)}
                {e.targetName ? ` → ${e.targetName}` : ""}
                {e.reason ? ` · ${e.reason}` : ""}
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export function ModerationAnalyticsPanel({
  analytics,
}: {
  analytics: OwnerModerationAnalytics | null;
}) {
  if (!analytics) {
    return (
      <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">
        Loading analytics…
      </p>
    );
  }

  const maxDay = Math.max(1, ...analytics.reportsPerDay.map((d) => d.count));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Spam prevented" value={String(analytics.spamPrevented)} />
        <Metric
          label="Avg response (h)"
          value={
            analytics.avgResponseHours != null
              ? String(analytics.avgResponseHours)
              : "—"
          }
        />
        <Metric
          label="False positives"
          value={String(analytics.falsePositives)}
        />
        <Metric
          label="Active moderators"
          value={String(analytics.moderatorActivity.length)}
        />
      </div>

      <section>
        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
          Reports per day
        </h3>
        <ul className="space-y-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          {analytics.reportsPerDay.map((d) => (
            <li key={d.date}>
              <div className="mb-1 flex justify-between text-[12px]">
                <span>{d.date}</span>
                <span className="tabular-nums">{d.count}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
                <div
                  className="h-full rounded-full bg-[var(--color-accent)]"
                  style={{ width: `${(d.count / maxDay) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
          Top violation categories
        </h3>
        <ul className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)]">
          {analytics.topCategories.map((c) => (
            <li
              key={c.reason}
              className="flex justify-between px-4 py-2.5 text-[13px]"
            >
              <span>{c.reason}</span>
              <span className="tabular-nums text-[var(--color-text-muted)]">
                {c.count}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
          Moderator activity
        </h3>
        <ul className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)]">
          {analytics.moderatorActivity.map((m) => (
            <li
              key={m.moderatorId}
              className="flex justify-between px-4 py-2.5 text-[13px]"
            >
              <span>{m.name}</span>
              <span className="tabular-nums text-[var(--color-text-muted)]">
                {m.actions} actions
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">
        {value}
      </p>
    </div>
  );
}
