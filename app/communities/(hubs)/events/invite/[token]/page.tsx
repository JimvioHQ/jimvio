"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function EventInvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/c/events/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: params.token }),
      });
      const json = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok || !json.eventId) {
        router.replace("/communities/events?invite=invalid");
        return;
      }
      router.replace(`/communities/events/${json.eventId}?token=${encodeURIComponent(params.token)}`);
    })();
    return () => { cancelled = true; };
  }, [params.token, router]);
  return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
}
