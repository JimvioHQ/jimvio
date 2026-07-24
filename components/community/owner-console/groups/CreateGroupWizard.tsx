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
  DEFAULT_CHANNEL_TYPE_OPTIONS,
  DEFAULT_GROUP_COLOR,
  DEFAULT_GROUP_CONTENT,
  DEFAULT_GROUP_ICON,
  DEFAULT_PERMISSION_CONFIG,
  GROUP_COLOR_PRESETS,
  GROUP_ICON_PRESETS,
  GROUP_PERMISSION_ACTORS,
  GROUP_PRIVACY_DESCRIPTIONS,
  GROUP_PRIVACY_LABELS,
  GROUP_PRIVACY_VALUES,
  slugifyGroupName,
  type CreateOwnerGroupInput,
  type GroupDefaultContent,
  type GroupPermissionConfig,
  type GroupPrivacyMode,
  type OwnerGroupListItem,
} from "@/lib/community/owner-console/groups";

const STEPS = [
  { id: 1, label: "Identity" },
  { id: 2, label: "Privacy" },
  { id: 3, label: "Permissions" },
  { id: 4, label: "Defaults" },
  { id: 5, label: "Review" },
] as const;

type Draft = {
  name: string;
  slug: string;
  description: string;
  icon: string;
  coverUrl: string;
  color: string;
  privacy: GroupPrivacyMode;
  permissionConfig: GroupPermissionConfig;
  defaultContent: GroupDefaultContent;
};

function emptyDraft(): Draft {
  return {
    name: "",
    slug: "",
    description: "",
    icon: DEFAULT_GROUP_ICON,
    coverUrl: "",
    color: DEFAULT_GROUP_COLOR,
    privacy: "public",
    permissionConfig: { ...DEFAULT_PERMISSION_CONFIG },
    defaultContent: {
      ...DEFAULT_GROUP_CONTENT,
      defaultChannels: [...DEFAULT_GROUP_CONTENT.defaultChannels],
      defaultResources: [],
    },
  };
}

function RoleChecklist({
  label,
  value,
  onChange,
}: {
  label: string;
  value: GroupPermissionConfig["whoCanInvite"];
  onChange: (next: GroupPermissionConfig["whoCanInvite"]) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-[var(--color-text-secondary)]">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {GROUP_PERMISSION_ACTORS.map((role) => {
          const on = value.includes(role);
          return (
            <button
              key={role}
              type="button"
              onClick={() =>
                onChange(
                  on ? value.filter((r) => r !== role) : [...value, role]
                )
              }
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors",
                on
                  ? "bg-[var(--color-accent)] text-white"
                  : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              )}
            >
              {role}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CreateGroupWizard({
  open,
  onOpenChange,
  communityId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string;
  onCreated?: (group: OwnerGroupListItem) => void;
}) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setDraft(emptyDraft());
      setSlugTouched(false);
      setSaving(false);
    }
  }, [open]);

  useEffect(() => {
    if (!slugTouched) {
      setDraft((d) => ({
        ...d,
        slug: slugifyGroupName(d.name),
      }));
    }
  }, [draft.name, slugTouched]);

  const canNext = useMemo(() => {
    if (step === 1) return draft.name.trim().length >= 2;
    return true;
  }, [step, draft.name]);

  async function publish(asDraft = false) {
    if (saving) return;
    setSaving(true);
    try {
      const payload: CreateOwnerGroupInput = {
        communityId,
        name: draft.name.trim(),
        slug: draft.slug.trim() || undefined,
        description: draft.description.trim() || null,
        icon: draft.icon,
        coverUrl: draft.coverUrl.trim() || null,
        color: draft.color,
        privacy: draft.privacy,
        permissionConfig: draft.permissionConfig,
        defaultContent: draft.defaultContent,
        publish: !asDraft,
      };
      const res = await fetch("/api/c/owner/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not create group");
        return;
      }
      toast.success(asDraft ? "Group saved as draft" : "Group published");
      onCreated?.(data.group);
      onOpenChange(false);
    } catch {
      toast.error("Could not create group");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto border-[var(--color-border)] bg-[var(--color-surface)]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold tracking-tight">
            Create Group
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--color-text-muted)]">
            Build a primary organizational unit for your community.
          </DialogDescription>
        </DialogHeader>

        <ol className="mt-2 flex flex-wrap gap-2" aria-label="Create group steps">
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
              <Field label="Group name">
                <Input
                  value={draft.name}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, name: e.target.value }))
                  }
                  placeholder="e.g. Founders Circle"
                  maxLength={80}
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
                      slug: slugifyGroupName(e.target.value),
                    }));
                  }}
                  placeholder="founders-circle"
                />
              </Field>
              <Field label="Description">
                <Textarea
                  value={draft.description}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, description: e.target.value }))
                  }
                  rows={3}
                  placeholder="Who is this group for?"
                />
              </Field>
              <Field label="Icon">
                <div className="flex flex-wrap gap-1.5">
                  {GROUP_ICON_PRESETS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, icon: emoji }))}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-colors",
                        draft.icon === emoji
                          ? "bg-[var(--color-accent)]/15 ring-2 ring-[var(--color-accent)]"
                          : "bg-[var(--color-surface-secondary)] hover:bg-[var(--color-border)]"
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
                      aria-label={`Color ${c}`}
                      onClick={() => setDraft((d) => ({ ...d, color: c }))}
                      className={cn(
                        "h-8 w-8 rounded-full transition-transform",
                        draft.color === c && "ring-2 ring-offset-2 ring-[var(--color-accent)]"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </Field>
              <Field label="Cover image URL (optional)">
                <Input
                  value={draft.coverUrl}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, coverUrl: e.target.value }))
                  }
                  placeholder="https://…"
                />
              </Field>
            </>
          )}

          {step === 2 && (
            <div className="grid gap-2">
              {GROUP_PRIVACY_VALUES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, privacy: mode }))}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-left transition-colors",
                    draft.privacy === mode
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
                      : "border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]"
                  )}
                >
                  <p className="text-sm font-bold text-[var(--color-text-primary)]">
                    {GROUP_PRIVACY_LABELS[mode]}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
                    {GROUP_PRIVACY_DESCRIPTIONS[mode]}
                  </p>
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <Field label="Who can join">
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      "everyone",
                      "members",
                      "invite_only",
                      "approval",
                    ] as const
                  ).map((policy) => (
                    <button
                      key={policy}
                      type="button"
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          permissionConfig: {
                            ...d.permissionConfig,
                            whoCanJoin: policy,
                          },
                        }))
                      }
                      className={cn(
                        "rounded-full px-3 py-1.5 text-[11px] font-semibold capitalize",
                        draft.permissionConfig.whoCanJoin === policy
                          ? "bg-[var(--color-accent)] text-white"
                          : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
                      )}
                    >
                      {policy.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </Field>
              <RoleChecklist
                label="Who can invite"
                value={draft.permissionConfig.whoCanInvite}
                onChange={(whoCanInvite) =>
                  setDraft((d) => ({
                    ...d,
                    permissionConfig: { ...d.permissionConfig, whoCanInvite },
                  }))
                }
              />
              <RoleChecklist
                label="Who can create channels"
                value={draft.permissionConfig.whoCanCreateChannels}
                onChange={(whoCanCreateChannels) =>
                  setDraft((d) => ({
                    ...d,
                    permissionConfig: {
                      ...d.permissionConfig,
                      whoCanCreateChannels,
                    },
                  }))
                }
              />
              <RoleChecklist
                label="Who can upload files"
                value={draft.permissionConfig.whoCanUpload}
                onChange={(whoCanUpload) =>
                  setDraft((d) => ({
                    ...d,
                    permissionConfig: { ...d.permissionConfig, whoCanUpload },
                  }))
                }
              />
              <RoleChecklist
                label="Who can create events"
                value={draft.permissionConfig.whoCanCreateEvents}
                onChange={(whoCanCreateEvents) =>
                  setDraft((d) => ({
                    ...d,
                    permissionConfig: {
                      ...d.permissionConfig,
                      whoCanCreateEvents,
                    },
                  }))
                }
              />
              <RoleChecklist
                label="Who can create courses"
                value={draft.permissionConfig.whoCanCreateCourses}
                onChange={(whoCanCreateCourses) =>
                  setDraft((d) => ({
                    ...d,
                    permissionConfig: {
                      ...d.permissionConfig,
                      whoCanCreateCourses,
                    },
                  }))
                }
              />
              <RoleChecklist
                label="Who can create voice rooms"
                value={draft.permissionConfig.whoCanCreateVoiceRooms}
                onChange={(whoCanCreateVoiceRooms) =>
                  setDraft((d) => ({
                    ...d,
                    permissionConfig: {
                      ...d.permissionConfig,
                      whoCanCreateVoiceRooms,
                    },
                  }))
                }
              />
              <RoleChecklist
                label="Who can create live sessions"
                value={draft.permissionConfig.whoCanCreateLiveSessions}
                onChange={(whoCanCreateLiveSessions) =>
                  setDraft((d) => ({
                    ...d,
                    permissionConfig: {
                      ...d.permissionConfig,
                      whoCanCreateLiveSessions,
                    },
                  }))
                }
              />
              <RoleChecklist
                label="Who can go live"
                value={draft.permissionConfig.whoCanGoLive}
                onChange={(whoCanGoLive) =>
                  setDraft((d) => ({
                    ...d,
                    permissionConfig: { ...d.permissionConfig, whoCanGoLive },
                  }))
                }
              />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <Field label="Welcome message">
                <Textarea
                  value={draft.defaultContent.welcomeMessage}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      defaultContent: {
                        ...d.defaultContent,
                        welcomeMessage: e.target.value,
                      },
                    }))
                  }
                  rows={3}
                />
              </Field>
              <Field label="Channels (optional)">
                <p className="mb-2 text-[12px] text-[var(--color-text-muted)]">
                  Leave empty to create the group first, then add channels later.
                </p>
                <div className="space-y-2">
                  {draft.defaultContent.defaultChannels.map((ch, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={ch.name}
                        onChange={(e) => {
                          const next = [...draft.defaultContent.defaultChannels];
                          next[i] = { ...next[i], name: e.target.value };
                          setDraft((d) => ({
                            ...d,
                            defaultContent: {
                              ...d.defaultContent,
                              defaultChannels: next,
                            },
                          }));
                        }}
                        placeholder="Channel name"
                      />
                      <select
                        value={ch.roomType}
                        onChange={(e) => {
                          const next = [...draft.defaultContent.defaultChannels];
                          next[i] = { ...next[i], roomType: e.target.value };
                          setDraft((d) => ({
                            ...d,
                            defaultContent: {
                              ...d.defaultContent,
                              defaultChannels: next,
                            },
                          }));
                        }}
                        className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                      >
                        {DEFAULT_CHANNEL_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        defaultContent: {
                          ...d.defaultContent,
                          defaultChannels: [
                            ...d.defaultContent.defaultChannels,
                            { name: "", roomType: "chat" },
                          ],
                        },
                      }))
                    }
                  >
                    Add channel
                  </Button>
                </div>
              </Field>
              <Field label="Default resources (one per line)">
                <Textarea
                  value={draft.defaultContent.defaultResources.join("\n")}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      defaultContent: {
                        ...d.defaultContent,
                        defaultResources: e.target.value
                          .split("\n")
                          .map((x) => x.trim())
                          .filter(Boolean),
                      },
                    }))
                  }
                  rows={3}
                  placeholder="https://docs.example.com"
                />
              </Field>
              <Field label="Default rules">
                <Textarea
                  value={draft.defaultContent.defaultRules}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      defaultContent: {
                        ...d.defaultContent,
                        defaultRules: e.target.value,
                      },
                    }))
                  }
                  rows={3}
                />
              </Field>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40 p-4">
              <ReviewRow label="Name" value={`${draft.icon} ${draft.name}`} />
              <ReviewRow label="Slug" value={draft.slug || "—"} />
              <ReviewRow
                label="Privacy"
                value={GROUP_PRIVACY_LABELS[draft.privacy]}
              />
              <ReviewRow
                label="Channels"
                value={String(draft.defaultContent.defaultChannels.length)}
              />
              <ReviewRow
                label="Join policy"
                value={draft.permissionConfig.whoCanJoin.replace("_", " ")}
              />
              {draft.description && (
                <ReviewRow label="Description" value={draft.description} />
              )}
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
          <div className="flex flex-wrap gap-2">
            {step === 5 && (
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => void publish(true)}
              >
                Save draft
              </Button>
            )}
            {step < 5 ? (
              <Button
                type="button"
                disabled={!canNext || saving}
                onClick={() => setStep((s) => Math.min(5, s + 1))}
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

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span className="max-w-[70%] text-right font-semibold text-[var(--color-text-primary)]">
        {value}
      </span>
    </div>
  );
}
