import type { Metadata } from "next";
import { cookies } from "next/headers";
import { MediaHeader } from "@/components/editorial/media-header";
import { normalizeUgcLocale, UGC_LOCALE_COOKIE } from "@/lib/ugc/i18n/messages";

export const metadata: Metadata = {
  title: { default: "Jimvio Media", template: "%s · Jimvio Media" },
  description: "Real stories and deeper insights from Jimvio Media.",
  openGraph: { siteName: "Jimvio Media", locale: "en_US", type: "website" },
};

export default async function MediaSiteLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const locale = normalizeUgcLocale(cookieStore.get(UGC_LOCALE_COOKIE)?.value);
  return (
    <div className="min-h-screen bg-white text-[#141820]">
      <a href="#media-main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:shadow">Skip to stories</a>
      <MediaHeader locale={locale} />
      <main id="media-main">{children}</main>
    </div>
  );
}
