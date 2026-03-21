"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Link2, Plus, Copy, TrendingUp, DollarSign, MousePointer, ShoppingCart, ExternalLink, CheckCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Input } from "@/components/ui/input";
import { formatCurrency, cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { TableRowSkeleton } from "@/components/ui/skeleton";

type ProductRow = { id: string; name: string; slug: string; price: number; affiliate_commission_rate?: number; images?: string[] };

export default function AffiliateLinksPage() {
  const router = useRouter();
  const [affiliate, setAffiliate]   = useState<Record<string, unknown> | null>(null);
  const [links, setLinks]           = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading]       = useState(true);
  const [copied, setCopied]         = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newUrl, setNewUrl]         = useState("");
  const [newRate, setNewRate]       = useState("10");
  const [creating, setCreating]     = useState(false);
  const [products, setProducts]     = useState<ProductRow[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: aff } = await supabase.from("affiliates").select("*").eq("user_id", user.id).single();
      setAffiliate(aff ?? null);

      if (aff) {
        const { data: lnks } = await supabase
          .from("affiliate_links")
          .select(`
            id, link_code, destination_url, full_url, commission_rate, is_active,
            total_clicks, unique_clicks, total_conversions, total_earnings, created_at,
            products ( id, name, slug, price, images )
          `)
          .eq("affiliate_id", aff.id)
          .order("created_at", { ascending: false });
        setLinks(lnks ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (!affiliate) return;
    const supabase = createClient();
    const q = supabase
      .from("products")
      .select("id, name, slug, price, affiliate_commission_rate, images")
      .eq("status", "active")
      .eq("is_active", true)
      .eq("affiliate_enabled", true)
      .limit(50);
    q.then(({ data }) => setProducts((data ?? []) as ProductRow[]));
  }, [affiliate]);

  if (!loading && !affiliate) {
    router.replace("/dashboard/activate/affiliate");
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-sm text-[var(--color-text-muted)]">Redirecting to activate affiliate…</p>
      </div>
    );
  }

  async function createLinkFromProduct() {
    if (!affiliate || !selectedProduct) return;
    setCreating(true);
    const supabase = createClient();
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const dest = `${base}/marketplace/${selectedProduct.slug}`;
    const refUrl = `${dest}?ref=${affiliate.affiliate_code}`;
    const { data, error } = await supabase.from("affiliate_links").insert({
      affiliate_id:    affiliate.id,
      product_id:      selectedProduct.id,
      destination_url: dest,
      full_url:        refUrl,
      commission_rate: selectedProduct.affiliate_commission_rate ?? (parseFloat(newRate) || 10),
    }).select(`
      id, link_code, destination_url, full_url, commission_rate, is_active,
      total_clicks, unique_clicks, total_conversions, total_earnings, created_at,
      products ( id, name, slug, price, images )
    `).single();

    if (!error && data) {
      setLinks(prev => [data, ...prev]);
      setGeneratedUrl((data as { full_url?: string }).full_url ?? refUrl);
      setSelectedProduct(null);
      setProductSearch("");
    }
    setCreating(false);
  }

  async function createLink() {
    if (!affiliate || !newUrl) return;
    setCreating(true);
    const supabase = createClient();
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const refUrl = newUrl.includes("?") ? `${newUrl}&ref=${affiliate.affiliate_code}` : `${newUrl}?ref=${affiliate.affiliate_code}`;
    const { data, error } = await supabase.from("affiliate_links").insert({
      affiliate_id:    affiliate.id,
      destination_url: newUrl,
      full_url:        refUrl,
      commission_rate: parseFloat(newRate) || 10,
    }).select(`
      id, link_code, destination_url, full_url, commission_rate, is_active,
      total_clicks, unique_clicks, total_conversions, total_earnings, created_at,
      products ( id, name, slug, price, images )
    `).single();

    if (!error && data) {
      setLinks(prev => [data, ...prev]);
      setNewUrl("");
      setShowNewForm(false);
      setGeneratedUrl(refUrl);
    }
    setCreating(false);
  }

  function copyLink(codeOrUrl: string) {
    const url = codeOrUrl.startsWith("http") ? codeOrUrl : `${typeof window !== "undefined" ? window.location.origin : ""}/ref/${codeOrUrl}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(codeOrUrl);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  const totalClicks   = links.reduce((s, l) => s + (l.total_clicks as number ?? 0), 0);
  const totalConvs    = links.reduce((s, l) => s + (l.total_conversions as number ?? 0), 0);
  const totalEarnings = links.reduce((s, l) => s + Number(l.total_earnings ?? 0), 0);
  const activeLinks   = links.filter(l => l.is_active !== false).length;
  const filteredProducts = productSearch.trim()
    ? products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.slug.toLowerCase().includes(productSearch.toLowerCase()))
    : products;

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">Affiliate Links</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Create referral links and track clicks and earnings.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
            <span className="text-xs font-medium text-[var(--color-text-muted)]">Code</span>
            <code className="text-sm font-mono font-semibold text-[var(--color-accent)]">{affiliate?.affiliate_code as string ?? "—"}</code>
            <button
              type="button"
              onClick={() => { const c = affiliate?.affiliate_code as string; if (c) copyLink(c); }}
              className="p-1.5 rounded-lg hover:bg-[var(--color-surface)] transition-colors touch-manipulation"
              title="Copy code"
            >
              {copied === (affiliate?.affiliate_code as string) ? <CheckCircle className="h-4 w-4 text-[var(--color-success)]" /> : <Copy className="h-4 w-4 text-[var(--color-text-muted)]" />}
            </button>
          </div>
          <Button onClick={() => setShowNewForm(true)} size="default" className="shrink-0">
            <Plus className="h-4 w-4 mr-2" /> Create Link
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Clicks" value={loading ? "—" : totalClicks.toLocaleString()} icon={<MousePointer className="h-4 w-4" />} iconColor="from-primary-600 to-accent-600" />
        <StatCard title="Conversions" value={loading ? "—" : totalConvs.toLocaleString()} icon={<ShoppingCart className="h-4 w-4" />} iconColor="from-emerald-600 to-teal-600" />
        <StatCard title="Commission Earned" value={loading ? "—" : formatCurrency(totalEarnings)} icon={<DollarSign className="h-4 w-4" />} iconColor="from-amber-600 to-orange-600" />
        <StatCard title="Active Links" value={loading ? "—" : activeLinks.toString()} icon={<Link2 className="h-4 w-4" />} iconColor="from-blue-600 to-cyan-600" />
      </div>

      {/* Link generator */}
      <Card className="border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
        <CardHeader className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 py-4 px-5">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Link2 className="h-5 w-5 text-[var(--color-accent)]" />
            Affiliate Link Generator
          </CardTitle>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Search a product, generate your link, then copy and share.</p>
        </CardHeader>
        <CardContent className="p-5 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Search + product list */}
            <div className="lg:col-span-3 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)] pointer-events-none" />
                <Input
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="Search products…"
                  className="pl-10 rounded-xl h-11 border-[var(--color-border)]"
                />
              </div>
              <div className="rounded-xl border border-[var(--color-border)] overflow-hidden max-h-[280px] overflow-y-auto">
                {filteredProducts.slice(0, 25).map((p) => {
                  const rate = p.affiliate_commission_rate ?? 0;
                  const selected = selectedProduct?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProduct(p)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-[var(--color-border)] last:border-b-0",
                        selected ? "bg-[var(--color-accent-light)] border-l-4 border-l-[var(--color-accent)]" : "hover:bg-[var(--color-surface-secondary)]"
                      )}
                    >
                      <div className="w-10 h-10 shrink-0 rounded-lg overflow-hidden bg-[var(--color-surface-secondary)]">
                        {Array.isArray(p.images) && p.images[0] ? (
                          <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[var(--color-text-muted)]">
                            <ShoppingCart className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <span className="flex-1 min-w-0 font-medium text-sm text-[var(--color-text-primary)] truncate">{p.name}</span>
                      <span className="text-sm text-[var(--color-text-muted)] shrink-0">{formatCurrency(Number(p.price))}</span>
                      <span className={cn("text-xs font-medium shrink-0 px-2 py-0.5 rounded-full", rate > 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]")}>
                        {rate > 0 ? `${rate}%` : "—"}
                      </span>
                    </button>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">No products found. Try a different search.</div>
                )}
              </div>
            </div>
            {/* Selected + generate + result */}
            <div className="lg:col-span-2 space-y-4">
              {selectedProduct ? (
                <>
                  <div className="p-4 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-[var(--color-surface)]">
                        {Array.isArray(selectedProduct.images) && selectedProduct.images[0] ? (
                          <img src={selectedProduct.images[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[var(--color-text-muted)]"><ShoppingCart className="h-6 w-6" /></div>
                        )}
                      </div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)] min-w-0">{selectedProduct.name}</p>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {(selectedProduct.affiliate_commission_rate ?? 10)}% commission · You earn{" "}
                      <span className="font-semibold text-[var(--color-accent)]">{formatCurrency(Number(selectedProduct.price) * ((selectedProduct.affiliate_commission_rate ?? 10) / 100))}</span> per sale
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" onClick={createLinkFromProduct} disabled={creating} className="flex-1">
                        <Link2 className="h-4 w-4 mr-1.5" /> Generate link
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedProduct(null)}>Clear</Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-6 rounded-xl border border-dashed border-[var(--color-border)] text-center">
                  <p className="text-sm text-[var(--color-text-muted)]">Select a product from the list to generate your affiliate link.</p>
                </div>
              )}
              {generatedUrl && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[var(--color-text-muted)]">Your link (copy and share)</label>
                  <div className="flex gap-2">
                    <input readOnly value={generatedUrl} className="flex-1 min-w-0 px-3 py-2.5 text-sm rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] truncate" />
                    <Button size="default" variant="outline" onClick={() => copyLink(generatedUrl)} className="shrink-0 min-h-[44px] min-w-[44px] touch-manipulation">
                      {copied === generatedUrl ? <CheckCircle className="h-5 w-5 text-[var(--color-success)]" /> : <><Copy className="h-4 w-4 mr-1.5" /> Copy</>}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="pt-3 border-t border-[var(--color-border)]">
            <button type="button" onClick={() => setShowNewForm(true)} className="text-sm font-medium text-[var(--color-accent)] hover:underline">
              Or add a custom URL
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Custom URL form */}
      {showNewForm && (
        <Card className="border-[var(--color-border)] shadow-[var(--shadow-sm)]">
          <CardHeader className="border-b border-[var(--color-border)] py-4 px-5">
            <CardTitle className="text-base">Create link from custom URL</CardTitle>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Paste any product or page URL to attach your affiliate code.</p>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div>
              <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-1.5">Destination URL</label>
              <Input type="url" value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://jimvio.com/marketplace/product-slug" className="rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-1.5">Commission rate (%)</label>
              <Input type="number" value={newRate} onChange={e => setNewRate(e.target.value)} min={1} max={90} className="w-28 rounded-xl" />
            </div>
            <div className="flex gap-3">
              <Button onClick={createLink} disabled={creating}><Link2 className="h-4 w-4 mr-1.5" /> Generate link</Button>
              <Button variant="outline" onClick={() => setShowNewForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* My links table */}
      <Card className="border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
        <CardHeader className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 py-4 px-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base font-semibold">My Affiliate Links</CardTitle>
            <Badge variant="secondary" className="font-medium">{links.length} {links.length === 1 ? "link" : "links"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50">
                  <th className="text-left font-medium text-[var(--color-text-muted)] py-3.5 pl-5 pr-3">Product / URL</th>
                  <th className="text-left font-medium text-[var(--color-text-muted)] py-3.5 px-3">Link</th>
                  <th className="text-right font-medium text-[var(--color-text-muted)] py-3.5 px-3 w-20">Clicks</th>
                  <th className="text-right font-medium text-[var(--color-text-muted)] py-3.5 px-3 w-20">Conv.</th>
                  <th className="text-right font-medium text-[var(--color-text-muted)] py-3.5 px-3 w-24">Earnings</th>
                  <th className="text-center font-medium text-[var(--color-text-muted)] py-3.5 px-3 w-20">Status</th>
                  <th className="text-right font-medium text-[var(--color-text-muted)] py-3.5 pl-3 pr-5 w-12" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(3).fill(0).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
                ) : links.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-14 px-5">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] mb-3"><Link2 className="h-6 w-6" /></div>
                      <p className="font-medium text-[var(--color-text-primary)]">No links yet</p>
                      <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Create your first affiliate link above to start earning.</p>
                    </td>
                  </tr>
                ) : (
                  links.map((l) => {
                    const product = l.products as Record<string, unknown> | null;
                    const fullUrl = (l as { full_url?: string }).full_url ?? "";
                    const isCopied = copied === fullUrl || copied === (l.link_code as string);
                    return (
                      <tr key={l.id as string} className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface-secondary)]/50 transition-colors">
                        <td className="py-3.5 pl-5 pr-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 shrink-0 rounded-lg overflow-hidden bg-[var(--color-surface-secondary)]">
                              {product && Array.isArray(product.images) && product.images[0] ? (
                                <img src={product.images[0] as string} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[var(--color-text-muted)]"><ShoppingCart className="h-4 w-4" /></div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-[var(--color-text-primary)]">{product?.name as string ?? "Custom link"}</p>
                              <p className="text-xs text-[var(--color-text-muted)] truncate max-w-[200px] mt-0.5">{(l.destination_url as string)?.replace(/^https?:\/\//, "")}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2">
                            <code className="text-xs font-mono text-[var(--color-accent)] bg-[var(--color-accent-light)]/50 px-2 py-1 rounded-lg truncate max-w-[120px]">{l.link_code as string}</code>
                            <button
                              type="button"
                              onClick={() => copyLink(fullUrl || (l.link_code as string))}
                              className="shrink-0 p-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors touch-manipulation min-h-[40px] min-w-[40px] inline-flex items-center justify-center"
                              title="Copy link"
                            >
                              {isCopied ? <CheckCircle className="h-4 w-4 text-[var(--color-success)]" /> : <Copy className="h-4 w-4 text-[var(--color-text-muted)]" />}
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-right font-medium tabular-nums">{((l.total_clicks as number) ?? 0).toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-right font-medium tabular-nums">{((l.total_conversions as number) ?? 0).toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-right font-semibold text-[var(--color-text-primary)]">{formatCurrency(Number(l.total_earnings ?? 0))}</td>
                        <td className="py-3.5 px-3 text-center">
                          <Badge variant={l.is_active ? "success" : "secondary"} className="text-[10px] py-0.5">{l.is_active ? "Active" : "Inactive"}</Badge>
                        </td>
                        <td className="py-3.5 pl-3 pr-5 text-right">
                          <a href={l.destination_url as string} target="_blank" rel="noopener noreferrer" className="inline-flex p-2 rounded-lg hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] transition-colors" title="Open link">
                            <ExternalLink className="h-4 w-4" />
                          </a>
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
