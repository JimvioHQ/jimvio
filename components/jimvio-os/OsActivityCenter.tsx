"use client";

import type { ReactNode } from "react";
import { OsPill, OsSectionTitle } from "./os-ui";

export type OsActivityFilter = {
  id: string;
  label: string;
  count?: number;
};

type OsActivityCenterProps = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  filters?: OsActivityFilter[];
  activeFilter?: string;
  onFilterChange?: (id: string) => void;
  children: ReactNode;
  className?: string;
};

/**
 * Presentation-only wrapper for activity/notification surfaces — adds a calm header and
 * optional filter chips around existing content. Does not fetch or mutate data itself.
 */
export function OsActivityCenter({
  title = "Activity Center",
  subtitle,
  actions,
  filters,
  activeFilter,
  onFilterChange,
  children,
  className,
}: OsActivityCenterProps) {
  return (
    <section className={className}>
      <OsSectionTitle title={title} subtitle={subtitle} actions={actions} />

      {filters && filters.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
          {filters.map((filter) => (
            <OsPill
              key={filter.id}
              active={activeFilter === filter.id}
              onClick={onFilterChange ? () => onFilterChange(filter.id) : undefined}
            >
              {filter.label}
              {typeof filter.count === "number" && filter.count > 0 && (
                <span className="opacity-70">· {filter.count}</span>
              )}
            </OsPill>
          ))}
        </div>
      )}

      <div className="mt-4">{children}</div>
    </section>
  );
}
