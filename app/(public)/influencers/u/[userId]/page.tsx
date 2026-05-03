import React from "react";
import Link from "next/link";
import { Video, ArrowLeft } from "lucide-react";
import { getDB } from "@/services/db";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function InfluencerByUserPage({ params }: PageProps) {
  const { userId } = await params;
  const db = await getDB();

  const { data: influencer } = await db
    .from("influencers")
    .select("id, user_id, display_name, profile_image, bio, total_followers")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (!influencer) notFound();

  const { data: clips } = await db
    .from("viral_clips")
    .select("id, title, thumbnail_url, video_url, total_views")
    .eq("influencer_id", influencer.id)
    .eq("is_active", true)
    .not("video_url", "is", null)
    .order("total_views", { ascending: false })
    .limit(24);

  const list = clips ?? [];

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-accent)] mb-4"
          >
            <ArrowLeft className="h-4 w-4" /> Back to marketplace
          </Link>
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="h-24 w-24 rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-secondary)] shrink-0">
              {influencer.profile_image ? (
                <img src={influencer.profile_image} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-[var(--color-accent)]">
                  {influencer.display_name?.[0] ?? "C"}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{influencer.display_name}</h1>
              {influencer.bio ? (
                <p className="text-sm text-[var(--color-text-secondary)] mt-2 max-w-xl">{influencer.bio}</p>
              ) : null}
              <p className="text-xs text-[var(--color-text-muted)] mt-2">
                {list.length} video{list.length === 1 ? "" : "s"} ·{" "}
                {Number(influencer.total_followers ?? 0).toLocaleString()} followers (profile)
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {list.length === 0 ? (
          <p className="text-center text-[var(--color-text-secondary)] py-16">No published videos yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {list.map((c) => (
              <Link
                key={c.id}
                href={`/clippings`}
                className="group rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)] hover:border-[var(--color-accent)] transition-colors"
              >
                <div className="aspect-[9/14] relative bg-ink-dark">
                  {c.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.thumbnail_url}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100"
                    />
                  ) : null}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Video className="h-10 w-10 text-white/80" />
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium text-[var(--color-text-primary)] line-clamp-2">{c.title}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                    {Number(c.total_views ?? 0).toLocaleString()} views
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
        <div className="mt-10 flex justify-center">
          <Button variant="outline" asChild>
            <Link href="/clippings">Browse all clips</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
