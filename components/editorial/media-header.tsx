"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Globe, Search } from "lucide-react";
import { MEDIA_CATEGORIES, type MediaCategory } from "@/lib/editorial/types";
import { UGC_LOCALE_COOKIE, type UgcLocale } from "@/lib/ugc/i18n/messages";
import { cn } from "@/lib/utils";

const LOCALES: { code: UgcLocale; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "rw", label: "RW" },
];

const PRIMARY_CATEGORIES: MediaCategory[] = ["news", "business", "technology", "magazine", "guides"];
const primaryLinks = [
  { href: "/media", label: "Home" },
  ...MEDIA_CATEGORIES.filter((category) => PRIMARY_CATEGORIES.includes(category.slug)).map((category) => ({
    href: `/media/category/${category.slug}`,
    label: category.label,
  })),
];
const exploreLinks = MEDIA_CATEGORIES.filter((category) => !PRIMARY_CATEGORIES.includes(category.slug)).map((category) => ({
  href: `/media/category/${category.slug}`,
  label: category.label,
}));

function isActive(pathname: string, href: string) {
  if (href === "/media") return pathname === "/media";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function persistLocale(code: UgcLocale) {
  window.document.cookie = `${UGC_LOCALE_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
}

export function MediaHeader({ locale }: { locale: UgcLocale }) {
  const pathname = usePathname() || "/media";
  const router = useRouter();
  const [more, setMore] = useState(false);
  const [lang, setLang] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const current = LOCALES.find((item) => item.code === locale) ?? LOCALES[0];

  function chooseLocale(code: UgcLocale) {
    persistLocale(code);
    setLang(false);
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[#e7eaf0] bg-white/95 shadow-[0_2px_12px_rgba(16,24,40,0.035)] backdrop-blur-xl">
      <div className="mx-auto flex h-[58px] max-w-[1440px] items-center gap-4 px-4 sm:px-6 lg:h-[56px] lg:px-10">
        <Link href="/media" aria-label="Jimvio Media home" className="flex shrink-0 items-center gap-2.5">
          <Image src="/jimvio-logo-mark.png" alt="" width={38} height={38} className="h-[34px] w-[34px] rounded-full" priority />
          <span className="text-[19px] font-extrabold tracking-[-0.045em] text-[#101828]">Jimvio <span className="text-[#fd5000]">Media</span></span>
        </Link>
        <div className="mx-2 hidden h-6 w-px bg-[#e7eaf0] lg:block" />
        <form action="/media/search" className="mx-auto hidden w-full max-w-[400px] md:block lg:hidden">
          <label className="relative block"><span className="sr-only">Search Jimvio Media</span><input name="q" placeholder="Search stories, topics or countries..." className="h-10 w-full rounded-full border-0 bg-[#f0f3fb] pl-4 pr-11 text-sm text-[#172033] outline-none placeholder:text-[#667085] focus:ring-2 focus:ring-[#fd5000]/30"/><button type="submit" aria-label="Search" className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-[#172033]"><Search className="h-4 w-4"/></button></label>
        </form>
        <div className="ml-auto flex shrink-0 items-center gap-1 lg:ml-0">
          <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#172033] hover:bg-[#f5f6f8] md:hidden" aria-expanded={searchOpen} onClick={() => setSearchOpen((value) => !value)}><Search className="h-[19px] w-[19px]"/><span className="sr-only">Search</span></button>
          <div className="relative">
            <button type="button" className="inline-flex h-10 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-bold text-[#172033] hover:bg-[#f5f6f8]" aria-expanded={lang} aria-haspopup="listbox" onClick={() => {setLang((value)=>!value);setMore(false);}}><Globe className="h-4 w-4"/>{current.label}<ChevronDown className="h-3.5 w-3.5"/></button>
            {lang ? <ul role="listbox" aria-label="Language" className="absolute right-0 z-30 mt-2 w-28 overflow-hidden rounded-xl border border-[#e9edf2] bg-white py-1 shadow-xl">{LOCALES.map((item)=><li key={item.code}><button type="button" role="option" aria-selected={item.code===locale} className="block w-full px-3 py-2.5 text-left text-sm font-semibold text-[#344054] hover:bg-[#f7f8fa]" onClick={()=>chooseLocale(item.code)}>{item.label}</button></li>)}</ul>:null}
          </div>
          <button type="button" aria-label="Open sections menu" aria-expanded={more} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#172033] hover:bg-[#f5f6f8] lg:hidden" onClick={()=>setMore((value)=>!value)}><span className="flex flex-col gap-[4px]"><span className="h-[2px] w-5 rounded bg-current"/><span className="h-[2px] w-5 rounded bg-current"/><span className="h-[2px] w-5 rounded bg-current"/></span></button>
        </div>
        <form action="/media/search" className="ml-auto hidden w-full max-w-[310px] lg:block"><label className="relative block"><span className="sr-only">Search Jimvio Media</span><input name="q" placeholder="Search stories, topics, or countries..." className="h-9 w-full rounded-full border-0 bg-[#f0f3fb] pl-10 pr-3 text-[12px] text-[#172033] outline-none placeholder:text-[#667085] focus:ring-2 focus:ring-[#fd5000]/30"/><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#172033]"/></label></form>
      </div>
      {searchOpen ? <form action="/media/search" className="border-t border-[#e9edf2] bg-white px-4 py-3 md:hidden"><label className="relative block"><span className="sr-only">Search Jimvio Media</span><input name="q" autoFocus placeholder="Search stories, topics or countries..." className="h-11 w-full rounded-xl border border-[#e4e7ec] bg-[#f8f9fb] pl-4 pr-11 text-sm text-[#172033] outline-none focus:border-[#fd5000] focus:bg-white"/><button type="submit" aria-label="Search" className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-[#667085]"><Search className="h-4 w-4"/></button></label></form>:null}

      <nav aria-label="Media sections" className="mx-auto hidden h-[48px] max-w-[1280px] items-center gap-x-7 px-6 lg:flex lg:px-8">
        {primaryLinks.map((link) => (
          <Link key={link.href} href={link.href} aria-current={isActive(pathname, link.href) ? "page" : undefined} className={cn(
            "relative inline-flex h-[48px] items-center text-[13px] font-semibold text-[#475467] transition-colors hover:text-[#c94308]",
            isActive(pathname, link.href) && "text-[#c94308] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:rounded-full after:bg-[#fd5000]",
          )}>{link.label}</Link>
        ))}
        <div className="relative ml-auto">
          <button type="button" className={cn("inline-flex h-[48px] items-center gap-1.5 text-[13px] font-semibold transition-colors hover:text-[#c94308]", more ? "text-[#c94308]" : "text-[#475467]")} aria-expanded={more} onClick={() => { setMore((value) => !value); setLang(false); }}>
            Explore <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", more && "rotate-180")} />
          </button>
          {more ? (
            <div className="absolute right-0 top-full z-30 mt-1 w-56 rounded-xl border border-[#e9edf2] bg-white p-1.5 shadow-[0_16px_40px_rgba(16,24,40,0.14)]">
              {exploreLinks.map((link) => (
                <Link key={link.href} href={link.href} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-[#344054] transition hover:bg-[#f7f8fa] hover:text-[#c94308]" onClick={() => setMore(false)}>{link.label}</Link>
              ))}
            </div>
          ) : null}
        </div>
      </nav>

      <nav aria-label="Media sections" className="flex items-center gap-5 overflow-x-auto px-4 py-3 lg:hidden">
        {primaryLinks.map((link) => (
          <Link key={link.href} href={link.href} aria-current={isActive(pathname, link.href) ? "page" : undefined} className={cn(
            "shrink-0 whitespace-nowrap text-[13px] font-semibold text-[#667085] transition-colors",
            isActive(pathname, link.href) && "text-[#c94308]",
          )}>{link.label}</Link>
        ))}
        <button type="button" aria-expanded={more} className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[13px] font-semibold text-[#475467]" onClick={() => setMore((value) => !value)}>
          Explore <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", more && "rotate-180")} />
        </button>
      </nav>
      {more ? (
        <div className="border-t border-[#edf0f4] bg-[#fafbfc] px-4 py-3 lg:hidden">
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
            {exploreLinks.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-lg px-3 py-2.5 text-sm font-medium text-[#344054] transition hover:bg-white hover:text-[#c94308]" onClick={() => setMore(false)}>{link.label}</Link>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
