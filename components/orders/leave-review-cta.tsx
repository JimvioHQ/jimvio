"use client";

import Link from "next/link";
import { Star } from "lucide-react";

export function LeaveReviewCta({
  productSlug,
  productName,
  orderItemId,
}: {
  productSlug: string;
  productName: string;
  orderItemId?: string;
}) {
  const href = `/marketplace/${productSlug}?review=1${
    orderItemId ? `&order_item=${orderItemId}` : ""
  }`;

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-xl border border-[#fd5000]/30 bg-[#fd5000]/10 px-3 py-2 text-[12px] font-bold text-[#fd5000] transition-colors hover:bg-[#fd5000]/15"
    >
      <Star className="h-3.5 w-3.5" />
      Review {productName}
    </Link>
  );
}
