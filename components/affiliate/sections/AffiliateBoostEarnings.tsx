import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clock3,
  Gift,
  Percent,
  Sparkles,
} from "lucide-react";
import { AFFILIATE_CARD, AFFILIATE_SHELL, AffiliateSectionHeading } from "./shared";

const FEATURES = [
  {
    title: "Higher Commission Rates",
    desc: "Earn more on every eligible sale with Pro rates.",
    icon: Percent,
  },
  {
    title: "Exclusive Offers",
    desc: "Access limited campaigns reserved for Pro affiliates.",
    icon: Gift,
  },
  {
    title: "Marketing Tools",
    desc: "Creatives, banners, and link kits ready to share.",
    icon: Sparkles,
  },
  {
    title: "Timely Payouts",
    desc: "Faster withdrawals once you hit the Pro threshold.",
    icon: Clock3,
  },
] as const;

const PRO_BENEFITS = [
  "Up to 25% commission on top campaigns",
  "Priority access to exclusive offers",
  "Advanced analytics dashboard",
  "Dedicated affiliate support",
  "Early access to new products",
];

export function AffiliateBoostEarnings() {
  return (
    <section className={`${AFFILIATE_SHELL} pt-12 sm:pt-14`} id="campaigns">
      <div className={`${AFFILIATE_CARD} overflow-hidden`}>
        <div className="grid lg:grid-cols-[1fr_1.05fr]">
          <div className="border-b border-[#F3F4F6] p-6 sm:p-8 lg:border-b-0 lg:border-r">
            <AffiliateSectionHeading
              title="Boost Your Earnings"
              subtitle="Upgrade to Jimvio Pro and unlock higher commissions, exclusive campaigns, and premium tools."
              className="mb-6 sm:mb-7"
            />

            <div className="space-y-4">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="flex gap-3.5">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FFF0E8]">
                      <Icon className="h-[18px] w-[18px] text-[#fd5000]" strokeWidth={2.1} />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-[#111827]">
                        {feature.title}
                      </p>
                      <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#6B7280]">
                        {feature.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <Link
              href="/pricing"
              className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#fd5000] px-6 text-[14px] font-bold text-white shadow-[0_8px_20px_rgba(253,80,0,0.28)] transition-colors hover:bg-[#e04700]"
            >
              Upgrade to Pro
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </Link>
          </div>

          <div
            className="relative flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center"
            style={{
              background:
                "linear-gradient(155deg, #FFF3EC 0%, #FFE8DE 45%, #FFF8F5 100%)",
            }}
          >
            <div className="relative z-[1] max-w-[220px] shrink-0">
              <p className="text-[15px] font-bold text-[#111827]">
                <span aria-hidden>👑 </span>Pro Benefits
              </p>
              <ul className="mt-3.5 space-y-2.5">
                {PRO_BENEFITS.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-[12.5px] leading-snug text-[#374151]"
                  >
                    <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#fd5000]">
                      <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative mx-auto h-[220px] w-full max-w-[320px] flex-1 sm:h-[250px]">
              <Image
                src="/images/affiliate/pro-card.png"
                alt="Jimvio Pro benefits illustration"
                fill
                className="object-contain object-center drop-shadow-[0_16px_30px_rgba(253,80,0,0.15)]"
                sizes="(max-width: 1024px) 80vw, 320px"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
