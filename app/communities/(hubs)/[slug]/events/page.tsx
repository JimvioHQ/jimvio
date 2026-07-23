import { redirect } from "next/navigation";

/** Community Events deep-links resolve to the hub events surface. */
export default async function CommunityEventsRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await params;
  redirect("/communities/events");
}
