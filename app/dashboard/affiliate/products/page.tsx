"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Package, ArrowLeft, ShoppingCart, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { TableRowSkeleton } from "@/components/ui/skeleton";

type ProductInfo = { id?: string; name?: string; slug?: string; price?: number; images?: string[] };

export default function AffiliatePromotedProductsPage() {
  const router = useRouter();
  const [affiliate, setAffiliate] = useState<{ id: string } | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: aff } = await supabase.from("affiliates").select("id").eq("user_id", user.id).maybeSingle();
      setAffiliate(aff ?? null);
      if (aff) {
        const { data } = await supabase
          .from("affiliate_links")
          .select(`
            id, commission_rate, total_clicks, total_conversions, total_earnings,
            products ( id, name, slug, price, images )
          `)
          .eq("affiliate_id", aff.id)
          .order("total_clicks", { ascending: false });
        setRows(data ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (!loading && !affiliate) {
    router.replace("/dashboard/activate/affiliate");
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-sm text-[var(--color-text-muted)]">Redirecting…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="shrink-0 rounded-xl">
            <Link href="/dashboard/links"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">Promoted Products</h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Products you’ve generated affiliate links for and their performance.</p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href="/dashboard/links">Create new link</Link>
        </Button>
      </div>

      <Card className="border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
        <CardHeader className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 py-4 px-5">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-[var(--color-accent)]" />
            Products & performance
          </CardTitle>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Clicks, conversions, and commission earned per product.</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50">
                  <th className="text-left font-medium text-[var(--color-text-muted)] py-3.5 pl-5 pr-3">Product</th>
                  <th className="text-center font-medium text-[var(--color-text-muted)] py-3.5 px-3 w-24">Commission</th>
                  <th className="text-right font-medium text-[var(--color-text-muted)] py-3.5 px-3 w-20">Clicks</th>
                  <th className="text-right font-medium text-[var(--color-text-muted)] py-3.5 px-3 w-24">Conversions</th>
                  <th className="text-right font-medium text-[var(--color-text-muted)] py-3.5 pl-3 pr-5 w-28">Earned</th>
                  <th className="w-12 pr-5" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(4).fill(0).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-14 px-5">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] mb-3">
                        <Package className="h-6 w-6" />
                      </div>
                      <p className="font-medium text-[var(--color-text-primary)]">No promoted products yet</p>
                      <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                        <Link href="/dashboard/links" className="text-[var(--color-accent)] hover:underline">Create affiliate links</Link> to see them here.
                      </p>
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const product = r.products as ProductInfo | null;
                    const price = Number(product?.price ?? 0);
                    const rate = Number(r.commission_rate ?? 0);
                    const perSale = price * (rate / 100);
                    const hasProduct = product?.name != null;
                    const imgSrc = product && Array.isArray(product.images) && product.images[0] ? product.images[0] : null;
                    return (
                      <tr key={r.id as string} className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface-secondary)]/50 transition-colors">
                        <td className="py-3.5 pl-5 pr-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 shrink-0 rounded-lg overflow-hidden bg-[var(--color-surface-secondary)]">
                              {imgSrc ? (
                                <img src={imgSrc} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[var(--color-text-muted)]">
                                  <ShoppingCart className="h-5 w-5" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              {hasProduct ? (
                                <>
                                  <Link
                                    href={`/marketplace/${product?.slug ?? ""}`}
                                    className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent)] truncate block"
                                  >
                                    {product?.name}
                                  </Link>
                                  {rate > 0 && (
                                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                                      {rate}% — {formatCurrency(perSale)} per sale
                                    </p>
                                  )}
                                </>
                              ) : (
                                <span className="text-[var(--color-text-muted)] italic">Custom link</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <Badge variant="secondary" className="text-[10px] py-0.5 font-medium">{rate}%</Badge>
                        </td>
                        <td className="py-3.5 px-3 text-right font-medium tabular-nums">{(r.total_clicks as number) ?? 0}</td>
                        <td className="py-3.5 px-3 text-right font-medium tabular-nums">{(r.total_conversions as number) ?? 0}</td>
                        <td className="py-3.5 px-3 text-right font-semibold text-[var(--color-accent)]">{formatCurrency(Number(r.total_earnings ?? 0))}</td>
                        <td className="py-3.5 pr-5">
                          {hasProduct && product?.slug ? (
                            <a
                              href={`/marketplace/${product.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex p-2 rounded-lg hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] transition-colors"
                              title="View product"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
