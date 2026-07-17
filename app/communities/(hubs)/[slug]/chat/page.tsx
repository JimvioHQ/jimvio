import { CommunityChatPage } from "@/components/community/CommunityChatPage";

export default async function CommunityChatRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <div className="h-full min-h-0">
      <CommunityChatPage slug={slug} />
    </div>
  );
}
