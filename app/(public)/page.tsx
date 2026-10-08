import React, { Suspense } from "react";
import type { Metadata } from "next";
import { HomepageRedesign } from "@/components/layout/homepage-redesign";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("home");

// Never SSG against Supabase — a saturated DB must not fail production builds.
export const dynamic = "force-dynamic";

function HomepageFallback() {
  return (
    <div
      aria-hidden
      className="min-h-[60vh] w-full"
      style={{ background: "var(--color-bg)" }}
    />
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomepageFallback />}>
      <HomepageRedesign />
    </Suspense>
  );
}
