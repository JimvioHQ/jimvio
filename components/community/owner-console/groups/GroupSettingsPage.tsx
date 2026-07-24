"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Trash2,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { sectionPath } from "@/lib/community/owner-console";
import {
  DEFAULT_GROUP_COLOR,
  DEFAULT_GROUP_ICON,
  GROUP_COLOR_PRESETS,
  GROUP_ICON_PRESETS,
  GROUP_PERMISSION_ACTORS,
  GROUP_PRIVACY_DESCRIPTIONS,
  GROUP_PRIVACY_LABELS,
  GROUP_PRIVACY_VALUES,
  GROUP_SETTINGS_TABS,
  GROUP_STATUS_LABELS,
  STAFF_ROLE_OPTIONS,
  type GroupPermissionConfig,
  type GroupPrivacyMode,
  type GroupSettingsTab,
  type OwnerGroupAnalytics,
  type OwnerGroupListItem,
  type OwnerGroupMember,
  type OwnerGroupStaffMember,
} from "@/lib/community/owner-console/groups";
import { useOwnerConsole } from "@/components/community/owner-console/OwnerConsoleContext";

export function GroupSettingsPage({ groupId }: { groupId: string }) {
  const { community } = useOwnerConsole();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as GroupSettingsTab | null;
  const tab: GroupSettingsTab =
    tabParam && (GROUP_SETTINGS_TABS as readonly string[]).includes(tabParam)
      ? tabParam
      : "general";

  const [group, setGroup] = useState<OwnerGroupListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState<OwnerGroupStaffMember[]>([]);
  const [members, setMembers] = useState<OwnerGroupMember[]>([]);
  const [memberQuery, setMemberQuery] = useState("");
  const [analytics, setAnalytics] = useState<OwnerGroupAnalytics | null>(null);
  const [channels, setChannels] = useState<
    { id: string; name: string; room_type: string }[]
  >([]);
  const [staffUserId, setStaffUserId] = useState("");
  const [staffRole, setStaffRole] = useState<"moderator" | "admin">("moderator");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/c/owner/groups/${groupId}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Group not found");
        setGroup(null);
        return;
      }
      setGroup(data.group);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!group) return;
    if (tab === "moderators") {
      void fetch(`/api/c/owner/groups/${groupId}/staff`)
        .then((r) => r.json())
        .then((d) => setStaff(d.staff ?? []));
    }
    if (tab === "members") {
      const q = new URLSearchParams({ q: memberQuery });
      void fetch(`/api/c/owner/groups/${groupId}/members?${q}`)
        .then((r) => r.json())
        .then((d) => setMembers(d.members ?? []));
    }
    if (tab === "analytics") {
      void fetch(`/api/c/owner/groups/${groupId}/analytics`)
        .then((r) => r.json())
        .then((d) => setAnalytics(d.analytics ?? null));
    }
    if (tab === "channels" || tab === "resources") {
      void fetch(`/api/rooms/${groupId}`)
        .then((r) => r.json())
        .then((d) => setChannels(d.rooms ?? []));
    }
  }, [group, tab, groupId, memberQuery]);

  function setTab(next: GroupSettingsTab) {
    const base = sectionPath(
      `groups/${groupId}`,
      community?.slug
    );
    const url = new URL(base, window.location.origin);
    url.searchParams.set("tab", next);
    router.replace(url.pathname + url.search);
  }

  async function save(patch: Record<string, unknown>) {
    if (!group) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/c/owner/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Save failed");
        return;
      }
      setGroup(data.group);
      toast.success("Saved");
    } finally {
      setSaving(false);
    }
  }

  async function runAction(action: string, hard = false) {
    const res = await fetch(`/api/c/owner/groups/${groupId}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, hard }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Action failed");
      return;
    }
    if (data.deleted) {
      toast.success("Group deleted");
      router.push(sectionPath("groups", community?.slug));
      return;
    }
    if (data.group) setGroup(data.group);
    toast.success("Updated");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-[var(--color-text-muted)]">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading group settings…
      </div>
    );
  }

  if (!group) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm font-semibold">Group not found</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href={sectionPath("groups", community?.slug)}>
            Back to groups
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={sectionPath("groups", community?.slug)}
            className="mb-2 inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Groups
          </Link>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
            <span>{group.icon ?? DEFAULT_GROUP_ICON}</span>
            {group.name}
          </h1>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            {GROUP_STATUS_LABELS[group.status]} ·{" "}
            {GROUP_PRIVACY_LABELS[group.privacy]} · {group.memberCount} members ·{" "}
            {group.channelCount} channels
          </p>
        </div>
        {saving && (
          <span className="inline-flex items-center gap-1 text-[12px] text-[var(--color-text-muted)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
          </span>
        )}
      </div>

      <nav
        className="flex gap-1 overflow-x-auto border-b border-[var(--color-border)] pb-px"
        aria-label="Group settings tabs"
      >
        {GROUP_SETTINGS_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "shrink-0 rounded-t-lg px-3 py-2 text-[12px] font-semibold capitalize transition-colors",
              tab === t
                ? "bg-[var(--color-surface)] text-[var(--color-accent)] shadow-[inset_0_-2px_0_var(--color-accent)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            )}
          >
            {t === "danger" ? "Danger Zone" : t}
          </button>
        ))}
      </nav>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        {tab === "general" && (
          <div className="max-w-xl space-y-4">
            <Field label="Name">
              <Input
                defaultValue={group.name}
                onBlur={(e) => {
                  if (e.target.value.trim() && e.target.value !== group.name) {
                    void save({ name: e.target.value.trim() });
                  }
                }}
              />
            </Field>
            <Field label="Slug">
              <Input
                defaultValue={group.slug}
                disabled={group.isSystem}
                onBlur={(e) => {
                  if (e.target.value.trim() && e.target.value !== group.slug) {
                    void save({ slug: e.target.value.trim() });
                  }
                }}
              />
            </Field>
            <Field label="Description">
              <Textarea
                defaultValue={group.description ?? ""}
                rows={4}
                onBlur={(e) => {
                  if (e.target.value !== (group.description ?? "")) {
                    void save({ description: e.target.value });
                  }
                }}
              />
            </Field>
            <Field label="Welcome message">
              <Textarea
                defaultValue={group.welcomeMessage ?? ""}
                rows={3}
                onBlur={(e) => {
                  if (e.target.value !== (group.welcomeMessage ?? "")) {
                    void save({ welcomeMessage: e.target.value });
                  }
                }}
              />
            </Field>
          </div>
        )}

        {tab === "branding" && (
          <div className="max-w-xl space-y-4">
            <Field label="Emoji / icon">
              <div className="flex flex-wrap gap-1.5">
                {GROUP_ICON_PRESETS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => void save({ icon: emoji })}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg text-lg",
                      group.icon === emoji
                        ? "ring-2 ring-[var(--color-accent)]"
                        : "bg-[var(--color-surface-secondary)]"
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Theme color">
              <div className="flex flex-wrap gap-2">
                {GROUP_COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => void save({ color: c })}
                    className={cn(
                      "h-8 w-8 rounded-full",
                      (group.color ?? DEFAULT_GROUP_COLOR) === c &&
                        "ring-2 ring-offset-2 ring-[var(--color-accent)]"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </Field>
            <Field label="Cover URL">
              <Input
                defaultValue={group.coverUrl ?? ""}
                onBlur={(e) => {
                  if (e.target.value !== (group.coverUrl ?? "")) {
                    void save({ coverUrl: e.target.value || null });
                  }
                }}
              />
            </Field>
            <Field label="Banner URL">
              <Input
                defaultValue={group.bannerUrl ?? ""}
                onBlur={(e) => {
                  if (e.target.value !== (group.bannerUrl ?? "")) {
                    void save({ bannerUrl: e.target.value || null });
                  }
                }}
              />
            </Field>
          </div>
        )}

        {tab === "privacy" && (
          <div className="grid max-w-2xl gap-2">
            {GROUP_PRIVACY_VALUES.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => void save({ privacy: mode as GroupPrivacyMode })}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left",
                  group.privacy === mode
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
                    : "border-[var(--color-border)]"
                )}
              >
                <p className="text-sm font-bold">{GROUP_PRIVACY_LABELS[mode]}</p>
                <p className="text-[12px] text-[var(--color-text-muted)]">
                  {GROUP_PRIVACY_DESCRIPTIONS[mode]}
                </p>
              </button>
            ))}
          </div>
        )}

        {tab === "permissions" && (
          <PermissionsEditor
            config={group.permissionConfig}
            onSave={(permissionConfig) => void save({ permissionConfig })}
          />
        )}

        {tab === "moderators" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Input
                value={staffUserId}
                onChange={(e) => setStaffUserId(e.target.value)}
                placeholder="Member user ID"
                className="max-w-xs"
              />
              <select
                value={staffRole}
                onChange={(e) =>
                  setStaffRole(e.target.value as "moderator" | "admin")
                }
                className="rounded-md border border-[var(--color-border)] px-2 text-sm"
              >
                {STAFF_ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                onClick={async () => {
                  if (!staffUserId.trim()) return;
                  const res = await fetch(
                    `/api/c/owner/groups/${groupId}/staff`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        userId: staffUserId.trim(),
                        staffRole,
                      }),
                    }
                  );
                  const data = await res.json();
                  if (!res.ok) {
                    toast.error(data.error || "Could not assign");
                    return;
                  }
                  toast.success("Moderator assigned");
                  setStaffUserId("");
                  const refreshed = await fetch(
                    `/api/c/owner/groups/${groupId}/staff`
                  ).then((r) => r.json());
                  setStaff(refreshed.staff ?? []);
                }}
              >
                <UserPlus className="mr-1 h-4 w-4" />
                Assign
              </Button>
            </div>
            <ul className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)]">
              {staff.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
                  No group moderators yet
                </li>
              )}
              {staff.map((s) => (
                <li
                  key={s.userId}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {s.fullName || s.username || s.userId.slice(0, 8)}
                    </p>
                    <p className="text-[11px] capitalize text-[var(--color-text-muted)]">
                      {s.staffRole}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await fetch(
                        `/api/c/owner/groups/${groupId}/staff?userId=${encodeURIComponent(s.userId)}`,
                        { method: "DELETE" }
                      );
                      setStaff((prev) =>
                        prev.filter((x) => x.userId !== s.userId)
                      );
                    }}
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "members" && (
          <div className="space-y-4">
            <Input
              value={memberQuery}
              onChange={(e) => setMemberQuery(e.target.value)}
              placeholder="Search members…"
              className="max-w-sm"
            />
            <ul className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)]">
              {members.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
                  No members found
                </li>
              )}
              {members.map((m) => (
                <li
                  key={m.userId}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {m.fullName || m.username || "Member"}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      {m.role} · {m.status}
                      {m.joinedAt
                        ? ` · joined ${new Date(m.joinedAt).toLocaleDateString()}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await fetch(`/api/c/owner/groups/${groupId}/members`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            userId: m.userId,
                            action: "mute",
                          }),
                        });
                        toast.success("Muted");
                      }}
                    >
                      Mute
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await fetch(`/api/c/owner/groups/${groupId}/members`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            userId: m.userId,
                            action: "remove",
                          }),
                        });
                        setMembers((prev) =>
                          prev.filter((x) => x.userId !== m.userId)
                        );
                        toast.success("Removed from group");
                      }}
                    >
                      Remove
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-600"
                      onClick={async () => {
                        if (!window.confirm("Ban this member from the community?"))
                          return;
                        await fetch(`/api/c/owner/groups/${groupId}/members`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            userId: m.userId,
                            action: "ban",
                          }),
                        });
                        toast.success("Banned");
                      }}
                    >
                      Ban
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              Transfer ownership is reserved for a future phase.
            </p>
          </div>
        )}

        {tab === "channels" && (
          <div className="space-y-3">
            <p className="text-[13px] text-[var(--color-text-muted)]">
              Channels in this group. Full channel management arrives in the
              Channels Owner Console phase.
            </p>
            <ul className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)]">
              {channels.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
                  No channels yet
                </li>
              )}
              {channels.map((c) => (
                <li key={c.id} className="flex justify-between px-4 py-3 text-sm">
                  <span className="font-semibold">{c.name}</span>
                  <span className="text-[var(--color-text-muted)]">
                    {c.room_type}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "resources" && (
          <div className="space-y-4">
            <Field label="Default rules">
              <Textarea
                defaultValue={group.rules ?? ""}
                rows={5}
                onBlur={(e) => {
                  if (e.target.value !== (group.rules ?? "")) {
                    void save({ rules: e.target.value });
                  }
                }}
              />
            </Field>
            <Field label="Default resources (one URL per line)">
              <Textarea
                defaultValue={group.defaultContent.defaultResources.join("\n")}
                rows={4}
                onBlur={(e) => {
                  const defaultResources = e.target.value
                    .split("\n")
                    .map((x) => x.trim())
                    .filter(Boolean);
                  void save({
                    defaultContent: {
                      ...group.defaultContent,
                      defaultResources,
                    },
                  });
                }}
              />
            </Field>
            <div>
              <p className="mb-2 text-xs font-bold text-[var(--color-text-secondary)]">
                Resource channels
              </p>
              <ul className="text-sm text-[var(--color-text-muted)]">
                {channels
                  .filter((c) => c.room_type === "resources")
                  .map((c) => (
                    <li key={c.id}>{c.name}</li>
                  ))}
                {channels.filter((c) => c.room_type === "resources").length ===
                  0 && <li>None</li>}
              </ul>
            </div>
          </div>
        )}

        {tab === "analytics" && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["Growth", analytics?.growth],
                ["Members", analytics?.members],
                ["Activity", analytics?.activity],
                ["Knowledge", analytics?.knowledge],
                ["Commerce", analytics?.commerce],
                ["Live", analytics?.live],
                ["Courses", analytics?.courses],
                ["Retention", analytics?.retention],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40 px-4 py-3"
              >
                <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                  {label}
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">
                  {value ?? "—"}
                </p>
              </div>
            ))}
          </div>
        )}

        {tab === "danger" && (
          <div className="max-w-xl space-y-4">
            <DangerCard
              title="Archive group"
              description="Hide the group from active directories. Can be restored later."
              actionLabel="Archive"
              disabled={group.isSystem || group.status === "archived"}
              onAction={() => void runAction("archive")}
            />
            {group.status === "archived" && (
              <DangerCard
                title="Restore group"
                description="Return this group to the active directory."
                actionLabel="Restore"
                onAction={() => void runAction("restore")}
              />
            )}
            <DangerCard
              title="Delete group"
              description="Soft-delete (archive). Hard delete permanently removes the group and its channels."
              actionLabel="Delete"
              destructive
              disabled={group.isSystem}
              onAction={() => {
                if (
                  window.confirm(
                    `Delete “${group.name}”? Soft delete archives the group.`
                  )
                ) {
                  void runAction("delete");
                }
              }}
            />
            <DangerCard
              title="Hard delete"
              description="Permanently remove this group. This cannot be undone."
              actionLabel="Hard delete"
              destructive
              disabled={group.isSystem}
              onAction={() => {
                if (
                  window.confirm(
                    `HARD DELETE “${group.name}”? This cannot be undone.`
                  )
                ) {
                  void runAction("delete", true);
                }
              }}
            />
            <div className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-3 text-[13px] text-[var(--color-text-muted)]">
              Transfer Ownership — coming in a future Owner Console phase.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-[var(--color-text-secondary)]">
        {label}
      </label>
      {children}
    </div>
  );
}

function PermissionsEditor({
  config,
  onSave,
}: {
  config: GroupPermissionConfig;
  onSave: (next: GroupPermissionConfig) => void;
}) {
  const [draft, setDraft] = useState(config);
  useEffect(() => setDraft(config), [config]);

  function toggle(
    key: keyof Omit<GroupPermissionConfig, "whoCanJoin">,
    role: (typeof GROUP_PERMISSION_ACTORS)[number]
  ) {
    setDraft((d) => {
      const set = new Set(d[key]);
      if (set.has(role)) set.delete(role);
      else set.add(role);
      return { ...d, [key]: [...set] };
    });
  }

  return (
    <div className="space-y-4">
      <Field label="Who can join">
        <div className="flex flex-wrap gap-1.5">
          {(["everyone", "members", "invite_only", "approval"] as const).map(
            (p) => (
              <button
                key={p}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, whoCanJoin: p }))}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11px] font-semibold capitalize",
                  draft.whoCanJoin === p
                    ? "bg-[var(--color-accent)] text-white"
                    : "bg-[var(--color-surface-secondary)]"
                )}
              >
                {p.replace("_", " ")}
              </button>
            )
          )}
        </div>
      </Field>
      {(
        [
          ["whoCanInvite", "Who can invite"],
          ["whoCanCreateChannels", "Who can create sub-channels"],
          ["whoCanUpload", "Who can upload files"],
          ["whoCanCreateEvents", "Who can create events"],
          ["whoCanCreateCourses", "Who can create courses"],
          ["whoCanCreateVoiceRooms", "Who can create voice rooms"],
          ["whoCanCreateLiveSessions", "Who can create live sessions"],
          ["whoCanGoLive", "Who can go live"],
        ] as const
      ).map(([key, label]) => (
        <Field key={key} label={label}>
          <div className="flex flex-wrap gap-1.5">
            {GROUP_PERMISSION_ACTORS.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => toggle(key, role)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize",
                  draft[key].includes(role)
                    ? "bg-[var(--color-accent)] text-white"
                    : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
                )}
              >
                {role}
              </button>
            ))}
          </div>
        </Field>
      ))}
      <Button type="button" onClick={() => onSave(draft)}>
        Save permissions
      </Button>
    </div>
  );
}

function DangerCard({
  title,
  description,
  actionLabel,
  onAction,
  destructive,
  disabled,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3">
      <div>
        <p className="text-sm font-bold text-[var(--color-text-primary)]">
          {title}
        </p>
        <p className="text-[12px] text-[var(--color-text-muted)]">{description}</p>
      </div>
      <Button
        type="button"
        variant={destructive ? "destructive" : "outline"}
        disabled={disabled}
        onClick={onAction}
      >
        {destructive && <Trash2 className="mr-1 h-4 w-4" />}
        {actionLabel}
      </Button>
    </div>
  );
}
