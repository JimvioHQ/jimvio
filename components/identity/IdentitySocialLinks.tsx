import {
  BadgeCheck,
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  Music2,
  Twitter,
  Youtube,
  MessageCircle,
  Link as LinkIcon,
} from "lucide-react";
import type { IdentitySocialAccount, IdentitySocialPlatform } from "@/lib/identity/types";
import { IdentityCard, cn } from "@/components/identity/identity-ui";
import { formatNumber } from "@/lib/utils";

const PLATFORM_META: Record<
  IdentitySocialPlatform,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  tiktok: { label: "TikTok", icon: Music2, color: "#161512" },
  instagram: { label: "Instagram", icon: Instagram, color: "#E4405F" },
  youtube: { label: "YouTube", icon: Youtube, color: "#FF0000" },
  facebook: { label: "Facebook", icon: Facebook, color: "#1877F2" },
  x: { label: "X", icon: Twitter, color: "#111827" },
  threads: { label: "Threads", icon: MessageCircle, color: "#161512" },
  linkedin: { label: "LinkedIn", icon: Linkedin, color: "#0A66C2" },
  pinterest: { label: "Pinterest", icon: LinkIcon, color: "#C8232C" },
  snapchat: { label: "Snapchat", icon: LinkIcon, color: "#C7A200" },
  website: { label: "Website", icon: Globe, color: "#2563EB" },
};

export function IdentitySocialLinks({
  accounts,
  className,
  compact = false,
  branded = false,
}: {
  accounts: IdentitySocialAccount[];
  className?: string;
  compact?: boolean;
  /** Colorize icons with platform brand colors (stats row). */
  branded?: boolean;
}) {
  const visible = accounts.filter((account) => Boolean(account.url?.trim()));
  if (visible.length === 0) return null;

  if (compact) {
    return (
      <div className={cn("flex flex-wrap items-center gap-2.5", className)}>
        {visible.map((a) => {
          const meta = PLATFORM_META[a.platform];
          const Icon = meta.icon;
          const label = `${meta.label}${a.handle ? ` · @${a.handle}` : ""}`;
          return (
            <a
              key={a.id}
              href={a.url!}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              title={label}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full transition-opacity hover:opacity-80",
                branded
                  ? "bg-transparent"
                  : "border border-black/[0.06] bg-white text-[#59544B] hover:border-black/15 hover:text-[#1C1B19]",
              )}
              style={branded ? { color: meta.color } : undefined}
            >
              <Icon className="h-[18px] w-[18px]" />
            </a>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 gap-2.5 sm:grid-cols-2", className)}>
      {visible.map((a) => {
        const meta = PLATFORM_META[a.platform];
        const Icon = meta.icon;
        return (
          <a
            key={a.id}
            href={a.url!}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white px-3.5 py-3 transition-colors hover:border-black/15"
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${meta.color}14`, color: meta.color }}
            >
              <Icon className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <p className="truncate text-[13px] font-semibold text-[#1C1B19]">
                  {a.handle ? `@${a.handle}` : meta.label}
                </p>
                {a.isVerified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[#FF5A1F]" />}
              </div>
              <p className="text-[11.5px] text-[#9A9388]">
                {meta.label}
                {a.followers > 0 && ` · ${formatNumber(a.followers)} followers`}
              </p>
            </div>
          </a>
        );
      })}
    </div>
  );
}

export function IdentitySocialLinksCard({ accounts }: { accounts: IdentitySocialAccount[] }) {
  if (accounts.length === 0) return null;
  return (
    <IdentityCard className="p-5">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9388]">Channels</p>
      <IdentitySocialLinks accounts={accounts} />
    </IdentityCard>
  );
}
