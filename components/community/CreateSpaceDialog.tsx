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
import {
  SPACE_TYPES,
  SPACE_TYPE_LABELS,
  type SpaceType,
} from "@/lib/community/workspace/space-types";

export function CreateSpaceDialog({
  open,
  onOpenChange,
  communityId,
  onCreated,
  entityLabel = "Space",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string;
  onCreated?: (space: { id: string; name: string; slug: string }) => void;
  /** UI label — always Space in product UI. */
  entityLabel?: "Space";
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [spaceType, setSpaceType] = useState<SpaceType>("discussion");
  const [saving, setSaving] = useState(false);

  function reset() {
    setName("");
    setDescription("");
    setSpaceType("discussion");
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
          spaceType,
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
            Spaces organize collaboration inside a community. Pick a type that
            matches how members will use it.
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
              placeholder="e.g. Mentorship"
              className="rounded-sm border-[var(--color-border)]"
              maxLength={80}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--color-text-secondary)]">
              Space type
            </label>
            <select
              value={spaceType}
              onChange={(e) => setSpaceType(e.target.value as SpaceType)}
              className="flex h-10 w-full rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              {SPACE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {SPACE_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
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
