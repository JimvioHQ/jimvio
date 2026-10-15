"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import EventDetailPage from "./event-detail";

export default function Page() {
  return (
    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <EventDetailPage />
    </Suspense>
  );
}
