import { notFound } from "next/navigation";
import { ActiveProjectView } from "@/components/ugc/project/ActiveProjectView";
import { isUgcCampaignId } from "@/lib/ugc/routes";

type Props = { params: Promise<{ id: string }> };

export default async function CampaignDashboardPage({ params }: Props) {
  const { id } = await params;
  if (!isUgcCampaignId(id)) notFound();
  return <ActiveProjectView />;
}
