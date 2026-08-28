"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  UGCPageEmpty,
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
} from "@/components/ugc/workspace/UGCPageShell";

type ActivityEvent = {
  id: string;
  event_type: string;
  title: string;
  description?: string | null;
  created_at: string;
  metadata?: Record<string, unknown>;
};

export function CampaignTimelinePage({ campaignId }: { campaignId: string }) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ugc/campaigns/${campaignId}/activity`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("load failed");
      const json = await res.json();
      setEvents(json.data ?? json.events ?? []);
    } catch {
      setError("Could not load activity timeline.");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <UGCPageShell
      titleKey="campaignTimeline"
      subtitleKey="timelineSubtitle"
      actions={
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline" className="rounded-xl">
            <Link href={`/ugc/${campaignId}`}>Campaign</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="rounded-xl">
            <Link href={`/ugc/${campaignId}/chat`}>Chat</Link>
          </Button>
        </div>
      }
    >
      {loading ? <UGCPageLoading /> : null}
      {!loading && error ? <UGCPageError message={error} onRetry={load} /> : null}
      {!loading && !error && events.length === 0 ? (
        <UGCPageEmpty
          title="No activity yet"
          description="Events will appear as creators apply, submit, and get reviewed."
          illustration="analytics"
        />
      ) : null}

      {!loading && !error && events.length > 0 ? (
        <ol className="relative space-y-0 border-l-2 border-[#FFE4D6] pl-5">
          {events.map((e) => (
            <li key={e.id} className="relative pb-5">
              <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-[#FF5A1F]" />
              <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
                <p className="text-[11px] font-semibold uppercase text-[#FF5A1F]">
                  {e.event_type.replace(/_/g, " ")} ·{" "}
                  {new Date(e.created_at).toLocaleString()}
                </p>
                <p className="mt-1 text-[14px] font-bold text-[#111827]">{e.title}</p>
                {e.description ? (
                  <p className="mt-1 text-[13px] text-[#6B7280]">{e.description}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </UGCPageShell>
  );
}
