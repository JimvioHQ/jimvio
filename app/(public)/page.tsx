
import React, { Suspense } from "react";
import type { Metadata } from "next";
import { HomepageSpecSections } from "@/components/layout/homepage-spec-sections";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("home");

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
      <HomepageSpecSections />
    </Suspense>
  );
}
