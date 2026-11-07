import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { isUgcCampaignId } from "@/lib/ugc/routes";

type Props = {
  children: ReactNode;
  params: Promise<{ id: string }>;
};

/** Reject reserved Brand Workspace segments that would otherwise soft-match [id]. */
export default async function UgcCampaignIdLayout({ children, params }: Props) {
  const { id } = await params;
  if (!isUgcCampaignId(id)) notFound();
  return children;
}
