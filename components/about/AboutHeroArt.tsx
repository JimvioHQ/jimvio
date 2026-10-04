import Image from "next/image";
import { cn } from "@/lib/utils";

export function AboutHeroArt({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative aspect-[5/4] w-full overflow-hidden rounded-[22px] border border-[rgba(255,90,31,0.16)] bg-[linear-gradient(145deg,#FFE8D8_0%,#FF5A1F_55%,#C2410C_100%)] shadow-[0_18px_40px_rgba(255,90,31,0.18)]",
        className,
      )}
    >
      <Image
        src="/images/jimvio-mobile-app-everywhere.jpg"
        alt="Creators and entrepreneurs building with Jimvio"
        fill
        sizes="(max-width: 1024px) 90vw, 420px"
        className="object-cover object-[50%_28%] opacity-95"
        priority
      />
      <div
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,24,39,0.08)_0%,rgba(255,90,31,0.28)_55%,rgba(17,24,39,0.45)_100%)]"
        aria-hidden="true"
      />

      <div className="absolute left-4 top-4 flex flex-wrap gap-2">
        {["Create", "Connect", "Earn Anywhere"].map((label) => (
          <span
            key={label}
            className="rounded-full border border-white/40 bg-white/90 px-3 py-1 text-[11px] font-bold text-[#111827] shadow-sm backdrop-blur"
          >
            {label}
          </span>
        ))}
      </div>

      <div className="absolute bottom-4 left-4 right-4 rounded-[14px] border border-white/50 bg-white/90 px-3.5 py-3 shadow-sm backdrop-blur">
        <p className="text-xs font-bold text-[#111827]">Built for creators worldwide</p>
        <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
          Marketplace · Communities · Commerce · Affiliates · UGC
        </p>
      </div>
    </div>
  );
}
