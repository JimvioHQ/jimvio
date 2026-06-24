import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { FaqJsonLd, HELP_FAQ_ITEMS } from "@/components/seo/FaqJsonLd";

export const metadata: Metadata = pageMetadata("help");

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <FaqJsonLd items={HELP_FAQ_ITEMS} />
      {children}
    </>
  );
}
