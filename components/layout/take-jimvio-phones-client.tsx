"use client";

import { useState } from "react";
import { ShoppingBag, Wallet, Megaphone } from "lucide-react";
import IPhoneMockup from "@/components/ui/iphone-mockup";
import AndroidMockup from "@/components/ui/android-mockup";
import { cn } from "@/lib/utils";

const ORANGE = "#fd5000";
const GREEN = "#16a34a";
const PURPLE = "#7c3aed";

type AppScreen = "earnings" | "shop" | "campaigns";

const TABS: { id: AppScreen; label: string; icon: typeof Wallet }[] = [
  { id: "earnings", label: "Earnings", icon: Wallet },
  { id: "shop", label: "Shop", icon: ShoppingBag },
  { id: "campaigns", label: "Campaigns", icon: Megaphone },
];

const IPHONE_SCALE_SM = 0.26;
const IPHONE_OUTER_W = 417;
const IPHONE_OUTER_H = 876;

const ANDROID_SCALE = 0.32;
const ANDROID_OUTER_W = 380;
const ANDROID_OUTER_H = 800;

function EarningsContent() {
  return (
    <div className="flex flex-1 flex-col p-3">
      <div className="text-[10px] font-bold text-[#111]">Earnings</div>
      <div className="mt-1 text-[18px] font-black leading-none" style={{ color: GREEN }}>
        $1,240
      </div>
      <div className="mt-3 flex-1 space-y-2">
        {[
          { label: "Affiliate", amount: "$420", w: 65 },
          { label: "UGC", amount: "$380", w: 45 },
          { label: "Sales", amount: "$440", w: 80 },
        ].map((row) => (
          <div key={row.label} className="rounded-lg bg-white p-2 shadow-sm">
            <div className="flex items-center justify-between text-[8px] font-semibold text-[#6b7280]">
              <span>{row.label}</span>
              <span className="font-bold text-[#111]">{row.amount}</span>
            </div>
            <div className="mt-1 h-1.5 rounded bg-[#e5e7eb]">
              <div className="h-full rounded" style={{ width: `${row.w}%`, background: GREEN }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShopContent() {
  return (
    <div className="flex flex-1 flex-col">
      <div
        className="flex flex-1 items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=700&fit=crop)",
        }}
      />
      <div className="bg-white p-3">
        <div className="text-[10px] font-bold text-[#111]">Smart Watch Pro</div>
        <div className="text-[14px] font-black" style={{ color: ORANGE }}>
          $89.99
        </div>
        <button
          type="button"
          className="mt-2 w-full rounded-lg py-1.5 text-[9px] font-bold text-white"
          style={{ background: ORANGE }}
        >
          Buy Now
        </button>
      </div>
    </div>
  );
}

function CampaignsContent() {
  return (
    <div className="flex flex-1 flex-col p-3">
      <div className="text-[10px] font-bold text-[#111]">Campaigns</div>
      <div className="mt-2 flex-1 space-y-2">
        {[
          { color: "#111", label: "TikTok", pay: "$8/1K" },
          { color: PURPLE, label: "UGC", pay: "$12/1K" },
          { color: GREEN, label: "Clip", pay: "$6/1K" },
        ].map((c) => (
          <div key={c.label} className="rounded-lg bg-white p-2 shadow-sm">
            <div className="flex items-center gap-1.5">
              <div className="size-3.5 shrink-0 rounded" style={{ background: c.color }} />
              <span className="text-[9px] font-bold text-[#111]">{c.label}</span>
              <span className="ml-auto text-[8px] font-semibold" style={{ color: ORANGE }}>
                {c.pay}
              </span>
            </div>
            <div className="mt-1.5 h-1 w-2/3 rounded bg-[#f3f4f6]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenContent({ screen }: { screen: AppScreen }) {
  if (screen === "shop") return <ShopContent />;
  if (screen === "campaigns") return <CampaignsContent />;
  return <EarningsContent />;
}

function StaticIPhone({
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
      className="relative shrink-0 transition-transform duration-300"
      style={{
        width: IPHONE_OUTER_W * scale,
        height: IPHONE_OUTER_H * scale,
        transform: elevated ? "translateY(-18px)" : undefined,
      }}
    >
      <IPhoneMockup
        model="15-pro"
        color="space-black"
        scale={scale}
        screenBg="#fafafa"
        safeAreaOverrides={{ top: 52, bottom: 28, left: 0, right: 0 }}
      >
        {children}
      </IPhoneMockup>
    </div>
  );
}

function InteractiveAndroidPhone({ screen }: { screen: AppScreen }) {
  return (
    <div
      className="relative shrink-0"
      style={{
        width: ANDROID_OUTER_W * ANDROID_SCALE,
        height: ANDROID_OUTER_H * ANDROID_SCALE,
        transform: "translateY(-18px)",
      }}
    >
      <AndroidMockup
        color="graphite"
        scale={ANDROID_SCALE}
        screenBg="#fafafa"
        safeAreaOverrides={{ top: 30, bottom: 20, left: 0, right: 0 }}
      >
        <div key={screen} className="flex min-h-0 flex-1 flex-col animate-in fade-in duration-300">
          <ScreenContent screen={screen} />
        </div>
      </AndroidMockup>
    </div>
  );
}

export function TakeJimvioPhonesClient() {
  const [screen, setScreen] = useState<AppScreen>("shop");

  return (
    <div className="flex w-full flex-col gap-4 lg:flex-1 lg:gap-5">
      <div className="w-full">
        <p className="mb-2 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-white/75">
          Live app preview
        </p>
        <div
          className="inline-flex w-full max-w-full flex-wrap gap-1 rounded-2xl border border-white/20 bg-white/10 p-1 backdrop-blur-sm sm:w-auto"
          role="tablist"
          aria-label="App screens"
        >
          {TABS.map((tab) => {
            const active = screen === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setScreen(tab.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-bold transition-all duration-200 sm:flex-initial sm:px-4",
                  active
                    ? "bg-white text-[#111] shadow-sm"
                    : "text-white/90 hover:bg-white/10",
                )}
              >
                <Icon className="size-3.5" strokeWidth={2.3} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-end justify-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-4 [&::-webkit-scrollbar]:hidden">
        <StaticIPhone scale={IPHONE_SCALE_SM}>
          <EarningsContent />
        </StaticIPhone>

        <InteractiveAndroidPhone screen={screen} />

        <StaticIPhone scale={IPHONE_SCALE_SM}>
          <CampaignsContent />
        </StaticIPhone>
      </div>
    </div>
  );
}
