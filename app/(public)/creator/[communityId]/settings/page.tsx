import React from "react";
import { CreatorSettingsClient } from "@/components/community/creator/CreatorSettingsClient";

export const metadata = {
  title: "Community Settings",
};

export default async function CreatorSettingsPage({ params }: { params: Promise<{ communityId: string }> }) {
  const { communityId } = await params;
  return <CreatorSettingsClient communityId={communityId} />;
}
