"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Globe, Menu, Search, X } from "lucide-react";
import { MEDIA_CATEGORIES } from "@/lib/editorial/types";
import { UGC_LOCALE_COOKIE, type UgcLocale } from "@/lib/ugc/i18n/messages";
import { cn } from "@/lib/utils";

const LOCALES: { code: UgcLocale; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "rw", label: "RW" },
];

function isActive(pathname: string, href: string) {
  if (href === "/media") return pathname === "/media";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function persistLocale(code: UgcLocale) {
  const next = `${UGC_LOCALE_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
  window.document.cookie = next;
}

export function MediaHeader({ locale }: { locale: UgcLocale }) {
  const pathname = usePathname() || "/media";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [lang, setLang] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const current = LOCALES.find((item) => item.code === locale) ?? LOCALES[0];

  function chooseLocale(code: UgcLocale) {
    persistLocale(code);
    setLang(false);
    router.refresh();
  }

  const links = [
    { href: "/media", label: "Home" },
    ...MEDIA_CATEGORIES.map((category) => ({
      href: `/media/category/${category.slug}`,
      label: category.label,
    })),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[#eceff3] bg-white/95 backdrop-blur-md">
      <div className="relative isolate bg-[#0f1115]">
        {/* Living Jimvio gradient: slow drifting light, still for reduced motion. */}
        <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <span className="jv-media-orb jv-media-orb-a" />
          <span className="jv-media-orb jv-media-orb-b" />
          <span className="jv-media-orb jv-media-orb-c" />
          <span className="jv-media-sheen" />
        </span>
      <div className="relative mx-auto flex h-[72px] max-w-[1180px] items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white lg:hidden"
          aria-expanded={open}
          aria-controls="media-sections"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          <span className="sr-only">Sections</span>
        </button>
        <Link href="/media" className="flex min-w-0 items-center gap-2.5">
          <Image src="/jimvio-logo-mark.png" alt="" width={36} height={36} className="h-9 w-9 rounded-[10px] shadow-[0_0_24px_rgba(253,80,0,0.55)]" priority />
          <span className="min-w-0 leading-tight">
            <span className="block text-[16px] font-extrabold tracking-[-0.03em] text-white">
              Jimvio <span className="bg-gradient-to-r from-[#ff7a2f] to-[#ffc46b] bg-clip-text text-transparent">Media</span>
            </span>
            <span className="hidden text-[11px] font-medium text-white/60 sm:block">Real Stories. Deeper Insights.</span>
          </span>
        </Link>
        <form action="/media/search" className="mx-auto hidden w-full max-w-[520px] md:block">
          <label className="relative block">
            <span className="sr-only">Search Jimvio Media</span>
            <input
              name="q"
              placeholder="Search for news, articles, guides, reviews..."
              className="h-10 w-full rounded-full border border-white/15 bg-white/10 pl-4 pr-11 text-sm text-white outline-none backdrop-blur placeholder:text-white/55 focus:border-[#fd5000] focus:bg-white focus:text-[#172033] focus:placeholder:text-[#98a2b3]"
            />
            <button type="submit" aria-label="Search" className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-white/70">
              <Search className="h-4 w-4" />
            </button>
          </label>
        </form>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white md:hidden"
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((value) => !value)}
          >
            <Search className="h-5 w-5" />
            <span className="sr-only">Search</span>
          </button>
          <div className="relative">
            <button
              type="button"
              className="inline-flex h-10 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-white"
              aria-expanded={lang}
              aria-haspopup="listbox"
              onClick={() => {
                setLang((value) => !value);
                setMore(false);
              }}
            >
              <Globe className="h-4 w-4" />
              {current.label}
              <ChevronDown className="h-3.5 w-3.5 text-white/60" />
            </button>
            {lang ? (
              <ul role="listbox" className="absolute right-0 z-20 mt-1 w-28 overflow-hidden rounded-xl border border-[#eceff3] bg-white py-1 shadow-lg">
                {LOCALES.map((item) => (
                  <li key={item.code}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={item.code === locale}
                      className="block w-full px-3 py-2 text-left text-sm font-medium hover:bg-[#f7f8fa]"
                      onClick={() => chooseLocale(item.code)}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
      </div>
      {searchOpen ? (
        <form action="/media/search" className="border-t border-[#f2f4f7] px-4 py-3 md:hidden">
          <label className="relative block">
            <span className="sr-only">Search Jimvio Media</span>
            <input
              name="q"
              autoFocus
              placeholder="Search for news, articles, guides, reviews..."
              className="h-10 w-full rounded-full bg-[#f4f5f7] pl-4 pr-11 text-sm outline-none focus:bg-white"
            />
            <button type="submit" aria-label="Search" className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center">
              <Search className="h-4 w-4" />
            </button>
          </label>
        </form>
      ) : null}
      <nav aria-label="Sections" className="mx-auto hidden h-11 max-w-[1180px] items-center gap-x-4 overflow-x-auto px-6 lg:flex">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive(pathname, link.href) ? "page" : undefined}
            className={cn(
              "relative inline-flex h-11 items-center text-[14px] font-medium text-[#243044] hover:text-[#fd5000]",
              isActive(pathname, link.href) && "text-[#fd5000] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-[#fd5000]",
            )}
          >
            {link.label}
          </Link>
        ))}
        <div className="relative">
          <button
            type="button"
            className="inline-flex h-11 items-center gap-1 text-[14px] font-medium text-[#243044]"
            aria-expanded={more}
            onClick={() => setMore((value) => !value)}
          >
            More <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {more ? (
            <div className="absolute left-0 z-20 mt-1 w-52 rounded-xl border border-[#eceff3] bg-white py-1 shadow-lg">
              {MEDIA_CATEGORIES.map((category) => (
                <Link
                  key={category.slug}
                  href={`/media/category/${category.slug}`}
                  className="block px-3 py-2 text-sm font-medium text-[#243044] hover:bg-[#f7f8fa]"
                  onClick={() => setMore(false)}
                >
                  {category.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </nav>
      <nav aria-label="Sections" className="flex gap-4 overflow-x-auto px-4 pb-2 lg:hidden">
        {links.slice(0, 6).map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "shrink-0 border-b-2 border-transparent pb-2 text-[13px] font-medium text-[#243044]",
              isActive(pathname, link.href) && "border-[#fd5000] text-[#fd5000]",
            )}
          >
            {link.label}
          </Link>
        ))}
        <button
          type="button"
          className="shrink-0 pb-2 text-[13px] font-medium text-[#243044]"
          onClick={() => setOpen(true)}
        >
          More
        </button>
      </nav>
      {open ? (
        <div id="media-sections" className="border-t border-[#f2f4f7] bg-white px-4 py-3 lg:hidden">
          <div className="grid grid-cols-2 gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-[#172033] hover:bg-[#f7f8fa]"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
