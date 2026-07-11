import { HubLivePage } from "@/components/community/hub/hub-live-page";

export default async function CommunityLivePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <HubLivePage communitySlug={slug} />;
}
