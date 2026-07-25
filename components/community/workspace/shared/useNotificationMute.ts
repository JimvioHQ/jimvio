"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { MuteTargetKind } from "@/lib/community/notification-mutes";

/**
 * Load + persist channel/group notification mute prefs on community_memberships.
 */
export function useNotificationMute(args: {
  communityId?: string | null;
  kind: MuteTargetKind;
  targetId?: string | null;
}) {
  const { communityId, kind, targetId } = args;
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!communityId || !targetId) {
      setReady(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({
          communityId,
          ...(kind === "space" ? { spaceId: targetId } : { roomId: targetId }),
        });
        const res = await fetch(`/api/c/notification-mutes?${params}`);
        if (!res.ok) return;
        const data = (await res.json()) as { muted?: boolean };
        if (!cancelled) setNotificationsOn(!data.muted);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [communityId, kind, targetId]);

  const toggle = useCallback(async () => {
    if (!communityId || !targetId || saving) return;
    const nextOn = !notificationsOn;
    setNotificationsOn(nextOn);
    setSaving(true);
    try {
      const res = await fetch("/api/c/notification-mutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communityId,
          kind,
          targetId,
          muted: !nextOn,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Couldn't update mute preference");
      toast.success(nextOn ? "Notifications on" : "Notifications muted");
    } catch (e: unknown) {
      setNotificationsOn(!nextOn);
      toast.error(e instanceof Error ? e.message : "Couldn't update mute preference");
    } finally {
      setSaving(false);
    }
  }, [communityId, kind, targetId, notificationsOn, saving]);

  return { notificationsOn, toggle, ready, saving };
}
