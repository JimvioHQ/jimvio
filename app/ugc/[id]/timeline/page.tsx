"use client";

import { useParams } from "next/navigation";
import { CampaignTimelinePage } from "@/components/ugc/project/CampaignTimelinePage";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <CampaignTimelinePage campaignId={String(id ?? "")} />;
}
