import { FeedSection } from "@/components/community/workspace/sections/Feed";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CommunityFeedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: community } = await supabase
    .from("communities")
    .select("id, name, slug")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!community) notFound();

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-bg,#f4f4f5)]">
      <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-4">
        <FeedSection communityId={community.id} />
      </div>
    </div>
  );
}
