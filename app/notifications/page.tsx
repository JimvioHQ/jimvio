"use client";

import { Suspense } from "react";
import { NotificationCenterPage } from "@/components/notifications/NotificationCenterPage";
import { Loader2 } from "lucide-react";

function NotificationsFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-[#fd5000]" />
    </div>
  );
}

export default function NotificationsRoutePage() {
  return (
    <Suspense fallback={<NotificationsFallback />}>
      <NotificationCenterPage />
    </Suspense>
  );
}
