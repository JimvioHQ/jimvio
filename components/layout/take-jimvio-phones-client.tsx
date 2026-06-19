"use client";

import {
  Home,
  ShoppingBag,
  Wallet,
  Megaphone,
  User,
  Search,
  ArrowUpRight,
  Clock,
  CheckCircle2,
} from "lucide-react";
import IPhoneMockup from "@/components/ui/iphone-mockup";
import { cn } from "@/lib/utils";
const ORANGE = "#fd5000";
const GREEN = "#16a34a";
const PURPLE = "#7c3aed";
const BLUE = "#2563eb";
const MUTED = "#6b7280";

type TabId = "home" | "shop" | "wallet" | "campaigns" | "profile";
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

function MiniLineChart() {
  return (
    <svg viewBox="0 0 120 36" className="h-full w-full" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={PURPLE}
        strokeWidth="1.5"
        points="0,28 12,24 24,26 36,18 48,20 60,12 72,14 84,8 96,10 108,6 120,4"
      />
      <polyline
        fill="none"
        stroke="#38bdf8"
        strokeWidth="1.2"
        strokeDasharray="3 2"
        points="0,32 12,30 24,28 36,26 48,22 60,24 72,18 84,20 96,16 108,18 120,14"
      />
    </svg>
  );
}

function MiniBarChart() {
  const bars = [18, 24, 20, 28, 22, 32, 26, 30];
  return (
    <svg viewBox="0 0 120 36" className="h-full w-full" preserveAspectRatio="none">
      {bars.map((h, i) => {
        const x = i * 14 + 2;
        return (
          <g key={i}>
            <rect x={x} y={36 - h * 0.55} width="5" height={h * 0.55} fill="#e5e7eb" rx="0.5" />
            <rect x={x + 6} y={36 - h * 0.7} width="5" height={h * 0.7} fill={PURPLE} rx="0.5" />
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Laptop: analytics dashboard (reference layout) ─── */
function DashboardWebScreen() {
  const kpis = [
    { label: "Net earnings", val: "$25,874", chg: "−3.3%", up: false, bg: "#ede9ff", color: PURPLE },
    { label: "Pending", val: "$1,872", chg: "+2.9%", up: true, bg: "#e0f2fe", color: BLUE },
    { label: "Store sales", val: "$18,420", chg: "+2.9%", up: true, bg: "#fef9c3", color: "#ca8a04" },
  ];

  const messages = [
    { name: "Kora Studio", msg: "Shipment update for JV-48291", time: "12m" },
    { name: "A. Okonkwo", msg: "Thanks — digital pack received", time: "1d" },
  ];

  const products = [
    { name: "Pour-over set", sold: "139 sold", price: "$42" },
    { name: "Notion pack", sold: "88 sold", price: "$19" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f4f4f5] p-1 text-[#111]">
      <div className="grid grid-cols-3 gap-0.5">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-sm border border-[#ececec] bg-white px-1 py-0.5">
            <div className="flex items-start justify-between">
              <p className="text-[3.5px] font-medium text-[#9ca3af]">{k.label}</p>
              <span className="size-2 rounded-sm" style={{ background: k.bg }} />
            </div>
            <p className="text-[6px] font-bold tabular-nums">{k.val}</p>
            <p className="text-[3px] font-semibold" style={{ color: k.up ? GREEN : "#ef4444" }}>
              {k.chg}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-0.5 grid min-h-0 flex-1 grid-cols-[1.4fr_0.8fr] gap-0.5">
        <div className="flex min-h-0 flex-col rounded-sm border border-[#ececec] bg-white">
          <div className="flex items-center justify-between border-b border-[#f0f0f0] px-1 py-0.5">
            <span className="text-[4px] font-bold">Traffic</span>
            <span className="text-[3px] text-[#9ca3af]">This year</span>
          </div>
          <div className="min-h-0 flex-1 px-0.5 py-0.5">
            <MiniLineChart />
          </div>
        </div>

        <div className="flex min-h-0 flex-col rounded-sm border border-[#ececec] bg-white">
          <div className="border-b border-[#f0f0f0] px-1 py-0.5 text-[4px] font-bold">Messages</div>
          <div className="flex-1 divide-y divide-[#f5f5f5]">
            {messages.map((m) => (
              <div key={m.name} className="px-1 py-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-[3.5px] font-bold">{m.name}</span>
                  <span className="text-[3px] text-[#9ca3af]">{m.time}</span>
                </div>
                <p className="truncate text-[3px] text-[#9ca3af]">{m.msg}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-0.5 grid grid-cols-[0.85fr_1.15fr] gap-0.5">
        <div className="rounded-sm border border-[#ececec] bg-white">
          <div className="border-b border-[#f0f0f0] px-1 py-0.5 text-[4px] font-bold">Top products</div>
          {products.map((p) => (
            <div key={p.name} className="flex items-center justify-between border-b border-[#f5f5f5] px-1 py-0.5 last:border-0">
              <div className="min-w-0">
                <p className="truncate text-[3.5px] font-semibold">{p.name}</p>
                <p className="text-[3px] text-[#9ca3af]">{p.sold}</p>
              </div>
              <span className="text-[3.5px] font-bold">{p.price}</span>
            </div>
          ))}
        </div>

        <div className="rounded-sm border border-[#ececec] bg-white">
          <div className="flex items-center justify-between border-b border-[#f0f0f0] px-1 py-0.5">
            <span className="text-[4px] font-bold">Product sales</span>
            <span className="text-[3px] text-[#9ca3af]">This year</span>
          </div>
          <div className="h-8 px-0.5 py-0.5">
            <MiniBarChart />
          </div>
        </div>
      </div>
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
  elevated = false,
  children,
}: {
  elevated?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0",
        "h-[166px] w-[79px] sm:h-[184px] sm:w-[88px] md:h-[210px] md:w-[100px] lg:h-[245px] lg:w-[117px]",
        elevated && "-translate-y-2.5 sm:-translate-y-3"
      )}
    >
      <div className="absolute left-0 top-0 origin-top-left scale-[0.19] sm:scale-[0.21] md:scale-[0.24] lg:scale-[0.28]">
        <IPhoneMockup
          model="15-pro"
          color="space-black"
          scale={1}
          screenBg="#fafafa"
          safeAreaOverrides={{ top: 52, bottom: 24, left: 0, right: 0 }}
        >
          {children}
        </IPhoneMockup>
      </div>
    </div>
  );
}

/** Static placeholder — dimensions match IPhonePreview at default breakpoint */
export function TakeJimvioDevicesSkeleton() {
  return (
    <div className="w-full overflow-hidden lg:flex-1" aria-hidden>
      <div className="flex w-full items-end justify-center gap-1.5 px-0.5 sm:gap-2 md:gap-3 lg:gap-4">
        <div className="h-[96px] w-[72px] shrink-0 rounded-[12px] bg-white/10 sm:h-[133px] sm:w-[100px] md:h-[173px] md:w-[130px] lg:h-[207px] lg:w-[155px] xl:h-[233px] xl:w-[175px]" />
        <div className="h-[75px] w-[120px] shrink-0 rounded-t-lg bg-white/10 sm:h-[112px] sm:w-[180px] md:h-[150px] md:w-[240px] lg:h-[187px] lg:w-[300px] xl:h-[225px] xl:w-[360px]" />
        <div className="h-[166px] w-[79px] shrink-0 rounded-[20px] bg-white/10 sm:h-[184px] sm:w-[88px] md:h-[210px] md:w-[100px] lg:h-[245px] lg:w-[117px]" />
      </div>
    </div>
  );
}

export function TakeJimvioPhonesClient() {
  return (
    <div className="w-full overflow-hidden lg:flex-1">
      <div className="flex w-full items-end justify-center gap-1.5 px-0.5 sm:gap-2 md:gap-3 lg:gap-4">        <TabletShell className="w-[72px] sm:w-[100px] md:w-[130px] lg:w-[155px] xl:w-[175px]">
          <MarketplaceTabletScreen />
        </TabletShell>

        <LaptopShell className="w-[120px] sm:w-[180px] md:w-[240px] lg:w-[300px] xl:w-[360px] -translate-y-1 sm:-translate-y-2">
          <DashboardWebScreen />
        </LaptopShell>

        <IPhonePreview elevated>
          <WalletPhoneScreen />
        </IPhonePreview>      </div>
    </div>
  );
}
