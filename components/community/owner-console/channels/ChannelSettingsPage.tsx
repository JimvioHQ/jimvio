"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Trash2, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { sectionPath } from "@/lib/community/owner-console";
import {
  CHANNEL_COLOR_PRESETS,
  CHANNEL_ICON_PRESETS,
  CHANNEL_KIND_LABELS,
  CHANNEL_PERMISSION_ACTORS,
  CHANNEL_SETTINGS_TABS,
  CHANNEL_VISIBILITY_DESCRIPTIONS,
  CHANNEL_VISIBILITY_LABELS,
  CHANNEL_VISIBILITY_VALUES,
  DEFAULT_CHANNEL_COLOR,
  DEFAULT_CHANNEL_ICON,
  OWNER_CHANNEL_KINDS,
  type ChannelPermissionConfig,
  type ChannelSettingsTab,
  type ChannelVisibilityMode,
  type OwnerChannelAnalytics,
  type OwnerChannelKind,
  type OwnerChannelListItem,
  type OwnerChannelMember,
  type OwnerChannelStaffMember,
} from "@/lib/community/owner-console/channels";
import { useOwnerConsole } from "@/components/community/owner-console/OwnerConsoleContext";

export function ChannelSettingsPage({ channelId }: { channelId: string }) {
  const { community } = useOwnerConsole();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as ChannelSettingsTab | null;
  const tab: ChannelSettingsTab =
    tabParam && (CHANNEL_SETTINGS_TABS as readonly string[]).includes(tabParam)
      ? tabParam
      : "general";

  const [channel, setChannel] = useState<OwnerChannelListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState<OwnerChannelStaffMember[]>([]);
  const [members, setMembers] = useState<OwnerChannelMember[]>([]);
  const [memberQuery, setMemberQuery] = useState("");
  const [analytics, setAnalytics] = useState<OwnerChannelAnalytics | null>(null);
  const [staffUserId, setStaffUserId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/c/owner/channels/${channelId}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Channel not found");
        setChannel(null);
        return;
      }
      setChannel(data.channel);
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!channel) return;
    if (tab === "moderators") {
      void fetch(`/api/c/owner/channels/${channelId}/staff`)
        .then((r) => r.json())
        .then((d) => setStaff(d.staff ?? []));
    }
    if (tab === "members") {
      const q = new URLSearchParams({ q: memberQuery });
      void fetch(`/api/c/owner/channels/${channelId}/members?${q}`)
        .then((r) => r.json())
        .then((d) => setMembers(d.members ?? []));
    }
    if (tab === "analytics") {
      void fetch(`/api/c/owner/channels/${channelId}/analytics`)
        .then((r) => r.json())
        .then((d) => setAnalytics(d.analytics ?? null));
    }
  }, [channel, tab, channelId, memberQuery]);

  function setTab(next: ChannelSettingsTab) {
    const base = sectionPath(
      `/community-owner/channels/${channelId}`,
      community?.id
    );
    const url = new URL(base, window.location.origin);
    url.searchParams.set("tab", next);
    if (community?.id) url.searchParams.set("community", community.id);
    router.replace(url.pathname + url.search);
  }

  async function save(patch: Record<string, unknown>) {
    if (!channel) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/c/owner/channels/${channelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Save failed");
        return;
      }
      setChannel(data.channel);
      toast.success("Saved");
    } finally {
      setSaving(false);
    }
  }

  async function runAction(action: string, hard = false) {
    const res = await fetch(`/api/c/owner/channels/${channelId}/actions`, {
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
      toast.success("Channel deleted");
      router.push(sectionPath("/community-owner/channels", community?.id));
      return;
    }
    if (data.channel) setChannel(data.channel);
    toast.success("Updated");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-[var(--color-text-muted)]">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading channel settings…
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm font-semibold">Channel not found</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href={sectionPath("/community-owner/channels", community?.id)}>
            Back to channels
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
            href={sectionPath("/community-owner/channels", community?.id)}
            className="mb-2 inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Channels
          </Link>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <span>{channel.emoji ?? channel.icon ?? DEFAULT_CHANNEL_ICON}</span>
            {channel.name}
          </h1>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            {channel.groupName} · {CHANNEL_KIND_LABELS[channel.kind]} ·{" "}
            {CHANNEL_VISIBILITY_LABELS[channel.visibility]} · {channel.status}
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
        aria-label="Channel settings tabs"
      >
        {CHANNEL_SETTINGS_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "shrink-0 rounded-t-lg px-3 py-2 text-[12px] font-semibold capitalize",
              tab === t
                ? "text-[var(--color-accent)] shadow-[inset_0_-2px_0_var(--color-accent)]"
                : "text-[var(--color-text-muted)]"
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
                defaultValue={channel.name}
                onBlur={(e) => {
                  if (e.target.value.trim() && e.target.value !== channel.name) {
                    void save({ name: e.target.value.trim() });
                  }
                }}
              />
            </Field>
            <Field label="Slug">
              <Input
                defaultValue={channel.slug}
                onBlur={(e) => {
                  if (e.target.value.trim() && e.target.value !== channel.slug) {
                    void save({ slug: e.target.value.trim() });
                  }
                }}
              />
            </Field>
            <Field label="Description">
              <Textarea
                defaultValue={channel.description ?? ""}
                rows={3}
                onBlur={(e) => {
                  if (e.target.value !== (channel.description ?? "")) {
                    void save({ description: e.target.value });
                  }
                }}
              />
            </Field>
            <Field label="Channel type">
              <select
                value={channel.kind}
                onChange={(e) =>
                  void save({ kind: e.target.value as OwnerChannelKind })
                }
                className="h-10 w-full rounded-md border border-[var(--color-border)] px-2 text-sm"
              >
                {OWNER_CHANNEL_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {CHANNEL_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}

        {tab === "branding" && (
          <div className="max-w-xl space-y-4">
            <Field label="Emoji / icon">
              <div className="flex flex-wrap gap-1.5">
                {CHANNEL_ICON_PRESETS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => void save({ icon: emoji, emoji })}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg text-lg",
                      (channel.emoji ?? channel.icon) === emoji
                        ? "ring-2 ring-[var(--color-accent)]"
                        : "bg-[var(--color-surface-secondary)]"
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Accent color">
              <div className="flex flex-wrap gap-2">
                {CHANNEL_COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => void save({ color: c })}
                    className={cn(
                      "h-8 w-8 rounded-full",
                      (channel.color ?? DEFAULT_CHANNEL_COLOR) === c &&
                        "ring-2 ring-offset-2 ring-[var(--color-accent)]"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </Field>
            <p className="text-[12px] text-[var(--color-text-muted)]">
              Banner images arrive in a future branding phase.
            </p>
          </div>
        )}

        {tab === "permissions" && (
          <PermissionsEditor
            config={channel.permissionConfig}
            onSave={(permissionConfig) => void save({ permissionConfig })}
          />
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
                <li key={m.userId} className="flex justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold">
                      {m.fullName || m.username || "Member"}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      {m.role} · {m.status}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
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
              <Button
                type="button"
                onClick={async () => {
                  if (!staffUserId.trim()) return;
                  const res = await fetch(
                    `/api/c/owner/channels/${channelId}/staff`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ userId: staffUserId.trim() }),
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
                    `/api/c/owner/channels/${channelId}/staff`
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
                  No channel moderators yet
                </li>
              )}
              {staff.map((s) => (
                <li
                  key={s.userId}
                  className="flex items-center justify-between px-4 py-3"
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
                        `/api/c/owner/channels/${channelId}/staff?userId=${encodeURIComponent(s.userId)}`,
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

        {tab === "content" && (
          <div className="max-w-xl space-y-4">
            <Field label="Welcome message">
              <Textarea
                defaultValue={channel.welcomeMessage ?? ""}
                rows={4}
                onBlur={(e) => {
                  if (e.target.value !== (channel.welcomeMessage ?? "")) {
                    void save({
                      welcomeMessage: e.target.value,
                      behaviorConfig: {
                        ...channel.behaviorConfig,
                        welcomeMessage: e.target.value,
                      },
                    });
                  }
                }}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={channel.behaviorConfig.readOnly}
                onChange={(e) =>
                  void save({
                    behaviorConfig: {
                      ...channel.behaviorConfig,
                      readOnly: e.target.checked,
                    },
                  })
                }
              />
              Read only / lock posting
            </label>
            <Field label="Slow mode (seconds)">
              <Input
                type="number"
                min={0}
                defaultValue={channel.behaviorConfig.slowModeSeconds}
                onBlur={(e) =>
                  void save({
                    behaviorConfig: {
                      ...channel.behaviorConfig,
                      slowModeSeconds: Number(e.target.value) || 0,
                    },
                  })
                }
              />
            </Field>
          </div>
        )}

        {tab === "automation" && (
          <div className="max-w-xl space-y-3">
            {(
              [
                ["autoWelcome", "Auto welcome"],
                ["autoArchive", "Auto archive"],
                ["autoAiSummary", "Auto AI summary"],
                ["autoPinRules", "Auto pin rules"],
                ["autoModeration", "Auto moderation"],
                ["autoKnowledgeCapture", "Auto knowledge capture"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={channel.automationConfig[key]}
                  onChange={(e) =>
                    void save({
                      automationConfig: {
                        ...channel.automationConfig,
                        [key]: e.target.checked,
                      },
                    })
                  }
                />
                {label}
              </label>
            ))}
          </div>
        )}

        {tab === "analytics" && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["Messages", analytics?.messages],
                ["Active members", analytics?.activeMembers],
                ["Growth", analytics?.growth],
                ["Engagement", analytics?.engagement],
                ["Knowledge", analytics?.knowledgeGenerated],
                ["Files", analytics?.filesShared],
                ["Commerce", analytics?.commerceActivity],
                ["Live", analytics?.liveActivity],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-[var(--color-border)] px-4 py-3"
              >
                <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                  {label}
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums">
                  {value ?? "—"}
                </p>
              </div>
            ))}
          </div>
        )}

        {tab === "danger" && (
          <div className="max-w-xl space-y-4">
            <DangerCard
              title="Archive channel"
              description="Hide from active directories. Can be restored."
              actionLabel="Archive"
              disabled={channel.status === "archived"}
              onAction={() => void runAction("archive")}
            />
            {channel.status === "archived" && (
              <DangerCard
                title="Restore channel"
                description="Return to the active directory."
                actionLabel="Restore"
                onAction={() => void runAction("restore")}
              />
            )}
            <DangerCard
              title="Delete channel"
              description="Soft-delete (archive). Hard delete permanently removes the channel."
              actionLabel="Delete"
              destructive
              onAction={() => {
                if (window.confirm(`Delete “${channel.name}”?`)) {
                  void runAction("delete");
                }
              }}
            />
            <DangerCard
              title="Hard delete"
              description="Permanently remove this channel. Cannot be undone."
              actionLabel="Hard delete"
              destructive
              onAction={() => {
                if (
                  window.confirm(
                    `HARD DELETE “${channel.name}”? This cannot be undone.`
                  )
                ) {
                  void runAction("delete", true);
                }
              }}
            />
          </div>
        )}
      </div>

      {tab === "general" && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
            Visibility
          </p>
          <div className="grid max-w-2xl gap-2">
            {CHANNEL_VISIBILITY_VALUES.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() =>
                  void save({ visibility: mode as ChannelVisibilityMode })
                }
                className={cn(
                  "rounded-xl border px-4 py-3 text-left",
                  channel.visibility === mode
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
                    : "border-[var(--color-border)]"
                )}
              >
                <p className="text-sm font-bold">
                  {CHANNEL_VISIBILITY_LABELS[mode]}
                </p>
                <p className="text-[12px] text-[var(--color-text-muted)]">
                  {CHANNEL_VISIBILITY_DESCRIPTIONS[mode]}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
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
  config: ChannelPermissionConfig;
  onSave: (next: ChannelPermissionConfig) => void;
}) {
  const [draft, setDraft] = useState(config);
  useEffect(() => setDraft(config), [config]);

  return (
    <div className="space-y-4">
      {(
        [
          ["whoCanView", "Who can view"],
          ["whoCanPost", "Who can post"],
          ["whoCanReply", "Who can reply"],
          ["whoCanUpload", "Who can upload"],
          ["whoCanPin", "Who can pin"],
          ["whoCanModerate", "Who can moderate"],
          ["whoCanGoLive", "Who can go live"],
          ["whoCanCreateThreads", "Who can create threads"],
        ] as const
      ).map(([key, label]) => (
        <Field key={key} label={label}>
          <div className="flex flex-wrap gap-1.5">
            {CHANNEL_PERMISSION_ACTORS.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() =>
                  setDraft((d) => {
                    const set = new Set(d[key]);
                    if (set.has(role)) set.delete(role);
                    else set.add(role);
                    return { ...d, [key]: [...set] };
                  })
                }
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
        <p className="text-sm font-bold">{title}</p>
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
