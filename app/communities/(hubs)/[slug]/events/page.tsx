import { redirect } from "next/navigation";

/** Keep community context on the hub events surface. */
export default async function CommunityEventsRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/communities/events?community=${encodeURIComponent(slug)}`);
}
