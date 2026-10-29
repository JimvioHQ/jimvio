import { BadgeCheck, LineChart, ShieldCheck } from "lucide-react";

const ITEMS = [
  {
    icon: ShieldCheck,
    title: "Every campaign here is paid for",
    body: "A campaign only appears on this page once the brand has paid its full budget to Jimvio. The money waits safely with Jimvio and goes to creators for approved work.",
  },
  {
    icon: BadgeCheck,
    title: "Real views only",
    body: "Jimvio reads your views straight from YouTube and TikTok on the account you connect. Numbers typed by hand and screenshots are not used.",
  },
  {
    icon: LineChart,
    title: "Paid from the moment you submit",
    body: "You earn on the views your post gets after you submit it here. Bought views, reused videos and fake likes are not paid.",
  },
] as const;

export function UGCTrustStrip() {
  return (
    <section
      aria-label="How Jimvio protects creators and brands"
      className="mt-6 grid min-w-0 gap-2 rounded-[14px] border border-[#E8EAED] bg-white p-3 sm:grid-cols-3 sm:gap-3 sm:p-4"
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
