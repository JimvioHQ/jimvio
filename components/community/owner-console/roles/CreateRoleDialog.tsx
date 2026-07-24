"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ROLE_TEMPLATES,
  SYSTEM_ROLE_KEYS,
  SYSTEM_ROLE_LABELS,
  type OwnerRoleTemplate,
  type RoleTemplateKey,
} from "@/lib/community/owner-console/roles";

export function CreateRoleDialog({
  open,
  onClose,
  onCreate,
  templates = ROLE_TEMPLATES,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: Record<string, unknown>) => Promise<unknown>;
  templates?: OwnerRoleTemplate[];
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [templateKey, setTemplateKey] = useState<string>("");
  const [inheritsFrom, setInheritsFrom] = useState("member");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function submit() {
    setBusy(true);
    const ok = await onCreate({
      name: name.trim() || undefined,
      description: description.trim() || null,
      fromTemplate: templateKey || undefined,
      inheritsFrom: templateKey ? undefined : inheritsFrom,
    });
    setBusy(false);
    if (ok) {
      setName("");
      setDescription("");
      setTemplateKey("");
      onClose();
    }
  }

  function applyTemplate(key: string) {
    setTemplateKey(key);
    const t = templates.find((x) => x.key === key);
    if (t) {
      setName(t.name);
      setDescription(t.description);
      setInheritsFrom(t.inheritsFrom);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal
        aria-labelledby="create-role-title"
        className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xl"
      >
        <h2
          id="create-role-title"
          className="text-base font-bold text-[var(--color-text-primary)]"
        >
          Create role
        </h2>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
          Start from a template or build a custom role with inheritance.
        </p>

        <div className="mt-4 space-y-3">
          <label className="block space-y-1 text-[12px] font-semibold">
            Template (optional)
            <select
              value={templateKey}
              onChange={(e) => applyTemplate(e.target.value)}
              className="flex h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            >
              <option value="">Blank custom role</option>
              {templates.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-[12px] font-semibold">
            Name
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Role name"
            />
          </label>
          <label className="block space-y-1 text-[12px] font-semibold">
            Description
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this role can do"
            />
          </label>
          {!templateKey && (
            <label className="block space-y-1 text-[12px] font-semibold">
              Inherits from
              <select
                value={inheritsFrom}
                onChange={(e) => setInheritsFrom(e.target.value)}
                className="flex h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
              >
                {SYSTEM_ROLE_KEYS.filter((k) => k !== "owner").map((k) => (
                  <option key={k} value={k}>
                    {SYSTEM_ROLE_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={busy || (!name.trim() && !templateKey)}
          >
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}

export function RoleTemplatesPanel({
  templates,
  onUse,
}: {
  templates: OwnerRoleTemplate[];
  onUse: (key: RoleTemplateKey) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onUse(t.key)}
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left transition-colors hover:border-[var(--color-accent)]/40"
        >
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
            style={{ backgroundColor: `${t.color}22` }}
          >
            {t.icon}
          </span>
          <p className="mt-3 text-sm font-bold text-[var(--color-text-primary)]">
            {t.name}
          </p>
          <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
            {t.description}
          </p>
          <p className="mt-2 text-[11px] font-semibold text-[var(--color-accent)]">
            {t.capabilities.length} capabilities · inherits{" "}
            {SYSTEM_ROLE_LABELS[t.inheritsFrom as keyof typeof SYSTEM_ROLE_LABELS] ??
              t.inheritsFrom}
          </p>
        </button>
      ))}
    </div>
  );
}
