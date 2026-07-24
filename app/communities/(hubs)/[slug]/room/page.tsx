import { permanentRedirect } from "next/navigation";
import { redirectLegacySpaceRoomQuery } from "@/lib/community/workspace/legacy-redirect";

/**
 * Legacy room overlay URL.
 * /communities/[slug]/room?space=&room= → canonical channel path.
 */
export default async function LegacyCommunityRoomRedirect({
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
