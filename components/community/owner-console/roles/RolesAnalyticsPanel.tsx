"use client";

import type {
  OwnerRoleAnalytics,
  OwnerRoleAuditEntry,
} from "@/lib/community/owner-console/roles";
import { Input } from "@/components/ui/input";

export function RolesAnalyticsPanel({
  analytics,
}: {
  analytics: OwnerRoleAnalytics | null;
}) {
  if (!analytics) {
    return (
      <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">
        Loading analytics…
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Roles with members"
          value={String(analytics.mostUsedRoles.length)}
        />
        <Metric
          label="Inactive custom roles"
          value={String(analytics.inactiveRoles.length)}
        />
        <Metric
          label="Recent changes (30d)"
          value={String(analytics.recentChanges)}
        />
        <Metric
          label="Tracked capabilities"
          value={String(analytics.permissionUsage.length)}
        />
      </div>

      <Section title="Members per role">
        <Bars
          rows={analytics.membersPerRole.slice(0, 12).map((r) => ({
            label: r.name,
            value: r.count,
          }))}
        />
      </Section>

      <Section title="Most used roles">
        <Bars
          rows={analytics.mostUsedRoles.map((r) => ({
            label: r.name,
            value: r.count,
          }))}
        />
      </Section>

      <Section title="Permission usage">
        <ul className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)]">
          {analytics.permissionUsage.map((p) => (
            <li
              key={p.capability}
              className="flex items-center justify-between px-4 py-2.5 text-[13px]"
            >
              <code className="text-[var(--color-text-primary)]">{p.capability}</code>
              <span className="tabular-nums text-[var(--color-text-muted)]">
                {p.roleCount} roles
              </span>
            </li>
          ))}
        </ul>
      </Section>

      {analytics.inactiveRoles.length > 0 && (
        <Section title="Inactive roles">
          <div className="flex flex-wrap gap-2">
            {analytics.inactiveRoles.map((r) => (
              <span
                key={r.roleId}
                className="rounded-lg bg-[var(--color-surface-secondary)] px-2.5 py-1 text-[12px] font-semibold text-[var(--color-text-muted)]"
              >
                {r.name}
              </span>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

export function RolesAuditPanel({
  entries,
  search,
  onSearch,
}: {
  entries: OwnerRoleAuditEntry[];
  search: string;
  onSearch: (q: string) => void;
}) {
  return (
    <div className="space-y-3">
      <Input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search audit history…"
        aria-label="Search audit history"
      />
      <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        {entries.length === 0 ? (
          <li className="px-4 py-10 text-center text-[13px] text-[var(--color-text-muted)]">
            No audit events yet
          </li>
        ) : (
          entries.map((e) => (
            <li key={e.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {e.action.replace(/_/g, " ")}
                  {e.roleName ? ` · ${e.roleName}` : ""}
                </p>
                <time className="text-[11px] text-[var(--color-text-muted)]">
                  {new Date(e.createdAt).toLocaleString()}
                </time>
              </div>
              <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
                {e.actorName ?? e.actorId.slice(0, 8)}
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

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Bars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex justify-between text-[12px]">
            <span className="font-semibold text-[var(--color-text-primary)]">
              {r.label}
            </span>
            <span className="tabular-nums text-[var(--color-text-muted)]">
              {r.value}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
            <div
              className="h-full rounded-full bg-[var(--color-accent)]"
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
