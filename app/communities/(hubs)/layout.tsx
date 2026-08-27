import HubLayout from "../components/Layout";
import { FeedAuthProvider } from "@/lib/feed/use-feed-user";
import { loadFeedAuthInitial } from "@/lib/feed/load-feed-auth";

export default async function HubsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialAuth = await loadFeedAuthInitial();
  return (
    <FeedAuthProvider initial={initialAuth}>
      <HubLayout>{children}</HubLayout>
    </FeedAuthProvider>
  );
}
