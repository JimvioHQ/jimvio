import type { Metadata } from "next";
import { AboutCenter } from "@/components/about/AboutCenter";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("about");

export default function About() {
  return <AboutCenter />;
}
