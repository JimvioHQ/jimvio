import { FeedSection } from "@/components/community/workspace/sections/Feed";

export const dynamic = "force-dynamic";

export default function CommunityFeedPage() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-bg,#f4f4f5)]">
      <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-4">
        <FeedSection />
      </div>
    </div>
  );
}
