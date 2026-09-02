"use client";

import { BadgeCheck, FileText, Flame, Package, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  productHasCustomerDescription,
  productHasTrendingSignal,
  productHasVerifiedSupplier,
  productHasVideoSignal,
  productIsInStock,
} from "@/lib/marketplace/product-signals";

type BadgeProduct = {
  description?: string | null;
  inventory_quantity?: number | null;
  in_stock?: boolean | null;
  view_count?: number | null;
  sale_count?: number | null;
  sold_count?: number | null;
  source_metadata?: unknown;
  vendors?: { verification_status?: string | null } | null;
  product_videos?: unknown;
};

const CHIP =
  "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-bold leading-none";

export function ProductSignalBadges({
  product,
  className,
}: {
  product: BadgeProduct;
  className?: string;
}) {
  const badges: Array<{ key: string; label: string; icon: typeof Video; className: string }> = [];

  if (productHasVideoSignal(product)) {
    badges.push({
      key: "video",
      label: "Video",
      icon: Video,
      className: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
    });
  }
  if (productHasVerifiedSupplier(product)) {
    badges.push({
      key: "verified",
      label: "Verified",
      icon: BadgeCheck,
      className: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
    });
  }
  if (productHasTrendingSignal(product)) {
    badges.push({
      key: "trending",
      label: "Trending",
      icon: Flame,
      className: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
    });
  }
  if (productIsInStock(product)) {
    badges.push({
      key: "stock",
      label: "In Stock",
      icon: Package,
      className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
    });
  }
  if (productHasCustomerDescription(product)) {
    badges.push({
      key: "desc",
      label: "Details",
      icon: FileText,
      className: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    });
  }

  if (badges.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {badges.map(({ key, label, icon: Icon, className: chipClass }) => (
        <span key={key} className={cn(CHIP, chipClass)}>
          <Icon className="size-2.5 shrink-0" aria-hidden />
          {label}
        </span>
      ))}
    </div>
  );
}
