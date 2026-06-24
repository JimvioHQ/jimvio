"use client";

import { EmptyState } from "@/components/empty-states/empty-state";
import { offlinePagePreset } from "@/components/empty-states/presets";

export function OfflinePageClient() {
  const preset = offlinePagePreset();

  return (
    <EmptyState
      variant="page"
      eyebrow={preset.eyebrow}
      title={preset.title}
      description={preset.description}
      illustration={preset.illustration}
      actions={preset.actions}
    />
  );
}
