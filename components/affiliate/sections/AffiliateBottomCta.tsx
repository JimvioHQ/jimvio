import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AFFILIATE_SHELL } from "./shared";

type AffiliateBottomCtaProps = {
  primaryCtaHref: string;
};

export function AffiliateBottomCta({ primaryCtaHref }: AffiliateBottomCtaProps) {
  return (
    <section className={`${AFFILIATE_SHELL} py-12 sm:py-14`}>
      <div
        className="relative overflow-hidden rounded-[18px] border border-[#FFE4D6] px-5 py-7 sm:px-8 sm:py-8 lg:px-10"
        style={{
          background:
            "linear-gradient(110deg, #FFF5F0 0%, #FFEDE4 45%, #FFF8F5 100%)",
        }}
      >
        <div className="relative z-[1] flex flex-col items-center gap-6 md:flex-row md:items-center md:justify-between md:gap-8">
          <div className="relative h-[110px] w-[110px] shrink-0 sm:h-[130px] sm:w-[130px]">
            <Image
              src="/images/affiliate/megaphone.png"
              alt=""
              fill
              className="object-contain drop-shadow-[0_12px_24px_rgba(253,80,0,0.2)]"
              sizes="130px"
            />
          </div>

          <div className="min-w-0 flex-1 text-center md:text-left">
            <h2 className="text-[22px] font-bold tracking-tight text-[#111827] sm:text-[26px]">
              Ready to start earning?
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-[#6B7280]">
              Join thousands of Affiliates who are earning daily with Jimvio.
            </p>
          </div>

          <Link
            href={primaryCtaHref}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-[#fd5000] px-7 text-[14px] font-bold text-white shadow-[0_10px_24px_rgba(253,80,0,0.3)] transition-colors hover:bg-[#e04700]"
          >
            Start Promoting Now
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </section>
  );
}
