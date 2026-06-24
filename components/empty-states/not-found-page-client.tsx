"use client";

import { NotFoundState } from "@/components/empty-states";
import { NOT_FOUND_QUICK_LINKS } from "@/components/empty-states/presets";

export function NotFoundPageClient() {
  return (
    <NotFoundState
      variant="page"
      quickLinks={NOT_FOUND_QUICK_LINKS}
    />
  );
}
