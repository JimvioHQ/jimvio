import Link from "next/link";
import {
  CLOSING_LINE,
  MASTER_DEFINITION_PARAGRAPHS,
  PUBLIC_ECOSYSTEM,
} from "@/lib/brand/positioning";

const shell = "mx-auto w-full max-w-8xl px-4 sm:px-6";

/** Server-rendered definition so search engines can read the ecosystem without interaction. */
export function WhatJimvioIs() {
  return (
    <section
      className="jimvio-what-jimvio jimvio-home-section relative overflow-x-clip"
      aria-labelledby="what-jimvio-is-title"
    >
      <div className={shell}>
        <h2
          id="what-jimvio-is-title"
          className="text-center text-[clamp(1.35rem,2.8vw,1.85rem)] font-black tracking-[-0.03em] text-[#111827]"
        >
          What Jimvio is
        </h2>
        <div className="mx-auto mt-4 max-w-3xl space-y-3 text-center text-[14px] leading-relaxed text-[#4B5563] sm:text-[15px]">
          {MASTER_DEFINITION_PARAGRAPHS.map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
          <p className="font-semibold text-[#111827]">{CLOSING_LINE}</p>
          <p className="text-[13px] text-[#6B7280]">
            Available features, payment methods, and country coverage vary.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
          {PUBLIC_ECOSYSTEM.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="rounded-[14px] border border-[rgba(17,24,39,0.07)] bg-white px-4 py-3 text-left shadow-[0_4px_14px_rgba(17,24,39,0.035)] transition-[border-color,box-shadow] duration-200 hover:border-[rgba(255,90,31,0.22)] hover:shadow-[0_10px_22px_rgba(17,24,39,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] focus-visible:ring-offset-2"
            >
              <h3 className="text-[14px] font-bold tracking-[-0.015em] text-[#111827]">
                {item.title}
              </h3>
              <p className="mt-1 text-[12.5px] leading-snug text-[#6B7280]">{item.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
