"use client";

"use client";

import { LostMapIllustration } from "./illustrations";
import { NOT_FOUND_DEFAULT_ACTIONS, NOT_FOUND_QUICK_LINKS } from "./presets";
import {
  EmptyStateBody,
  type EmptyAction,
  type EmptyQuickLink,
  type EmptyVariant,
} from "./shared";

export interface NotFoundStateProps {
  variant?: EmptyVariant;
  eyebrow?: string;
  title?: string;
  description?: string;
  query?: string;
  actions?: EmptyAction[];
  quickLinks?: EmptyQuickLink[];
  hideIllustration?: boolean;
  illustration?: React.ReactNode;
}

export function NotFoundState({
  variant = "page",
  eyebrow = "Error 404",
  title = "We can't find that page",
  description = "The link may be broken, or the page may have moved.",
  query,
  actions,
  quickLinks,
  hideIllustration = false,
  illustration,
}: NotFoundStateProps) {
  const resolvedActions =
    actions ??
    (variant === "page"
      ? NOT_FOUND_DEFAULT_ACTIONS
      : []);

  return (
    <EmptyStateBody
      variant={variant}
      eyebrow={eyebrow}
      title={title}
      description={description}
      query={query}
      actions={resolvedActions}
      quickLinks={quickLinks ?? (variant === "page" ? NOT_FOUND_QUICK_LINKS : undefined)}
      hideIllustration={hideIllustration}
      illustration={illustration ?? <LostMapIllustration />}
    />
  );
}
