"use client";
export const dynamic = "force-dynamic";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Package, ArrowLeft, Save, Zap, DollarSign, Image as ImageIcon, Info, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

function slugify(text: string) {
  return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}

const inputClass = "h-11 rounded-xl border-[var(--color-border)] focus:ring-2 focus:ring-[var(--color-accent)]/20";
const selectClass =
  "h-11 w-full px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20";

export default function NewProductPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [vendor, setVendor] = useState<Record<string, unknown> | null>(null);
  const [categories, setCategories] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    short_description: "",
    description: "",
    product_type: "physical",
    price: "",
    compare_at_price: "",
    currency: "RWF",
    category_id: "",
    is_digital: false,
    digital_file_url: "",
    track_inventory: true,
    inventory_quantity: "0",
    affiliate_enabled: true,
    affiliate_commission_rate: "10",
    influencer_enabled: true,
    is_featured: false,
    status: "draft",
    tags: "",
  });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: vend } = await supabase.from("vendors").select("*").eq("user_id", user.id).single();
      if (!vend) {
        router.push("/dashboard/activate/vendor");
        return;
      }
      setVendor(vend);
      const { data: cats } = await supabase
        .from("product_categories")
        .select("id, name, slug")
        .eq("is_active", true)
        .order("sort_order");
      setCategories(cats ?? []);
    }
    load();
  }, [router]);

  function handleChange(field: string, value: string | boolean) {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "name") updated.slug = slugify(value as string);
      if (field === "product_type")
        updated.is_digital = ["digital", "course", "software", "template", "ebook"].includes(value as string);
      return updated;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!vendor || !form.name || !form.price) {
      setError("Product name and price are required.");
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      let slug = form.slug || slugify(form.name);
      const { data: existing } = await supabase.from("products").select("id").eq("slug", slug).single();
      if (existing) slug = `${slug}-${Date.now()}`;
      const payload: Record<string, unknown> = {
        vendor_id: vendor.id,
        name: form.name,
        slug,
        short_description: form.short_description || null,
        description: form.description || null,
        product_type: form.product_type,
        status: form.status,
        price: parseFloat(form.price),
        compare_at_price: form.compare_at_price ? parseFloat(form.compare_at_price) : null,
        currency: form.currency,
        category_id: form.category_id || null,
        is_digital: form.is_digital,
        digital_file_url: form.is_digital && form.digital_file_url ? form.digital_file_url : null,
        track_inventory: !form.is_digital && form.track_inventory,
        inventory_quantity: form.is_digital ? 0 : parseInt(form.inventory_quantity ?? "0"),
        affiliate_enabled: form.affiliate_enabled,
        affiliate_commission_rate: parseFloat(form.affiliate_commission_rate ?? "10"),
        influencer_enabled: form.influencer_enabled,
        is_featured: form.is_featured,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : null,
        images: [],
      };
      const { error: insertErr } = await supabase.from("products").insert(payload);
      if (insertErr) {
        setError(insertErr.message);
      } else {
        setSuccess(true);
        setTimeout(() => router.push("/dashboard/products"), 1500);
      }
    });
  }

  if (success) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-gradient-to-b from-[var(--color-surface-secondary)] to-[var(--color-bg)]">
        <div className="w-14 h-14 rounded-2xl bg-[var(--color-success-light)] flex items-center justify-center text-2xl text-[var(--color-success)]">
          ✓
        </div>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mt-4">Product created</h2>
        <p className="text-sm text-[var(--color-text-muted)]">Redirecting to your products…</p>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] bg-gradient-to-b from-[var(--color-surface-secondary)] to-[var(--color-bg)]">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {/* Header — same as vendor form */}
        <div className="flex items-start gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild className="shrink-0 mt-0.5 rounded-full hover:bg-white/80">
            <Link href="/dashboard/products">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] tracking-tight flex items-center gap-2">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--color-accent)] text-white shadow-lg shadow-[var(--color-accent)]/25">
                <Package className="h-5 w-5" />
              </span>
              Add New Product
            </h1>
            <p className="text-[var(--color-text-secondary)] mt-1.5 text-base">
              Fill in the details to list your product. Required fields are marked with *.
            </p>
          </div>
        </div>

        <Card className="border-[var(--color-border)] shadow-[var(--shadow-md)] rounded-2xl overflow-hidden bg-white/90 backdrop-blur-sm">
          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information */}
              <div className="space-y-6">
                <div className="pb-2">
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                    <Package className="h-5 w-5 text-[var(--color-accent)]" />
                    Basic information
                  </h2>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">Name, type, category and description</p>
                </div>
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-[var(--color-text-secondary)] font-medium">Product name *</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      placeholder="e.g. iPhone 15 Pro Max 256GB"
                      className={inputClass}
                      required
                    />
                    <p className="text-xs text-[var(--color-text-muted)]">Shown to buyers in listings and on the product page</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="product_type" className="text-[var(--color-text-secondary)] font-medium">Product type</Label>
                      <select
                        id="product_type"
                        value={form.product_type}
                        onChange={(e) => handleChange("product_type", e.target.value)}
                        className={selectClass}
                      >
                        <option value="physical">Physical Product</option>
                        <option value="digital">Digital Product</option>
                        <option value="course">Online Course</option>
                        <option value="software">Software / App</option>
                        <option value="template">Template</option>
                        <option value="ebook">Ebook</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category_id" className="text-[var(--color-text-secondary)] font-medium">Category</Label>
                      <select
                        id="category_id"
                        value={form.category_id}
                        onChange={(e) => handleChange("category_id", e.target.value)}
                        className={selectClass}
                      >
                        <option value="">Select category</option>
                        {categories.map((cat) => (
                          <option key={cat.id as string} value={cat.id as string}>
                            {cat.name as string}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="short_description" className="text-[var(--color-text-secondary)] font-medium">Short description</Label>
                    <Textarea
                      id="short_description"
                      placeholder="Brief product summary (shown in listings)"
                      value={form.short_description}
                      onChange={(e) => handleChange("short_description", e.target.value)}
                      rows={3}
                      className="min-h-[80px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:ring-2 focus:ring-[var(--color-accent)]/20 resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-[var(--color-text-secondary)] font-medium">Full description</Label>
                    <Textarea
                      id="description"
                      placeholder="Detailed product description..."
                      value={form.description}
                      onChange={(e) => handleChange("description", e.target.value)}
                      rows={5}
                      className="min-h-[120px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:ring-2 focus:ring-[var(--color-accent)]/20 resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tags" className="text-[var(--color-text-secondary)] font-medium">Tags <span className="text-[var(--color-text-muted)] font-normal">(comma-separated)</span></Label>
                    <Input
                      id="tags"
                      value={form.tags}
                      onChange={(e) => handleChange("tags", e.target.value)}
                      placeholder="e.g. electronics, smartphone, apple"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-6">
                <div className="pb-2">
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-[var(--color-accent)]" />
                    Pricing
                  </h2>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">Set price and currency</p>
                </div>
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="price" className="text-[var(--color-text-secondary)] font-medium">Price *</Label>
                      <Input
                        id="price"
                        type="number"
                        placeholder="0"
                        min={0}
                        step="0.01"
                        value={form.price}
                        onChange={(e) => handleChange("price", e.target.value)}
                        className={inputClass}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="compare_at_price" className="text-[var(--color-text-secondary)] font-medium">Compare-at price <span className="text-[var(--color-text-muted)] font-normal">(optional)</span></Label>
                      <Input
                        id="compare_at_price"
                        type="number"
                        placeholder="0"
                        min={0}
                        step="0.01"
                        value={form.compare_at_price}
                        onChange={(e) => handleChange("compare_at_price", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency" className="text-[var(--color-text-secondary)] font-medium">Currency</Label>
                    <select
                      id="currency"
                      value={form.currency}
                      onChange={(e) => handleChange("currency", e.target.value)}
                      className={selectClass}
                    >
                      <option value="RWF">RWF — Rwandan Franc</option>
                      <option value="USD">USD — US Dollar</option>
                      <option value="EUR">EUR — Euro</option>
                      <option value="KES">KES — Kenyan Shilling</option>
                      <option value="UGX">UGX — Ugandan Shilling</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Inventory — physical only */}
              {!form.is_digital && (
                <div className="space-y-6">
                  <div className="pb-2">
                    <h2 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                      <Box className="h-5 w-5 text-[var(--color-accent)]" />
                      Inventory
                    </h2>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">Stock and tracking</p>
                  </div>
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="inventory_quantity" className="text-[var(--color-text-secondary)] font-medium">Quantity in stock</Label>
                      <Input
                        id="inventory_quantity"
                        type="number"
                        placeholder="0"
                        min={0}
                        value={form.inventory_quantity}
                        onChange={(e) => handleChange("inventory_quantity", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)] transition-colors">
                      <input
                        type="checkbox"
                        checked={form.track_inventory}
                        onChange={(e) => handleChange("track_inventory", e.target.checked)}
                        className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                      />
                      <span className="text-sm text-[var(--color-text-primary)]">Track inventory (show stock warnings)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Digital file — digital only */}
              {form.is_digital && (
                <div className="space-y-6">
                  <div className="pb-2">
                    <h2 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-[var(--color-accent)]" />
                      Digital file
                    </h2>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">Link to the file customers download after purchase</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="digital_file_url" className="text-[var(--color-text-secondary)] font-medium">Download URL</Label>
                    <Input
                      id="digital_file_url"
                      type="url"
                      placeholder="https://your-file-host.com/your-file.zip"
                      value={form.digital_file_url}
                      onChange={(e) => handleChange("digital_file_url", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              {/* Affiliate & Marketing */}
              <div className="space-y-6">
                <div className="pb-2">
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                    <Zap className="h-5 w-5 text-[var(--color-accent)]" />
                    Affiliate &amp; marketing
                  </h2>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">Let affiliates and influencers promote this product</p>
                </div>
                <div className="space-y-5">
                  <div className="rounded-xl border border-[var(--color-accent)]/30 bg-[var(--color-accent-light)] p-4 flex items-start gap-3">
                    <Info className="h-5 w-5 text-[var(--color-accent)] shrink-0 mt-0.5" />
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Enable affiliate marketing to let affiliates promote your product and earn a commission per sale.
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">Enable affiliate marketing</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Affiliates can earn commissions promoting this product</p>
                    </div>
                    <label className="cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={form.affiliate_enabled}
                        onChange={(e) => handleChange("affiliate_enabled", e.target.checked)}
                      />
                      <div className={`w-11 h-6 rounded-full transition-colors ${form.affiliate_enabled ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"}`}>
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm m-1 transition-transform ${form.affiliate_enabled ? "translate-x-5" : "translate-x-0"}`} />
                      </div>
                    </label>
                  </div>
                  {form.affiliate_enabled && (
                    <div className="space-y-2">
                      <Label htmlFor="affiliate_commission_rate" className="text-[var(--color-text-secondary)] font-medium">Commission rate (%)</Label>
                      <Input
                        id="affiliate_commission_rate"
                        type="number"
                        placeholder="10"
                        min={1}
                        max={90}
                        value={form.affiliate_commission_rate}
                        onChange={(e) => handleChange("affiliate_commission_rate", e.target.value)}
                        className={inputClass}
                      />
                      <p className="text-xs text-[var(--color-text-muted)]">Percentage of sale price affiliates will earn</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">Enable influencer campaigns</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Allow influencers to promote this product</p>
                    </div>
                    <label className="cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={form.influencer_enabled}
                        onChange={(e) => handleChange("influencer_enabled", e.target.checked)}
                      />
                      <div className={`w-11 h-6 rounded-full transition-colors ${form.influencer_enabled ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"}`}>
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm m-1 transition-transform ${form.influencer_enabled ? "translate-x-5" : "translate-x-0"}`} />
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Publish status + actions — same footer pattern as vendor form */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pt-6 border-t border-[var(--color-border)]">
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-[var(--color-text-secondary)] font-medium">Publish status</Label>
                  <select
                    id="status"
                    value={form.status}
                    onChange={(e) => handleChange("status", e.target.value)}
                    className={`${selectClass} max-w-[200px]`}
                  >
                    <option value="draft">Save as draft</option>
                    <option value="active">Publish now</option>
                  </select>
                </div>
                <div className="flex gap-3 shrink-0">
                  <Button type="button" variant="outline" className="rounded-xl border-[var(--color-border)]" asChild>
                    <Link href="/dashboard/products">Cancel</Link>
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="gap-2 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] shadow-md"
                  >
                    <Save className="h-4 w-4" />
                    {isPending ? "Saving…" : form.status === "active" ? "Publish product" : "Save draft"}
                  </Button>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-[var(--color-danger)]/50 bg-[var(--color-danger-light)] px-4 py-3 text-sm text-[var(--color-danger)]">
                  {error}
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
