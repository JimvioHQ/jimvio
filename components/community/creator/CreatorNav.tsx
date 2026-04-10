"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  LayoutGrid,
  Users,
  Wallet,
  Shield,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = (communityId: string, slug: string) => [
  { href: `/creator/${communityId}/dashboard`, label: "Overview", icon: BarChart3 },
  { href: `/creator/${communityId}/spaces`, label: "Spaces", icon: LayoutGrid },
  { href: `/creator/${communityId}/members`, label: "Members", icon: Users },
  { href: `/creator/${communityId}/content`, label: "Content", icon: BookOpen },
  { href: `/creator/${communityId}/earnings`, label: "Earnings", icon: Wallet },
  { href: `/creator/${communityId}/moderation`, label: "Moderation", icon: Shield },
  { href: `/creator/${communityId}/settings`, label: "Settings", icon: Settings },
];

export function CreatorNav({
  communityId,
  slug,
  name,
  avatarUrl,
}: {
  communityId: string;
  slug: string;
  name: string;
  avatarUrl: string | null;
}) {
  const pathname = usePathname();
  const links = LINKS(communityId, slug);

  return (
    <nav className="w-full lg:w-56 shrink-0 space-y-4">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" width={44} height={44} className="object-cover h-full w-full" unoptimized />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-sm font-black text-[var(--color-accent)]">{name[0] ?? "?"}</div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-[var(--color-text-primary)] truncate">{name}</p>
          <p className="text-[10px] text-[var(--color-text-muted)] font-semibold">Creator</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-colors",
                active
                  ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 px-1">
        <Link
          href={`/communities/${slug}/workspace`}
          className="text-xs font-bold text-[var(--color-accent)] hover:underline"
        >
          View Community (workspace)
        </Link>
        <Link href={`/communities/${slug}`} className="text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          Public page
        </Link>
      </div>
    </nav>
  );
}
