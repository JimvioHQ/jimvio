"use client";

import { WorkspaceHome } from "./WorkspaceHome";

type OsMissionControlProps = {
  /** Optional display name — pass down from an already-loaded profile. No new data fetching happens here. */
  name?: string | null;
  className?: string;
};

/**
 * @deprecated Prefer importing `WorkspaceHome` directly. Kept as a thin, source-compatible
 * wrapper so existing call sites don't need to change their import path.
 */
export function OsMissionControl({ name, className }: OsMissionControlProps) {
  return <WorkspaceHome name={name} className={className} />;
}
