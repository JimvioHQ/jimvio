"use client";

import { useEffect, useState } from "react";
import { HubLivePage } from "@/components/community/hub/hub-live-page";
import { usePathname } from "next/navigation";

export default function LiveSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const pathname = usePathname();
  const [communitySlug, setCommunitySlug] = useState<string | null>(null);

  useEffect(() => {
    const match = pathname.match(/\/c\/([^/]+)\/live/);
    if (match) {
      setCommunitySlug(match[1]);
    }
  }, [pathname]);

  return <HubLivePage sessionId={params.then(p => p.sessionId)} communitySlug={communitySlug} />;
}
