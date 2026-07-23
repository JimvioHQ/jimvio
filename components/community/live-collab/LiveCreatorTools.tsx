"use client";

import { useEffect, useState } from "react";
import { Copy, Link2, Shield, UserPlus, Users } from "lucide-react";
import { useLiveCollabStore } from "@/lib/community/live-collab";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function LiveCreatorTools({
  sessionId,
  canManage,
}: {
  sessionId: string;
  canManage?: boolean;
}) {
  const ensureTools = useLiveCollabStore((s) => s.ensureTools);
  const setWaitingRoom = useLiveCollabStore((s) => s.setWaitingRoom);
  const addCohost = useLiveCollabStore((s) => s.addCohost);
  const tools = useLiveCollabStore((s) => s.toolsBySession[sessionId]);
  const [guestId, setGuestId] = useState("");

  useEffect(() => {
    ensureTools(sessionId);
  }, [sessionId, ensureTools]);

  if (!tools) return null;

  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-neutral-400">
        <Shield className="h-3.5 w-3.5 text-[var(--color-accent)]" />
        Creator tools
      </p>
      <p className="text-[12px] text-neutral-500">
        Co-hosts, moderators, guest speakers, waiting room, and invite links —
        roles reuse Live Studio stage permissions.
      </p>
      <div className="rounded-xl bg-neutral-50 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-semibold text-neutral-800">
            Waiting room
          </span>
          <button
            type="button"
            disabled={!canManage}
            onClick={() => setWaitingRoom(sessionId, !tools.waitingRoomEnabled)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase",
              tools.waitingRoomEnabled
                ? "bg-emerald-100 text-emerald-800"
                : "bg-neutral-200 text-neutral-600"
            )}
          >
            {tools.waitingRoomEnabled ? "On" : "Off"}
          </button>
        </div>
        <p className="mt-1 text-[11px] text-neutral-500">
          {tools.waitingUserIds.length} waiting
        </p>
      </div>
      <div className="space-y-1.5">
        <p className="flex items-center gap-1 text-[11px] font-bold uppercase text-neutral-400">
          <Users className="h-3 w-3" /> Co-hosts ({tools.cohostIds.length})
        </p>
        {canManage && (
          <div className="flex gap-1.5">
            <input
              value={guestId}
              onChange={(e) => setGuestId(e.target.value)}
              placeholder="User id"
              className="flex-1 rounded-lg border border-neutral-200 px-2 py-1.5 text-[12px] outline-none focus:ring-2 focus:ring-neutral-900/15"
            />
            <button
              type="button"
              onClick={() => {
                if (!guestId.trim()) return;
                addCohost(sessionId, guestId.trim());
                setGuestId("");
                toast.success("Co-host added");
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-neutral-900 px-2.5 py-1.5 text-[11px] font-semibold text-white"
            >
              <UserPlus className="h-3 w-3" />
              Add
            </button>
          </div>
        )}
      </div>
      <div className="rounded-xl border border-neutral-200 px-3 py-2.5">
        <p className="flex items-center gap-1 text-[11px] font-bold uppercase text-neutral-400">
          <Link2 className="h-3 w-3" /> Invite link
        </p>
        <p className="mt-1 truncate font-mono text-[11px] text-neutral-600">
          {tools.inviteLink}
        </p>
        <button
          type="button"
          onClick={() => {
            if (!tools.inviteLink) return;
            void navigator.clipboard.writeText(tools.inviteLink).then(
              () => toast.success("Invite link copied"),
              () => toast.error("Copy failed")
            );
          }}
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-700"
        >
          <Copy className="h-3 w-3" />
          Copy
        </button>
      </div>
    </div>
  );
}
