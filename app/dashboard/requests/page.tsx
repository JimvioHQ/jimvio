"use client";

import React, { useEffect, useState } from "react";
import { FileText, Send, Package, MapPin, DollarSign, ArrowRight, Zap, Target, History, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard, GlassPill, GlassAmbientGlow } from "@/components/ui/glass";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createBuyingLead, getBuyerLeads, type BuyingLeadForm } from "@/lib/actions/leads";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type LeadRow = {
  id: string;
  product_name: string;
  category: string | null;
  quantity_needed: number;
  budget_min: number | null;
  budget_max: number | null;
  delivery_country: string | null;
  description: string | null;
  status: string;
  created_at: string;
  buying_lead_offers?: Array<{
    id: string;
    message: string | null;
    offered_price: number | null;
    status: string;
    created_at: string;
    vendors?: { business_name: string; business_slug: string }[] | { business_name: string; business_slug: string } | null;
  }>;
};

export default function BuyingLeadsPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<BuyingLeadForm>({
    product_name: "",
    category: "",
    quantity_needed: 1,
    budget_min: undefined,
    budget_max: undefined,
    delivery_country: "",
    description: "",
  });

  const loadLeads = () => {
    setLoading(true);
    getBuyerLeads().then((data) => {
      setLeads((data as unknown) as LeadRow[]);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadLeads();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.product_name.trim()) {
      toast.error("Product name is required");
      return;
    }
    setSubmitting(true);
    const res = await createBuyingLead(form);
    setSubmitting(false);
    if (res.success) {
      toast.success("Buying lead posted");
      setForm({
        product_name: "",
        category: "",
        quantity_needed: 1,
        budget_min: undefined,
        budget_max: undefined,
        delivery_country: "",
        description: "",
      });
      loadLeads();
    } else {
      toast.error(res.error ?? "Failed to post");
    }
  }

  if (loading && leads.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-700" style={{ background: "var(--color-bg)" }}>
        <div className="relative">
          <div className="absolute inset-0 bg-orange-400/20 blur-3xl rounded-sm scale-150 animate-pulse" />
          <div className="relative w-24 h-24 rounded-sm bg-surface dark:bg-surface border border-border shadow-none flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 border-2 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent rounded-sm animate-spin m-2" />
            <FileText className="h-10 w-10 text-stone-900 dark:text-white" />
          </div>
        </div>
        <div className="text-center space-y-3">
           <h2 className="text-[14px] font-black text-stone-900 dark:text-white uppercase tracking-[0.4em] pl-[0.4em]">Buying Requests</h2>
           <p className="text-[10px] font-bold text-stone-400 dark:text-text-muted uppercase tracking-widest pl-[0.1em]">Syncing Acquisition Leads</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen animate-in fade-in duration-700 pb-24 relative overflow-hidden"
      style={{ background: "var(--color-bg)" }}
    >
      <GlassAmbientGlow color="orange" position="top-right" />
      <GlassAmbientGlow color="orange" position="bottom-left" />

      <div className="max-w-[1440px] mx-auto space-y-16 px-8 pt-12 relative z-10">
        
        {/* Header Protocol */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
           <div className="space-y-2">
              <h1 className="text-4xl font-black text-stone-900 dark:text-white tracking-tighter flex items-center gap-4">
                 <div className="p-2.5 rounded-sm bg-surface dark:bg-surface border border-border shadow-none shrink-0">
                    <FileText className="h-8 w-8 text-orange-500" />
                 </div>
                 Requests & Payouts
              </h1>
              <p className="text-[11px] font-bold text-stone-400 dark:text-text-muted uppercase tracking-[0.3em] pl-16">
                 Global Sourcing Hub & Buyer Request History
              </p>
           </div>
           
           <div className="flex items-center gap-4 bg-surface dark:bg-surface/40 p-1.5 rounded-sm border border-border shadow-none backdrop-blur-xl">
              <div className="w-3 h-3 rounded-sm bg-orange-500 ml-4 animate-pulse shadow-[0_0_12px_rgba(249,115,22,0.5)]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-900 dark:text-white pr-6 pl-2">Syncing Global Sourcing</span>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
           
           {/* Primary Input Logic */}
           <div className="lg:col-span-12">
              <GlassCard className="p-12 rounded-sm border-white bg-white dark:bg-surface/60 shadow-none relative overflow-hidden">
                 <div className="flex items-center justify-between mb-12">
                    <div className="space-y-1">
                       <h3 className="text-2xl font-black text-stone-900 dark:text-white tracking-tighter">Create New Request</h3>
                       <p className="text-[11px] font-black uppercase tracking-widest text-stone-400">Request a specific product for vendors to offer</p>
                    </div>
                    <Plus className="h-8 w-8 text-stone-100" />
                 </div>
                 
                 <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-x-10 gap-y-8">
                    <div className="md:col-span-8 space-y-4">
                       <Label className="text-[11px] font-black uppercase tracking-widest text-stone-400 px-2">What are you looking for?</Label>
                       <Input
                         id="product_name"
                         value={form.product_name}
                         onChange={(e) => setForm((f) => ({ ...f, product_name: e.target.value }))}
                         placeholder="e.g. HIGH-DENSITY ORGANIC COTTON"
                         className="h-16 rounded-sm bg-white dark:bg-surface border-white shadow-none focus:ring-8 focus:ring-orange-500/5 focus:border-orange-400 text-xl font-black tracking-tighter px-8 transition-all"
                         required
                       />
                    </div>
                    <div className="md:col-span-4 space-y-4">
                       <Label className="text-[11px] font-black uppercase tracking-widest text-stone-400 px-2">Category</Label>
                       <Input
                         id="category"
                         value={form.category}
                         onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                         placeholder="e.g. RAW MATERIALS"
                         className="h-16 rounded-sm bg-surface dark:bg-surface/40 border-border focus:bg-surface dark:focus:bg-zinc-900 text-sm font-black tracking-widest px-8 transition-all"
                       />
                    </div>
                    
                    <div className="md:col-span-3 space-y-4">
                       <Label className="text-[11px] font-black uppercase tracking-widest text-stone-400 px-2">Quantity Needed</Label>
                       <Input
                         id="quantity_needed"
                         type="number"
                         min={1}
                         value={form.quantity_needed}
                         onChange={(e) => setForm((f) => ({ ...f, quantity_needed: Number(e.target.value) || 1 }))}
                         className="h-16 rounded-sm bg-white dark:bg-surface/40 border-stone-100 dark:border-border focus:bg-white dark:bg-surface text-sm font-black tracking-widest px-8 transition-all tabular-nums"
                       />
                    </div>
                    
                    <div className="md:col-span-3 space-y-4">
                       <Label className="text-[11px] font-black uppercase tracking-widest text-stone-400 px-2">Min Budget</Label>
                       <div className="relative">
                          <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-300" />
                          <Input
                             id="budget_min"
                             type="number"
                             min={0}
                             value={form.budget_min ?? ""}
                             onChange={(e) => setForm((f) => ({ ...f, budget_min: e.target.value ? Number(e.target.value) : undefined }))}
                             placeholder="MIN"
                             className="h-16 rounded-sm bg-surface dark:bg-surface/40 border-border focus:bg-surface dark:focus:bg-zinc-900 text-sm font-black tracking-widest pl-14 transition-all"
                          />
                       </div>
                    </div>

                    <div className="md:col-span-3 space-y-4">
                       <Label className="text-[11px] font-black uppercase tracking-widest text-stone-400 px-2">Max Budget</Label>
                       <div className="relative">
                          <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-300" />
                          <Input
                             id="budget_max"
                             type="number"
                             min={0}
                             value={form.budget_max ?? ""}
                             onChange={(e) => setForm((f) => ({ ...f, budget_max: e.target.value ? Number(e.target.value) : undefined }))}
                             placeholder="MAX"
                             className="h-16 rounded-sm bg-surface dark:bg-surface/40 border-border focus:bg-surface dark:focus:bg-zinc-900 text-sm font-black tracking-widest pl-14 transition-all"
                          />
                       </div>
                    </div>

                    <div className="md:col-span-3 space-y-4">
                       <Label className="text-[11px] font-black uppercase tracking-widest text-stone-400 px-2">Location Hub (Country)</Label>
                       <div className="relative">
                          <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-300" />
                          <Input
                             id="delivery_country"
                             value={form.delivery_country}
                             onChange={(e) => setForm((f) => ({ ...f, delivery_country: e.target.value }))}
                             placeholder="DESTINATION HUB"
                             className="h-16 rounded-sm bg-surface dark:bg-surface/40 border-border focus:bg-surface dark:focus:bg-zinc-900 text-sm font-black tracking-widest pl-14 transition-all"
                          />
                       </div>
                    </div>

                    <div className="md:col-span-12 space-y-4">
                       <Label className="text-[11px] font-black uppercase tracking-widest text-stone-400 px-2">Sourcing Description & Details</Label>
                       <Textarea
                         id="description"
                         value={form.description}
                         onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                         placeholder="Define technical requirements, quality standards, and timelines..."
                         rows={4}
                         className="rounded-sm bg-surface dark:bg-surface/40 border-border focus:bg-surface dark:focus:bg-zinc-900 text-[14px] font-black leading-relaxed tracking-tight px-8 py-6 transition-all min-h-[160px] resize-none"
                       />
                    </div>
                    
                    <div className="md:col-span-12 flex justify-end pt-6">
                       <Button type="submit" disabled={submitting} className="h-20 px-12 rounded-sm bg-stone-900 text-white font-black text-[12px] uppercase tracking-[0.4em] shadow-none shadow-stone-900/40 active:scale-95 transition-all hover:bg-black border-none">
                          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                             <div className="flex items-center gap-4">
                                <Zap className="h-5 w-5 text-orange-400" /> Post Request
                             </div>
                          )}
                       </Button>
                    </div>
                 </form>
              </GlassCard>
           </div>

           {/* Results Matrix */}
           <div className="lg:col-span-12 space-y-8">
              <div className="flex items-center justify-between px-4">
                 <div className="space-y-1">
                    <h2 className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter">Your Requests</h2>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-stone-400 flex items-center gap-3">
                       <History className="h-4 w-4" /> Global Pulse Log ({leads.length} Items)
                    </p>
                 </div>
                 <div className="flex items-center gap-3 bg-white dark:bg-surface/60 p-1.5 rounded-sm border border-white shadow-none">
                    <div className="px-6 py-2 rounded-sm bg-stone-900 text-white font-black text-[9px] uppercase tracking-widest shadow-none">ALL</div>
                    <div className="px-6 py-2 rounded-sm text-stone-400 font-black text-[9px] uppercase tracking-widest hover:text-stone-900 dark:text-white transition-colors">ACTIVE</div>
                 </div>
              </div>

              {leads.length === 0 ? (
                 <GlassCard className="py-32 text-center rounded-sm border-dashed border-orange-200 bg-white dark:bg-surface/20">
                    <div className="w-24 h-24 bg-white dark:bg-surface rounded-sm flex items-center justify-center mx-auto mb-10 border border-white shadow-none">
                       <Target className="h-10 w-10 text-stone-100" />
                    </div>
                    <h3 className="text-2xl font-black text-stone-900 dark:text-white tracking-tighter">No Active Requests</h3>
                    <p className="text-[11px] font-black text-stone-400 uppercase tracking-widest max-w-[280px] mx-auto leading-relaxed">System requires request parameters to broadcast to global suppliers.</p>
                 </GlassCard>
              ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {leads.map((lead) => (
                      <GlassCard 
                        key={lead.id} 
                        className="p-10 rounded-sm bg-white dark:bg-surface/70 border-white shadow-none hover:shadow-none hover:-translate-y-2 transition-all duration-700 group flex flex-col justify-between h-full"
                      >
                        <div className="space-y-8">
                           <div className="flex items-start justify-between">
                              <div className="space-y-3">
                                 <h4 className="text-2xl font-black text-stone-900 dark:text-white tracking-tighter group-hover:text-orange-600 transition-colors">{lead.product_name}</h4>
                                 <div className="flex flex-wrap gap-3">
                                    {lead.category && <GlassPill color="default" className="px-3 py-1 font-black text-[9px] h-auto">{lead.category.toUpperCase()}</GlassPill>}
                                    <GlassPill color="orange" className="px-3 py-1 font-black text-[9px] h-auto flex items-center gap-2"><Package className="h-3 w-3" /> QTY: {lead.quantity_needed}</GlassPill>
                                    <GlassPill color="emerald" className="px-3 py-1 font-black text-[9px] h-auto uppercase tracking-widest">
                                       {(lead.budget_min != null || lead.budget_max != null) 
                                          ? `$${(lead.budget_min ?? 0).toLocaleString()} - $${(lead.budget_max ?? 0).toLocaleString()}`
                                          : "FLEXIBLE_BUDGET"}
                                    </GlassPill>
                                 </div>
                              </div>
                              <GlassPill color={lead.status === "open" ? "sky" : lead.status === "awarded" ? "emerald" : "default"} className="font-black text-[10px] px-4 py-2 border-white shadow-none ring-1 ring-white">
                                 {lead.status.toUpperCase()}
                              </GlassPill>
                           </div>
                           
                           {lead.description && (
                             <p className="text-[14px] font-black text-stone-400 tracking-tight leading-relaxed line-clamp-3 uppercase overflow-hidden">
                                {lead.description}
                             </p>
                           )}
                        </div>

                        {lead.buying_lead_offers && lead.buying_lead_offers.length > 0 && (
                          <div className="mt-10 pt-10 border-t border-border space-y-6">
                            <div className="flex items-center justify-between">
                               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">Supplier Offers</p>
                               <span className="text-[10px] font-black text-stone-300 uppercase tracking-widest">{lead.buying_lead_offers.length} Offers</span>
                            </div>
                            <ul className="space-y-3">
                              {lead.buying_lead_offers.slice(0, 3).map((offer) => {
                                const vendor = Array.isArray(offer.vendors) ? offer.vendors[0] : offer.vendors;
                                return (
                                <li key={offer.id} className="p-4 bg-white dark:bg-surface/60 rounded-sm border border-white shadow-none flex items-center justify-between group/offer hover:bg-white dark:bg-surface transition-all">
                                  <div className="space-y-1">
                                     <p className="text-[11px] font-black text-stone-900 dark:text-white tracking-widest uppercase truncate max-w-[180px]">{vendor?.business_name ?? "ANON_SUPPLIER"}</p>
                                     <p className="text-[10px] font-black text-stone-400 truncate max-w-[200px] leading-none uppercase">{offer.message ?? "NO_MESSAGE_LOGGED"}</p>
                                  </div>
                                  <div className="text-right shrink-0">
                                     <p className="text-[11px] font-black text-emerald-500 tabular-nums">${(offer.offered_price ?? 0).toLocaleString()}</p>
                                     <p className="text-[8px] font-black text-stone-300 uppercase mt-1">{new Date(offer.created_at).toLocaleDateString()}</p>
                                  </div>
                                </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                        
                        <div className="mt-10 pt-10 border-t border-stone-100 dark:border-border flex items-center justify-between">
                           <div className="flex items-center gap-3">
                              <MapPin className="h-4 w-4 text-stone-300" />
                              <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{lead.delivery_country || "GLOBAL"}</span>
                           </div>
                           <p className="text-[9px] font-black text-stone-300 uppercase tracking-widest">ID: {new Date(lead.created_at).getTime().toString(16).toUpperCase()}</p>
                        </div>
                      </GlassCard>
                    ))}
                 </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}

