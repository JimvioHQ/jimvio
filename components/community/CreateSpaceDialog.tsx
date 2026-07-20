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
import { Textarea } from "@/components/ui/textarea";

const ROOM_TYPES = [
  { value: "chat", label: "Chat" },
  { value: "posts", label: "Posts" },
  { value: "resources", label: "Resources" },
] as const;

export function CreateSpaceDialog({
  open,
  onOpenChange,
  communityId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string;
  onCreated?: (space: { id: string; name: string; slug: string }) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultRoomType, setDefaultRoomType] =
    useState<(typeof ROOM_TYPES)[number]["value"]>("chat");
  const [saving, setSaving] = useState(false);

  function reset() {
    setName("");
    setDescription("");
    setDefaultRoomType("chat");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/c/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communityId,
          name: trimmed,
          description: description.trim() || undefined,
          defaultRoomType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not create space");
        return;
      }
      toast.success("Space created");
      onCreated?.(data.space);
      reset();
      onOpenChange(false);
    } catch {
      toast.error("Could not create space");
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
          <DialogTitle className="text-base font-bold">Create Space</DialogTitle>
          <DialogDescription className="text-sm text-[var(--color-text-muted)]">
            Organize rooms for chat, posts, or resources in this community.
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
              placeholder="e.g. General"
              className="rounded-sm border-[var(--color-border)]"
              maxLength={80}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--color-text-secondary)]">
              Description (optional)
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this space for?"
              rows={2}
              className="resize-none rounded-sm border-[var(--color-border)]"
              maxLength={300}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--color-text-secondary)]">
              Default room type
            </label>
            <select
              value={defaultRoomType}
              onChange={(e) =>
                setDefaultRoomType(e.target.value as (typeof ROOM_TYPES)[number]["value"])
              }
              className="w-full rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
            >
              {ROOM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
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
              disabled={saving || !name.trim()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
