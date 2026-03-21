"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Package, AlertTriangle, TrendingDown, RefreshCw, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { createClient } from "@/lib/supabase/client";

export default function InventoryPage() {
  const [products, setProducts] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading]   = useState(true);
  const [vendor, setVendor]     = useState<Record<string, unknown> | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editQty, setEditQty]   = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: vend } = await supabase.from("vendors").select("id").eq("user_id", user.id).single();
      setVendor(vend);

      if (vend) {
        const { data } = await supabase
          .from("products")
          .select("id, name, slug, status, product_type, is_digital, inventory_quantity, low_stock_threshold, sale_count, images")
          .eq("vendor_id", vend.id)
          .eq("is_active", true)
          .eq("is_digital", false)  // Only physical products need inventory
          .order("inventory_quantity", { ascending: true });
        setProducts(data ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function updateInventory(productId: string, quantity: string) {
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 0) return;
    setUpdating(productId);
    const supabase = createClient();
    await supabase.from("products").update({ inventory_quantity: qty }).eq("id", productId);
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, inventory_quantity: qty } : p));
    setEditQty(prev => { const n = { ...prev }; delete n[productId]; return n; });
    setUpdating(null);
  }

  const outOfStock = products.filter(p => (p.inventory_quantity as number) === 0).length;
  const lowStock   = products.filter(p => (p.inventory_quantity as number) > 0 && (p.inventory_quantity as number) <= ((p.low_stock_threshold as number) ?? 5)).length;
  const totalUnits = products.reduce((s, p) => s + (p.inventory_quantity as number ?? 0), 0);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent)]" /></div>;

  if (!vendor) return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Inventory</h1>
      <div className="bg-subtle border border-base rounded-xl p-8 text-center">
        <Button asChild><Link href="/dashboard/roles">Activate Vendor Role</Link></Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Inventory</h1>
        <p className="text-sm text-muted-c mt-0.5">Track and manage your physical product stock</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Total Units"   value={totalUnits.toLocaleString()} icon={<Package        className="h-4 w-4" />} iconColor="from-blue-600 to-cyan-600" />
        <StatCard title="Low Stock"     value={lowStock}                     icon={<TrendingDown   className="h-4 w-4" />} iconColor="from-amber-600 to-orange-600" />
        <StatCard title="Out of Stock"  value={outOfStock}                   icon={<AlertTriangle  className="h-4 w-4" />} iconColor="from-red-600 to-rose-600" />
      </div>

      {products.length === 0 ? (
        <div className="bg-subtle border border-base rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">📦</div>
          <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">No physical products</h3>
          <p className="text-sm text-muted-c mb-4">Physical products you add will show their inventory here.</p>
          <Button asChild><Link href="/dashboard/products/new">Add Physical Product</Link></Button>
        </div>
      ) : (
        <Card>
          <CardHeader className="pt-5 px-5 pb-4"><CardTitle>Stock Levels ({products.length} products)</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th className="pl-5">Product</th>
                    <th className="text-right">Sales</th>
                    <th className="text-center">Stock Status</th>
                    <th className="text-right">Quantity</th>
                    <th className="pr-5">Update</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const qty       = p.inventory_quantity as number ?? 0;
                    const threshold = (p.low_stock_threshold as number) ?? 5;
                    const isOut     = qty === 0;
                    const isLow     = qty > 0 && qty <= threshold;
                    const images    = (p.images as string[]) ?? [];
                    const isEditing = editQty[p.id as string] !== undefined;

                    return (
                      <tr key={p.id as string} className="group">
                        <td className="pl-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-subtle border border-base overflow-hidden flex items-center justify-center text-xl shrink-0">
                              {images[0] ? <img src={images[0]} alt="" className="w-full h-full object-cover" /> : "📦"}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-base">{p.name as string}</p>
                              <p className="text-xs text-muted-c">{p.product_type as string}</p>
                            </div>
                          </div>
                        </td>
                        <td className="text-right">
                          <span className="text-sm text-muted-c">{(p.sale_count as number ?? 0).toLocaleString()}</span>
                        </td>
                        <td className="text-center">
                          <Badge variant={isOut ? "destructive" : isLow ? "warning" : "success"}>
                            {isOut ? "Out of Stock" : isLow ? "Low Stock" : "In Stock"}
                          </Badge>
                        </td>
                        <td className="text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editQty[p.id as string]}
                              onChange={e => setEditQty(prev => ({ ...prev, [p.id as string]: e.target.value }))}
                              className="w-20 h-8 px-2 text-sm text-right rounded-lg border border-primary-500 bg-subtle focus:outline-none"
                              min="0"
                              autoFocus
                            />
                          ) : (
                            <span
                              className={`text-sm font-bold cursor-pointer hover:text-primary-700 dark:hover:text-primary-300 transition-colors ${isOut ? "text-red-500" : isLow ? "text-amber-600 dark:text-amber-400" : "text-base"}`}
                              onClick={() => setEditQty(prev => ({ ...prev, [p.id as string]: String(qty) }))}
                              title="Click to edit"
                            >
                              {qty}
                            </span>
                          )}
                        </td>
                        <td className="pr-5">
                          {isEditing ? (
                            <div className="flex gap-1.5">
                              <Button size="sm" loading={updating === p.id as string} onClick={() => updateInventory(p.id as string, editQty[p.id as string])}>
                                <RefreshCw className="h-3.5 w-3.5" /> Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditQty(prev => { const n = { ...prev }; delete n[p.id as string]; return n; })}>
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setEditQty(prev => ({ ...prev, [p.id as string]: String(qty) }))}>
                              Edit
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
