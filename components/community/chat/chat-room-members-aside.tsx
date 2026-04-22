"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { MessageCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CommunityInboxDialog } from "@/components/community/chat/community-inbox-dialog";
import { cn } from "@/lib/utils";

type MemberRow = {
  user_id: string;
  role: string;
  profile: { full_name: string | null; avatar_url: string | null; username: string | null } | null;
};

export function ChatRoomMembersAside({
  communityId,
  userId,
  threadOpen,
  mobilePeopleOpen,
  onMobilePeopleOpenChange,
  /** When `xl`, desktop aside shows from `xl` up (use beside wide layouts e.g. course). Default `lg` for chat. */
  desktopBreakpoint = "lg",
}: {
  communityId: string;
  userId: string | null;
  threadOpen?: boolean;
  /** Optional: parent controls the mobile "People" sheet (e.g. chip-row button). */
  mobilePeopleOpen?: boolean;
  onMobilePeopleOpenChange?: (open: boolean) => void;
  desktopBreakpoint?: "lg" | "xl";
}) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inboxPeer, setInboxPeer] = useState<MemberRow | null>(null);
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);

  const controlled = mobilePeopleOpen !== undefined && onMobilePeopleOpenChange !== undefined;
  const mobileOpen = controlled ? mobilePeopleOpen : internalMobileOpen;
  const setMobileOpen = controlled ? onMobilePeopleOpenChange : setInternalMobileOpen;

  const bp = desktopBreakpoint === "xl" ? "xl" : "lg";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/communities/${communityId}/members`);
        const data = await res.json();
        if (!res.ok || cancelled) return;
        setMembers(data.members ?? []);
      } catch {
        if (!cancelled) setMembers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [communityId]);

  const others = members.filter((m) => m.user_id !== userId);

  function displayName(m: MemberRow) {
    return m.profile?.full_name || m.profile?.username || "Member";
  }

  function MemberList({ className }: { className?: string }) {
    return (
      <div className={cn("flex flex-col gap-0.5 overflow-y-auto", className)}>
        {loading ? (
          <p className="px-2 py-4 text-center text-xs text-[var(--color-text-muted)]">Loading…</p>
        ) : others.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-[var(--color-text-muted)]">No other members yet.</p>
        ) : (
          others.map((m) => (
            <button
              key={m.user_id}
              type="button"
              className="flex w-full items-center gap-2 rounded-none px-2 py-2 text-left transition-colors hover:bg-[var(--color-surface-secondary)]"
              onClick={() => {
                setInboxPeer(m);
                setMobileOpen(false);
              }}
            >
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-none border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                {m.profile?.avatar_url ? (
                  <Image src={m.profile.avatar_url} alt="" width={36} height={36} className="h-full w-full object-cover" unoptimized />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-black text-[var(--color-accent)]">
                    {displayName(m)[0]}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[var(--color-text-primary)]">{displayName(m)}</p>
                {m.role && m.role !== "member" ? (
                  <p className="truncate text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">{m.role}</p>
                ) : null}
              </div>
              <MessageCircle className="h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden />
            </button>
          ))
        )}
      </div>
    );
  }

  return (
    <>
      <CommunityInboxDialog
        open={!!inboxPeer}
        onOpenChange={(o) => !o && setInboxPeer(null)}
        communityId={communityId}
        peerUserId={inboxPeer?.user_id ?? null}
        peerName={inboxPeer ? displayName(inboxPeer) : ""}
        peerAvatarUrl={inboxPeer?.profile?.avatar_url ?? null}
        currentUserId={userId}
      />

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent
          overlayClassName="z-[10050]"
          className="z-[10051] max-h-[80vh] max-w-md border-[var(--color-border)] bg-[var(--color-surface)]"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--color-text-primary)]">
              <Users className="h-5 w-5 text-[var(--color-accent)]" />
              People in this community
            </DialogTitle>
            <p className="text-left text-xs text-[var(--color-text-muted)]">Tap someone to open a private inbox.</p>
          </DialogHeader>
          <MemberList className="max-h-[55vh]" />
        </DialogContent>
      </Dialog>

      <aside
        className={cn(
          "hidden w-[260px] shrink-0 flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)]",
          bp === "xl" ? "xl:flex" : "lg:flex",
          threadOpen && (bp === "xl" ? "xl:hidden" : "lg:hidden")
        )}
      >
        <div className="border-b border-[var(--color-border)] px-3 py-2">
          <div className="flex items-center gap-2 text-sm font-black text-[var(--color-text-primary)]">
            <Users className="h-4 w-4 text-[var(--color-accent)]" />
            People
          </div>
          <p className="text-[10px] text-[var(--color-text-muted)]">Message members privately</p>
        </div>
        <MemberList className="flex-1 min-h-0 p-2" />
      </aside>
    </>
  );
}

