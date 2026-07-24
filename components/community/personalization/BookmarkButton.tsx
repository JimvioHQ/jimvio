"use client";

import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  usePersonalizationStore,
  type PersonalItemKind,
} from "@/lib/community/personalization";

/**
 * Bookmark any collaboration object — local until server bookmarks expand.
 */
export function BookmarkButton({
  id,
  kind,
  communityId,
  title,
  href,
  subtitle,
  className,
  size = "md",
}: {
  id: string;
  kind: PersonalItemKind;
  communityId: string;
  title: string;
  href: string;
  subtitle?: string | null;
  className?: string;
  size?: "sm" | "md";
}) {
  const isBookmarked = usePersonalizationStore((s) => s.isBookmarked(kind, id));
  const toggleBookmark = usePersonalizationStore((s) => s.toggleBookmark);
  const pushActivity = usePersonalizationStore((s) => s.pushActivity);

  return (
    <button
      type="button"
      aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
      aria-pressed={isBookmarked}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const saved = toggleBookmark({
          id,
          kind,
          communityId,
          title,
          href,
          subtitle: subtitle ?? null,
        });
        if (saved) {
          pushActivity({
            communityId,
            verb: "saved",
            title,
            href,
          });
          toast.success("Saved to bookmarks");
        } else {
          toast.success("Removed from bookmarks");
        }
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-full transition",
        "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
        size === "sm" ? "h-9 w-9" : "h-10 w-10",
        isBookmarked && "text-[var(--color-accent)]",
        className
      )}
    >
      <Bookmark
        className={cn(
          size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4",
          isBookmarked && "fill-current"
        )}
      />
    </button>
  );
}
