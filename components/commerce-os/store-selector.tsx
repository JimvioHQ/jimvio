import Link from "next/link";
import type { MerchantStoreSummary } from "@/lib/commerce-os";
import { cn } from "@/lib/utils";

export function StoreSelector({
  stores,
  activeId,
  basePath,
}: {
  stores: MerchantStoreSummary[];
  activeId: string | null;
  basePath: string;
}) {
  if (!stores.length) return null;

  const active = stores.find((s) => s.id === activeId) ?? stores[0];

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <span className="truncate text-xs font-semibold uppercase tracking-wide text-[#111827]">
          {active?.name ?? "Store"}
        </span>
        {active?.handle ? (
          <span className="hidden truncate text-[11px] text-[#9CA3AF] sm:inline">
            {active.handle}.jimvio.com
          </span>
        ) : null}
      </div>
      {stores.length > 1 ? (
        <div className="flex max-w-full flex-wrap gap-1.5">
          {stores.map((s) => {
            const href = basePath.includes("?")
              ? `${basePath}&storeId=${s.id}`
              : `${basePath}?storeId=${s.id}`;
            const isActive = s.id === activeId;
            return (
              <Link
                key={s.id}
                href={href}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold transition",
                  isActive
                    ? "bg-[#FF5A1F]/10 text-[#FF5A1F]"
                    : "border border-[#E5E7EB] bg-white text-[#6B7280] hover:text-[#111827]"
                )}
              >
                {s.name}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
