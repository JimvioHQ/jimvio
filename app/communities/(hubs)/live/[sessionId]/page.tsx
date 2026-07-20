import { HubLivePage } from "@/components/community/hub/hub-live-page";

/**
 * Viewer / participant entry: /communities/live/[sessionId]
 * Same Studio chrome; LiveKit subscribe + Supabase chat/roles.
 */
export default async function LiveSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <HubLivePage sessionId={sessionId} />;
}
