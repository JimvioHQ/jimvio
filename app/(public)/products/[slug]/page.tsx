import React from "react";
import Link from "next/link";
import { ChevronRight, Package, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/services/db";
import { formatDisplayMoney } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ProductDetailActions } from "./product-detail-actions";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductBySlugPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const rawV = product.vendors as unknown;
  const vendor = (Array.isArray(rawV) ? rawV[0] : rawV) as {
    id: string;
    business_name: string;
    business_slug: string;
    rating?: number;
    follower_count?: number;
  } | null;
  const mainImage = product.images?.[0] || null;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] py-3">
        <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
          <Link href="/" className="hover:text-[var(--color-accent)] transition-colors">Home</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/products" className="hover:text-[var(--color-accent)] transition-colors">Products</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-[var(--color-text-primary)] font-medium line-clamp-1">{product.name}</span>
        </div>
      </div>

      <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="aspect-square bg-[var(--color-surface-secondary)] rounded-2xl border border-[var(--color-border)] flex items-center justify-center overflow-hidden">
              {mainImage ? (
                <img src={mainImage} alt={product.name} className="w-full h-full object-contain" />
              ) : (
                <Package className="h-20 w-20 text-[var(--color-text-muted)]" />
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{String(product.product_type)}</Badge>
            </div>
            <h1 className="text-4xl font-black text-[var(--color-text-primary)] leading-tight">{product.name}</h1>
            <p className="text-3xl font-black text-[var(--color-accent)]">{formatDisplayMoney(Number(product.price), product.currency)}</p>

            {vendor && (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-[var(--color-text-muted)]">Vendor</p>
                  <Link href={`/vendors/${vendor.business_slug}`} className="font-bold text-[var(--color-text-primary)] hover:text-[var(--color-accent)]">
                    {vendor.business_name}
                  </Link>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    ★ {vendor.rating ?? "—"} · {vendor.follower_count ?? 0} followers
                  </p>
                </div>
                <ShieldCheck className="h-5 w-5 text-[var(--color-success)]" />
              </div>
            )}

            <p className="text-[var(--color-text-secondary)] whitespace-pre-wrap">{product.description || product.short_description || ""}</p>

            <ProductDetailActions
              productId={product.id}
              vendorId={product.vendor_id}
            />

            <p className="text-xs text-[var(--color-text-muted)]">Standard shipping estimates apply at checkout.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
