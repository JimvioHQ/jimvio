"use client";

import React, { useState } from "react";
import { Star, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitReview } from "@/lib/actions/marketplace";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ReviewFormProps {
  productId?: string;
  vendorId?: string;
}

export function ReviewForm({ productId, vendorId }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setLoading(true);
    const res = await submitReview({
      productId,
      vendorId,
      rating,
      title,
      body
    });
    setLoading(false);

    if (res.success) {
      toast.success("Review submitted! Thank you for your feedback.");
      setRating(0);
      setTitle("");
      setBody("");
    } else {
      toast.error(res.error || "Failed to submit review.");
    }
  };

  return (
    <div className="bg-[var(--color-surface-secondary)] rounded-2xl p-6 border border-[var(--color-border)] mb-8">
      <h3 className="text-lg font-black mb-4">Leave a Review</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-black text-[var(--color-text-muted)] capitalize tracking-widest">Your Rating</label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="p-1 transition-all hover:scale-125"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              >
                <Star 
                  className={cn(
                    "h-6 w-6 transition-colors",
                    (hoverRating || rating) >= star 
                      ? "fill-[#f59e0b] text-[#f59e0b]" 
                      : "text-[var(--color-border)]"
                  )} 
                />
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-black text-[var(--color-text-muted)] capitalize tracking-widest">Short Summary (Optional)</label>
          <input 
            type="text" 
            placeholder="Great product!" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--color-accent)] outline-none"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-black text-[var(--color-text-muted)] capitalize tracking-widest">Detailed Feedback</label>
          <textarea 
            placeholder="Tell us what you liked or disliked about this item..." 
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--color-accent)] outline-none resize-none"
          />
        </div>

        <Button 
          type="submit" 
          disabled={loading}
          className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] font-black h-12 rounded-xl border-none"
        >
          {loading ? "Submitting..." : <><Send className="mr-2 h-4 w-4" /> Post Review</>}
        </Button>
      </form>
    </div>
  );
}
