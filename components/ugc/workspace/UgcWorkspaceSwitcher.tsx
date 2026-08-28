"use client";

import { useLocale } from "@/context/LocaleContext";
import { useUgcBrandWorkspace } from "./UgcBrandWorkspaceProvider";
import { cn } from "@/lib/utils";
import type { UgcMessageKey } from "@/lib/ugc/i18n/messages";

const ROLE_KEY: Record<string, UgcMessageKey> = {
  owner: "roleOwner",
  manager: "roleManager",
  reviewer: "roleReviewer",
  finance: "roleFinance",
  viewer: "roleViewer",
};

export function UgcWorkspaceSwitcher({ compact = false }: { compact?: boolean }) {
  const { t } = useLocale();
  const { workspaces, brandId, loading, error, setBrandId } = useUgcBrandWorkspace();

  if (loading) {
    return (
      <p className="px-2.5 py-2 text-[11px] text-[#9CA3AF]" aria-live="polite">
        {t("workspaceLoading")}
      </p>
    );
  }
  if (error) {
    return (
      <p className="px-2.5 py-2 text-[11px] text-rose-600" role="alert">
        {t("workspaceError")}
      </p>
    );
  }
  if (workspaces.length === 0) {
    return (
      <p className="px-2.5 py-2 text-[11px] text-[#9CA3AF]">{t("noWorkspaces")}</p>
    );
  }

  const current = workspaces.find((w) => w.id === brandId) ?? workspaces[0];

  return (
    <div className={cn("px-2.5", compact ? "py-1" : "py-2")}>
      <label className="block">
        <span className="sr-only">{t("switchWorkspace")}</span>
        <select
          value={current.id}
          onChange={(e) => setBrandId(e.target.value)}
          aria-label={t("switchWorkspace")}
          className={cn(
            "h-10 w-full min-h-11 appearance-none rounded-[10px] border border-[#E5E7EB] bg-white px-2.5 pr-7 text-[12px] font-semibold text-[#111827]",
            "outline-none focus:border-[#FF5A1F]/40 focus:shadow-[0_0_0_3px_rgba(255,90,31,0.08)]",
          )}
        >
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} · {t(ROLE_KEY[w.role] ?? "roleViewer")}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
