import { getPublicCommunities } from "@/services/db";
import { CommunitiesDiscovery } from "@/components/community/communities-discovery";

export const revalidate = 120;

export default async function CommunitiesExplorePage() {
  let initialCommunities: Awaited<ReturnType<typeof getPublicCommunities>> = [];
  let initialError = false;
  try {
    initialCommunities = await getPublicCommunities(20);
  } catch (err) {
    console.error("[communities/explore] initial load failed:", err);
    initialError = true;
  }
  return (
    <CommunitiesDiscovery
      initialCommunities={initialCommunities as never}
      initialTotal={initialCommunities.length}
      initialError={initialError}
    />
  );
}
