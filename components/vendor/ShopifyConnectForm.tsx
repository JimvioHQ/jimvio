"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, RefreshCw, Unplug, ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  vendorId: string;
};

export function ShopifyConnectForm({ vendorId }: Props) {
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connected, setConnected] = useState<{
    shopDomain: string;
    updatedAt: string;
    productCount: number;
  } | null>(null);
  const [previewProducts, setPreviewProducts] = useState<
    { id: string; name: string; price: number; currency: string; images: unknown }[]
  >([]);

  const [shopDomain, setShopDomain] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  async function loadStatus() {
    setLoading(true);
    const supabase = createClient();
    const { data: creds } = await supabase
      .from("shopify_credentials")
      .select("shop_domain, updated_at")
      .eq("vendor_id", vendorId)
      .maybeSingle();

    const { count } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("vendor_id", vendorId)
      .eq("source", "shopify");

    const { data: preview } = await supabase
      .from("products")
      .select("id, name, price, currency, images, updated_at")
      .eq("vendor_id", vendorId)
      .eq("source", "shopify")
      .order("updated_at", { ascending: false })
      .limit(6);

    setPreviewProducts((preview ?? []) as { id: string; name: string; price: number; currency: string; images: unknown }[]);

    if (creds?.shop_domain) {
      setConnected({
        shopDomain: creds.shop_domain,
        updatedAt: creds.updated_at ?? new Date().toISOString(),
        productCount: count ?? 0,
      });
    } else {
      setConnected(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadStatus();
  }, [vendorId]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!shopDomain.trim() || !accessToken.trim()) {
      toast.error("Shop domain and access token are required");
      return;
    }
    setConnecting(true);
    try {
      const res = await fetch("/api/shopify/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopDomain: shopDomain.trim(),
          accessToken: accessToken.trim(),
          vendorId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Connection failed");
      toast.success("Store connected");
      setAccessToken("");
      await loadStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/shopify/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      toast.success("Products synced");
      await loadStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    const supabase = createClient();
    const { error } = await supabase.from("shopify_credentials").delete().eq("vendor_id", vendorId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Disconnected");
    setConnected(null);
    setPreviewProducts([]);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent)]" />
      </div>
    );
  }

  if (connected) {
    const mins = Math.floor((Date.now() - new Date(connected.updatedAt).getTime()) / 60000);
    return (
      <div className="space-y-8">
        <div className="rounded-none border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Sync status</p>
          <div className="flex items-start gap-3 mt-3">
            <CheckCircle2 className="h-8 w-8 text-[var(--color-success)] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[var(--color-text-primary)]">Connected Â· {connected.shopDomain}</p>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                Last synced: {mins < 1 ? "just now" : `${mins} minutes ago`}
              </p>
              <p className="text-sm text-[var(--color-text-primary)] mt-2 font-medium tabular-nums">
                Products synced: {connected.productCount}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-2">
                Products sync automatically every 6 hours (cron). Use sync now for an immediate refresh.
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" variant="default" onClick={handleSync} disabled={syncing}>
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sync now
            </Button>
            <Button type="button" variant="outline" onClick={handleDisconnect}>
              <Unplug className="h-4 w-4" /> Disconnect
            </Button>
          </div>
        </div>

        {previewProducts.length > 0 && (
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Recent products</h2>
              <Link
                href="/dashboard/vendor/store"
                className="text-sm font-semibold text-[var(--color-accent)] hover:underline"
              >
                View all products
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {previewProducts.map((p) => {
                const img = Array.isArray(p.images) && p.images.length > 0 ? String(p.images[0]) : null;
                return (
                  <div
                    key={p.id}
                    className="rounded-none border border-[var(--color-border)] bg-[var(--color-surface-secondary)] overflow-hidden"
                  >
                    <div className="aspect-square bg-[var(--color-border)] relative">
                      {img ? (
                        <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--color-text-muted)]">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-[var(--color-text-primary)] line-clamp-2">{p.name}</p>
                      <p className="text-sm font-semibold text-[var(--color-text-primary)] mt-1 tabular-nums">
                        {formatCurrency(p.price, p.currency || "USD")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleConnect} className="space-y-5">
      <Input
        label="Shop domain"
        placeholder="your-store.myshopify.com"
        value={shopDomain}
        onChange={(e) => setShopDomain(e.target.value)}
        hint="Found in your Shopify admin URL"
        required
      />
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Admin API access token</label>
          <button
            type="button"
            className="text-xs text-[var(--color-accent)] font-semibold"
            onClick={() => setShowToken((s) => !s)}
          >
            {showToken ? "Hide" : "Show"}
          </button>
        </div>
        <input
          type={showToken ? "text" : "password"}
          placeholder="shpat_xxxxxxxxxxxx"
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          className={cn(
            "w-full rounded-none border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          )}
          required
        />
        <p className="text-xs text-[var(--color-text-muted)] mt-1">Settings â†’ Apps â†’ Develop apps â†’ API credentials</p>
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={connecting}>
        {connecting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Connectingâ€¦
          </>
        ) : (
          "Connect store"
        )}
      </Button>

      <div className="border border-[var(--color-border)] rounded-none overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-[var(--color-text-primary)] bg-[var(--color-surface-secondary)]"
          onClick={() => setHelpOpen((o) => !o)}
        >
          How to get your token
          {helpOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {helpOpen && (
          <ol className="list-decimal pl-8 pr-4 py-3 text-sm text-[var(--color-text-secondary)] space-y-2">
            <li>Open your Shopify Admin</li>
            <li>Settings â†’ Apps â†’ Develop apps</li>
            <li>Create app â†’ Configure Admin API scopes (products, orders)</li>
            <li>Install app â†’ Copy the Admin API access token</li>
          </ol>
        )}
      </div>
    </form>
  );
}

