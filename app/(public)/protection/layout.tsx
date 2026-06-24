import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("protection");

export default function ProtectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
