"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, MessageSquareQuote, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getInitials } from "@/lib/utils";
import type { IdentityProfilePayload, IdentityReviewDirection } from "@/lib/identity/types";
import {
  IdentityButton,
  IdentityCard,
  IdentityEmptyState,
  IdentityPill,
  IdentitySectionHeading,
} from "@/components/identity/identity-ui";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className="h-3.5 w-3.5"
          style={{
            fill: i <= Math.round(rating) ? "#FF5A1F" : "transparent",
            color: i <= Math.round(rating) ? "#FF5A1F" : "#D8D2C6",
          }}
        />
      ))}
    </div>
  );
}

export function IdentityReviewsPanel({
  payload,
  subjectUserId,
  displayName,
}: {
  payload: IdentityProfilePayload;
  subjectUserId: string;
  displayName: string;
}) {
  const [viewerId, setViewerId] = useState<string | null | undefined>(undefined);
  const [reviews, setReviews] = useState(payload.reviews);
  const [showForm, setShowForm] = useState(false);
  const [direction, setDirection] = useState<IdentityReviewDirection>("brand_to_creator");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    supabase.auth.getUser().then((result: { data: { user: { id: string } | null } }) => {
      if (active) setViewerId(result.data.user?.id ?? null);
    });
    return () => {
      active = false;
    };
  }, []);

  const canWrite = viewerId != null && viewerId !== subjectUserId && !payload.isOwner;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) {
      setError("Share a few words about your experience.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/identity/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectUserId,
          direction,
          rating,
          title: title.trim() || undefined,
          body: body.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to submit review");
      setReviews((prev) => [json.review, ...prev]);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  }

  const allTestimonials = payload.testimonials;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <IdentitySectionHeading
          eyebrow="Trust"
          title="Reviews"
          description={
            payload.profile.reviewCount > 0
              ? `${payload.profile.avgRating.toFixed(1)} average from ${payload.profile.reviewCount} verified review${payload.profile.reviewCount === 1 ? "" : "s"}`
              : "No verified reviews yet."
          }
        />
        {canWrite && !showForm && (
          <IdentityButton size="sm" variant="outline" onClick={() => setShowForm(true)}>
            Write a review
          </IdentityButton>
        )}
      </div>

      {canWrite && showForm && (
        <IdentityCard className="p-5">
          {done ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <BadgeCheck className="h-8 w-8 text-[#1C8A44]" />
              <p className="text-[13.5px] font-semibold text-[#1C1B19]">Thanks for your review</p>
              <p className="text-[12px] text-[#8B8579]">It&apos;s now visible on {displayName}&apos;s profile.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-[12.5px] text-[#59544B]">
                  <span>I&apos;m reviewing as</span>
                  <select
                    value={direction}
                    onChange={(e) => setDirection(e.target.value as IdentityReviewDirection)}
                    className="h-8 rounded-lg border border-black/10 bg-white px-2 text-[12.5px]"
                  >
                    <option value="brand_to_creator">A brand</option>
                    <option value="creator_to_brand">A creator</option>
                  </select>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[12.5px] text-[#59544B]">Rating</span>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button key={i} type="button" onClick={() => setRating(i)} aria-label={`${i} stars`}>
                        <Star
                          className="h-4.5 w-4.5"
                          style={{
                            fill: i <= rating ? "#FF5A1F" : "transparent",
                            color: i <= rating ? "#FF5A1F" : "#D8D2C6",
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Review title (optional)"
                maxLength={120}
                className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-[13px] outline-none focus:border-[#FF5A1F]"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={`Share your experience working with ${displayName}…`}
                rows={4}
                maxLength={2000}
                className="w-full resize-none rounded-xl border border-black/10 bg-white p-3 text-[13px] outline-none focus:border-[#FF5A1F]"
              />
              {error && <p className="text-[12px] text-[#C23A2F]">{error}</p>}
              <p className="text-[11px] text-[#9A9388]">
                Reviews are only published when Jimvio can verify a completed booking or campaign between you two.
              </p>
              <div className="flex gap-2">
                <IdentityButton type="submit" size="sm" loading={submitting}>
                  Submit review
                </IdentityButton>
                <IdentityButton type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </IdentityButton>
              </div>
            </form>
          )}
        </IdentityCard>
      )}

      {reviews.length === 0 && allTestimonials.length === 0 ? (
        <IdentityEmptyState
          icon={<MessageSquareQuote className="h-6 w-6" />}
          title="No reviews yet"
          description={`Verified feedback from ${displayName}'s brand and creator partners will appear here.`}
        />
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <IdentityCard key={r.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#FF5A1F] text-[12px] font-semibold text-white">
                  {r.reviewer?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.reviewer.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    getInitials(r.reviewer?.fullName || r.reviewer?.username || "?")
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold text-[#1C1B19]">
                      {r.reviewer?.fullName || r.reviewer?.username || "Jimvio member"}
                    </p>
                    <div className="flex items-center gap-2">
                      {r.isVerified && (
                        <IdentityPill tone="success" icon={<BadgeCheck className="h-3 w-3" />}>
                          Verified
                        </IdentityPill>
                      )}
                      <Stars rating={r.rating} />
                    </div>
                  </div>
                  <p className="text-[11px] text-[#9A9388]">
                    {r.direction === "brand_to_creator" ? "Brand review" : "Creator review"} ·{" "}
                    {new Date(r.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                  </p>
                  {r.title && <p className="mt-2 text-[13px] font-semibold text-[#1C1B19]">{r.title}</p>}
                  <p className="mt-1 text-[12.5px] leading-relaxed text-[#59544B]">{r.body}</p>
                </div>
              </div>
            </IdentityCard>
          ))}

          {allTestimonials.map((t) => (
            <IdentityCard key={t.id} className="p-4">
              <p className="font-[var(--font-identity-serif)] text-[13.5px] italic leading-relaxed text-[#3E3A34]">
                “{t.quote}”
              </p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-[11.5px] font-medium text-[#59544B]">
                  {t.authorName}
                  {t.authorCompany && <span className="text-[#B9B3A6]"> · {t.authorCompany}</span>}
                </p>
                {t.rating != null && <Stars rating={t.rating} />}
              </div>
            </IdentityCard>
          ))}
        </div>
      )}
    </div>
  );
}
