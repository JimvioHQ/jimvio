import React from "react";
import { getAdminProducts } from "@/services/db";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { products, total } = await getAdminProducts(q, 100);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Products</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">View and moderate product listings</p>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <form method="get" action="/admin/products" className="flex gap-2 max-w-sm">
            <Input name="q" defaultValue={q ?? ""} placeholder="Search by name or slug..." className="rounded-xl" />
            <Button type="submit" variant="secondary" size="icon" className="rounded-xl">
              <Search className="h-4 w-4" />
            </Button>
          </form>
          <p className="text-xs text-[var(--color-text-muted)] mt-2">{total} product(s)</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50">
                  <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Product</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Vendor</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Price</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--color-text-secondary)]">Featured</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-[var(--color-text-muted)]">No products found</td></tr>
                ) : (
                  products.map((p: any) => (
                    <tr key={p.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-secondary)]/30">
                      <td className="py-3 px-4">
                        <p className="font-medium truncate max-w-[200px]">{p.name}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{p.slug}</p>
                      </td>
                      <td className="py-3 px-4">{p.vendor_name || "—"}</td>
                      <td className="py-3 px-4">{formatCurrency(Number(p.price ?? 0))}</td>
                      <td className="py-3 px-4">
                        <Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status || "draft"}</Badge>
                      </td>
                      <td className="py-3 px-4">{p.is_featured ? <Badge className="bg-amber-600">Featured</Badge> : "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
