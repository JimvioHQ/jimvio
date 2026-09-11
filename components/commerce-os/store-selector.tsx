import Link from "next/link";
import type { MerchantStoreSummary } from "@/lib/commerce-os";

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
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
        Store
      </span>
      {stores.map((s) => {
        const href =
          basePath.includes("?")
            ? `${basePath}&storeId=${s.id}`
            : `${basePath}?storeId=${s.id}`;
        const active = s.id === activeId;
        return (
          <Link
            key={s.id}
            href={href}
            className={
              active
                ? "rounded-md bg-[#FF5A1F]/10 px-2.5 py-1 text-xs font-semibold text-[#FF5A1F]"
                : "rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1 text-xs font-medium text-[#4B5563]"
            }
          >
            {s.name}
          </Link>
        );
      })}
    </div>
  );
}
