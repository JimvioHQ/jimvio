import { getPublicCommunities, getPublicCommunitiesTotal } from "@/services/db";
import { CommunitiesDiscovery } from "@/components/community/communities-discovery";

export const revalidate = 120;

export default async function CommunitiesExplorePage() {
  let initialCommunities: Awaited<ReturnType<typeof getPublicCommunities>> = [];
  let initialTotal = 0;
  let initialError = false;
  try {
    const [communities, total] = await Promise.all([
      getPublicCommunities(20),
      getPublicCommunitiesTotal(),
    ]);
    initialCommunities = communities;
    initialTotal = total;
  } catch (err) {
    console.error("[communities/explore] initial load failed:", err);
    initialError = true;
  }
  return (
    <CommunitiesDiscovery
      initialCommunities={initialCommunities as never}
      initialTotal={initialTotal}
      initialError={initialError}
    />
  );
}
