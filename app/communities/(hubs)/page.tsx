import { HubHome } from "@/components/community/hub/hub-home";
import { loadHubHome } from "@/lib/community/load-hub-home";
import { constructMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = constructMetadata({
  title: "Communities",
  description: "Your communities, live sessions, and challenges on Jimvio.",
  path: "/communities",
});

export default async function CommunitiesHubPage() {
  const data = await loadHubHome();
  return <HubHome data={data} />;
}
