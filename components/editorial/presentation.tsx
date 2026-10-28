import Image from "next/image";
import Link from "next/link";
import { editorialPhotoSrc } from "@/lib/editorial/image-display";
import type { StoryCardModel } from "@/lib/editorial/types";
import { displayKicker, kickerColor } from "@/lib/editorial/validate";
import { cn } from "@/lib/utils";

export function SampleBanner() {
  return (
    <p
      role="note"
      className="border-b border-[#f3d7a1] bg-[#fff8eb] px-4 py-2 text-center text-[13px] font-medium text-[#8a5a12]"
    >
      Sample layout. These stories are design fixtures for development, not published news.
    </p>
  );
}

export function Kicker({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit max-w-full items-center self-start rounded-[3px] px-1.5 py-[3px] text-[10px] font-bold uppercase tracking-[0.08em] text-white",
        className,
      )}
      style={{ backgroundColor: kickerColor(label) }}
    >
      {label}
    </span>
  );
}

export function StoryImage({
  src,
  alt,
  priority = false,
  sizes,
}: {
  src: string | null;
  alt: string;
  priority?: boolean;
  sizes: string;
}) {
  const photo = editorialPhotoSrc(src);
  if (!photo) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#f4f5f7] text-[#98a2b3]" aria-hidden="true">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">Jimvio Media</span>
      </div>
    );
  }
  return (
    <Image
      src={photo}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      className="object-cover"
    />
  );
}

export function SectionHeading({
  title,
  href,
}: {
  title: string;
  href?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 className="flex items-center gap-2.5 text-[18px] font-bold tracking-[-0.02em] text-[#172033]">
        <span className="h-[18px] w-[3px] rounded-full bg-[#fd5000]" aria-hidden="true" />
        {title}
      </h2>
      {href ? (
        <Link href={href} className="text-[13px] font-semibold text-[#3b5ccc] hover:underline">
          View all →
        </Link>
      ) : null}
    </div>
  );
}

export function OverlayCard({
  card,
  className,
  titleClassName,
  contentClassName,
  priority = false,
  sizes,
  scrim = "rail",
}: {
  card: StoryCardModel;
  className?: string;
  titleClassName?: string;
  contentClassName?: string;
  priority?: boolean;
  sizes: string;
  scrim?: "hero" | "rail";
}) {
  const photo = editorialPhotoSrc(card.imageUrl);
  if (!photo) {
    return (
      <Link
        href={card.href}
        className="block rounded-2xl border border-[#eceff3] bg-[#fafbfc] p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fd5000] sm:p-5"
      >
        <Kicker label={card.kicker} />
        <h3 className={cn("mt-2 font-bold leading-snug tracking-[-0.02em] text-[#172033]", titleClassName ?? "text-[18px]")}>
          {card.title}
        </h3>
        {card.excerpt ? <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#4b5568]">{card.excerpt}</p> : null}
      </Link>
    );
  }
  return (
    <Link
      href={card.href}
      className={cn(
        "group relative block overflow-hidden rounded-2xl bg-[#121826] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fd5000]",
        className,
      )}
    >
      <StoryImage src={photo} alt="" priority={priority} sizes={sizes} />
      <span className="sr-only">{card.imageAlt}</span>
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-t",
          scrim === "hero" ? "from-black/88 via-black/45 to-black/10" : "from-black/80 via-black/25 to-transparent",
        )}
      />
      <div className={cn("relative flex h-full flex-col justify-end", contentClassName ?? "p-4 sm:p-5")}>
        <Kicker label={card.kicker} />
        <h3 className={cn("mt-2 font-bold leading-[1.2] tracking-[-0.02em] text-white", titleClassName)}>
          {card.title}
        </h3>
        {card.excerpt ? (
          <p
            className={cn(
              "mt-2 max-w-2xl text-[13.5px] leading-relaxed text-white/85",
              scrim === "hero" ? "line-clamp-2 pr-24" : "line-clamp-2 sm:line-clamp-3",
            )}
          >
            {card.excerpt}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

export function StoryCard({ card, stacked = false }: { card: StoryCardModel; stacked?: boolean }) {
  return (
    <Link
      href={card.href}
      className={cn(
        "flex overflow-hidden rounded-2xl border border-[#eceff3] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fd5000]",
        stacked ? "flex-col" : "gap-3 md:flex-col md:gap-0",
      )}
    >
      {editorialPhotoSrc(card.imageUrl) ? (
        <div
          className={cn(
            "relative shrink-0",
            stacked ? "aspect-[16/10] w-full" : "h-[76px] w-[112px] md:aspect-[16/10] md:h-auto md:w-full",
          )}
        >
          <StoryImage src={card.imageUrl} alt={card.imageAlt} sizes="(min-width: 768px) 25vw, 112px" />
          <Kicker label={card.kicker} className={cn("absolute left-2.5 top-2.5", stacked ? "inline-flex" : "hidden md:inline-flex")} />
        </div>
      ) : null}
      <div className={cn("min-w-0 flex-1", stacked ? "px-3 py-3" : "py-1 pr-2 md:px-3 md:py-3")}>
        {!editorialPhotoSrc(card.imageUrl) || !stacked ? (
          <Kicker label={card.kicker} className={editorialPhotoSrc(card.imageUrl) ? "md:hidden" : undefined} />
        ) : null}
        <h3 className="mt-1 line-clamp-3 text-[15px] font-semibold leading-[1.35] text-[#172033] md:mt-0 md:line-clamp-2">
          {card.title}
        </h3>
      </div>
    </Link>
  );
}

export function PageLinks({
  page,
  pages,
  hrefFor,
  label,
}: {
  page: number;
  pages: number;
  hrefFor: (page: number) => string;
  label: string;
}) {
  if (pages <= 1) return null;
  const linkClass =
    "inline-flex h-10 items-center rounded-lg border border-[#e6e8ee] bg-white px-3 text-sm font-semibold text-[#172033] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fd5000]";
  return (
    <nav aria-label={label} className="mt-8 flex items-center justify-center gap-3">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={linkClass}>
          Previous
        </Link>
      ) : (
        <span className="inline-flex h-10 items-center px-3 text-sm font-semibold text-[#98a2b3]">Previous</span>
      )}
      <p className="text-sm text-[#667085]">
        Page {page} of {pages}
      </p>
      {page < pages ? (
        <Link href={hrefFor(page + 1)} className={linkClass}>
          Next
        </Link>
      ) : (
        <span className="inline-flex h-10 items-center px-3 text-sm font-semibold text-[#98a2b3]">Next</span>
      )}
    </nav>
  );
}

export function MediaEmptyState() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-6 py-24 text-center">
      <span className="h-1 w-10 rounded-full bg-[#fd5000]" aria-hidden="true" />
      <h1 className="mt-5 text-3xl font-bold tracking-[-0.03em] text-[#172033]">No stories published yet</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-[#667085]">
        Jimvio Media will show articles here after an administrator publishes them.
      </p>
    </div>
  );
}

export function MediaErrorState() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="text-3xl font-bold tracking-[-0.03em] text-[#172033]">Media is temporarily unavailable</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-[#667085]">
        Published stories could not be loaded. Nothing on this page is sample news.
      </p>
      <Link
        href="/media"
        className="mt-6 inline-flex h-10 items-center rounded-lg bg-[#fd5000] px-4 text-sm font-semibold text-white"
      >
        Try again
      </Link>
    </div>
  );
}

export function toCard(article: {
  slug: string;
  title: string;
  excerpt: string;
  kicker: string;
  category: string;
  imageUrl: string | null;
  imageAlt: string;
}, withExcerpt = false): StoryCardModel {
  const kicker = displayKicker(article);
  return {
    href: `/media/article/${article.slug}`,
    title: article.title,
    excerpt: withExcerpt ? article.excerpt : undefined,
    kicker,
    imageUrl: editorialPhotoSrc(article.imageUrl),
    imageAlt: article.imageAlt || article.title,
  };
}
