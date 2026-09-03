"use client";

import { useLocale } from "@/context/LocaleContext";
import { useUgcBrandWorkspace } from "./UgcBrandWorkspaceProvider";

export function UgcWorkspaceSwitcher() {
  const { t } = useLocale();
  const { workspaces, brandId, loading, error, setBrandId } = useUgcBrandWorkspace();

  if (loading || error || workspaces.length < 2) return null;

  const current = workspaces.find((w) => w.id === brandId) ?? workspaces[0];

  return (
    <div className="border-t border-[#E5E7EB] px-3 py-3">
      <label className="block">
        <span className="sr-only">{t("switchWorkspace")}</span>
        <select
          value={current.id}
          onChange={(e) => setBrandId(e.target.value)}
          aria-label={t("switchWorkspace")}
          className="h-9 w-full appearance-none rounded-lg border border-[#E5E7EB] bg-white px-2.5 text-[12px] font-medium text-[#374151] outline-none focus:border-[#FF5A1F]/40"
        >
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
