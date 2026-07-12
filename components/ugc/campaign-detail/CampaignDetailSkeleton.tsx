"use client";

export function CampaignDetailSkeleton() {
  return (
    <div className="animate-pulse bg-[#FAFAFA] pb-24">
      <div className="h-[220px] bg-[#E5E7EB]" />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="flex gap-4">
          <div className="h-16 w-16 rounded-2xl bg-[#E5E7EB]" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 rounded bg-[#E5E7EB]" />
            <div className="h-8 w-3/4 rounded bg-[#E5E7EB]" />
            <div className="h-4 w-full rounded bg-[#E5E7EB]" />
          </div>
        </div>
        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_300px]">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-40 rounded-[16px] bg-[#E5E7EB]" />
            ))}
          </div>
          <div className="hidden h-80 rounded-[16px] bg-[#E5E7EB] lg:block" />
        </div>
      </div>
    </div>
  );
}
