import { Briefcase, ExternalLink, Play, Star } from "lucide-react";
import type { IdentityPortfolioItem } from "@/lib/identity/types";
import { IdentityEmptyState, IdentitySectionHeading, cn } from "@/components/identity/identity-ui";

export function IdentityPortfolio({
  items,
  className,
  emptyAction,
}: {
  items: IdentityPortfolioItem[];
  className?: string;
  emptyAction?: React.ReactNode;
}) {
  return (
    <div className={cn(className)}>
      <IdentitySectionHeading eyebrow="Work" title="Portfolio" className="mb-4" />

      {items.length === 0 ? (
        <IdentityEmptyState
          icon={<Briefcase className="h-6 w-6" />}
          title="No portfolio items yet"
          description="Showcase your best campaigns, videos and brand collaborations here."
          action={emptyAction}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <PortfolioTile key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function PortfolioTile({ item }: { item: IdentityPortfolioItem }) {
  const isVideo = item.kind === "video" || Boolean(item.mediaUrl && (/\/video\/upload\//i.test(item.mediaUrl) || /\.(mp4|m4v|mov|webm)(?:[?#]|$)/i.test(item.mediaUrl)));
  const image = item.thumbnailUrl?.trim() || (!isVideo && item.kind === "image" ? item.mediaUrl?.trim() : null) || null;
  const content = (
    <div className="group relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-black/[0.06] bg-[#F1EFEA]">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={item.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      ) : isVideo && item.mediaUrl ? (
        <video
          src={item.mediaUrl}
          poster={item.thumbnailUrl ?? undefined}
          controls
          playsInline
          preload="metadata"
          aria-label={"Play " + item.title}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[#C7C1B4]">
          <Briefcase className="h-6 w-6" />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-0 transition-opacity group-hover:opacity-100" />
      {isVideo && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90">
            <Play className="h-4 w-4 fill-current text-[#161512]" />
          </div>
        </div>
      )}
      {item.isFeatured && (
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-[#D6480F]">
          <Star className="h-2.5 w-2.5 fill-current" /> Featured
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 translate-y-1 p-2.5 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
        <p className="truncate text-[12px] font-semibold text-white">{item.title}</p>
        {item.brandName && <p className="truncate text-[10.5px] text-white/75">{item.brandName}</p>}
      </div>
    </div>
  );

  if (item.externalUrl) {
    return (
      <a href={item.externalUrl} target="_blank" rel="noreferrer" className="relative block">
        {content}
        <ExternalLink className="absolute right-2 top-2 h-3.5 w-3.5 text-white/0 group-hover:text-white/80" />
      </a>
    );
  }
  return content;
}
