"use client";

import { ShoppingBag } from "lucide-react";
import {
  AttachCommerceDialog,
  MessageCommerceEmbed,
} from "@/components/community/commerce";
import { useCreatorCommerceStore } from "@/lib/community/commerce";
import { useState } from "react";
import { useShallow } from "zustand/react/shallow";

/** Live shopping rail — reuses Creator Commerce Engine. */
export function LiveCommerceRail({
  communityId,
  canManage,
  onShareOffer,
}: {
  communityId?: string | null;
  canManage?: boolean;
  onShareOffer?: (title: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const items = useCreatorCommerceStore(
    useShallow((s) =>
      communityId ? s.featuredForCommunity(communityId).slice(0, 6) : []
    )
  );

  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-neutral-400">
          <ShoppingBag className="h-3.5 w-3.5 text-[var(--color-accent)]" />
          Live commerce
        </p>
        {canManage && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full bg-neutral-900 px-3 py-1.5 text-[11px] font-semibold text-white"
          >
            Sell / share
          </button>
        )}
      </div>
      <p className="text-[12px] text-neutral-500">
        Products, courses, tickets, tips, and affiliates — same commerce engine as
        chat.
      </p>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-200 px-3 py-4 text-center text-[12px] text-neutral-400">
          Feature offers from the community store or attach commerce during live.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <MessageCommerceEmbed key={`${item.id}-${item.createdAt}`} embed={item} compact />
          ))}
        </div>
      )}
      <AttachCommerceDialog
        open={open}
        onClose={() => setOpen(false)}
        onAttach={(embed) => {
          if (communityId) {
            useCreatorCommerceStore.getState().featureInCommunity({
              communityId,
              embed,
              createdBy: null,
              featured: true,
            });
          }
          onShareOffer?.(embed.title);
        }}
      />
    </div>
  );
}
