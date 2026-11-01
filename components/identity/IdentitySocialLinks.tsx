import { BadgeCheck } from "lucide-react";
import type { IdentitySocialAccount, IdentitySocialPlatform } from "@/lib/identity/types";
import { IdentityCard, cn } from "@/components/identity/identity-ui";
import { SocialPlatformIcon } from "@/components/identity/SocialPlatformIcon";
import { formatNumber } from "@/lib/utils";

const PLATFORM_META: Record<IdentitySocialPlatform, { label: string; color: string }> = {
  tiktok: { label: "TikTok", color: "#161512" },
  instagram: { label: "Instagram", color: "#D6295C" },
  youtube: { label: "YouTube", color: "#E1352B" },
  facebook: { label: "Facebook", color: "#1866D6" },
  x: { label: "X", color: "#161512" },
  threads: { label: "Threads", color: "#161512" },
  linkedin: { label: "LinkedIn", color: "#0A66C2" },
  pinterest: { label: "Pinterest", color: "#C8232C" },
  snapchat: { label: "Snapchat", color: "#C7A200" },
  website: { label: "Website", color: "#59544B" },
};

export function IdentitySocialLinks({
  accounts,
  className,
  compact = false,
}: {
  accounts: IdentitySocialAccount[];
  className?: string;
  compact?: boolean;
}) {
  if (accounts.length === 0) return null;

  if (compact) {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        {accounts.map((account) => {
          const meta = PLATFORM_META[account.platform];
          return (
            <a
              key={account.id}
              href={account.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.06] bg-white transition-colors hover:border-black/15"
              title={meta.label + (account.handle ? " · @" + account.handle : "")}
              aria-label={"Open " + meta.label + (account.handle ? " account @" + account.handle : "")}
            >
              <SocialPlatformIcon platform={account.platform} bare className="h-4 w-4" />
            </a>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 gap-2.5 sm:grid-cols-2", className)}>
      {accounts.map((account) => {
        const meta = PLATFORM_META[account.platform];
        return (
          <a
            key={account.id}
            href={account.url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={"Open " + meta.label + (account.handle ? " account @" + account.handle : "")}
            className="group flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white px-3.5 py-3 transition-colors hover:border-black/15"
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: meta.color + "14" }}
            >
              <SocialPlatformIcon platform={account.platform} bare className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <p className="truncate text-[13px] font-semibold text-[#1C1B19]">
                  {account.handle ? "@" + account.handle : meta.label}
                </p>
                {account.isVerified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[#FF5A1F]" />}
              </div>
              <p className="text-[11.5px] text-[#9A9388]">
                {meta.label}
                {account.followers > 0 && " · " + formatNumber(account.followers) + " followers"}
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
