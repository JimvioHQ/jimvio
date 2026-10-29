import HubLayout from "../components/Layout";
import { PresenceProvider } from "@/components/presence/PresenceProvider";
import { FeedAuthProvider } from "@/lib/feed/use-feed-user";
import { loadFeedAuthInitial } from "@/lib/feed/load-feed-auth";

/**
 * Manage Community lives in its own route group so moving between it and the
 * member workspace (/communities/[slug]/spaces/…) always re-renders the right
 * layout. Sharing one [slug] layout left the workspace missing after a
 * client-side jump from Manage → "Open Space" ("Sign in to open this Space").
 */
export default async function ManageGroupLayout({ children }: { children: React.ReactNode }) {
  const initialAuth = await loadFeedAuthInitial();
  return (
    <FeedAuthProvider initial={initialAuth}>
      <PresenceProvider>
        <HubLayout>{children}</HubLayout>
      </PresenceProvider>
    </FeedAuthProvider>
  );
}
