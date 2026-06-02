import { Play, Heart, ThumbsUp, Flame, DollarSign, Eye } from "lucide-react";

function CountBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="rounded-md bg-white/10 px-2.5 py-1.5 text-xl font-black tabular-nums text-white">
        {value}
      </div>
      <div className="mt-1 text-[10px] font-medium tracking-wide text-white/60">{label}</div>
    </div>
  );
}

export function HeroBanner() {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-[image:var(--gradient-hero)] p-6 sm:p-9">
      {/* sparkle backdrop */}
      <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_70%_40%,oklch(0.5_0.2_320/.5),transparent_55%)]" />

      <div className="relative flex flex-col items-center gap-6 lg:flex-row">
        {/* Left copy */}
        <div className="flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[image:var(--gradient-cta)] px-3 py-1 text-xs font-bold text-primary-foreground">
            <Flame className="size-3.5" /> FLASH SALE
          </span>
          <h1 className="mt-4 text-4xl font-black leading-[1.05] text-white sm:text-5xl">
            TikTok Viral
            <br />
            <span className="bg-gradient-to-r from-[oklch(0.7_0.2_330)] to-[oklch(0.65_0.22_300)] bg-clip-text text-transparent">
              Smart Projector
            </span>
          </h1>
          <p className="mt-3 font-semibold text-white/90">Full HD | 4K Support | Android 11 | WiFi 6</p>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex -space-x-2">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-7 rounded-full border-2 border-[oklch(0.2_0.05_290)] bg-[image:var(--gradient-cta)]"
                />
              ))}
            </div>
            <span className="flex items-center gap-1.5 text-sm text-white/80">
              <span className="size-2 rounded-full bg-success" /> 52 creators promoting this
            </span>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <span className="text-4xl font-black text-accent">$89.99</span>
            <span className="text-lg text-white/50 line-through">$189.99</span>
            <span className="rounded-full bg-primary px-2.5 py-1 text-sm font-bold text-primary-foreground">-53%</span>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button className="rounded-xl bg-[image:var(--gradient-cta)] px-6 py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-card)]">
              Shop Now →
            </button>
            <button className="flex items-center gap-2 rounded-xl border border-white/25 px-6 py-3 text-sm font-bold text-white">
              <Eye className="size-4" /> Quick View
            </button>
          </div>
        </div>

        {/* Product */}
        <div className="relative flex w-full max-w-sm flex-1 items-center justify-center sm:max-w-md lg:max-w-lg">
          <div className="absolute left-1/2 top-1/2 size-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[oklch(0.5_0.25_320/.45)] blur-3xl sm:size-64" />
          <div className="relative aspect-square w-full max-w-[260px] sm:max-w-[320px] lg:max-w-[380px]">
            <img
              src="/marketplace/projector.png"
              alt="TikTok Viral Smart Projector"
              width={768}
              height={768}
              loading="eager"
              decoding="async"
              className="h-full w-full object-contain object-center drop-shadow-2xl"
            />
          </div>
          {/* floating reactions */}
          <span className="absolute left-2 top-6 grid size-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg">
            <Heart className="size-5 fill-current" />
          </span>
          <span className="absolute right-6 top-2 grid size-10 place-items-center rounded-xl bg-[oklch(0.55_0.2_260)] text-white shadow-lg">
            <ThumbsUp className="size-5 fill-current" />
          </span>
          <span className="absolute bottom-10 left-4 grid size-10 place-items-center rounded-full bg-accent text-accent-foreground shadow-lg">
            <DollarSign className="size-5" />
          </span>
          <span className="absolute bottom-2 right-8 grid size-9 place-items-center rounded-lg bg-[oklch(0.55_0.2_260)] text-white shadow-lg">
            <Play className="size-4 fill-current" />
          </span>
        </div>

        {/* Right: discount + timer */}
        <div className="flex flex-col items-center gap-4 lg:items-end">
          <div className="grid size-28 place-items-center rounded-full bg-[image:var(--gradient-flash)] text-center text-primary-foreground shadow-[var(--shadow-card)]">
            <div>
              <div className="text-xs font-semibold">Up to</div>
              <div className="text-2xl font-black leading-none">70%</div>
              <div className="text-xs font-semibold">OFF</div>
            </div>
          </div>
          <div className="rounded-xl bg-black/40 p-3">
            <div className="mb-2 text-center text-xs font-medium text-white/70">Deal ends in</div>
            <div className="flex gap-2">
              <CountBox value="09" label="HRS" />
              <CountBox value="30" label="MINS" />
              <CountBox value="25" label="SECS" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}