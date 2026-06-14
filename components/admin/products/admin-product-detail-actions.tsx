"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ExternalLink,
  Loader2,
  Rocket,
  RotateCcw,
  SquarePen,
} from "lucide-react";
import { publishAdminProduct } from "@/lib/actions/admin-products";
import { MoveProductDialog } from "@/components/admin/MoveProductDialog";

type Props = {
  productId: string;
  status: string;
  source?: string | null;
  cjPid?: string | null;
  slug: string;
  vendorName?: string | null;
  hasImages: boolean;
};

export function AdminProductDetailActions({
  productId,
  status,
  source,
  cjPid,
  slug,
  vendorName,
  hasImages,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [resyncing, setResyncing] = useState(false);

  const isDraft = status === "draft";
  const isCj = source === "cj" && Boolean(cjPid);

  function handlePublish() {
    if (!hasImages) {
      toast.error("Add images before publishing");
      return;
    }
    if (!confirm("Publish this product to the storefront?")) return;

    startTransition(async () => {
      const result = await publishAdminProduct(productId);
      if (result.success) {
        toast.success("Product published");
        router.refresh();
      } else {
        toast.error("error" in result ? result.error : "Publish failed");
      }
    });
  }

  async function handleResync() {
    if (!cjPid) return;
    setResyncing(true);
    try {
      const res = await fetch("/api/cj/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pid: cjPid }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Re-sync failed");
      toast.success("Product re-synced from CJ");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Re-sync failed");
    } finally {
      setResyncing(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isDraft && (
        <button
          type="button"
          onClick={handlePublish}
          disabled={pending || !hasImages}
          className="inline-flex items-center gap-2 h-9 px-3.5 rounded-md bg-emerald-600 text-white text-[13px] font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
          Publish
        </button>
      )}

      {isCj && (
        <button
          type="button"
          onClick={handleResync}
          disabled={resyncing}
          className="inline-flex items-center gap-2 h-9 px-3.5 rounded-md bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] text-[13px] font-medium hover:bg-[var(--color-surface-secondary)] transition-colors"
        >
          {resyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
          Re-sync CJ
        </button>
      )}

      <Link
        href={`/admin/products/${productId}/edit`}
        className="inline-flex items-center gap-2 h-9 px-3.5 rounded-md bg-[var(--color-accent)] text-white text-[13px] font-semibold hover:bg-orange-500 transition-colors"
      >
        <SquarePen className="h-3.5 w-3.5" />
        Edit
      </Link>

      <Link
        href={`/marketplace/${slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 h-9 px-3.5 rounded-md bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] text-[13px] font-medium hover:bg-[var(--color-surface-secondary)] transition-colors"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Storefront
      </Link>

      <MoveProductDialog productId={productId} currentVendorName={vendorName ?? undefined} />
    </div>
  );
}
