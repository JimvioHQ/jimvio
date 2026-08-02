"use client";

import { useParams } from "next/navigation";
import { CampaignChatPage } from "@/components/ugc/project/CampaignChatPage";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <CampaignChatPage campaignId={String(id ?? "")} />;
}
