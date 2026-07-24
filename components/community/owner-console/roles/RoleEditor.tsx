"use client";

import { useMemo, useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PERMISSION_CATALOG,
  PERMISSION_CATEGORY_LABELS,
  ROLE_EDITOR_TABS,
  SYSTEM_ROLE_LABELS,
  type OwnerRoleListItem,
  type OwnerRoleMember,
  type PermissionCategoryId,
  type RoleEditorTab,
  type UpdateOwnerRoleInput,
} from "@/lib/community/owner-console/roles";

const CHANNEL_CAPS = [
  { id: "view", label: "Can View", hint: "channel.read" },
  { id: "post", label: "Can Post", hint: "channel.write" },
  { id: "reply", label: "Can Reply", hint: "channel.write" },
  { id: "upload", label: "Can Upload", hint: "files.upload" },
  { id: "pin", label: "Can Pin", hint: "pins.manage" },
  { id: "moderate", label: "Can Moderate", hint: "moderation.manage" },
  { id: "live", label: "Can Go Live", hint: "live.manage" },
  { id: "threads", label: "Can Create Threads", hint: "channel.write" },
] as const;

export function RoleEditor({
  role,
  members,
  tab,
  onTabChange,
  canManage,
  onUpdate,
  onDuplicate,
  onDelete,
  onAssign,
  onRemove,
  groups,
  channels,
}: {
  role: OwnerRoleListItem;
  members: OwnerRoleMember[];
  tab: RoleEditorTab;
  onTabChange: (tab: RoleEditorTab) => void;
  canManage: boolean;
  onUpdate: (patch: UpdateOwnerRoleInput) => Promise<unknown>;
  onDuplicate: () => void;
  onDelete: () => void;
  onAssign: (membershipIds: string[]) => void;
  onRemove: (membershipIds: string[]) => void;
  groups: { id: string; name: string }[];
  channels: { id: string; name: string }[];
}) {
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description ?? "");
  const [icon, setIcon] = useState(role.icon ?? "🏷️");
  const [color, setColor] = useState(role.color ?? "#64748b");
  const [priority, setPriority] = useState(String(role.priority));
  const [visibility, setVisibility] = useState(role.visibility);
  const [caps, setCaps] = useState<Set<string>>(new Set(role.capabilities));
  const [groupIds, setGroupIds] = useState<Set<string>>(new Set(role.groupIds));
  const [channelIds, setChannelIds] = useState<Set<string>>(
    new Set(role.channelIds)
  );
  const [membershipInput, setMembershipInput] = useState("");
  const [saving, setSaving] = useState(false);
  const readOnly = role.isSystem || !canManage;

  const byCategory = useMemo(() => {
    const map = new Map<PermissionCategoryId, typeof PERMISSION_CATALOG>();
    for (const item of PERMISSION_CATALOG) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return map;
  }, []);

  async function saveOverview() {
    if (readOnly) return;
    setSaving(true);
    await onUpdate({
      name: name.trim(),
      description: description.trim() || null,
      icon,
      color,
      priority: Number(priority) || 0,
      visibility,
      isDefaultAssignment: role.isDefaultAssignment,
    });
    setSaving(false);
  }

  async function savePermissions() {
    if (readOnly) return;
    setSaving(true);
    await onUpdate({ capabilities: Array.from(caps) });
    setSaving(false);
  }

  async function saveScopes(kind: "groups" | "channels") {
    if (readOnly) return;
    setSaving(true);
    await onUpdate(
      kind === "groups"
        ? { groupIds: Array.from(groupIds) }
        : { channelIds: Array.from(channelIds) }
    );
    setSaving(false);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)] px-4 py-4">
        <div className="flex items-center gap-3">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl"
            style={{ backgroundColor: `${role.color ?? "#64748b"}22` }}
          >
            {role.icon ?? "🏷️"}
          </span>
          <div>
            <h2 className="text-base font-bold text-[var(--color-text-primary)]">
              {role.name}
            </h2>
            <p className="text-[12px] text-[var(--color-text-muted)]">
              {role.isSystem ? "System role" : "Custom role"} · inherits{" "}
              {SYSTEM_ROLE_LABELS[
                role.inheritsFrom as keyof typeof SYSTEM_ROLE_LABELS
              ] ?? role.inheritsFrom}
              {role.isProtected ? " · protected" : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && (
            <Button type="button" variant="outline" size="sm" onClick={onDuplicate}>
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Duplicate
            </Button>
          )}
          {!role.isSystem && canManage && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="text-red-600"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-[var(--color-border)] px-3 py-2">
        {ROLE_EDITOR_TABS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={`h-8 rounded-lg px-3 text-[12px] font-semibold capitalize transition-all ${
              tab === id
                ? "bg-[var(--color-text-primary)] text-[var(--color-surface)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {id}
          </button>
        ))}
      </div>

      <div className="space-y-4 p-4">
        {tab === "overview" && (
          <>
            {readOnly ? (
              <p className="text-[13px] text-[var(--color-text-muted)]">
                System roles are read-only. Duplicate to customize capabilities.
              </p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-[12px] font-semibold">
                Name
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={readOnly}
                />
              </label>
              <label className="space-y-1 text-[12px] font-semibold">
                Icon
                <Input
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  disabled={readOnly}
                  maxLength={4}
                />
              </label>
              <label className="space-y-1 text-[12px] font-semibold">
                Color
                <Input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  disabled={readOnly}
                  className="h-10 p-1"
                />
              </label>
              <label className="space-y-1 text-[12px] font-semibold">
                Priority
                <Input
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  disabled={readOnly}
                  inputMode="numeric"
                />
              </label>
              <label className="space-y-1 text-[12px] font-semibold sm:col-span-2">
                Description
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={readOnly}
                />
              </label>
              <label className="space-y-1 text-[12px] font-semibold">
                Visibility
                <select
                  value={visibility}
                  onChange={(e) =>
                    setVisibility(e.target.value as typeof visibility)
                  }
                  disabled={readOnly}
                  className="flex h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                >
                  <option value="public">Public</option>
                  <option value="staff">Staff</option>
                  <option value="hidden">Hidden</option>
                </select>
              </label>
            </div>
            {!readOnly && (
              <Button type="button" onClick={() => void saveOverview()} disabled={saving}>
                Save overview
              </Button>
            )}
          </>
        )}

        {tab === "permissions" && (
          <>
            <p className="text-[13px] text-[var(--color-text-muted)]">
              Capabilities resolve through the shared permission engine. Never
              check role names in product code.
            </p>
            <div className="space-y-4">
              {Array.from(byCategory.entries()).map(([category, items]) => (
                <div key={category}>
                  <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                    {PERMISSION_CATEGORY_LABELS[category]}
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {items.map((item) => {
                      const checked = caps.has(item.id);
                      return (
                        <label
                          key={item.id}
                          className={`flex cursor-pointer gap-2 rounded-xl border px-3 py-2.5 ${
                            checked
                              ? "border-[var(--color-accent)]/40 bg-[var(--color-accent)]/5"
                              : "border-[var(--color-border)]"
                          } ${readOnly ? "opacity-70" : ""}`}
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={checked}
                            disabled={readOnly}
                            onChange={() => {
                              setCaps((prev) => {
                                const next = new Set(prev);
                                if (next.has(item.id)) next.delete(item.id);
                                else next.add(item.id);
                                return next;
                              });
                            }}
                          />
                          <span>
                            <span className="block text-[13px] font-semibold text-[var(--color-text-primary)]">
                              {item.label}
                            </span>
                            <span className="block text-[11px] text-[var(--color-text-muted)]">
                              {item.id}
                              {item.alias ? ` · ${item.alias}` : ""}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {!readOnly && (
              <Button
                type="button"
                onClick={() => void savePermissions()}
                disabled={saving}
              >
                Save permissions
              </Button>
            )}
          </>
        )}

        {tab === "members" && (
          <>
            <div className="flex flex-wrap gap-2">
              <Input
                value={membershipInput}
                onChange={(e) => setMembershipInput(e.target.value)}
                placeholder="Membership UUID(s), comma-separated"
                className="min-w-[220px] flex-1"
                disabled={!canManage}
              />
              {canManage && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      const ids = membershipInput
                        .split(/[\s,]+/)
                        .map((s) => s.trim())
                        .filter(Boolean);
                      if (ids.length) onAssign(ids);
                    }}
                  >
                    Bulk Assign
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const ids = membershipInput
                        .split(/[\s,]+/)
                        .map((s) => s.trim())
                        .filter(Boolean);
                      if (ids.length) onRemove(ids);
                    }}
                  >
                    Bulk Remove
                  </Button>
                </>
              )}
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              Scheduled assignment is future-ready via the assign API.
            </p>
            <ul className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)]">
              {members.length === 0 ? (
                <li className="px-4 py-8 text-center text-[13px] text-[var(--color-text-muted)]">
                  No members currently assigned
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
                      <p className="text-[11px] text-[var(--color-text-muted)]">
                        {m.username ? `@${m.username}` : m.userId.slice(0, 8)}
                      </p>
                    </div>
                    {canManage && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => onRemove([m.membershipId])}
                      >
                        Remove
                      </Button>
                    )}
                  </li>
                ))
              )}
            </ul>
          </>
        )}

        {tab === "groups" && (
          <>
            <p className="text-[13px] text-[var(--color-text-muted)]">
              Limit this role to one or more groups (e.g. Mentor of VIP).
            </p>
            {groups.length === 0 ? (
              <p className="text-[13px] text-[var(--color-text-muted)]">
                No groups available. Create groups first.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {groups.map((g) => (
                  <label
                    key={g.id}
                    className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={groupIds.has(g.id)}
                      disabled={readOnly}
                      onChange={() => {
                        setGroupIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(g.id)) next.delete(g.id);
                          else next.add(g.id);
                          return next;
                        });
                      }}
                    />
                    {g.name}
                  </label>
                ))}
              </div>
            )}
            {!readOnly && (
              <Button type="button" onClick={() => void saveScopes("groups")} disabled={saving}>
                Save group scopes
              </Button>
            )}
          </>
        )}

        {tab === "channels" && (
          <>
            <p className="text-[13px] text-[var(--color-text-muted)]">
              Scope channel access. Capability checks still use the shared engine.
            </p>
            <div className="mb-3 flex flex-wrap gap-2">
              {CHANNEL_CAPS.map((c) => (
                <span
                  key={c.id}
                  className="rounded-lg bg-[var(--color-surface-secondary)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-muted)]"
                  title={c.hint}
                >
                  {c.label}
                </span>
              ))}
            </div>
            {channels.length === 0 ? (
              <p className="text-[13px] text-[var(--color-text-muted)]">
                No channels available.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {channels.map((ch) => (
                  <label
                    key={ch.id}
                    className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={channelIds.has(ch.id)}
                      disabled={readOnly}
                      onChange={() => {
                        setChannelIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(ch.id)) next.delete(ch.id);
                          else next.add(ch.id);
                          return next;
                        });
                      }}
                    />
                    {ch.name}
                  </label>
                ))}
              </div>
            )}
            {!readOnly && (
              <Button
                type="button"
                onClick={() => void saveScopes("channels")}
                disabled={saving}
              >
                Save channel scopes
              </Button>
            )}
          </>
        )}

        {tab === "analytics" && (
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Members" value={String(role.memberCount)} />
            <Stat label="Capabilities" value={String(role.capabilities.length)} />
            <Stat
              label="Priority"
              value={String(role.priority)}
            />
            <Stat
              label="Group scopes"
              value={String(role.groupIds.length)}
            />
            <Stat
              label="Channel scopes"
              value={String(role.channelIds.length)}
            />
            <Stat
              label="Default"
              value={role.isDefaultAssignment ? "Yes" : "No"}
            />
          </div>
        )}

        {tab === "audit" && (
          <p className="text-[13px] text-[var(--color-text-muted)]">
            Open the Audit tab in the roles dashboard for searchable community-wide
            history. Role-scoped filters use the same audit API.
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold tabular-nums text-[var(--color-text-primary)]">
        {value}
      </p>
    </div>
  );
}
