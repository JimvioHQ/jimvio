import type { Metadata } from "next";
import { OfflinePageClient } from "@/components/empty-states/offline-page-client";

export const metadata: Metadata = {
  title: "You're offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return <OfflinePageClient />;
}
