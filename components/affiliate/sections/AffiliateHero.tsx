import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { AFFILIATE_SHELL } from "./shared";

const CHECKLIST = [
  "High commission rates",
  "Real-time tracking",
  "Timely payouts",
  "Marketing tools & creatives",
];

const SOCIAL_AVATARS = [
  { bg: "from-[#FD7E14] to-[#fd5000]", initials: "AM" },
  { bg: "from-[#6366F1] to-[#4F46E5]", initials: "JK" },
  { bg: "from-[#10B981] to-[#059669]", initials: "SL" },
  { bg: "from-[#F59E0B] to-[#D97706]", initials: "NR" },
];

type AffiliateHeroProps = {
  heroRate: number;
  primaryCtaHref: string;
};

export function AffiliateHero({ heroRate, primaryCtaHref }: AffiliateHeroProps) {
  return (
    <section className={`${AFFILIATE_SHELL} pt-5 sm:pt-6 lg:pt-7`}>
      <div
        className="relative overflow-hidden rounded-[20px] border border-[#FFE8DE] px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12"
        style={{
          background:
            "radial-gradient(120% 90% at 100% 0%, #FFE8DE 0%, #FFF7F3 32%, #FFFFFF 68%)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 top-0 h-56 w-56 rounded-full bg-[#fd5000]/10 blur-3xl"
        />

        <div className="relative grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 xl:gap-10">
          <div className="max-w-xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#fd5000]">
              Jimvio Affiliate Program
            </p>
            <h1 className="mt-3 text-[clamp(1.85rem,4vw,2.65rem)] font-bold leading-[1.12] tracking-tight text-[#111827]">
              Jimvio{" "}
              <span className="text-[#fd5000]">Affiliate Program</span>
            </h1>
            <p className="mt-3.5 max-w-md text-[15px] leading-relaxed text-[#6B7280]">
              Earn up to {heroRate}% commission by promoting products you love
              and trust.
            </p>

            <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {CHECKLIST.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-[13.5px] font-medium text-[#374151]"
                >
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#fd5000]">
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={primaryCtaHref}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#fd5000] px-6 text-[14px] font-bold text-white shadow-[0_8px_20px_rgba(253,80,0,0.28)] transition-colors hover:bg-[#e04700]"
              >
                Start Promoting Now
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </Link>
              <Link
                href="#campaigns"
                className="inline-flex h-11 items-center justify-center rounded-[10px] border border-[#E5E7EB] bg-white px-6 text-[14px] font-semibold text-[#111827] transition-colors hover:bg-[#F9FAFB]"
              >
                View Top Campaigns
              </Link>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <div className="flex -space-x-2.5">
                {SOCIAL_AVATARS.map((avatar) => (
                  <span
                    key={avatar.initials}
                    className={`relative grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br ${avatar.bg} text-[10px] font-bold text-white ring-2 ring-white`}
                  >
                    {avatar.initials}
                  </span>
                ))}
              </div>
              <p className="text-[12.5px] font-medium text-[#6B7280]">
                Join{" "}
                <span className="font-semibold text-[#111827]">25,000+</span>{" "}
                affiliates earning with Jimvio
              </p>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[460px] lg:mx-0 lg:max-w-none">
            <div className="relative aspect-[5/4] w-full sm:aspect-[6/5]">
              <Image
                src="/images/affiliate/hero-phone.png"
                alt="Affiliate earnings on Jimvio — up to top commission rates"
                fill
                priority
                className="object-contain object-center drop-shadow-[0_20px_40px_rgba(253,80,0,0.12)]"
                sizes="(max-width: 1024px) 90vw, 460px"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
