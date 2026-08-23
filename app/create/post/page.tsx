"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { PostComposer } from "@/components/feed/PostComposer";

function UploadPostPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const communitySlug = searchParams.get("community");

  const onPublished = useCallback(
    (postId?: string) => {
      if (communitySlug) {
        router.push(`/communities/${communitySlug}${postId ? `?post=${postId}` : ""}`);
        return;
      }
      router.push(postId ? `/communities?post=${postId}` : "/communities");
    },
    [communitySlug, router]
  );

  return (
    <div className="space-y-4">
      <Link
        href={communitySlug ? `/communities/${communitySlug}` : "/communities"}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-600 hover:text-[#fd5000]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>
      <PostComposer
        variant="page"
        initialCommunitySlug={communitySlug}
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
