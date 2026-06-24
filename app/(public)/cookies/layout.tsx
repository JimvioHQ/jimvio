import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("cookies");

export default function CookiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
