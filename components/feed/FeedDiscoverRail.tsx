"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Flame, Package, Radio, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type TrendItem = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  image?: string | null;
  badge?: string;
};

type DiscoverPayload = {
  creators?: TrendItem[];
  products?: TrendItem[];
  campaigns?: TrendItem[];
  live?: TrendItem[];
};

export function FeedDiscoverRail() {
  const [data, setData] = useState<DiscoverPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/c/hub/discover", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled && json) setData(json);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return null;

  const sections: Array<{
    key: keyof DiscoverPayload;
    title: string;
    icon: typeof Flame;
  }> = [
    { key: "creators", title: "Trending creators", icon: Users },
    { key: "products", title: "Trending products", icon: Package },
    { key: "campaigns", title: "Campaign announcements", icon: Sparkles },
    { key: "live", title: "Live now", icon: Radio },
  ];

  const hasAny = sections.some((s) => (data[s.key] ?? []).length > 0);
  if (!hasAny) return null;

  return (
    <div className="space-y-3">
      {sections.map(({ key, title, icon: Icon }) => {
        const items = data[key] ?? [];
        if (!items.length) return null;
        return (
          <section
            key={key}
            className="overflow-hidden rounded-2xl border border-[#E8EAED] bg-white/90 shadow-[0_1px_2px_rgba(17,24,39,0.04)] backdrop-blur"
          >
            <div className="flex items-center gap-2 border-b border-[#F3F4F6] px-4 py-2.5">
              <Icon className="h-4 w-4 text-[#fd5000]" />
              <h2 className="text-[13px] font-bold text-[#111827]">{title}</h2>
            </div>
            <div className="flex gap-2 overflow-x-auto px-3 py-3 scrollbar-hide">
              {items.slice(0, 8).map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "group flex w-[148px] shrink-0 flex-col overflow-hidden rounded-xl border border-[#F3F4F6] bg-[#F9FAFB]",
                    "transition hover:-translate-y-0.5 hover:border-[#fd5000]/35 hover:shadow-md"
                  )}
                >
                  <div className="relative h-20 w-full bg-[#EEE]">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt=""
                        fill
                        className="object-cover transition duration-300 group-hover:scale-105"
                        sizes="148px"
                        unoptimized
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-[#fd5000]">
                        <Flame className="h-5 w-5" />
                      </div>
                    )}
                    {item.badge ? (
                      <span className="absolute left-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                        {item.badge}
                      </span>
                    ) : null}
                  </div>
                  <div className="p-2.5">
                    <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-[#111827]">
                      {item.title}
                    </p>
                    {item.subtitle ? (
                      <p className="mt-0.5 truncate text-[10px] text-[#6B7280]">
                        {item.subtitle}
                      </p>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
