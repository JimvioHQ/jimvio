import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CommunitySubscribeClient } from "@/components/community/community-subscribe-client";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("communities")
    .select("name")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (!data) return { title: "Subscribe" };
  return { title: `Subscribe · ${data.name}` };
}

export default async function CommunitySubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const planRaw = typeof sp.plan === "string" ? sp.plan : "monthly";
  const providerRaw = typeof sp.provider === "string" ? sp.provider : "pesapal";

  const supabase = await createClient();
  const { data: community } = await supabase
    .from("communities")
    .select(
      "id, name, slug, tagline, avatar_url, is_free, monthly_price, yearly_price, lifetime_price, currency"
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!community) notFound();
  if (community.is_free) redirect(`/communities/${slug}`);

  return (
    <CommunitySubscribeClient
      community={community}
      initialPlan={planRaw}
      initialProvider={providerRaw}
    />
  );
}
