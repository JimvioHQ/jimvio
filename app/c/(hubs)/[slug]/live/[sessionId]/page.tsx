import { HubLivePage } from "@/components/community/hub/hub-live-page";

export default async function CommunityLiveSessionPage({ params }: { params: Promise<{ slug: string; sessionId: string }> }) {
  const { slug, sessionId } = await params;
  return <HubLivePage sessionId={sessionId} communitySlug={slug} />;
}
