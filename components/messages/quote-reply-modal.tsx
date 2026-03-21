"use client";

import React, { useState } from "react";
import { Quote, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export function QuoteReplyModal({
  onClose,
  onSubmit,
  loading,
  quoteData,
}: {
  onClose: () => void;
  onSubmit: (data: { offer_price: string; delivery_time: string; status: "accepted" | "rejected"; body?: string }) => void;
  loading: boolean;
  quoteData?: { quantity?: number; expected_price?: string; delivery_country?: string };
}) {
  const [offer_price, setOffer_price] = useState("");
  const [delivery_time, setDelivery_time] = useState("");
  const [body, setBody] = useState("");

  function handleSubmit(status: "accepted" | "rejected") {
    return (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit({
        offer_price: offer_price.trim(),
        delivery_time: delivery_time.trim(),
        status,
        body: body.trim() || undefined,
      });
    };
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-darker/50" onClick={onClose}>
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <Quote className="h-5 w-5 text-[var(--color-accent)]" /> Send offer
          </h3>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--color-surface-secondary)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        {quoteData && (
          <div className="mb-4 p-3 rounded-xl bg-[var(--color-surface-secondary)] text-sm text-[var(--color-text-secondary)]">
            Requested: Qty {quoteData.quantity}, Expected {quoteData.expected_price}, Delivery to {quoteData.delivery_country}
          </div>
        )}
        <form className="space-y-4">
          <div>
            <Label className="text-[var(--color-text-secondary)]">Your offer price</Label>
            <Input
              type="text"
              placeholder="e.g. 45000"
              value={offer_price}
              onChange={(e) => setOffer_price(e.target.value)}
              className="rounded-xl mt-1"
            />
          </div>
          <div>
            <Label className="text-[var(--color-text-secondary)]">Delivery time</Label>
            <Input
              type="text"
              placeholder="e.g. 3-5 business days"
              value={delivery_time}
              onChange={(e) => setDelivery_time(e.target.value)}
              className="rounded-xl mt-1"
            />
          </div>
          <div>
            <Label className="text-[var(--color-text-secondary)]">Message (optional)</Label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add a note..."
              rows={2}
              className="w-full px-4 py-2 rounded-xl border border-[var(--color-border)] text-sm mt-1 resize-none"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="rounded-xl flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl flex-1 border-red-200 text-red-600 hover:bg-red-50"
              onClick={handleSubmit("rejected")}
              disabled={loading}
            >
              Decline
            </Button>
            <Button
              type="button"
              className="rounded-xl flex-1 bg-[var(--color-accent)]"
              onClick={handleSubmit("accepted")}
              disabled={loading || !offer_price.trim()}
            >
              {loading ? "Sending…" : "Send offer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
