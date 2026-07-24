"use client";

import Link from "next/link";
import { Bookmark, Layers, MessageCircle, GraduationCap, FileText, Calendar } from "lucide-react";
import { useClientReady } from "@/lib/community/use-client-ready";
import {
  usePersonalizationStore,
  type PersonalItemKind,
} from "@/lib/community/personalization";

const KIND_ICON: Partial<Record<PersonalItemKind, typeof Bookmark>> = {
  group: Layers,
  channel: MessageCircle,
  course: GraduationCap,
  resource: FileText,
  knowledge: FileText,
  event: Calendar,
  message: MessageCircle,
};

/**
 * Local workspace bookmarks — additive to saved posts on /communities/bookmarks.
 */
export function PersonalBookmarksPanel() {
  const ready = useClientReady();
  const bookmarks = usePersonalizationStore((s) => s.bookmarks);
  const toggleBookmark = usePersonalizationStore((s) => s.toggleBookmark);

  if (!ready || bookmarks.length === 0) return null;

  return (
    <section
      aria-label="Saved workspace items"
      className="mb-10 space-y-4"
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
          Workspace
        </p>
        <h2 className="mt-1 text-[18px] font-semibold text-[var(--color-text-primary)]">
          Saved items
        </h2>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
          Groups, channels, courses, resources, and more you bookmarked.
        </p>
      </div>
      <ul className="space-y-2">
        {bookmarks.slice(0, 40).map((b) => {
          const Icon = KIND_ICON[b.kind] ?? Bookmark;
          return (
            <li
              key={`${b.kind}:${b.id}`}
              className="flex items-center gap-3 rounded-xl bg-[var(--color-surface)] px-3 py-2.5 ring-1 ring-[var(--color-border)]/70"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <Link href={b.href} className="min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] rounded-md">
                <span className="block truncate text-[14px] font-semibold text-[var(--color-text-primary)]">
                  {b.title}
                </span>
                <span className="block truncate text-[12px] text-[var(--color-text-muted)]">
                  {b.subtitle ?? b.kind}
                </span>
              </Link>
              <button
                type="button"
                aria-label="Remove bookmark"
                onClick={() =>
                  toggleBookmark({
                    id: b.id,
                    kind: b.kind,
                    communityId: b.communityId,
                    title: b.title,
                    href: b.href,
                    subtitle: b.subtitle,
                  })
                }
                className="inline-flex min-h-9 items-center rounded-lg px-2.5 text-[12px] font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              >
                Remove
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
