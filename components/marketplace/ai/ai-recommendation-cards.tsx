"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {  Package, Megaphone, Users, ShieldCheck  } from "lucide-react"
import { VscPackage } from "react-icons/vsc";
import type { ParsedCampaign, ParsedCommunity, ParsedProduct } from "@/lib/ai/chat-shared";
import { JIMVIO_ORANGE } from "@/lib/ai/chat-shared";

interface Props {
  products?: ParsedProduct[];
  campaigns?: ParsedCampaign[];
  communities?: ParsedCommunity[];
  onClose?: () => void;
}

export function AiRecommendationCards({ products, campaigns, communities, onClose }: Props) {
  const hasProducts = products && products.length > 0;
  const hasCampaigns = campaigns && campaigns.length > 0;
  const hasCommunities = communities && communities.length > 0;

  if (!hasProducts && !hasCampaigns && !hasCommunities) return null;

  return (
    <div className="space-y-3 pt-1">
      {hasProducts && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {products!.map((p) => (
            <Link
              key={p.id}
              href={p.slug ? `/marketplace/${p.slug}` : "/marketplace"}
              onClick={onClose}
              className="group rounded-xl border border-[#FFE0D1] bg-[#FFFDFB] p-3 transition-colors hover:border-[var(--color-accent)]/40"
            >
              <div className="mb-2.5 flex h-20 items-center justify-center overflow-hidden rounded-lg bg-[var(--color-accent)]/5">
                {p.image ? (
                  <Image
                    src={p.image}
                    alt={p.name}
                    width={160}
                    height={80}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    unoptimized
                  />
                ) : (
                  <VscPackage className="size-7 text-[var(--color-text-muted)]" />
                )}
              </div>
              <div className="mb-1 flex items-center gap-1">
                <ShieldCheck className="size-3" style={{ color: JIMVIO_ORANGE }} />
                <span className="text-[10px] font-medium text-[var(--color-text-muted)]">Suggested product</span>
              </div>
              <h4 className="line-clamp-2 text-[13px] font-bold text-[var(--color-text-primary)]">{p.name}</h4>
              <div className="mt-2 flex items-center justify-between text-[12px]">
                <span className="font-bold" style={{ color: JIMVIO_ORANGE }}>{p.price}</span>
                {p.commission ? (
                  <span className="rounded-full bg-[var(--color-accent)]/10 px-2 py-0.5 text-[10px] font-bold" style={{ color: JIMVIO_ORANGE }}>
                    {p.commission} comm.
                  </span>
                ) : (
                  <span className="text-[var(--color-text-muted)]">MOQ {p.mqo}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {hasCampaigns && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {campaigns!.map((c) => (
            <Link
              key={c.id}
              href={`/ugc/${c.slug ?? c.id}`}
              onClick={onClose}
              className="rounded-xl border border-[#FFE0D1] bg-[#FFFDFB] p-3 transition-colors hover:border-[var(--color-accent)]/40"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-lg bg-violet-500/10 text-violet-600">
                  <Megaphone className="size-4" />
                </span>
                <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-600">
                  {c.type}
                </span>
              </div>
              <h4 className="line-clamp-2 text-[13px] font-bold text-[var(--color-text-primary)]">{c.title}</h4>
              <p className="mt-1.5 text-[12px] font-semibold" style={{ color: JIMVIO_ORANGE }}>{c.rate}</p>
            </Link>
          ))}
        </div>
      )}

      {hasCommunities && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {communities!.map((c) => (
            <Link
              key={c.id}
              href={c.slug ? `/communities/${c.slug}` : "/communities"}
              onClick={onClose}
              className="flex gap-3 rounded-xl border border-[#FFE0D1] bg-[#FFFDFB] p-3 transition-colors hover:border-[var(--color-accent)]/40"
            >
              <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--color-accent)]/10">
                {c.avatar ? (
                  <Image src={c.avatar} alt={c.name} width={40} height={40} className="size-10 object-cover" unoptimized />
                ) : (
                  <Users className="size-4" style={{ color: JIMVIO_ORANGE }} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-[13px] font-bold text-[var(--color-text-primary)]">{c.name}</h4>
                {c.tagline && (
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-[var(--color-text-muted)]">{c.tagline}</p>
                )}
                <p className="mt-1 text-[11px] font-medium text-[var(--color-text-muted)]">{c.members} members</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
