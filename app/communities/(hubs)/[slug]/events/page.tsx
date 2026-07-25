import EventsPageWrapper from "../../events/page";

export default async function CommunityEventsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <EventsPageWrapper communitySlug={slug} />;
}
