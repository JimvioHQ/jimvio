"use client";

import React, { useEffect, useState } from "react";
import { FileText, Send, Package, MapPin, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Buying Leads</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
          Post what you need; suppliers can send you offers.
        </p>
      </div>

      <Card className="border-[var(--color-border)]">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> Post a buying request
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="product_name">Product Name *</Label>
              <Input
                id="product_name"
                value={form.product_name}
                onChange={(e) => setForm((f) => ({ ...f, product_name: e.target.value }))}
                placeholder="e.g. Organic Cotton T-Shirts"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="e.g. Apparel"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="quantity_needed">Quantity Needed</Label>
              <Input
                id="quantity_needed"
                type="number"
                min={1}
                value={form.quantity_needed}
                onChange={(e) => setForm((f) => ({ ...f, quantity_needed: Number(e.target.value) || 1 }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="budget_min">Budget Min (optional)</Label>
              <Input
                id="budget_min"
                type="number"
                min={0}
                value={form.budget_min ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, budget_min: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="RWF"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="budget_max">Budget Max (optional)</Label>
              <Input
                id="budget_max"
                type="number"
                min={0}
                value={form.budget_max ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, budget_max: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="RWF"
                className="mt-1"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="delivery_country">Delivery Country</Label>
              <Input
                id="delivery_country"
                value={form.delivery_country}
                onChange={(e) => setForm((f) => ({ ...f, delivery_country: e.target.value }))}
                placeholder="e.g. Rwanda"
                className="mt-1"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe your requirements, quality, timeline..."
                rows={4}
                className="mt-1 resize-none"
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={submitting} className="gap-2">
                <Send className="h-4 w-4" /> {submitting ? "Posting..." : "Post Buying Lead"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-[var(--color-border)]">
        <CardHeader>
          <CardTitle className="text-base">My buying leads</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-[var(--color-text-muted)]">Loading...</p>
          ) : leads.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">No buying leads yet. Post one above.</p>
          ) : (
            <ul className="space-y-4">
              {leads.map((lead) => (
                <li
                  key={lead.id}
                  className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[var(--color-text-primary)]">{lead.product_name}</p>
                      <div className="flex flex-wrap gap-3 mt-1 text-sm text-[var(--color-text-muted)]">
                        {lead.category && <span>{lead.category}</span>}
                        <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" /> Qty: {lead.quantity_needed}</span>
                        {(lead.budget_min != null || lead.budget_max != null) && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5" />
                            {lead.budget_min != null && lead.budget_max != null
                              ? `RWF ${lead.budget_min.toLocaleString()} – ${lead.budget_max.toLocaleString()}`
                              : lead.budget_min != null
                                ? `From RWF ${lead.budget_min.toLocaleString()}`
                                : `Up to RWF ${lead.budget_max!.toLocaleString()}`}
                          </span>
                        )}
                        {lead.delivery_country && (
                          <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {lead.delivery_country}</span>
                        )}
                      </div>
                      {lead.description && (
                        <p className="mt-2 text-sm text-[var(--color-text-secondary)] line-clamp-2">{lead.description}</p>
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-1 rounded-full capitalize",
                        lead.status === "open" && "bg-[var(--color-success-light)] text-[var(--color-success)]",
                        lead.status === "closed" && "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]",
                        lead.status === "awarded" && "bg-[var(--color-accent-light)] text-[var(--color-accent)]"
                      )}
                    >
                      {lead.status}
                    </span>
                  </div>
                  {lead.buying_lead_offers && lead.buying_lead_offers.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                      <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2">Offers from suppliers</p>
                      <ul className="space-y-2">
                        {lead.buying_lead_offers.map((offer) => {
                          const vendor = Array.isArray(offer.vendors) ? offer.vendors[0] : offer.vendors;
                          return (
                          <li key={offer.id} className="text-sm flex items-center justify-between gap-2">
                            <span className="text-[var(--color-text-primary)]">
                              {vendor?.business_name ?? "Supplier"} — {offer.message ?? "No message"}
                              {offer.offered_price != null && ` · RWF ${offer.offered_price.toLocaleString()}`}
                            </span>
                            <span className="text-xs text-[var(--color-text-muted)]">{new Date(offer.created_at).toLocaleDateString()}</span>
                          </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  <p className="text-xs text-[var(--color-text-muted)] mt-2">{new Date(lead.created_at).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
