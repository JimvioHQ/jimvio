import { DollarSign, Megaphone, Link2, Wallet } from "lucide-react";
import { Tile } from "@/components/ui/admin-tile";

interface HeroStatsRowProps {
  earnedToday: string;
  newCampaigns: number;
  affiliateClicks: number;
  walletBalance?: string;
  earnedTrend?: string;
  campaignsTrend?: string;
  linksTrend?: string;
}

export function HeroStatsRow({
  earnedToday,
  newCampaigns,
  affiliateClicks,
  walletBalance,
  earnedTrend,
  campaignsTrend,
  linksTrend,
}: HeroStatsRowProps) {
  return (
    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Tile
        label="Earned today"
        value={earnedToday.replace(/\s+today$/i, "") || "—"}
        sublabel={earnedTrend ?? "vs yesterday"}
        icon={DollarSign}
        tone="success"
      />
      <Tile
        label="Active campaigns"
        value={String(newCampaigns)}
        sublabel={campaignsTrend ?? "UGC opportunities"}
        icon={Megaphone}
      />
      <Tile
        label="Affiliate links"
        value={String(affiliateClicks)}
        sublabel={linksTrend ?? "Active referral links"}
        icon={Link2}
      />
      <Tile
        label="Wallet"
        value={walletBalance ?? "—"}
        sublabel="Available balance"
        icon={Wallet}
        tone="success"
      />
    </div>
  );
}
