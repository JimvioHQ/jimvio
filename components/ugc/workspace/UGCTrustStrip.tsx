import { BadgeCheck, LineChart, ShieldCheck } from "lucide-react";

const ITEMS = [
  {
    icon: ShieldCheck,
    title: "Money held first",
    body: "“Funded” means the full budget is already held in escrow by Jimvio. Payouts never exceed the money held.",
  },
  {
    icon: BadgeCheck,
    title: "Real views only",
    body: "Views are read from YouTube and TikTok’s official APIs on the creator’s own connected account. Typed numbers and screenshots don’t count.",
  },
  {
    icon: LineChart,
    title: "Counted from submission",
    body: "Only views gained after the post is submitted are paid. Sudden spikes, recycled videos and fake engagement are held for review.",
  },
] as const;

export function UGCTrustStrip() {
  return (
    <section
      aria-label="How Jimvio verifies campaigns"
      className="mb-5 grid min-w-0 gap-2 rounded-[14px] border border-[#E8EAED] bg-white p-3 sm:grid-cols-3 sm:gap-3 sm:p-4"
    >
      {ITEMS.map(({ icon: Icon, title, body }) => (
        <div key={title} className="flex min-w-0 gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#FFF1EA] text-[#FF5A1F]">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#111827]">{title}</p>
            <p className="mt-0.5 text-[12px] leading-snug text-[#6B7280]">{body}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
