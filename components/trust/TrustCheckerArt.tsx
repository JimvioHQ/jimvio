import { BarChart3, Box, ImageIcon, Link2, Play, Zap } from "lucide-react";

/** Hero illustration: shield with check and floating tiles (pure SVG/CSS). */
export function TrustCheckerArt() {
  const tile = "absolute grid place-items-center rounded-2xl bg-white shadow-[0_12px_30px_rgba(255,90,31,0.18)]";
  return (
    <div className="relative h-[300px] w-full max-w-[520px] xl:h-[330px]" aria-hidden="true">
      <div className="absolute inset-[3%] rounded-full bg-[radial-gradient(circle_at_50%_45%,rgba(255,138,76,0.48),transparent_62%)] after:absolute after:inset-[8%] after:rounded-full after:border after:border-white/60 before:absolute before:inset-[18%] before:rounded-full before:border before:border-[#FFB38E]/60" />
      <svg viewBox="0 0 200 220" className="absolute left-1/2 top-1/2 h-[260px] w-[236px] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_26px_44px_rgba(234,88,12,0.38)] xl:h-[280px] xl:w-[254px]">
        <defs>
          <linearGradient id="tc-shield" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FF8A4C" />
            <stop offset="1" stopColor="#E8430F" />
          </linearGradient>
          <linearGradient id="tc-rim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFD3B8" />
            <stop offset="1" stopColor="#FF8A4C" />
          </linearGradient>
        </defs>
        <path d="M100 6 L186 38 V104 C186 158 148 196 100 214 C52 196 14 158 14 104 V38 Z" fill="url(#tc-rim)" />
        <path d="M100 20 L172 47 V104 C172 150 140 182 100 198 C60 182 28 150 28 104 V47 Z" fill="url(#tc-shield)" />
        <path d="M62 110 L90 138 L142 82" fill="none" stroke="#fff" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className={`${tile} left-[2%] top-[18%] h-16 w-16 -rotate-6`}>
        <Link2 className="h-8 w-8 text-[#FF5A1F]" />
      </div>
      <div className={`${tile} left-[10%] top-[58%] h-14 w-16 rotate-3`}>
        <Play className="h-7 w-7 fill-[#E8430F] text-[#E8430F]" />
      </div>
      <div className={`${tile} left-[26%] top-[4%] h-11 w-11 rotate-12 opacity-80`}>
        <Zap className="h-5 w-5 text-[#FF8A4C]" />
      </div>
      <div className={`${tile} right-[22%] top-[2%] h-14 w-14 rotate-6`}>
        <BarChart3 className="h-7 w-7 text-[#FF5A1F]" />
      </div>
      <div className={`${tile} right-[2%] top-[30%] h-16 w-16 -rotate-3`}>
        <ImageIcon className="h-8 w-8 text-[#2563EB]" />
      </div>
      <div className={`${tile} right-[16%] top-[64%] h-16 w-16 rotate-6`}>
        <Box className="h-8 w-8 text-[#FF5A1F]" />
      </div>
    </div>
  );
}
