"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  CHANNEL_COLOR_PRESETS,
  CHANNEL_ICON_PRESETS,
  CHANNEL_KIND_LABELS,
  CHANNEL_PERMISSION_ACTORS,
  CHANNEL_TEMPLATES,
  CHANNEL_VISIBILITY_DESCRIPTIONS,
  CHANNEL_VISIBILITY_LABELS,
  CHANNEL_VISIBILITY_VALUES,
  DEFAULT_AUTOMATION_CONFIG,
  DEFAULT_BEHAVIOR_CONFIG,
  DEFAULT_CHANNEL_COLOR,
  DEFAULT_CHANNEL_ICON,
  DEFAULT_PERMISSION_CONFIG,
  OWNER_CHANNEL_KINDS,
  slugifyChannelName,
  type ChannelPermissionConfig,
  type ChannelVisibilityMode,
  type CreateOwnerChannelInput,
  type OwnerChannelKind,
  type OwnerChannelListItem,
} from "@/lib/community/owner-console/channels";
import type { ChannelGroupOption } from "./useOwnerChannels";

const STEPS = [
  { id: 1, label: "Identity" },
  { id: 2, label: "Type" },
  { id: 3, label: "Visibility" },
  { id: 4, label: "Permissions" },
  { id: 5, label: "Behavior" },
  { id: 6, label: "Review" },
] as const;

type Draft = {
  name: string;
  slug: string;
  description: string;
  icon: string;
  emoji: string;
  color: string;
  groupId: string;
  kind: OwnerChannelKind;
  visibility: ChannelVisibilityMode;
  permissionConfig: ChannelPermissionConfig;
  slowModeSeconds: number;
  readOnly: boolean;
  welcomeMessage: string;
  autoArchiveDays: number | null;
  templateId?: string;
};

function emptyDraft(defaultGroupId: string): Draft {
  return {
    name: "",
    slug: "",
    description: "",
    icon: DEFAULT_CHANNEL_ICON,
    emoji: DEFAULT_CHANNEL_ICON,
    color: DEFAULT_CHANNEL_COLOR,
    groupId: defaultGroupId,
    kind: "discussion",
    visibility: "members",
    permissionConfig: { ...DEFAULT_PERMISSION_CONFIG },
    slowModeSeconds: 0,
    readOnly: false,
    welcomeMessage: DEFAULT_BEHAVIOR_CONFIG.welcomeMessage,
    autoArchiveDays: null,
  };
}

export function CreateChannelWizard({
  open,
  onOpenChange,
  communityId,
  groups,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string;
  groups: ChannelGroupOption[];
  onCreated?: (channel: OwnerChannelListItem) => void;
}) {
  const defaultGroupId = groups[0]?.id ?? "";
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(defaultGroupId));
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setDraft(emptyDraft(groups[0]?.id ?? ""));
      setSlugTouched(false);
      setSaving(false);
    } else if (groups[0]?.id && !draft.groupId) {
      setDraft((d) => ({ ...d, groupId: groups[0].id }));
    }
  }, [open, groups, draft.groupId]);

  useEffect(() => {
    if (!slugTouched) {
      setDraft((d) => ({ ...d, slug: slugifyChannelName(d.name) }));
    }
  }, [draft.name, slugTouched]);

  const canNext = useMemo(() => {
    if (step === 1) return draft.name.trim().length >= 2 && Boolean(draft.groupId);
    return true;
  }, [step, draft.name, draft.groupId]);

  async function publish(asDraft = false) {
    if (saving || !draft.groupId) return;
    setSaving(true);
    try {
      const payload: CreateOwnerChannelInput = {
        communityId,
        groupId: draft.groupId,
        name: draft.name.trim(),
        slug: draft.slug.trim() || undefined,
        description: draft.description.trim() || null,
        icon: draft.icon,
        emoji: draft.emoji,
        color: draft.color,
        kind: draft.kind,
        visibility: draft.visibility,
        permissionConfig: draft.permissionConfig,
        behaviorConfig: {
          ...DEFAULT_BEHAVIOR_CONFIG,
          slowModeSeconds: draft.slowModeSeconds,
          readOnly: draft.readOnly,
          welcomeMessage: draft.welcomeMessage,
          autoArchiveDays: draft.autoArchiveDays,
        },
        automationConfig: DEFAULT_AUTOMATION_CONFIG,
        templateId: draft.templateId,
        publish: !asDraft,
      };
      const res = await fetch("/api/c/owner/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not create channel");
        return;
      }
      toast.success(asDraft ? "Channel saved as draft" : "Channel published");
      onCreated?.(data.channel);
      onOpenChange(false);
    } catch {
      toast.error("Could not create channel");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto border-[var(--color-border)] bg-[var(--color-surface)]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold tracking-tight">
            Create Channel
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--color-text-muted)]">
            Add a collaboration room inside a group.
          </DialogDescription>
        </DialogHeader>

        <ol className="mt-2 flex flex-wrap gap-2" aria-label="Create channel steps">
          {STEPS.map((s) => (
            <li
              key={s.id}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
                step === s.id
                  ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                  : step > s.id
                    ? "bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-muted)]"
              )}
            >
              {step > s.id ? <Check className="h-3 w-3" /> : s.id}
              {s.label}
            </li>
          ))}
        </ol>

        <div className="mt-4 space-y-4">
          {step === 1 && (
            <>
              <Field label="Templates">
                <div className="grid gap-2 sm:grid-cols-2">
                  {CHANNEL_TEMPLATES.slice(0, 6).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          templateId: t.id,
                          kind: t.kind,
                          icon: t.icon,
                          emoji: t.icon,
                          name: d.name || t.label,
                        }))
                      }
                      className={cn(
                        "rounded-xl border px-3 py-2 text-left text-[12px]",
                        draft.templateId === t.id
                          ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
                          : "border-[var(--color-border)]"
                      )}
                    >
                      <span className="mr-1">{t.icon}</span>
                      <span className="font-semibold">{t.label}</span>
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Channel name">
                <Input
                  value={draft.name}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, name: e.target.value }))
                  }
                  placeholder="e.g. Discussion"
                  autoFocus
                />
              </Field>
              <Field label="Slug">
                <Input
                  value={draft.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setDraft((d) => ({
                      ...d,
                      slug: slugifyChannelName(e.target.value),
                    }));
                  }}
                />
              </Field>
              <Field label="Group">
                <select
                  value={draft.groupId}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, groupId: e.target.value }))
                  }
                  className="h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                >
                  {groups.length === 0 && (
                    <option value="">No groups available</option>
                  )}
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Description">
                <Textarea
                  value={draft.description}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, description: e.target.value }))
                  }
                  rows={2}
                />
              </Field>
              <Field label="Icon / emoji">
                <div className="flex flex-wrap gap-1.5">
                  {CHANNEL_ICON_PRESETS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() =>
                        setDraft((d) => ({ ...d, icon: emoji, emoji }))
                      }
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg text-lg",
                        draft.emoji === emoji
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
                      onClick={() => setDraft((d) => ({ ...d, color: c }))}
                      className={cn(
                        "h-8 w-8 rounded-full",
                        draft.color === c &&
                          "ring-2 ring-offset-2 ring-[var(--color-accent)]"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </Field>
            </>
          )}

          {step === 2 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {OWNER_CHANNEL_KINDS.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, kind }))}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-left text-sm font-semibold",
                    draft.kind === kind
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
                      : "border-[var(--color-border)]"
                  )}
                >
                  {CHANNEL_KIND_LABELS[kind]}
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-2">
              {CHANNEL_VISIBILITY_VALUES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, visibility: mode }))}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-left",
                    draft.visibility === mode
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
          )}

          {step === 4 && (
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
                <div key={key}>
                  <p className="mb-1.5 text-xs font-bold text-[var(--color-text-secondary)]">
                    {label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {CHANNEL_PERMISSION_ACTORS.map((role) => {
                      const on = draft.permissionConfig[key].includes(role);
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() =>
                            setDraft((d) => ({
                              ...d,
                              permissionConfig: {
                                ...d.permissionConfig,
                                [key]: on
                                  ? d.permissionConfig[key].filter((r) => r !== role)
                                  : [...d.permissionConfig[key], role],
                              },
                            }))
                          }
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize",
                            on
                              ? "bg-[var(--color-accent)] text-white"
                              : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
                          )}
                        >
                          {role}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <Field label="Slow mode (seconds)">
                <Input
                  type="number"
                  min={0}
                  value={draft.slowModeSeconds}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      slowModeSeconds: Number(e.target.value) || 0,
                    }))
                  }
                />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.readOnly}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, readOnly: e.target.checked }))
                  }
                />
                Read only
              </label>
              <Field label="Welcome message">
                <Textarea
                  value={draft.welcomeMessage}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, welcomeMessage: e.target.value }))
                  }
                  rows={3}
                />
              </Field>
              <Field label="Auto archive after days (optional)">
                <Input
                  type="number"
                  min={0}
                  value={draft.autoArchiveDays ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      autoArchiveDays: e.target.value
                        ? Number(e.target.value)
                        : null,
                    }))
                  }
                  placeholder="Leave empty to disable"
                />
              </Field>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40 p-4 text-sm">
              <Row label="Name" value={`${draft.emoji} ${draft.name}`} />
              <Row
                label="Group"
                value={groups.find((g) => g.id === draft.groupId)?.name ?? "—"}
              />
              <Row label="Type" value={CHANNEL_KIND_LABELS[draft.kind]} />
              <Row
                label="Visibility"
                value={CHANNEL_VISIBILITY_LABELS[draft.visibility]}
              />
              <Row
                label="Read only"
                value={draft.readOnly ? "Yes" : "No"}
              />
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)] pt-4">
          <Button
            type="button"
            variant="ghost"
            disabled={step === 1 || saving}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-2">
            {step === 6 && (
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => void publish(true)}
              >
                Save draft
              </Button>
            )}
            {step < 6 ? (
              <Button
                type="button"
                disabled={!canNext || saving}
                onClick={() => setStep((s) => Math.min(6, s + 1))}
              >
                Continue
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                disabled={saving || !canNext}
                onClick={() => void publish(false)}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Publish
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span className="font-semibold text-[var(--color-text-primary)]">{value}</span>
    </div>
  );
}
