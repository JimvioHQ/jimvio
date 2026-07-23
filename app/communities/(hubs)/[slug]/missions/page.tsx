import { redirect } from "next/navigation";

/** Community Challenges nav targets /[slug]/missions — hub missions page is the live feature. */
export default async function CommunityMissionsRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await params;
  redirect("/communities/missions");
}
