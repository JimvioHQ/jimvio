"use client";

import React, { useState } from "react";
import { Quote, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export function QuoteRequestModal({
  onClose,
  onSubmit,
  loading,
}: {
  onClose: () => void;
  onSubmit: (data: { quantity: number; expected_price: string; delivery_country: string; body?: string }) => void;
  loading: boolean;
}) {
  const [quantity, setQuantity] = useState("1");
  const [expected_price, setExpected_price] = useState("");
  const [delivery_country, setDelivery_country] = useState("RW");
  const [body, setBody] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = parseInt(quantity, 10);
    if (!expected_price.trim() || isNaN(q) || q < 1) return;
    onSubmit({
      quantity: q,
      expected_price: expected_price.trim(),
      delivery_country: delivery_country.trim() || "RW",
      body: body.trim() || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-darker/50" onClick={onClose}>
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <Quote className="h-5 w-5 text-[var(--color-accent)]" /> Request Quote
          </h3>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--color-surface-secondary)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-[var(--color-text-secondary)]">Quantity</Label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="rounded-xl mt-1"
            />
          </div>
          <div>
            <Label className="text-[var(--color-text-secondary)]">Expected price (e.g. 50000)</Label>
            <Input
              type="text"
              placeholder="Your budget or expected price"
              value={expected_price}
              onChange={(e) => setExpected_price(e.target.value)}
              className="rounded-xl mt-1"
              required
            />
          </div>
          <div>
            <Label className="text-[var(--color-text-secondary)]">Delivery country</Label>
            <select
              value={delivery_country}
              onChange={(e) => setDelivery_country(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm mt-1"
            >
              <option value="RW">Rwanda</option>
              <option value="KE">Kenya</option>
              <option value="UG">Uganda</option>
              <option value="TZ">Tanzania</option>
              <option value="NG">Nigeria</option>
              <option value="ZA">South Africa</option>
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
            </select>
          </div>
          <div>
            <Label className="text-[var(--color-text-secondary)]">Additional notes (optional)</Label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Any special requirements..."
              rows={2}
              className="w-full px-4 py-2 rounded-xl border border-[var(--color-border)] text-sm mt-1 resize-none"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="rounded-xl flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-xl flex-1 bg-[var(--color-accent)]" disabled={loading}>
              {loading ? "Sending…" : "Send request"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
