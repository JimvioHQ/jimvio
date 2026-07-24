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

export function CreateSpaceDialog({
  open,
  onOpenChange,
  communityId,
  onCreated,
  entityLabel = "Group",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string;
  onCreated?: (space: { id: string; name: string; slug: string }) => void;
  /** UI label — Groups are spaces under the hood. */
  entityLabel?: "Group" | "Space";
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setName("");
    setDescription("");
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
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || `Could not create ${entityLabel.toLowerCase()}`);
        return;
      }
      toast.success(`${entityLabel} created`);
      onCreated?.(data.space);
      reset();
      onOpenChange(false);
    } catch {
      toast.error(`Could not create ${entityLabel.toLowerCase()}`);
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
          <DialogTitle className="text-base font-bold">Create {entityLabel}</DialogTitle>
          <DialogDescription className="text-sm text-[var(--color-text-muted)]">
            {entityLabel === "Group"
              ? "Create a collaboration space. Add channels after the group exists."
              : "Organize collaboration in this community. Channels are added separately."}
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
              placeholder={entityLabel === "Group" ? "e.g. Beginners" : "e.g. Mentorship"}
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
              placeholder={
                entityLabel === "Group"
                  ? "Who is this group for?"
                  : "What is this space for?"
              }
              rows={2}
              className="resize-none rounded-sm border-[var(--color-border)]"
              maxLength={300}
            />
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
