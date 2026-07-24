import { permanentRedirect } from "next/navigation";
import { redirectLegacySpaceRoomQuery } from "@/lib/community/workspace/legacy-redirect";

/** Legacy nested community room path → canonical via shared resolver. */
export default async function LegacyNestedRoomRedirect({
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
