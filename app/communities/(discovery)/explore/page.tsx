import { Suspense } from "react";
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
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-8xl px-4 py-16 text-center text-[13px] text-[var(--color-text-muted)] sm:px-6">
          Loading communities…
        </div>
      }
    >
      <CommunitiesDiscovery
        initialCommunities={initialCommunities as never}
        initialTotal={initialTotal}
        initialError={initialError}
      />
    </Suspense>
  );
}
