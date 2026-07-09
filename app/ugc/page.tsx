"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const UGCDiscoverPage = dynamic(
  () =>
    import("@/components/ugc/workspace/UGCDiscoverPage").then((m) => ({
      default: m.UGCDiscoverPage,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#F3F4F6] border-t-[#FF5A1F]" />
      </div>
    ),
  }
);

export default function UGCPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#F3F4F6] border-t-[#FF5A1F]" />
        </div>
      }
    >
      <UGCDiscoverPage />
    </Suspense>
  );
}
