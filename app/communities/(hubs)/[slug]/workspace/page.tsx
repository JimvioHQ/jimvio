import { permanentRedirect } from "next/navigation";
import { redirectLegacySpaceRoomQuery } from "@/lib/community/workspace/legacy-redirect";

/**
 * Payment / legacy workspace URLs.
 * /communities/[slug]/workspace?space=&room= → canonical routes.
 * Clean /workspace → community hub.
 */
export default async function CommunityWorkspaceAliasRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ space?: string | string[]; room?: string | string[] }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  await redirectLegacySpaceRoomQuery(slug, query);
  permanentRedirect(`/communities/${slug}`);
}
