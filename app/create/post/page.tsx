"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { PostComposer, type PublishedPostResult } from "@/components/feed/PostComposer";

function UploadPostPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const communitySlug = searchParams.get("community");

  const onPublished = useCallback(
    (result: PublishedPostResult) => {
      const slug = result.communitySlug?.trim() || communitySlug;
      if (slug) {
        const qs = result.postId ? `?post=${encodeURIComponent(result.postId)}` : "";
        router.push(`/communities/${encodeURIComponent(slug)}/feed${qs}`);
        router.refresh();
        return;
      }
      router.push(result.postId ? `/communities?post=${encodeURIComponent(result.postId)}` : "/communities");
      router.refresh();
    },
    [communitySlug, router]
  );

  return (
    <div className="space-y-4">
      <Link
        href={communitySlug ? `/communities/${communitySlug}/feed` : "/communities"}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-600 hover:text-[#fd5000]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>
      <PostComposer
        variant="page"
        initialCommunitySlug={communitySlug}
        initialAiOpen={searchParams.get("ai") === "1"}
        onPublished={onPublished}
      />
    </div>
  );
}

export default function UploadPostPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl bg-white p-6 shadow-[0_0_0_1px_rgba(0,0,0,0.06)]">
          <div className="h-6 w-40 animate-pulse rounded bg-gray-100" />
          <div className="mt-4 h-32 animate-pulse rounded-xl bg-gray-50" />
        </div>
      }
    >
      <UploadPostPageInner />
    </Suspense>
  );
}
