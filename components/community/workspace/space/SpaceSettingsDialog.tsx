"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CloudinaryUploadButton } from "@/components/ui/cloudinary-upload";
import { cn } from "@/lib/utils";
import {
  GROUP_PRIVACY_LABELS,
  GROUP_PRIVACY_VALUES,
  type GroupPrivacyMode,
} from "@/lib/community/owner-console/groups";
import type { ChannelPostingMode } from "@/lib/community/owner-console/channels/types";

type SpaceSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string;
  discussionRoomId?: string | null;
  onSaved?: () => void;
};

export function SpaceSettingsDialog({
  open,
  onOpenChange,
  spaceId,
  discussionRoomId,
  onSaved,
}: SpaceSettingsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [privacy, setPrivacy] = useState<GroupPrivacyMode>("public");
  const [postingMode, setPostingMode] = useState<ChannelPostingMode>("everyone");

  const load = useCallback(async () => {
    if (!spaceId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/c/spaces/${spaceId}`);
      const data = (await res.json()) as {
        space?: {
          name: string;
          coverUrl?: string | null;
          privacy?: GroupPrivacyMode;
          permissionConfig?: { postingMode?: ChannelPostingMode };
        };
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error ?? "Could not load Space settings");
        return;
      }
      const space = data.space;
      if (!space) return;
      setName(space.name ?? "");
      setCoverUrl(space.coverUrl ?? "");
      setPrivacy(
        space.privacy && (GROUP_PRIVACY_VALUES as readonly string[]).includes(space.privacy)
          ? space.privacy
          : "public"
      );
      const mode = space.permissionConfig?.postingMode;
      setPostingMode(
        mode === "admins_only" || mode === "admins_moderators" ? mode : "everyone"
      );
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function save() {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/c/spaces/${spaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          coverUrl: coverUrl.trim() || null,
          privacy,
          messagingMode: postingMode,
          discussionRoomId: discussionRoomId ?? undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Could not save Space settings");
        return;
      }
      toast.success("Space settings saved");
      onOpenChange(false);
      onSaved?.();
    } catch {
      toast.error("Could not save Space settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-[var(--color-border)] px-5 py-4">
          <DialogTitle className="text-[16px] font-bold">Space settings</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-14">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : (
          <div className="max-h-[70vh] space-y-6 overflow-y-auto px-5 py-5">
            <section className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Identity
              </p>
              <div className="space-y-2">
                <label className="text-[12px] font-medium text-[var(--color-text-secondary)]">
                  Space name
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={120}
                  placeholder="QuantForg Signals"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[12px] font-medium text-[var(--color-text-secondary)]">
                  Profile picture
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#FF5A1F]/10 ring-1 ring-[var(--color-border)]">
                    {coverUrl ? (
                      <Image
                        src={coverUrl}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-lg font-bold text-[#FF5A1F]">
                        {(name.trim()[0] || "S").toUpperCase()}
                      </span>
                    )}
                  </div>
                  <CloudinaryUploadButton
                    folder="jimvio/community-avatars"
                    onUploadSuccess={(url) => setCoverUrl(url)}
                    buttonText="Change image"
                    className="text-[12px]"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Privacy
              </p>
              <div className="space-y-1.5">
                {GROUP_PRIVACY_VALUES.filter((p) => p !== "hidden").map((mode) => (
                  <label
                    key={mode}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-[13px] transition",
                      privacy === mode
                        ? "border-[#FF5A1F]/40 bg-[#FF5A1F]/5 font-semibold text-[#111827]"
                        : "border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]"
                    )}
                  >
                    <input
                      type="radio"
                      name="space-privacy"
                      checked={privacy === mode}
                      onChange={() => setPrivacy(mode)}
                      className="accent-[#FF5A1F]"
                    />
                    {GROUP_PRIVACY_LABELS[mode]}
                  </label>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Messaging
              </p>
              <p className="text-[12px] text-[var(--color-text-muted)]">
                Who can send messages?
              </p>
              <div className="space-y-1.5">
                {(
                  [
                    ["everyone", "All members"],
                    ["admins_moderators", "Admins & moderators"],
                    ["admins_only", "Admins only"],
                  ] as const
                ).map(([mode, label]) => (
                  <label
                    key={mode}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-[13px] transition",
                      postingMode === mode
                        ? "border-[#FF5A1F]/40 bg-[#FF5A1F]/5 font-semibold text-[#111827]"
                        : "border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]"
                    )}
                  >
                    <input
                      type="radio"
                      name="space-posting"
                      checked={postingMode === mode}
                      onChange={() => setPostingMode(mode)}
                      className="accent-[#FF5A1F]"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </section>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-[var(--color-border)] px-5 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={() => void save()}
            disabled={saving || loading || !name.trim()}
            className="bg-[#FF5A1F] hover:bg-[#e54e1a]"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
