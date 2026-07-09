"use client";

export function ActiveProjectSkeleton() {
  return (
    <div className="animate-pulse bg-[#FAFAFA] pb-28">
      <div className="h-[200px] bg-[#E5E7EB] sm:h-[240px]" />
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 rounded-[12px] bg-[#E5E7EB]" />
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-44 rounded-[16px] bg-[#E5E7EB]" />
            ))}
          </div>
          <div className="hidden space-y-4 lg:block">
            <div className="h-64 rounded-[16px] bg-[#E5E7EB]" />
            <div className="h-40 rounded-[16px] bg-[#E5E7EB]" />
          </div>
        </div>
      </div>
    </div>
  );
}
