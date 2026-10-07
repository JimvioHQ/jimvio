import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("press");

export default function PressLayout({ children }: { children: React.ReactNode }) {
  return children;
}
