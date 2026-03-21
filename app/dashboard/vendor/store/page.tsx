"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Store,
  Star,
  Users,
  Package,
  Pencil,
  Save,
  X,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function VendorStorePage() {
  const supabase = createClient();
  const [vendor, setVendor] = useState<{
    id: string;
    business_name: string;
    business_slug: string;
    business_description: string | null;
    business_logo: string | null;
    business_banner: string | null;
    rating: number;
    total_sales: number;
  } | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [followers, setFollowers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    business_name: "",
    business_description: "",
    business_logo: "",
    business_banner: "",
  });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: v } = await supabase.from("vendors").select("id, business_name, business_slug, business_description, business_logo, business_banner, rating, total_sales").eq("user_id", user.id).single();
      setVendor(v ?? null);
      if (v) {
        setForm({
          business_name: v.business_name ?? "",
          business_description: v.business_description ?? "",
          business_logo: v.business_logo ?? "",
          business_banner: v.business_banner ?? "",
        });
        const [prods, follow] = await Promise.all([
          supabase.from("products").select("id, name, slug, price, images, status").eq("vendor_id", v.id).eq("is_active", true).order("created_at", { ascending: false }).limit(8),
          supabase.from("vendor_followers").select("id", { count: "exact", head: true }).eq("vendor_id", v.id),
        ]);
        setProducts(prods.data ?? []);
        setFollowers(follow.count ?? 0);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    if (!vendor) return;
    setSaving(true);
    const { error } = await supabase
      .from("vendors")
      .update({
        business_name: form.business_name.trim(),
        business_description: form.business_description.trim() || null,
        business_logo: form.business_logo.trim() || null,
        business_banner: form.business_banner.trim() || null,
      })
      .eq("id", vendor.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Store updated");
    setVendor((prev) => prev ? { ...prev, ...form } : null);
    setEditing(false);
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><p className="text-sm text-[var(--color-text-muted)]">Loading...</p></div>;
  }
  if (!vendor) {
    return (
      <div className="text-center py-12">
        <Store className="h-14 w-14 text-[var(--color-border)] mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">No store yet</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Apply to become a vendor to create your store.</p>
        <Button asChild className="mt-4"><Link href="/dashboard/activate/vendor">Become a Vendor</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">My Store</h1>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-2">
            <Pencil className="h-4 w-4" /> Edit Store
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </div>

      {/* Banner */}
      <Card className="border-[var(--color-border)] overflow-hidden">
        <div className="relative h-40 sm:h-48 bg-[var(--color-surface-secondary)]">
          {editing ? (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="w-full">
                <Label className="text-xs text-[var(--color-text-muted)]">Banner URL</Label>
                <Input
                  value={form.business_banner}
                  onChange={(e) => setForm((f) => ({ ...f, business_banner: e.target.value }))}
                  placeholder="https://..."
                  className="mt-1 bg-white"
                />
              </div>
            </div>
          ) : (
            vendor.business_banner ? (
              <img src={vendor.business_banner} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Camera className="h-12 w-12 text-[var(--color-border)]" />
              </div>
            )
          )}
        </div>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative shrink-0">
              {editing ? (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-2 border-dashed border-[var(--color-border)] flex items-center justify-center bg-[var(--color-surface)]">
                  <div className="w-full p-2">
                    <Label className="text-xs">Logo URL</Label>
                    <Input
                      value={form.business_logo}
                      onChange={(e) => setForm((f) => ({ ...f, business_logo: e.target.value }))}
                      placeholder="https://..."
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
                  {vendor.business_logo ? (
                    <img src={vendor.business_logo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Store className="h-10 w-10 text-[var(--color-border)]" />
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="space-y-2">
                  <Label>Store name</Label>
                  <Input
                    value={form.business_name}
                    onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))}
                    className="font-semibold"
                  />
                  <Label>Description</Label>
                  <Textarea
                    value={form.business_description}
                    onChange={(e) => setForm((f) => ({ ...f, business_description: e.target.value }))}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{vendor.business_name}</h2>
                  <p className="text-sm text-[var(--color-text-muted)] mt-0.5">/vendors/{vendor.business_slug}</p>
                  {vendor.business_description && (
                    <p className="text-sm text-[var(--color-text-secondary)] mt-2">{vendor.business_description}</p>
                  )}
                  <div className="flex flex-wrap gap-4 mt-3">
                    <span className="flex items-center gap-1 text-sm text-[var(--color-text-muted)]">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {Number(vendor.rating).toFixed(1)}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-[var(--color-text-muted)]">
                      <Users className="h-4 w-4" /> {followers} followers
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products from store */}
      <Card className="border-[var(--color-border)]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Products</CardTitle>
          <Button asChild size="sm"><Link href="/dashboard/products/new">Add Product</Link></Button>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] py-6 text-center">No products yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {products.map((p) => (
                <Link key={p.id} href={`/marketplace/${p.slug}`} className="group">
                  <div className="aspect-square rounded-lg bg-[var(--color-surface-secondary)] overflow-hidden border border-[var(--color-border)]">
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package className="h-8 w-8 text-[var(--color-border)]" /></div>
                    )}
                  </div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)] mt-1 line-clamp-2">{p.name}</p>
                  <p className="text-xs text-[var(--color-accent)] font-semibold">{formatCurrency(Number(p.price))}</p>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
