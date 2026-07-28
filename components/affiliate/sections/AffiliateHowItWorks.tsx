import { Link2, Share2, ShoppingBag, Wallet } from "lucide-react";
import { AFFILIATE_SHELL, AffiliateSectionHeading } from "./shared";

const STEPS = [
  {
    n: 1,
    title: "Choose",
    desc: "Pick products or campaigns to promote.",
    icon: Link2,
  },
  {
    n: 2,
    title: "Share",
    desc: "Share your unique links with your audience.",
    icon: Share2,
  },
  {
    n: 3,
    title: "Earn",
    desc: "Get paid when someone makes a purchase.",
    icon: ShoppingBag,
  },
  {
    n: 4,
    title: "Get Paid",
    desc: "Receive payouts quickly and securely.",
    icon: Wallet,
  },
] as const;

export function AffiliateHowItWorks() {
  return (
    <section className={`${AFFILIATE_SHELL} pt-12 sm:pt-14`} id="tools">
      <AffiliateSectionHeading
        title="How It Works"
        subtitle="Start earning in 4 simple steps."
      />

      <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="relative">
              {index < STEPS.length - 1 ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute left-[calc(100%+2px)] top-[18px] z-0 hidden w-[calc(100%-8px)] items-center lg:flex"
                >
                  <div className="h-px w-full border-t border-dashed border-[#D1D5DB]" />
                  <span className="-ml-1 text-[#D1D5DB]">›</span>
                </div>
              ) : null}

              <div className="relative z-[1] flex gap-3.5 lg:flex-col lg:gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#fd5000] shadow-[0_6px_16px_rgba(253,80,0,0.28)]">
                  <Icon className="h-[18px] w-[18px] text-white" strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[#111827]">
                    <span className="text-[#fd5000]">{step.n}.</span> {step.title}
                  </h3>
                  <p className="mt-1.5 max-w-[210px] text-[13px] leading-relaxed text-[#6B7280]">
                    {step.desc}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
