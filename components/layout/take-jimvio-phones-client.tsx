"use client";

import { useEffect, useState } from "react";
import {
  Home,
  ShoppingBag,
  Wallet,
  Megaphone,
  User,
  Search,
  TrendingUp,
  LayoutDashboard,
  BarChart3,
  Bell,
  Package,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  CircleDot,
} from "lucide-react";
import IPhoneMockup from "@/components/ui/iphone-mockup";

const ORANGE = "#fd5000";
const GREEN = "#16a34a";
const PURPLE = "#7c3aed";
const BLUE = "#2563eb";
const MUTED = "#6b7280";

const PHONE_OUTER_W = 417;
const PHONE_OUTER_H = 876;

type TabId = "home" | "shop" | "wallet" | "campaigns" | "profile";

function usePhoneScale() {
  const [scale, setScale] = useState(0.2);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w >= 1024) setScale(0.28);
      else if (w >= 768) setScale(0.24);
      else if (w >= 640) setScale(0.21);
      else setScale(0.19);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return scale;
}

function InitialAvatar({ label, bg }: { label: string; bg: string }) {
  return (
    <span
      className="flex size-4 shrink-0 items-center justify-center rounded text-[5px] font-bold text-white sm:size-5 sm:text-[6px]"
      style={{ background: bg }}
    >
      {label}
    </span>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "green" | "orange" | "gray" | "purple";
}) {
  const tones = {
    green: { bg: "#ecfdf5", color: GREEN },
    orange: { bg: "#fff7ed", color: ORANGE },
    gray: { bg: "#f3f4f6", color: MUTED },
    purple: { bg: "#f5f3ff", color: PURPLE },
  };
  const t = tones[tone];
  return (
    <span
      className="rounded px-1 py-px text-[4px] font-semibold leading-none sm:text-[5px]"
      style={{ background: t.bg, color: t.color }}
    >
      {label}
    </span>
  );
}

function AppTabBar({ active }: { active: TabId }) {
  const tabs: { id: TabId; label: string; icon: typeof Home }[] = [
    { id: "home", label: "Home", icon: Home },
    { id: "shop", label: "Shop", icon: ShoppingBag },
    { id: "wallet", label: "Wallet", icon: Wallet },
    { id: "campaigns", label: "UGC", icon: Megaphone },
    { id: "profile", label: "You", icon: User },
  ];

  return (
    <nav className="mt-auto flex border-t border-[#ececec] bg-white px-0.5 py-1">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        const Icon = tab.icon;
        return (
          <div
            key={tab.id}
            className="flex flex-1 flex-col items-center gap-0.5 py-0.5"
            style={{ color: isActive ? ORANGE : "#9ca3af" }}
          >
            <Icon className="size-3" strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[6px] font-bold">{tab.label}</span>
          </div>
        );
      })}
    </nav>
  );
}

/* ─── Laptop: seller ops — orders + inventory, no stock photos ─── */
function DashboardWebScreen() {
  const nav = [
    { label: "Dashboard", icon: LayoutDashboard, active: false },
    { label: "Orders", icon: Package, active: true },
    { label: "Campaigns", icon: Megaphone, active: false },
    { label: "Analytics", icon: BarChart3, active: false },
  ];

  const orders = [
    { id: "JV-48291", item: "Ceramic pour-over set", buyer: "M. Chen", amt: "$34.20", status: "Shipped", tone: "green" as const },
    { id: "JV-48288", item: "Notion creator pack", buyer: "A. Okonkwo", amt: "$19.00", status: "Digital sent", tone: "purple" as const },
    { id: "JV-48285", item: "Linen weekender bag", buyer: "S. Rivera", amt: "$78.50", status: "Packing", tone: "orange" as const },
    { id: "JV-48279", item: "Affiliate · desk mat", buyer: "via @techsetup", amt: "$6.40", status: "Paid out", tone: "gray" as const },
  ];

  return (
    <div className="flex h-full min-h-0 bg-[#fafafa] text-[#111]">
      <aside className="flex w-[24%] shrink-0 flex-col border-r border-[#ececec] bg-white px-1.5 py-2">
        <span className="text-[8px] font-black tracking-tight" style={{ color: ORANGE }}>
          Jimvio
        </span>
        <p className="mt-0.5 text-[4px] font-medium text-[#9ca3af]">Vendor · Kora Studio</p>
        <nav className="mt-2 space-y-px">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-1 rounded px-1 py-0.5 text-[5px] font-semibold"
                style={{
                  background: item.active ? "#111" : "transparent",
                  color: item.active ? "#fff" : MUTED,
                }}
              >
                <Icon className="size-2 shrink-0" strokeWidth={2} />
                <span className="truncate">{item.label}</span>
              </div>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-[#f0f0f0] pt-1.5">
          <p className="text-[4px] font-medium text-[#9ca3af]">Today</p>
          <p className="text-[8px] font-bold tabular-nums">$3,842.17</p>
          <p className="text-[4px] font-medium" style={{ color: GREEN }}>
            +12.4% vs yesterday
          </p>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col p-1.5">
        <div className="flex items-start justify-between gap-1">
          <div>
            <p className="text-[7px] font-bold">Orders</p>
            <p className="text-[4px] text-[#9ca3af]">14 need action · last sync 2m ago</p>
          </div>
          <div className="flex items-center gap-0.5">
            <div className="flex items-center gap-0.5 rounded border border-[#e5e5e5] bg-white px-1 py-px">
              <Search className="size-1.5 text-[#9ca3af]" />
              <span className="text-[4px] text-[#9ca3af]">Filter</span>
            </div>
            <div className="relative">
              <Bell className="size-2 text-[#9ca3af]" />
              <span className="absolute -right-0.5 -top-0.5 size-1 rounded-full bg-[#ef4444]" />
            </div>
          </div>
        </div>

        <div className="mt-1 flex gap-1">
          {[
            { label: "Open", val: "14", accent: ORANGE },
            { label: "Ship today", val: "6", accent: "#111" },
            { label: "UGC due", val: "3", accent: PURPLE },
          ].map((s) => (
            <div key={s.label} className="flex-1 border border-[#ececec] bg-white px-1 py-0.5">
              <p className="text-[4px] text-[#9ca3af]">{s.label}</p>
              <p className="text-[7px] font-bold tabular-nums" style={{ color: s.accent }}>
                {s.val}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-1 min-h-0 flex-1 overflow-hidden rounded border border-[#ececec] bg-white">
          <div className="grid grid-cols-[1fr_0.5fr_0.45fr] gap-0.5 border-b border-[#f0f0f0] bg-[#fafafa] px-1 py-0.5 text-[4px] font-semibold uppercase tracking-wide text-[#9ca3af]">
            <span>Order</span>
            <span>Amt</span>
            <span>Status</span>
          </div>
          {orders.map((o) => (
            <div
              key={o.id}
              className="grid grid-cols-[1fr_0.5fr_0.45fr] items-center gap-0.5 border-b border-[#f5f5f5] px-1 py-0.5 last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate text-[4px] font-bold text-[#111]">{o.item}</p>
                <p className="truncate text-[3.5px] text-[#9ca3af]">
                  {o.id} · {o.buyer}
                </p>
              </div>
              <span className="text-[4px] font-semibold tabular-nums">{o.amt}</span>
              <StatusPill label={o.status} tone={o.tone} />
            </div>
          ))}
        </div>

        <div className="mt-1 flex items-center justify-between rounded border border-[#ececec] bg-white px-1 py-0.5">
          <div className="flex items-center gap-0.5">
            <CircleDot className="size-1.5" style={{ color: ORANGE }} />
            <span className="text-[4px] font-medium text-[#6b7280]">2 payouts queued</span>
          </div>
          <span className="text-[4px] font-bold" style={{ color: ORANGE }}>
            Review →
          </span>
        </div>
      </main>
    </div>
  );
}

/* ─── Tablet: browse list — vendor rows, no product photos ─── */
function MarketplaceTabletScreen() {
  const tabs = ["For you", "Physical", "Digital", "Affiliate"];
  const listings = [
    { vendor: "Kora Studio", title: "Hand-thrown mug set", type: "Physical", price: "$42", comm: "18%", sold: "214 sold", accent: "#d97706" },
    { vendor: "Pixel Draft Co.", title: "Figma wireframe kit", type: "Digital", price: "$29", comm: "35%", sold: "1.2k dl", accent: BLUE },
    { vendor: "Northline Goods", title: "Merino travel scarf", type: "Physical", price: "$56", comm: "22%", sold: "89 sold", accent: "#0d9488" },
    { vendor: "Brief Studio", title: "UGC brief · skincare", type: "Campaign", price: "$9/1K", comm: "Paid", sold: "12 slots", accent: PURPLE },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="border-b border-[#ececec] px-2 py-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-black tracking-tight" style={{ color: ORANGE }}>
            Jimvio
          </span>
          <span className="rounded border border-[#ececec] px-1 py-px text-[4px] font-semibold text-[#6b7280]">
            Lagos · USD
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1 rounded border border-[#e5e5e5] bg-[#fafafa] px-1.5 py-0.5">
          <Search className="size-2 text-[#9ca3af]" />
          <span className="text-[5px] text-[#9ca3af]">wireless mic, notion templates…</span>
        </div>
      </div>

      <div className="flex gap-2 border-b border-[#f0f0f0] px-2">
        {tabs.map((tab, i) => (
          <span
            key={tab}
            className="border-b-2 py-1 text-[5px] font-semibold"
            style={{
              borderColor: i === 0 ? ORANGE : "transparent",
              color: i === 0 ? "#111" : MUTED,
            }}
          >
            {tab}
          </span>
        ))}
      </div>

      <div className="flex-1 space-y-px overflow-hidden bg-[#fafafa] p-1.5">
        {listings.map((row) => (
          <div
            key={row.title}
            className="flex items-center gap-1 border border-[#ececec] bg-white px-1 py-1"
          >
            <InitialAvatar label={row.vendor.slice(0, 2).toUpperCase()} bg={row.accent} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[5px] font-bold">{row.title}</p>
              <p className="truncate text-[4px] text-[#9ca3af]">
                {row.vendor} · {row.sold}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[5px] font-bold tabular-nums">{row.price}</p>
              <p className="text-[4px] font-medium" style={{ color: row.type === "Campaign" ? PURPLE : GREEN }}>
                {row.comm}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Phone: wallet ledger — real transactions, not progress bars ─── */
function WalletPhoneScreen() {
  const ledger = [
    { label: "Affiliate · desk mat", sub: "Order JV-48279", amt: "+$6.40", time: "11:02", done: true },
    { label: "UGC payout · Brief #88", sub: "Approved clip", amt: "+$124.00", time: "Yesterday", done: true },
    { label: "Store sale · mug set", sub: "Awaiting delivery", amt: "+$34.20", time: "Pending", done: false },
    { label: "Withdrawal", sub: "To ·••• 4821", amt: "−$200.00", time: "Mon", done: true },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#fafafa]">
      <div className="border-b border-[#ececec] bg-white px-3 pb-2 pt-1">
        <p className="text-[10px] font-bold text-[#111]">Wallet</p>
        <p className="text-[7px] text-[#9ca3af]">Payouts clear in 24h · min $25</p>
      </div>

      <div className="flex-1 space-y-2 overflow-hidden px-2.5 py-2">
        <div className="border border-[#ececec] bg-white p-2.5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[6px] font-medium text-[#9ca3af]">Available</p>
              <p className="mt-0.5 text-[15px] font-bold leading-none tabular-nums text-[#111]">
                $1,247.60
              </p>
            </div>
            <div className="text-right">
              <p className="text-[6px] font-medium text-[#9ca3af]">Pending</p>
              <p className="text-[8px] font-bold tabular-nums" style={{ color: ORANGE }}>
                $47.20
              </p>
            </div>
          </div>
          <div className="mt-2 flex gap-1">
            <span
              className="rounded px-2 py-0.5 text-[6px] font-bold text-white"
              style={{ background: ORANGE }}
            >
              Withdraw
            </span>
            <span className="rounded border border-[#e5e5e5] bg-[#fafafa] px-2 py-0.5 text-[6px] font-semibold text-[#6b7280]">
              Statement
            </span>
          </div>
        </div>

        <div className="border border-[#ececec] bg-white">
          <div className="flex items-center justify-between border-b border-[#f0f0f0] px-2 py-1">
            <p className="text-[7px] font-bold">Recent</p>
            <span className="text-[6px] font-semibold" style={{ color: ORANGE }}>
              All
            </span>
          </div>
          {ledger.map((row) => (
            <div
              key={row.label}
              className="flex items-center gap-1.5 border-b border-[#f5f5f5] px-2 py-1.5 last:border-0"
            >
              <div
                className="flex size-4 shrink-0 items-center justify-center rounded-full"
                style={{ background: row.done ? "#f0fdf4" : "#fff7ed" }}
              >
                {row.done ? (
                  <CheckCircle2 className="size-2" style={{ color: GREEN }} />
                ) : (
                  <Clock className="size-2" style={{ color: ORANGE }} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[6px] font-semibold">{row.label}</p>
                <p className="truncate text-[5px] text-[#9ca3af]">{row.sub}</p>
              </div>
              <div className="shrink-0 text-right">
                <p
                  className="text-[6px] font-bold tabular-nums"
                  style={{ color: row.amt.startsWith("−") ? "#111" : GREEN }}
                >
                  {row.amt}
                </p>
                <p className="text-[5px] text-[#9ca3af]">{row.time}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between rounded border border-[#ececec] bg-white px-2 py-1.5">
          <div>
            <p className="text-[6px] font-bold">Open UGC brief</p>
            <p className="text-[5px] text-[#9ca3af]">Northline · 3 days left</p>
          </div>
          <div className="flex items-center gap-0.5 text-[6px] font-bold" style={{ color: ORANGE }}>
            Apply
            <ArrowUpRight className="size-2" />
          </div>
        </div>
      </div>

      <AppTabBar active="wallet" />
    </div>
  );
}

function LaptopShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex shrink-0 flex-col items-center ${className}`}>
      <div className="w-full rounded-t-[10px] border-[3px] border-b-0 border-[#1c1c1e] bg-[#1c1c1e] p-1 shadow-[0_20px_50px_rgba(0,0,0,0.35)] sm:rounded-t-[12px] sm:border-[4px] sm:p-1.5">
        <div className="aspect-[16/10] w-full overflow-hidden rounded-t-[4px] bg-white sm:rounded-t-[6px]">
          {children}
        </div>
      </div>
      <div className="h-1.5 w-[92%] rounded-b-sm bg-[#2d2d2d] sm:h-2" />
      <div className="mt-0.5 h-0.5 w-[28%] rounded-full bg-[#3a3a3a]" />
    </div>
  );
}

function TabletShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`shrink-0 rounded-[12px] border-[4px] border-[#1c1c1e] bg-[#1c1c1e] p-1 shadow-[0_16px_40px_rgba(0,0,0,0.3)] sm:rounded-[14px] sm:border-[5px] ${className}`}
    >
      <div className="aspect-[3/4] w-full overflow-hidden rounded-[6px] bg-white sm:rounded-[8px]">
        {children}
      </div>
    </div>
  );
}

function IPhonePreview({
  scale,
  elevated = false,
  children,
}: {
  scale: number;
  elevated?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative shrink-0"
      style={{
        width: PHONE_OUTER_W * scale,
        height: PHONE_OUTER_H * scale,
        transform: elevated ? "translateY(-10px)" : undefined,
      }}
    >
      <IPhoneMockup
        model="15-pro"
        color="space-black"
        scale={scale}
        screenBg="#fafafa"
        safeAreaOverrides={{ top: 52, bottom: 24, left: 0, right: 0 }}
      >
        {children}
      </IPhoneMockup>
    </div>
  );
}

export function TakeJimvioPhonesClient() {
  const phoneScale = usePhoneScale();

  return (
    <div className="w-full overflow-hidden lg:flex-1">
      <div className="flex w-full items-end justify-center gap-1.5 px-0.5 sm:gap-2 md:gap-3 lg:gap-4">
        <TabletShell className="w-[72px] sm:w-[100px] md:w-[130px] lg:w-[155px] xl:w-[175px]">
          <MarketplaceTabletScreen />
        </TabletShell>

        <LaptopShell className="w-[120px] sm:w-[180px] md:w-[240px] lg:w-[300px] xl:w-[360px] -translate-y-1 sm:-translate-y-2">
          <DashboardWebScreen />
        </LaptopShell>

        <IPhonePreview scale={phoneScale} elevated>
          <WalletPhoneScreen />
        </IPhonePreview>
      </div>
    </div>
  );
}
