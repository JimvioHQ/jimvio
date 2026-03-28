"use client";

import React, { useEffect, useState } from "react";
import { Download, Package, Search, ExternalLink, Video, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function DigitalLibraryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch items from orders that have digital assets
      // In Jimvio, influencers also have a library of clips.
      // For now, let's fetch 'order_items' where product might have a digital_file_url
      const { data } = await supabase
        .from("order_items")
        .select(`
          id, product_name, product_image, created_at,
          orders!inner ( status, buyer_id )
        `)
        .eq("orders.buyer_id", user.id)
        .eq("orders.status", "delivered"); // Only show for delivered/paid orders

      setItems(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = items.filter(i => 
    i.product_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Digital Library</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Access your purchased clips, templates, and digital assets</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
          <input
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-64 rounded-2xl bg-[var(--color-surface-secondary)] animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl">
          <div className="w-16 h-16 bg-[var(--color-surface-secondary)] rounded-full flex items-center justify-center mx-auto mb-4">
            <Video className="h-8 w-8 text-[var(--color-text-muted)]" />
          </div>
          <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Your library is empty</h3>
          <p className="text-[var(--color-text-muted)] max-w-xs mx-auto mt-2 text-sm leading-relaxed">
            Digital purchases like viral clips, course materials, and templates will appear here once your order is confirmed.
          </p>
          <Button asChild className="mt-6 rounded-xl px-8" variant="default">
            <a href="/dashboard/marketplace">Browse Digital Assets</a>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((item) => (
            <Card key={item.id} className="overflow-hidden border border-[var(--color-border)] hover:shadow-xl transition-all group rounded-2xl">
              <div className="aspect-video relative bg-[var(--color-surface-secondary)]">
                {item.product_image ? (
                  <img src={item.product_image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Package className="h-10 w-10 text-[var(--color-border)]" /></div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                   <Button size="sm" variant="secondary" className="rounded-full h-9 w-9 p-0"><Download className="h-4 w-4" /></Button>
                   <Button size="sm" variant="secondary" className="rounded-full h-9 w-9 p-0"><ExternalLink className="h-4 w-4" /></Button>
                </div>
                <Badge className="absolute top-2 right-2 bg-black/60 backdrop-blur-md border-white/10 text-[10px] font-black uppercase tracking-widest">Digital</Badge>
              </div>
              <CardContent className="p-4">
                <h4 className="font-bold text-[var(--color-text-primary)] truncate">{item.product_name}</h4>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-[9px] uppercase font-black text-[var(--color-text-muted)]">
                     <FileText className="h-3 w-3 mr-1" /> MP4 / Asset
                  </Badge>
                  <span className="text-[10px] text-[var(--color-text-muted)] font-medium">Added {new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Button className="w-full justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-widest h-10 shadow-lg hover:shadow-accent/20" variant="default">
                   <Download className="h-4 w-4" /> Download Files
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
