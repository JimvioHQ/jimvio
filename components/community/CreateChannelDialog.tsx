"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
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
import {
  CHANNEL_KIND_TO_ROOM_TYPE,
  CHANNEL_TEMPLATES,
  type ChannelTemplateId,
} from "@/lib/community/owner-console/channels";

/** Member-facing quick create — subset of production templates. */
const QUICK_TEMPLATES = CHANNEL_TEMPLATES.filter((t) =>
  (
    [
      "general_chat",
      "announcements",
      "introductions",
      "wins",
      "support",
      "resources",
      "knowledge",
    ] as ChannelTemplateId[]
  ).includes(t.id)
);

export function CreateChannelDialog({
  open,
  onOpenChange,
  spaceId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string | null;
  onCreated?: (room: { id: string; name: string; space_id: string }) => void;
}) {
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState<ChannelTemplateId>("general_chat");
  const [saving, setSaving] = useState(false);

  const selected = useMemo(
    () => CHANNEL_TEMPLATES.find((t) => t.id === templateId) ?? CHANNEL_TEMPLATES[0],
    [templateId]
  );

  function reset() {
    setName("");
    setTemplateId("general_chat");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || saving || !spaceId) return;
    setSaving(true);
    try {
      const roomType = CHANNEL_KIND_TO_ROOM_TYPE[selected.kind] ?? "chat";
      const res = await fetch(`/api/rooms/${spaceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          room_type: roomType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not create channel");
        return;
      }
      toast.success("Channel created");
      onCreated?.(data.room);
      reset();
      onOpenChange(false);
    } catch {
      toast.error("Could not create channel");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md border-[var(--color-border)] bg-[var(--color-surface)]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Create Channel</DialogTitle>
          <DialogDescription className="text-sm text-[var(--color-text-muted)]">
            Channels live inside this Group. Discussion-style templates stay open for
            members; announcements stay publisher-only.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="mt-2 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--color-text-secondary)]">
              Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={selected.label}
              className="rounded-sm border-[var(--color-border)]"
              maxLength={80}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--color-text-secondary)]">
              Template
            </label>
            <select
              value={templateId}
              onChange={(e) =>
                setTemplateId(e.target.value as ChannelTemplateId)
              }
              className="w-full rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
            >
              {QUICK_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.icon} {t.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
              {selected.description}
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !name.trim() || !spaceId}
              className="bg-[var(--color-accent)] text-white"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Create"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
