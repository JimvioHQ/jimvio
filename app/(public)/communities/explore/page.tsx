import { getPublicCommunities } from "@/services/db";
import { CommunitiesDiscovery } from "@/components/community/communities-discovery";

export default async function CommunitiesExplorePage() {
  const initialCommunities = await getPublicCommunities(20).catch(() => []);
  return (
    <CommunitiesDiscovery
      initialCommunities={initialCommunities as never}
      initialTotal={initialCommunities.length}
    />
  );
}
