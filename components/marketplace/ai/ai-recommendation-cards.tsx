"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { FileText, Megaphone, Package, ShieldCheck, Users } from "lucide-react";
import type { ParsedCampaign, ParsedCommunity, ParsedPost, ParsedProduct } from "@/lib/ai/chat-shared";
import { JIMVIO_ORANGE } from "@/lib/ai/chat-shared";

interface Props {
  products?: ParsedProduct[];
  campaigns?: ParsedCampaign[];
  communities?: ParsedCommunity[];
  posts?: ParsedPost[];
  onClose?: () => void;
}

export function AiRecommendationCards({ products, campaigns, communities, posts, onClose }: Props) {
  const hasProducts = products && products.length > 0;
  const hasCampaigns = campaigns && campaigns.length > 0;
  const hasCommunities = communities && communities.length > 0;
  const hasPosts = posts && posts.length > 0;

  if (!hasProducts && !hasCampaigns && !hasCommunities && !hasPosts) return null;

  return (
    <div className="space-y-3 pt-1">
      {hasProducts && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {products!.map((p) => (
            <Link
              key={p.id}
              href={p.slug ? `/marketplace/${p.slug}` : "/marketplace"}
              onClick={onClose}
              className="group rounded-xl border border-[#FFE0D1] bg-[#FFFDFB] p-3 transition-colors hover:border-[#FF5A1F]/40"
            >
              <div className="mb-2.5 flex h-20 items-center justify-center overflow-hidden rounded-lg bg-[#FF5A1F]/5">
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
                  <Package className="size-7 text-[var(--color-text-muted)]" />
                )}
              </div>
              <div className="mb-1 flex items-center gap-1">
                <ShieldCheck className="size-3" style={{ color: JIMVIO_ORANGE }} />
                <span className="text-[10px] font-medium text-[var(--color-text-muted)]">{p.basis ? "Catalog result" : "Suggested product"}</span>
              </div>
              <h4 className="line-clamp-2 text-[13px] font-bold text-[var(--color-text-primary)]">{p.name}</h4>
              {p.basis ? <p className="mt-1 text-[11px] leading-snug text-[var(--color-text-muted)]">{p.basis}</p> : null}
              <div className="mt-2 flex items-center justify-between text-[12px]">
                <span className="font-bold" style={{ color: JIMVIO_ORANGE }}>{p.price}</span>
                {p.commission ? (
                  <span className="rounded-full bg-[#FF5A1F]/10 px-2 py-0.5 text-[10px] font-bold" style={{ color: JIMVIO_ORANGE }}>
                    {p.commission} comm.
                  </span>
                ) : p.mqo ? (
                  <span className="text-[var(--color-text-muted)]">MOQ {p.mqo}</span>
                ) : null}
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
              className="rounded-xl border border-[#FFE0D1] bg-[#FFFDFB] p-3 transition-colors hover:border-[#FF5A1F]/40"
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
              {c.basis ? <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">{c.basis}</p> : null}
            </Link>
          ))}
        </div>
      )}

      {hasPosts && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {posts!.map((post) => (
            <Link
              key={post.id}
              href={post.href}
              onClick={onClose}
              className="rounded-xl border border-[#FFE0D1] bg-[#FFFDFB] p-3 transition-colors hover:border-[#FF5A1F]/40"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-lg bg-[#FF5A1F]/10">
                  <FileText className="size-4" style={{ color: JIMVIO_ORANGE }} />
                </span>
                <span className="text-[10px] font-medium text-[var(--color-text-muted)]">Public post</span>
              </div>
              <h4 className="line-clamp-3 text-[13px] font-bold text-[var(--color-text-primary)]">{post.title}</h4>
              {post.basis ? <p className="mt-1 text-[11px] leading-snug text-[var(--color-text-muted)]">{post.basis}</p> : null}
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
              className="flex gap-3 rounded-xl border border-[#FFE0D1] bg-[#FFFDFB] p-3 transition-colors hover:border-[#FF5A1F]/40"
            >
              <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[#FF5A1F]/10">
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
                <p className="mt-1 text-[11px] font-medium text-[var(--color-text-muted)]">{c.members} {c.members === "1" ? "member" : "members"}</p>
                {c.basis ? <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">{c.basis}</p> : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
