import { CreatorStreamDashboard } from "@/components/community/hub/creator-dashboard/CreatorStreamDashboard";

export default async function CreatorDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CreatorStreamDashboard communitySlug={slug} />;
}