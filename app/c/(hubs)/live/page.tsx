"use client";

import { useEffect, useState } from "react";
import { HubLivePage } from "@/components/community/hub/hub-live-page";
import { usePathname } from "next/navigation";

export default function LivePage() {
  const pathname = usePathname();
  const [communitySlug, setCommunitySlug] = useState<string | null>(null);

  useEffect(() => {
    // Check if we're in a community context (/c/[slug]/live)
    const match = pathname.match(/\/c\/([^/]+)\/live/);
    if (match) {
      setCommunitySlug(match[1]);
    }
  }, [pathname]);

  return <HubLivePage communitySlug={communitySlug} />;
}
