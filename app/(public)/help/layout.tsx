import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("help");

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
