"use client";

import Link from "next/link";
import {
  CREATE_MENU_TONE_CLASS,
  getCreateMenuItems,
  type CreateMenuContext,
} from "@/lib/navigation/create-menu";
import { cn } from "@/lib/utils";

type CreateMenuPanelProps = {
  onItemClick?: () => void;
  className?: string;
  context?: CreateMenuContext;
};

/**
 * Shared Create menu panel — used by header Create and community Create.
 * Instant shell; no data fetching.
 */
export function CreateMenuPanel({
  onItemClick,
  className,
  context = "global",
}: CreateMenuPanelProps) {
  const items = getCreateMenuItems(context);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.12),0_4px_12px_rgba(15,23,42,0.06)]",
        className,
      )}
    >
      <div className="border-b border-stone-100 px-3.5 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
          Create
        </p>
      </div>
      <div className="max-h-[min(70vh,420px)] overflow-y-auto py-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              role="menuitem"
              onClick={onItemClick}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-stone-50"
            >
              <span
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                  CREATE_MENU_TONE_CLASS[item.tone],
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-stone-900">
                  {item.label}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-stone-500">
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
