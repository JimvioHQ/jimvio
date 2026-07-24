"use client";

import type { OwnerRoleListItem } from "@/lib/community/owner-console/roles";
import { SYSTEM_ROLE_LABELS } from "@/lib/community/owner-console/roles";

export function RolesList({
  roles,
  selectedId,
  onSelect,
}: {
  roles: OwnerRoleListItem[];
  selectedId: string | null;
  onSelect: (role: OwnerRoleListItem) => void;
}) {
  if (roles.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-12 text-center">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
          No roles match
        </p>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
          Try a different search or create a custom role.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      {roles.map((role) => {
        const selected = role.id === selectedId;
        return (
          <li key={role.id}>
            <button
              type="button"
              onClick={() => onSelect(role)}
              className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                selected
                  ? "bg-[var(--color-surface-secondary)]"
                  : "hover:bg-[var(--color-surface-secondary)]/60"
              }`}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                style={{
                  backgroundColor: `${role.color ?? "#64748b"}22`,
                  color: role.color ?? "#64748b",
                }}
                aria-hidden
              >
                {role.icon ?? "🏷️"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                    {role.name}
                  </p>
                  {role.isSystem && (
                    <span className="rounded-md bg-[var(--color-surface-secondary)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                      System
                    </span>
                  )}
                  {role.isProtected && (
                    <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                      Protected
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-[12px] text-[var(--color-text-muted)]">
                  {role.description ||
                    `Inherits ${SYSTEM_ROLE_LABELS[role.inheritsFrom as keyof typeof SYSTEM_ROLE_LABELS] ?? role.inheritsFrom}`}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold tabular-nums text-[var(--color-text-primary)]">
                  {role.memberCount}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  {role.capabilities.length} caps
                </p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
