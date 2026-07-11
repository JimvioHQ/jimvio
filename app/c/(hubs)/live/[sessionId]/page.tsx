import { HubLivePage } from "@/components/community/hub/hub-live-page";

export default async function LiveSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <HubLivePage sessionId={sessionId} />;
}
