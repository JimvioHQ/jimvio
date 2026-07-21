"use client";

import { useState, type FormEvent } from "react";
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

const CHANNEL_TYPES = [
  { value: "chat", label: "Text" },
  { value: "posts", label: "Announcement" },
  { value: "voice", label: "Voice (coming soon)" },
] as const;

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
  const [channelType, setChannelType] =
    useState<(typeof CHANNEL_TYPES)[number]["value"]>("chat");
  const [saving, setSaving] = useState(false);

  function reset() {
    setName("");
    setChannelType("chat");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || saving || !spaceId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/rooms/${spaceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          room_type: channelType === "voice" ? "voice" : channelType,
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
            Add a discussion room. Messages use the existing community chat backend.
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
              placeholder="e.g. Signals"
              className="rounded-sm border-[var(--color-border)]"
              maxLength={80}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--color-text-secondary)]">
              Channel type
            </label>
            <select
              value={channelType}
              onChange={(e) =>
                setChannelType(e.target.value as (typeof CHANNEL_TYPES)[number]["value"])
              }
              className="w-full rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
            >
              {CHANNEL_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          {!spaceId && (
            <p className="text-[12px] text-amber-700">
              Create a group first so channels have a home space.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="rounded-sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-sm bg-[#fd5000] font-semibold text-white hover:bg-[#e04700]"
              disabled={saving || !name.trim() || !spaceId}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
