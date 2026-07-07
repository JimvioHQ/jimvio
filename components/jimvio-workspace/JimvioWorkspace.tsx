"use client";

import type { JimvioWorkspaceData } from "@/lib/jimvio-workspace/types";
import { WorkspaceWidgetGrid } from "./WorkspaceWidgetGrid";
import { WorkspaceEditToolbar } from "./WorkspaceEditToolbar";

type JimvioWorkspaceProps = {
  data: JimvioWorkspaceData;
  loading?: boolean;
};

export function JimvioWorkspace({ data, loading = false }: JimvioWorkspaceProps) {
  return (
    <section
      aria-label="Jimvio Workspace"
      className="mb-5 space-y-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 sm:p-5"
      style={{
        boxShadow: "var(--shadow-sm)",
        animation: loading ? undefined : "jimvio-workspace-enter 280ms ease-out",
      }}
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">
            Jimvio Workspace
          </p>
          <h2 className="mt-1 text-xl font-black tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-2xl">
            {loading ? "Loading workspace…" : `${data.greeting}, ${data.displayName}`}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            One unified home for earnings, communities, campaigns, messages, and AI — across all Jimvio modules.
          </p>
        </div>
        <WorkspaceEditToolbar />
      </header>

      <WorkspaceWidgetGrid data={data} loading={loading} />
    </section>
  );
}
