"use client";
export const dynamic = "force-dynamic";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading]  = useState(true);
  const [error, setError]      = useState<string | null>(null);
  const [success, setSuccess]  = useState(false);
  const [categories, setCategories] = useState<Record<string, unknown>[]>([]);

  const [form, setForm] = useState({
    name: "", slug: "", short_description: "", description: "",
    price: "", compare_at_price: "", category_id: "",
    inventory_quantity: "", affiliate_enabled: true,
    affiliate_commission_rate: "10", status: "draft",
    is_featured: false, tags: "", is_digital: false,
  });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const [productRes, catsRes] = await Promise.all([
        supabase.from("products").select("*").eq("id", productId).single(),
        supabase.from("product_categories").select("id, name, slug").eq("is_active", true).order("sort_order"),
      ]);

      if (productRes.data) {
        const p = productRes.data;
        setForm({
          name:                    p.name ?? "",
          slug:                    p.slug ?? "",
          short_description:       p.short_description ?? "",
          description:             p.description ?? "",
          price:                   String(p.price ?? ""),
          compare_at_price:        String(p.compare_at_price ?? ""),
          category_id:             p.category_id ?? "",
          inventory_quantity:      String(p.inventory_quantity ?? 0),
          affiliate_enabled:       p.affiliate_enabled ?? true,
          affiliate_commission_rate: String(p.affiliate_commission_rate ?? 10),
          status:                  p.status ?? "draft",
          is_featured:             p.is_featured ?? false,
          tags:                    (p.tags as string[])?.join(", ") ?? "",
          is_digital:              p.is_digital ?? false,
        });
      }
      setCategories(catsRes.data ?? []);
      setLoading(false);
    }
    load();
  }, [productId, router]);

  function handleChange(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error: updateErr } = await supabase.from("products").update({
        name:                    form.name,
        short_description:       form.short_description || null,
        description:             form.description || null,
        price:                   parseFloat(form.price),
        compare_at_price:        form.compare_at_price ? parseFloat(form.compare_at_price) : null,
        category_id:             form.category_id || null,
        inventory_quantity:      parseInt(form.inventory_quantity ?? "0"),
        affiliate_enabled:       form.affiliate_enabled,
        affiliate_commission_rate: parseFloat(form.affiliate_commission_rate ?? "10"),
        status:                  form.status,
        is_featured:             form.is_featured,
        tags:                    form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : null,
      }).eq("id", productId);

      if (updateErr) { setError(updateErr.message); return; }
      setSuccess(true);
      setTimeout(() => router.push("/dashboard/products"), 1000);
    });
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>;
  if (success)  return <div className="flex flex-col items-center justify-center h-64 gap-3"><div className="text-5xl">✅</div><p className="font-bold text-base">Product updated!</p></div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/products"><button className="btn btn-ghost btn-icon"><ArrowLeft className="h-4 w-4" /></button></Link>
        <div>
          <h1 className="text-2xl font-bold text-base">Edit Product</h1>
          <p className="text-sm text-muted-c">{form.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardHeader className="pt-5 px-5 pb-4"><CardTitle>Basic Information</CardTitle></CardHeader>
          <CardContent className="px-5 pb-5 pt-0 space-y-4">
            <Input label="Product Name *" value={form.name} onChange={e => handleChange("name", e.target.value)} required />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-base block mb-1.5">Category</label>
                <select value={form.category_id} onChange={e => handleChange("category_id", e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-base bg-subtle text-sm text-base focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all">
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id as string} value={c.id as string}>{c.name as string}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-base block mb-1.5">Status</label>
                <select value={form.status} onChange={e => handleChange("status", e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-base bg-subtle text-sm text-base focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all">
                  <option value="draft">Draft</option>
                  <option value="active">Active (Published)</option>
                  <option value="paused">Paused</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
            <Textarea label="Short Description" value={form.short_description} onChange={e => handleChange("short_description", e.target.value)} className="min-h-[80px]" />
            <Textarea label="Full Description" value={form.description} onChange={e => handleChange("description", e.target.value)} className="min-h-[120px]" />
            <Input label="Tags (comma-separated)" value={form.tags} onChange={e => handleChange("tags", e.target.value)} placeholder="tag1, tag2, tag3" />
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={form.is_featured} onChange={e => handleChange("is_featured", e.target.checked)} className="accent-purple-600 w-4 h-4" />
              <span className="text-sm text-base">Mark as Featured Product</span>
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pt-5 px-5 pb-4"><CardTitle>Pricing & Inventory</CardTitle></CardHeader>
          <CardContent className="px-5 pb-5 pt-0 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Price *" type="number" min="0" step="0.01" value={form.price} onChange={e => handleChange("price", e.target.value)} required />
              <Input label="Compare-at Price" type="number" min="0" step="0.01" value={form.compare_at_price} onChange={e => handleChange("compare_at_price", e.target.value)} />
            </div>
            {!form.is_digital && (
              <Input label="Inventory Quantity" type="number" min="0" value={form.inventory_quantity} onChange={e => handleChange("inventory_quantity", e.target.value)} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pt-5 px-5 pb-4"><CardTitle>Affiliate Settings</CardTitle></CardHeader>
          <CardContent className="px-5 pb-5 pt-0 space-y-4">
            <div className="flex items-center justify-between p-3.5 bg-subtle rounded-xl border border-base">
              <div>
                <p className="text-sm font-medium text-base">Affiliate Marketing Enabled</p>
                <p className="text-xs text-muted-c mt-0.5">Allow affiliates to earn commissions</p>
              </div>
              <label className="cursor-pointer">
                <input type="checkbox" className="sr-only" checked={form.affiliate_enabled} onChange={e => handleChange("affiliate_enabled", e.target.checked)} />
                <div className={`w-11 h-6 rounded-full transition-colors ${form.affiliate_enabled ? "bg-primary-600" : "bg-muted"}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm m-1 transition-transform ${form.affiliate_enabled ? "translate-x-5" : "translate-x-0"}`} />
                </div>
              </label>
            </div>
            {form.affiliate_enabled && (
              <Input label="Commission Rate (%)" type="number" min="1" max="90" value={form.affiliate_commission_rate} onChange={e => handleChange("affiliate_commission_rate", e.target.value)} />
            )}
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>
        )}

        <div className="flex gap-3">
          <Button type="submit" loading={isPending}><Save className="h-4 w-4" /> Save Changes</Button>
          <Button type="button" variant="outline" asChild><Link href="/dashboard/products">Cancel</Link></Button>
        </div>
      </form>
    </div>
  );
}
