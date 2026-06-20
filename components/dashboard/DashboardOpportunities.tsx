import Link from "next/link";
import { ArrowRight, Link2, Megaphone, ShoppingBag, Wallet, Users, Sparkles } from "lucide-react";

type Opportunity = {
  icon: typeof Link2;
  title: string;
  desc: string;
  href: string;
  cta: string;
  color: string;
  bg: string;
};

interface DashboardOpportunitiesProps {
  campaignsCount: number;
  linksCount: number;
  walletBalance: number;
  pendingBalance: number;
}

export function DashboardOpportunities({
  campaignsCount,
  linksCount,
  walletBalance,
  pendingBalance,
}: DashboardOpportunitiesProps) {
  const items: Opportunity[] = [];

  if (campaignsCount === 0) {
    items.push({
      icon: Megaphone,
      title: "Join your first UGC campaign",
      desc: "Get paid per view or per approved post. Most creators earn within their first week.",
      href: "/ugc",
      cta: "Browse campaigns",
      color: "#8b5cf6",
      bg: "#f5f3ff",
    });
  }

  if (linksCount < 2) {
    items.push({
      icon: Link2,
      title: "Create affiliate links",
      desc: "Share product links and earn commission on every sale — up to 30% on eligible products.",
      href: "/marketplace",
      cta: "Find products",
      color: "#fd5000",
      bg: "#fff4ed",
    });
  }

  items.push({
    icon: ShoppingBag,
    title: "Promote trending products",
    desc: "High-commission listings updated daily. Pick products that match your audience.",
    href: "/marketplace",
    cta: "View marketplace",
    color: "#3b82f6",
    bg: "#eff6ff",
  });

  if (walletBalance >= 10) {
    items.push({
      icon: Wallet,
      title: "Withdraw your earnings",
      desc: `${pendingBalance > 0 ? "You have pending balance clearing soon. " : ""}Cash out once you hit the minimum.`,
      href: "/dashboard/wallet",
      cta: "Open wallet",
      color: "#30a46c",
      bg: "#f0fdf4",
    });
  }

  items.push({
    icon: Users,
    title: "Grow in a community",
    desc: "Connect with sellers and creators, share wins, and find collaboration opportunities.",
    href: "/communities",
    cta: "Explore communities",
    color: "#ca8a04",
    bg: "#fffbeb",
  });

  const visible = items.slice(0, 4);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="size-4 text-[#fd5000]" />
        <h3 className="text-[14px] font-bold text-[var(--color-text-primary)]">
          Ways to grow your earnings
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {visible.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:bg-[var(--color-surface-secondary)]/50"
          >
            <span
              className="grid size-10 place-items-center rounded-lg"
              style={{ background: item.bg, color: item.color }}
            >
              <item.icon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-[var(--color-text-primary)]">
                {item.title}
              </span>
              <span className="mt-0.5 block text-[12px] leading-snug text-[var(--color-text-muted)]">
                {item.desc}
              </span>
              <span className="mt-2 inline-block text-[12px] font-bold" style={{ color: item.color }}>
                {item.cta}
              </span>
            </span>
            <ArrowRight
              className="size-4 shrink-0 text-[var(--color-text-muted)] transition-transform group-hover:translate-x-0.5"
              style={{ color: item.color }}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
