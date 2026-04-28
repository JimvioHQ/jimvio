// "use client";

// import React, { useState } from "react";
// import { Star, Send } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { submitReview } from "@/lib/actions/marketplace";
// import { toast } from "sonner";
// import { cn } from "@/lib/utils";

// interface ReviewFormProps {
//   productId?: string;
//   vendorId?: string;
// }

// export function ReviewForm({ productId, vendorId }: ReviewFormProps) {
//   const [rating, setRating] = useState(0);
//   const [hoverRating, setHoverRating] = useState(0);
//   const [title, setTitle] = useState("");
//   const [body, setBody] = useState("");
//   const [loading, setLoading] = useState(false);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (rating === 0) {
//       toast.error("Please select a rating");
//       return;
//     }

//     setLoading(true);
//     const res = await submitReview({
//       productId,
//       vendorId,
//       rating,
//       title,
//       body
//     });
//     setLoading(false);

//     if (res.success) {
//       toast.success("Review submitted! Thank you for your feedback.");
//       setRating(0);
//       setTitle("");
//       setBody("");
//     } else {
//       toast.error(res.error || "Failed to submit review.");
//     }
//   };

//   return (
//     <div className="bg-[var(--color-surface-secondary)] rounded-sm p-6 border border-[var(--color-border)] mb-8">
//       <h3 className="text-lg font-black mb-4">Leave a Review</h3>
//       <form onSubmit={handleSubmit} className="space-y-4">
//         <div className="flex flex-col gap-2">
//           <label className="text-xs font-black text-[var(--color-text-muted)] capitalize tracking-widest">Your Rating</label>
//           <div className="flex items-center gap-1">
//             {[1, 2, 3, 4, 5].map((star) => (
//               <button
//                 key={star}
//                 type="button"
//                 className="p-1 transition-all hover:scale-125"
//                 onMouseEnter={() => setHoverRating(star)}
//                 onMouseLeave={() => setHoverRating(0)}
//                 onClick={() => setRating(star)}
//               >
//                 <Star 
//                   className={cn(
//                     "h-6 w-6 transition-colors",
//                     (hoverRating || rating) >= star 
//                       ? "fill-[#f59e0b] text-[#f59e0b]" 
//                       : "text-[var(--color-border)]"
//                   )} 
//                 />
//               </button>
//             ))}
//           </div>
//         </div>

//         <div className="flex flex-col gap-2">
//           <label className="text-xs font-black text-[var(--color-text-muted)] capitalize tracking-widest">Short Summary (Optional)</label>
//           <input 
//             type="text" 
//             placeholder="Great product!" 
//             value={title}
//             onChange={(e) => setTitle(e.target.value)}
//             className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:ring-2 focus:ring-[var(--color-accent)] outline-none"
//           />
//         </div>

//         <div className="flex flex-col gap-2">
//           <label className="text-xs font-black text-[var(--color-text-muted)] capitalize tracking-widest">Detailed Feedback</label>
//           <textarea 
//             placeholder="Tell us what you liked or disliked about this item..." 
//             rows={3}
//             value={body}
//             onChange={(e) => setBody(e.target.value)}
//             className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:ring-2 focus:ring-[var(--color-accent)] outline-none resize-none"
//           />
//         </div>

//         <Button 
//           type="submit" 
//           disabled={loading}
//           className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] font-black h-12 rounded-sm border-none"
//         >
//           {loading ? "Submitting..." : <><Send className="mr-2 h-4 w-4" /> Post Review</>}
//         </Button>
//       </form>
//     </div>
//   );
// }

"use client";

import React, { useState } from "react";
import { Star, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitReview } from "@/lib/actions/marketplace";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReviewFormProps {
  productId?: string;
  vendorId?: string;
}

// ─── Rating label shown below the stars ───────────────────────────────────────

const RATING_LABELS: Record<number, string> = {
  1: "Poor — not what I expected",
  2: "Fair — below average",
  3: "Good — meets expectations",
  4: "Great — above expectations",
  5: "Excellent — highly recommend",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ReviewForm({ productId, vendorId }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [bodyTouched, setBodyTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const activeRating = hoverRating || rating;
  const bodyError = bodyTouched && body.trim().length < 10;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (rating === 0) {
      toast.error("Please select a star rating before submitting.");
      return;
    }
    if (body.trim().length < 10) {
      setBodyTouched(true);
      toast.error("Please write at least 10 characters in your feedback.");
      return;
    }

    setLoading(true);
    try {
      const res = await submitReview({ productId, vendorId, rating, title, body });
      if (res.success) {
        setSubmitted(true);
        toast.success("Review submitted — thank you!");
      } else {
        toast.error(res.error ?? "Failed to submit review.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Success state ──────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center gap-3 py-10 px-6 text-center",
        "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl"
      )}>
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-success-light)]">
          <Star className="h-5 w-5 fill-[var(--color-success)] text-[var(--color-success)]" />
        </div>
        <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
          Thanks for your review
        </p>
        <p className="text-[13px] text-[var(--color-text-muted)] max-w-[260px] leading-relaxed">
          Your feedback helps other buyers make informed decisions.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setRating(0);
            setTitle("");
            setBody("");
            setBodyTouched(false);
          }}
          className="mt-1 text-[12px] font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
        >
          Write another review
        </button>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
      <p className="text-[15px] font-semibold text-[var(--color-text-primary)] mb-5">
        Leave a review
      </p>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>

        {/* Star rating */}
        <div>
          <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-2">
            Your rating <span className="text-[var(--color-accent)]" aria-hidden="true">*</span>
          </label>

          {/* Stars — keyboard-accessible via role=radiogroup */}
          <div
            role="radiogroup"
            aria-label="Product rating"
            className="flex items-center gap-1"
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={rating === star}
                aria-label={`${star} star${star !== 1 ? "s" : ""}`}
                className="p-0.5 rounded-md transition-transform duration-100 focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] active:scale-90"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  className={cn(
                    "h-7 w-7 transition-colors duration-100",
                    activeRating >= star
                      ? "fill-amber-400 text-amber-400"
                      : "text-[var(--color-border-strong)] fill-none"
                  )}
                />
              </button>
            ))}
          </div>

          {/* Contextual label below stars */}
          <p className={cn(
            "mt-2 text-[12px] transition-all duration-150 min-h-[18px]",
            activeRating > 0
              ? "text-[var(--color-text-secondary)]"
              : "text-transparent select-none"
          )}>
            {activeRating > 0 ? RATING_LABELS[activeRating] : "placeholder"}
          </p>
        </div>

        {/* Title */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="review-title"
              className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest"
            >
              Summary
            </label>
            <span className="text-[10px] text-[var(--color-text-muted)]">Optional</span>
          </div>
          <input
            id="review-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Great component library"
            maxLength={100}
            className={cn(
              "w-full h-10 px-3 text-[13px] rounded-xl",
              "bg-[var(--color-surface-secondary)] border border-[var(--color-border)]",
              "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
              "focus:outline-none focus:border-[var(--color-accent)]/60 focus:ring-2 focus:ring-[var(--color-accent)]/10",
              "transition-all duration-150"
            )}
          />
        </div>

        {/* Body */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="review-body"
              className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest"
            >
              Feedback <span className="text-[var(--color-accent)]" aria-hidden="true">*</span>
            </label>
            <span className={cn(
              "text-[10px] tabular-nums transition-colors",
              body.length > 480
                ? "text-[var(--color-danger)]"
                : "text-[var(--color-text-muted)]"
            )}>
              {body.length} / 500
            </span>
          </div>
          <textarea
            id="review-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onBlur={() => setBodyTouched(true)}
            placeholder="What did you like or dislike? How did it help you?"
            rows={4}
            maxLength={500}
            className={cn(
              "w-full px-3 py-2.5 text-[13px] rounded-xl resize-none leading-relaxed",
              "bg-[var(--color-surface-secondary)] border",
              bodyError
                ? "border-[var(--color-danger)]/60 focus:ring-[var(--color-danger)]/15"
                : "border-[var(--color-border)] focus:border-[var(--color-accent)]/60 focus:ring-[var(--color-accent)]/10",
              "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
              "focus:outline-none focus:ring-2",
              "transition-all duration-150"
            )}
          />
          {bodyError && (
            <p className="mt-1.5 text-[11px] font-medium text-[var(--color-danger)]">
              Please write at least 10 characters.
            </p>
          )}
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={loading}
          className={cn(
            "w-full h-10 rounded-xl text-[13px] font-semibold border-none",
            "bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white",
            "transition-all active:scale-[0.98]"
          )}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              <Send className="mr-2 h-3.5 w-3.5" />
              Post review
            </>
          )}
        </Button>
      </form>
    </div>
  );
}