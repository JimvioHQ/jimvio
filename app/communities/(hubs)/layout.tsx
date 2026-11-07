import HubLayout from "../components/Layout";
import { PresenceProvider } from "@/components/presence/PresenceProvider";
import { FeedAuthProvider } from "@/lib/feed/use-feed-user";
import { loadFeedAuthInitial } from "@/lib/feed/load-feed-auth";

export default async function HubsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialAuth = await loadFeedAuthInitial({ withHub: true });
  return (
    <FeedAuthProvider initial={initialAuth}>
      <PresenceProvider>
        <HubLayout>{children}</HubLayout>
      </PresenceProvider>
    </FeedAuthProvider>
  );
}
