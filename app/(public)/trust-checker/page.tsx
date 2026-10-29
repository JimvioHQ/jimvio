import type { Metadata } from "next";
import { TrustCheckerPage } from "@/components/trust/TrustCheckerPage";

export const metadata: Metadata = {
  title: "Jimvio Trust Checker — check links, social media, digital products and media",
  description:
    "Free checker for scam links, fake engagement, unsafe digital products and AI or reused media. Evidence-based results with clear limits.",
  alternates: { canonical: "/trust-checker" },
};

export default function Page() {
  return <TrustCheckerPage />;
}
