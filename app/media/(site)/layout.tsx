import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { MediaHeader } from "@/components/editorial/media-header";
import { normalizeUgcLocale, UGC_LOCALE_COOKIE } from "@/lib/ugc/i18n/messages";

export const metadata: Metadata = {
  title: {
    default: "Jimvio Media",
    template: "%s · Jimvio Media",
  },
  description: "Real stories and deeper insights from Jimvio Media.",
  openGraph: {
    siteName: "Jimvio Media",
    locale: "en_US",
    type: "website",
  },
};

export default async function MediaSiteLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const locale = normalizeUgcLocale(cookieStore.get(UGC_LOCALE_COOKIE)?.value);
  return (
    <div className="min-h-screen bg-white text-[#141820]">
      <a
        href="#media-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:shadow"
      >
        Skip to stories
      </a>
      <MediaHeader locale={locale} />
      <main id="media-main">{children}</main>
      <footer className="media-footer">
        <Link href="/media" className="media-footer-brand">
          <Image src="/jimvio-logo-mark.png" alt="" width={34} height={34} />
          <span>Jimvio Media</span>
        </Link>
        <p>Trusted news and analysis from Africa and around the world.</p>
        <nav aria-label="Media footer">
          <Link href="/about">About</Link>
          <Link href="/media/category/news">Editorial Standards</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/privacy">Privacy &amp; Terms</Link>
        </nav>
      </footer>
      <nav className="media-mobile-dock" aria-label="Media quick navigation">
        <Link href="/media" aria-current="page"><span aria-hidden="true">⌂</span>Home</Link>
        <Link href="/media/latest"><span aria-hidden="true">▤</span>News</Link>
        <Link href="/media/category/news"><span aria-hidden="true">▦</span>Categories</Link>
        <Link href="/about"><span aria-hidden="true">♙</span>About</Link>
      </nav>
    </div>
  );
}
