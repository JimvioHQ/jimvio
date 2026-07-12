"use client";

import Link from "next/link";
import { DsBadge } from "./DsDisplay";
import { DsCard, DsCardContent, DsCardFooter, DsCardHeader, DsCardTitle } from "./DsCard";
import { cn } from "@/lib/utils";

export function DsProductCard({
  title,
  subtitle,
  price,
  imageUrl,
  href,
  badge,
  className,
}: {
  title: string;
  subtitle?: string;
  price: string;
  imageUrl?: string | null;
  href: string;
  badge?: string;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("block", className)}>
      <DsCard interactive padding="none" className="overflow-hidden">
        <div className="relative aspect-square bg-[var(--color-surface-secondary)]">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="size-full object-cover" loading="lazy" />
          ) : null}
          {badge && (
            <span className="absolute left-2 top-2">
              <DsBadge variant="accent">{badge}</DsBadge>
            </span>
          )}
        </div>
        <DsCardContent className="p-3">
          <p className="line-clamp-2 text-sm font-semibold text-[var(--color-text-primary)]">{title}</p>
          {subtitle && <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{subtitle}</p>}
          <p className="mt-2 text-base font-black text-[var(--color-accent)]">{price}</p>
        </DsCardContent>
      </DsCard>
    </Link>
  );
}

export function DsDashboardCard({
  label,
  value,
  delta,
  children,
}: {
  label: string;
  value: string;
  delta?: string;
  children?: React.ReactNode;
}) {
  return (
    <DsCard>
      <DsCardHeader>
        <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
        <DsCardTitle className="text-2xl">{value}</DsCardTitle>
        {delta && <p className="text-[11px] text-[var(--color-text-muted)]">{delta}</p>}
      </DsCardHeader>
      {children && <DsCardContent>{children}</DsCardContent>}
    </DsCard>
  );
}

export function DsAnalyticsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <DsCard padding="md" elevation="sm">
      <DsCardHeader>
        <DsCardTitle>{title}</DsCardTitle>
      </DsCardHeader>
      <DsCardContent>{children}</DsCardContent>
    </DsCard>
  );
}

export function DsCommunityCard({ name, members, href, imageUrl }: { name: string; members: string; href: string; imageUrl?: string | null }) {
  return (
    <Link href={href}>
      <DsCard interactive>
        <div className="flex items-center gap-3">
          <div className="size-12 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-surface-secondary)]">
            {imageUrl && <img src={imageUrl} alt="" className="size-full object-cover" />}
          </div>
          <div>
            <p className="font-bold text-[var(--color-text-primary)]">{name}</p>
            <p className="text-[11px] text-[var(--color-text-muted)]">{members}</p>
          </div>
        </div>
      </DsCard>
    </Link>
  );
}

export function DsCreatorCard({ name, stat, href, avatarUrl }: { name: string; stat: string; href: string; avatarUrl?: string | null }) {
  return (
    <Link href={href}>
      <DsCard interactive>
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-[var(--color-accent)]/10 ring-1 ring-[var(--color-border)] overflow-hidden">
            {avatarUrl ? <img src={avatarUrl} alt="" className="size-full object-cover" /> : <span className="grid size-full place-items-center text-xs font-bold text-[var(--color-accent)]">{name.slice(0, 2)}</span>}
          </div>
          <div>
            <p className="font-bold">{name}</p>
            <p className="text-[11px] text-[var(--color-text-muted)]">{stat}</p>
          </div>
        </div>
      </DsCard>
    </Link>
  );
}

export function DsCampaignCard({ title, earn, href, badge }: { title: string; earn: string; href: string; badge?: string }) {
  return (
    <Link href={href}>
      <DsCard interactive>
        <DsCardHeader>
          {badge && <DsBadge variant="accent">{badge}</DsBadge>}
          <DsCardTitle className="text-sm">{title}</DsCardTitle>
        </DsCardHeader>
        <DsCardFooter>
          <span className="text-sm font-bold text-emerald-600">{earn}</span>
        </DsCardFooter>
      </DsCard>
    </Link>
  );
}
