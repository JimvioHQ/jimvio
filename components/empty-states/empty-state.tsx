"use client";

import React from "react";
import { EmptyStateBody, type EmptyAction, type EmptyQuickLink, type EmptyVariant } from "./shared";
import {
  type EmptyStatePreset,
  type PresetContext,
  resolveEmptyStatePreset,
} from "./presets";

export interface EmptyStateProps {
  variant?: EmptyVariant;
  preset?: EmptyStatePreset;
  presetContext?: PresetContext;
  eyebrow?: string;
  title?: string;
  description?: string;
  query?: string;
  actions?: EmptyAction[];
  quickLinks?: EmptyQuickLink[];
  hideIllustration?: boolean;
  illustration?: React.ReactNode;
}

export function EmptyState({
  variant = "section",
  preset,
  presetContext,
  eyebrow,
  title,
  description,
  query,
  actions,
  quickLinks,
  hideIllustration = false,
  illustration,
}: EmptyStateProps) {
  const resolved = preset ? resolveEmptyStatePreset(preset, presetContext) : null;

  return (
    <EmptyStateBody
      variant={variant}
      eyebrow={eyebrow ?? resolved?.eyebrow}
      title={title ?? resolved?.title ?? "Nothing here"}
      description={description ?? resolved?.description}
      query={query ?? resolved?.query}
      actions={actions ?? resolved?.actions}
      quickLinks={quickLinks}
      hideIllustration={hideIllustration}
      illustration={illustration ?? resolved?.illustration}
    />
  );
}
