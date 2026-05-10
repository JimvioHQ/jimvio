import Link from "next/link";
import { Flame, ArrowRight, Clock, Eye, DollarSign, Sparkles } from "lucide-react";

interface Participant {
  initials: string;
  color: string;
  avatarUrl?: string | null;
}

interface FeaturedCampaignBannerProps {
  title: string;
  description: string | null;
  campaignType: string;
  paymentModel: "per_views" | "fixed_rate" | string;
  brandName: string | null;
  brandLogo: string | null;
  creatorsJoined: number;
  spotsLeft: number | null;
  alreadyPaid: string | null;
  earnUpTo: string;
  participants: Participant[];
  extraCount: number;
  coverImage?: string | null;
  endsAt?: string | null;
  href: string;
}

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const ms = new Date(dateStr).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86_400_000);
}

function formatType(t: string): string {
  return t
    .replace(/_/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function FeaturedCampaignBanner({
  title,
  description,
  campaignType,
  paymentModel,
  brandName,
  brandLogo,
  creatorsJoined,
  spotsLeft,
  alreadyPaid,
  earnUpTo,
  participants,
  extraCount,
  coverImage,
  endsAt,
  href,
}: FeaturedCampaignBannerProps) {
  const days = daysUntil(endsAt);
  const isEndingSoon = days !== null && days <= 3;
  const isClosed = spotsLeft === 0;
  const isPerViews = paymentModel === "per_views";

  const stats: { value: string; label: string; tone?: "urgent" | "default" }[] = [
    { value: creatorsJoined.toString(), label: "Creators joined" },
  ];
  if (spotsLeft !== null) {
    stats.push({
      value: spotsLeft.toString(),
      label: "Spots left",
      tone: spotsLeft <= 5 && spotsLeft > 0 ? "urgent" : "default",
    });
  }
  if (alreadyPaid !== null && creatorsJoined > 0) {
    stats.push({ value: alreadyPaid, label: "Paid out" });
  } else if (isPerViews) {
    stats.push({ value: "Uncapped", label: "Earnings" });
  }

  return (
    <div className="relative overflow-hidden rounded-2xl text-white min-h-[280px] bg-[#0f0f0f]">
      {/* ─ LAYER 1: Cover image fills the entire banner edge-to-edge ─ */}
      <div className="absolute inset-0">
        {coverImage ? (
          <img
            src={coverImage}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-end pb-8 pr-8"
            style={{
              background:
                "linear-gradient(135deg, rgba(253,80,0,0.15) 0%, rgba(253,80,0,0.05) 100%)",
            }}
          >
            <svg width="72" height="72" viewBox="0 0 48 48" fill="none" aria-hidden="true" style={{ marginRight: "10%" }}>
              <rect
                x="4" y="4" width="40" height="40" rx="8"
                stroke="rgba(253,80,0,0.5)" strokeWidth="1.5" strokeDasharray="4 3"
              />
              <path
                d="M16 28 L22 22 L26 26 L30 20 L36 28"
                stroke="rgba(253,80,0,0.7)" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round"
              />
              <circle cx="19" cy="20" r="3" fill="rgba(253,80,0,0.4)" />
            </svg>
          </div>
        )}
      </div>

      {/* ─ LAYER 2: Dark gradient bleeds left→right across ~65% to soak the text side ─ */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to right, #0f0f0f 0%, #1a0700 30%, rgba(26,7,0,0.85) 50%, rgba(26,7,0,0.45) 65%, transparent 80%)",
        }}
      />

      {/* ─ LAYER 3: Bottom darken across the entire banner so earn overlay reads ─ */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)",
        }}
      />

      {/* ─ LAYER 4: Orange ambient glow on the text side ─ */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 25% 50%, rgba(253,80,0,0.20) 0%, transparent 50%)",
        }}
      />

      {/* ─ LAYER 5: Content ─ */}
      <div className="relative flex flex-col md:grid md:grid-cols-2 items-stretch min-h-[280px]">
        {/* LEFT: Info */}
        <div className="p-6 flex flex-col justify-between gap-5 min-w-0">
          <div>
            {/* Trust row */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <div className="flex items-center gap-1.5 bg-[#fd5000] text-white text-[10px] font-bold tracking-widest px-2.5 py-1 rounded-full">
                <Flame size={10} />
                TRENDING
              </div>
              {isEndingSoon && (
                <div className="flex items-center gap-1.5 bg-[#e5484d]/15 text-[#ff6b70] text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full border border-[#e5484d]/30 backdrop-blur-sm">
                  <Clock size={10} />
                  {days === 0 ? "ENDS TODAY" : `${days}D LEFT`}
                </div>
              )}
              {isClosed && (
                <div className="flex items-center gap-1.5 bg-white/10 text-[#aaa] text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full">
                  CLOSED
                </div>
              )}
            </div>

            {/* Brand */}
            {brandName && (
              <div className="flex items-center gap-2 mb-2">
                {brandLogo ? (
                  <img
                    src={brandLogo}
                    alt={brandName}
                    className="w-5 h-5 rounded-full object-cover ring-1 ring-white/20"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold">
                    {brandName[0]?.toUpperCase()}
                  </div>
                )}
                <span className="text-[12px] text-[#aaa]">
                  by <span className="text-white font-semibold">{brandName}</span>
                </span>
              </div>
            )}

            <h2 className="text-[22px] font-extrabold tracking-tight mb-1.5 leading-tight drop-shadow-md">
              {title}
            </h2>

            <p className="text-[13px] text-[#bbb] mb-4 leading-snug line-clamp-2">
              {description ?? `${formatType(campaignType)} campaign`}
            </p>

            {/* Type pills */}
            <div className="flex flex-wrap gap-2 mb-5">
              <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-white/[0.08] border border-white/[0.15] backdrop-blur-sm">
                {formatType(campaignType)}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-3 py-1 rounded-full bg-white/[0.08] border border-white/[0.15] backdrop-blur-sm">
                {isPerViews ? <Eye size={10} /> : <DollarSign size={10} />}
                {isPerViews ? "Pay per view" : "Flat rate"}
              </span>
            </div>

            {/* Stats */}
            <div
              className="grid gap-4 mb-5"
              style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
            >
              {stats.map(({ value, label, tone }) => (
                <div key={label}>
                  <div
                    className={`text-[20px] font-extrabold leading-none drop-shadow-md ${tone === "urgent" ? "text-[#ff6b70]" : "text-white"
                      }`}
                  >
                    {value}
                  </div>
                  <div className="text-[11px] text-[#999] mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom: participants + CTA */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {participants.length > 0 ? (
              <div className="flex items-center gap-2.5">
                <div className="flex">
                  {participants.map((p, i) => (
                    <div
                      key={i}
                      className="w-7 h-7 rounded-full border-2 border-[#1a0700] flex items-center justify-center text-[10px] font-bold text-white overflow-hidden"
                      style={{
                        background: p.color,
                        marginLeft: i === 0 ? 0 : -8,
                        zIndex: participants.length - i,
                        position: "relative",
                      }}
                    >
                      {p.avatarUrl ? (
                        <img
                          src={p.avatarUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                        />
                      ) : (
                        p.initials
                      )}
                    </div>
                  ))}
                  {extraCount > 0 && (
                    <div
                      className="w-7 h-7 rounded-full border-2 border-[#1a0700] flex items-center justify-center text-[9px] font-semibold text-[#ccc]"
                      style={{
                        background: "rgba(255,255,255,0.15)",
                        marginLeft: -8,
                        position: "relative",
                        zIndex: 0,
                      }}
                    >
                      +{extraCount}
                    </div>
                  )}
                </div>
                <span className="text-[11px] text-[#aaa]">
                  {creatorsJoined === 1 ? "creator" : "creators"} joined
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[11px] text-[#fd5000]">
                <Sparkles size={12} />
                <span className="font-medium">Be the first to join</span>
              </div>
            )}

            <Link
              href={isClosed ? "/ugc" : href}
              className="inline-flex items-center justify-center gap-1.5 text-[13px] font-semibold text-white rounded-xl px-4 py-2.5 transition-all hover:gap-2.5 group whitespace-nowrap shadow-lg"
              style={{
                background: isClosed
                  ? "rgba(255,255,255,0.15)"
                  : "linear-gradient(135deg, #fd5000, #ff7a30)",
                boxShadow: isClosed ? "none" : "0 4px 20px rgba(253,80,0,0.35)",
              }}
            >
              {isClosed ? "View similar" : "View campaign"}
              <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* RIGHT: Earn overlay sits on top of the image */}
        <div className="relative min-h-[120px] md:min-h-0">
          {/* Earn amount — bottom-right of the photo */}
          <div className="absolute bottom-5 right-5 text-right">
            <div className="text-[10px] text-white/80 font-bold uppercase tracking-wider mb-0.5 drop-shadow-md">
              {isPerViews ? "Earn" : "Earn up to"}
            </div>
            <div
              className="text-[32px] font-extrabold text-white leading-none"
              style={{ textShadow: "0 2px 12px rgba(0,0,0,0.7)" }}
            >
              {earnUpTo}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}