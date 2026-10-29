import { AdminCampaignReview } from "@/components/admin/AdminCampaignReview";

export default async function AdminCampaignReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminCampaignReview campaignId={id} />;
}
